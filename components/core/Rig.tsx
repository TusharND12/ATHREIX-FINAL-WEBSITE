'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { buildPlaceholderCore, type CoreModel } from './buildPlaceholderCore'
import { sceneState, EXPLODE_SPREAD, THEME } from './sceneState'
import { ACTS, ACT_RANGE } from '@/lib/acts'

const tmpVec = new THREE.Vector3()
const tmpEdge = new THREE.Vector3()
const tmpRight = new THREE.Vector3()
const colA = new THREE.Color()
const colB = new THREE.Color()
const cssBg = new THREE.Color()
const cssFg = new THREE.Color()
const cssMuted = new THREE.Color()

/**
 * Reads sceneState every rendered frame and applies it to the scene. This is
 * the only place the 3D world is mutated. There is no React state here —
 * scrolling must never trigger a re-render.
 *
 * WHY THE CORE IS ATTACHED IMPERATIVELY, NOT VIA <primitive>
 *
 * The obvious spelling is `<primitive object={core.group} />`, but that object
 * has to be stored somewhere, and every hook-shaped option is a dead end here:
 * useMemo and useState both trip react-hooks/immutability (we mutate the core
 * every frame — that is how react-three-fiber works), and a ref trips
 * react-hooks/refs because <primitive> would read it during render.
 *
 * A module-level singleton passes lint but is genuinely broken: React
 * StrictMode mounts, unmounts and remounts in dev, and R3F's <primitive>
 * cannot remount the *same* object instance — it tags objects with its own
 * reconciler metadata, so the second mount silently fails.
 *
 * Owning the lifecycle in an effect fixes all of it: the core is built per
 * mount, added to the scene on mount, removed and disposed on cleanup, and the
 * ref is only ever read inside effects and useFrame — never during render.
 */
export function Rig() {
  const coreRef = useRef<CoreModel | null>(null)
  const { camera, size, invalidate, scene } = useThree()

  useEffect(() => {
    const core = buildPlaceholderCore()
    coreRef.current = core
    scene.add(core.group)
    invalidate()

    return () => {
      scene.remove(core.group)
      core.dispose()
      coreRef.current = null
    }
  }, [scene, invalidate])

  // Re-register the DOM stage when the viewport changes.
  useEffect(() => void invalidate(), [size.width, size.height, invalidate])

  useFrame(() => {
    const core = coreRef.current
    if (!core) return
    const s = sceneState
    const root = document.documentElement

    // --- camera ------------------------------------------------------------
    camera.position.set(s.camX, s.camY, s.camZ)
    camera.lookAt(0, 0, 0)

    // --- model orientation -------------------------------------------------
    core.group.rotation.set(s.rotX, s.rotY, 0)

    // --- explode: one scalar, every part -----------------------------------
    for (const p of core.parts) {
      p.node.position.copy(p.base).addScaledVector(p.dir, s.explode * EXPLODE_SPREAD)
    }

    // --- render mode crossfade ---------------------------------------------
    core.solidMaterial.opacity = 1 - s.blueprint
    core.solidMaterial.visible = s.blueprint < 0.995
    core.lineMaterial.opacity = s.blueprint
    core.lineMaterial.visible = s.blueprint > 0.005

    // --- theme: materials and CSS variables move together -------------------
    const t = s.theme
    core.solidMaterial.color.copy(
      colA.set(THEME.dark.solid).lerp(colB.set(THEME.light.solid), t),
    )
    core.lineMaterial.color.copy(
      colA.set(THEME.dark.line).lerp(colB.set(THEME.light.line), t),
    )

    cssBg.set(THEME.dark.bg).lerp(colB.set(THEME.light.bg), t)
    cssFg.set(THEME.dark.fg).lerp(colB.set(THEME.light.fg), t)
    cssMuted.set(THEME.dark.muted).lerp(colB.set(THEME.light.muted), t)
    root.style.setProperty('--bg', `#${cssBg.getHexString()}`)
    root.style.setProperty('--fg', `#${cssFg.getHexString()}`)
    root.style.setProperty('--muted', `#${cssMuted.getHexString()}`)

    // --- aperture ring: light the arc for the act you are actually in ------
    // Segment i belongs to act i, so the highlight is driven by that act's real
    // progress range rather than an even slice. Acts differ in length, and an
    // even slice would drift out of sync with the headings by the halfway mark.
    for (let i = 0; i < core.ringSegments.length; i++) {
      const seg = core.ringSegments[i]
      const act = ACTS[i]
      let peak = 0

      if (act) {
        const { start, end } = ACT_RANGE[act.id]
        const centre = (start + end) / 2
        // Falloff reaches a little past the act's own bounds so neighbouring
        // arcs overlap and the sweep reads as continuous.
        const reach = ((end - start) / 2) * 1.9
        peak = Math.max(0, 1 - Math.abs(s.progress - centre) / reach)
      }

      // Solid colour has no place in line-art mode, so the whole ring fades out
      // with the blueprint crossfade.
      const visible = 1 - s.blueprint
      seg.core.opacity = (0.09 + 0.91 * peak) * visible
      seg.halo.opacity = 0.5 * peak * peak * visible
    }

    // --- register the DOM aperture stage to the projected 3D ring -----------
    // Project the aperture centre and one edge point into screen space, and
    // hand the DOM layer a pixel position and radius via CSS variables.
    core.apertureAnchor.getWorldPosition(tmpVec)
    // screen-right at the aperture's depth = viewDir × up
    tmpRight.copy(tmpVec).sub(camera.position).normalize().cross(camera.up).normalize()
    tmpEdge.copy(tmpVec).addScaledVector(tmpRight, core.apertureRadius)
    tmpVec.project(camera)
    tmpEdge.project(camera)

    const cx = (tmpVec.x * 0.5 + 0.5) * size.width
    const cy = (-tmpVec.y * 0.5 + 0.5) * size.height
    const ex = (tmpEdge.x * 0.5 + 0.5) * size.width
    const ey = (-tmpEdge.y * 0.5 + 0.5) * size.height
    const r = Math.hypot(ex - cx, ey - cy)

    root.style.setProperty('--ap-x', `${cx.toFixed(1)}px`)
    root.style.setProperty('--ap-y', `${cy.toFixed(1)}px`)
    root.style.setProperty('--ap-r', `${r.toFixed(1)}px`)
    root.style.setProperty('--stage-in', s.stage.toFixed(3))
  })

  return (
    <>
      {/* Flat matte body, no PBR, no textures. Cheap, and it keeps the
          silhouette readable at every scale. */}
      <ambientLight intensity={0.5} />
      {/* Key */}
      <directionalLight position={[-5, 4, 7]} intensity={2.1} color="#ffd9c0" />
      {/* Rim from behind — this is what gives the warm edge highlight that
          makes a flat-shaded body read as a solid object. */}
      <directionalLight position={[4, 2, -6]} intensity={2.6} color="#ffb37a" />
      {/* Cool fill, keeps the shadow side from going flat black. */}
      <directionalLight position={[6, -3, 2]} intensity={0.7} color="#8fb6ff" />
    </>
  )
}
