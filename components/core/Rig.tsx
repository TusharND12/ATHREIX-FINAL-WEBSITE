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
    root.style.setProperty('--stage-in', s.stage.toFixed(3))
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      {/* Key */}
      <directionalLight position={[-5, 4, 7]} intensity={2.1} color="#ffd9c0" />
      {/* Rim from behind — the warm edge highlight that makes flat-shaded
          bodies read as solid objects rather than silhouettes. */}
      <directionalLight position={[4, 2, -6]} intensity={2.6} color="#ffb37a" />
      {/* Cool fill, keeps the shadow side off flat black. */}
      <directionalLight position={[6, -3, 2]} intensity={0.7} color="#8fb6ff" />
    </>
  )
}
