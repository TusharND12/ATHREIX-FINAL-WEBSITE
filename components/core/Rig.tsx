'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { buildDeviceCluster, type DeviceCluster } from './deviceCluster'
import { sceneState, EXPLODE_SPREAD, THEME } from './sceneState'
import { ACTS, ACT_RANGE } from '@/lib/acts'

const tmpC = new THREE.Vector3()
const tmpX = new THREE.Vector3()
const tmpY = new THREE.Vector3()
const axRight = new THREE.Vector3()
const axUp = new THREE.Vector3()
const axFwd = new THREE.Vector3()
const colA = new THREE.Color()
const colB = new THREE.Color()
const cssBg = new THREE.Color()
const cssFg = new THREE.Color()
const cssMuted = new THREE.Color()

/**
 * Reads sceneState every rendered frame and applies it to the scene. This is
 * the only place the 3D world is mutated, and there is no React state here —
 * scrolling must never trigger a re-render.
 *
 * The cluster is built per mount and attached with scene.add rather than via
 * <primitive>: <primitive> would have to read the object during render, and
 * R3F cannot remount the same object instance across StrictMode's double-mount.
 */
export function Rig() {
  const ref = useRef<DeviceCluster | null>(null)
  const { camera, size, invalidate, scene } = useThree()

  useEffect(() => {
    const cluster = buildDeviceCluster()
    ref.current = cluster
    scene.add(cluster.group)
    invalidate()
    return () => {
      scene.remove(cluster.group)
      cluster.dispose()
      ref.current = null
    }
  }, [scene, invalidate])

  useEffect(() => void invalidate(), [size.width, size.height, invalidate])

  useFrame(() => {
    const c = ref.current
    if (!c) return
    const s = sceneState
    const root = document.documentElement

    camera.position.set(s.camX, s.camY, s.camZ)
    camera.lookAt(0, 0.18, 0)

    c.group.rotation.set(s.rotX, s.rotY, 0)

    // The lid. 0.97 rather than a full right angle so it rests on the chassis
    // when shut instead of intersecting it.
    c.lid.rotation.x = (1 - s.lid) * (Math.PI / 2) * 0.97

    for (const p of c.parts) {
      p.node.position.copy(p.base).addScaledVector(p.dir, s.explode * EXPLODE_SPREAD)
    }

    // --- render mode crossfade ---------------------------------------------
    c.solidMaterial.opacity = 1 - s.blueprint
    c.solidMaterial.visible = s.blueprint < 0.995
    c.lineMaterial.opacity = s.blueprint
    c.lineMaterial.visible = s.blueprint > 0.005

    // --- theme --------------------------------------------------------------
    const t = s.theme
    c.solidMaterial.color.copy(colA.set(THEME.dark.solid).lerp(colB.set(THEME.light.solid), t))
    c.lineMaterial.color.copy(colA.set(THEME.dark.line).lerp(colB.set(THEME.light.line), t))

    // The display goes pale on the light theme, and vanishes in line-art mode
    // where there is no solid panel to be the face of.
    c.screenMaterial.color.copy(colA.set('#08090d').lerp(colB.set('#d9d6cf'), t))
    c.screenMaterial.opacity = 1 - s.blueprint
    c.screenMaterial.visible = s.blueprint < 0.995

    cssBg.set(THEME.dark.bg).lerp(colB.set(THEME.light.bg), t)
    cssFg.set(THEME.dark.fg).lerp(colB.set(THEME.light.fg), t)
    cssMuted.set(THEME.dark.muted).lerp(colB.set(THEME.light.muted), t)
    root.style.setProperty('--bg', `#${cssBg.getHexString()}`)
    root.style.setProperty('--fg', `#${cssFg.getHexString()}`)
    root.style.setProperty('--muted', `#${cssMuted.getHexString()}`)

    // Screens pick up the section accent, so the hardware looks powered rather
    // than like unlit plastic. Squared falloff on the lid keeps them dark until
    // the machine is actually open.
    const lidLit = Math.max(0, Math.min(1, (s.lid - 0.62) / 0.33))
    c.glowMaterial.color.set(s.accent)
    c.glowMaterial.opacity = 0.085 * lidLit * (1 - s.blueprint) * (1 - t * 0.75)

    // --- act ring: light the arc for the act you are actually in ------------
    for (let i = 0; i < c.ringSegments.length; i++) {
      const seg = c.ringSegments[i]
      const act = ACTS[i]
      let peak = 0
      if (act) {
        const { start, end } = ACT_RANGE[act.id]
        const centre = (start + end) / 2
        const reach = ((end - start) / 2) * 1.9
        peak = Math.max(0, 1 - Math.abs(s.progress - centre) / reach)
      }
      const visible = 1 - s.blueprint
      seg.core.opacity = (0.09 + 0.91 * peak) * visible
      seg.halo.opacity = 0.5 * peak * peak * visible
    }

    // --- register the DOM stage to the projected laptop display -------------
    // Take the display's own world axes rather than assuming screen-space
    // right/up: the panel is a child of the laptop, which rotates with the
    // cluster, and its half-extents have to be measured along its own plane.
    c.screenAnchor.getWorldPosition(tmpC)
    c.screenAnchor.matrixWorld.extractBasis(axRight, axUp, axFwd)
    tmpX.copy(tmpC).addScaledVector(axRight.normalize(), c.screenHalf.w)
    tmpY.copy(tmpC).addScaledVector(axUp.normalize(), c.screenHalf.h)

    tmpC.project(camera)
    tmpX.project(camera)
    tmpY.project(camera)

    const cx = (tmpC.x * 0.5 + 0.5) * size.width
    const cy = (-tmpC.y * 0.5 + 0.5) * size.height
    const hw = Math.abs((tmpX.x * 0.5 + 0.5) * size.width - cx)
    const hh = Math.abs((-tmpY.y * 0.5 + 0.5) * size.height - cy)

    root.style.setProperty('--st-x', `${cx.toFixed(1)}px`)
    root.style.setProperty('--st-y', `${cy.toFixed(1)}px`)
    root.style.setProperty('--st-w', `${(hw * 2).toFixed(1)}px`)
    root.style.setProperty('--st-h', `${(hh * 2).toFixed(1)}px`)
    // Gate the demo on the lid. Without this the screen readout renders on a
    // shut laptop during the intro, floating in front of the closed chassis.
    const lidGate = Math.max(0, Math.min(1, (s.lid - 0.62) / 0.33))
    root.style.setProperty('--stage-in', (s.stage * lidGate * lidGate).toFixed(3))
  })

  return (
    <>
      {/* Low ambient: the bodies are dark on purpose, so that edge highlights
          read as highlights instead of being lost in an evenly lit grey. */}
      <ambientLight intensity={0.26} />
      {/* Key — cool and sharp. The old rig ran two warm lights at 2.1 and 2.6,
          which is what made every device look dusty brown. */}
      <directionalLight position={[-4.5, 5, 6]} intensity={2.4} color="#eaf0ff" />
      {/* Warm rim from behind, dialled well back — an edge accent, not a wash. */}
      <directionalLight position={[5, 1.5, -5]} intensity={1.1} color="#ffb37a" />
      {/* Cool underfill so the shadow side has shape rather than going black. */}
      <directionalLight position={[3, -4, 2]} intensity={0.5} color="#7fa8ff" />
    </>
  )
}
