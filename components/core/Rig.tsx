'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { buildLatentField, pointCountForViewport, type LatentField } from './latentField'
import { sceneState, THEME } from './sceneState'

const colA = new THREE.Color()
const colB = new THREE.Color()
const cssBg = new THREE.Color()
const cssFg = new THREE.Color()
const cssMuted = new THREE.Color()

/**
 * Pushes sceneState into the field's shader uniforms every frame. The only
 * place the 3D world is mutated, and there is no React state here — scrolling
 * must never trigger a re-render.
 *
 * The field is built per mount and attached with scene.add rather than via
 * <primitive>: <primitive> would have to read the object during render, and
 * R3F cannot remount the same object instance across StrictMode's double-mount.
 */
export function Rig() {
  const ref = useRef<LatentField | null>(null)
  const accentRef = useRef<string>('')
  const { scene, camera, size, gl, invalidate } = useThree()

  useEffect(() => {
    // Point count is chosen once, at mount. Rebuilding the buffers on every
    // resize would cost more than it is worth; a phone that rotates keeps its
    // budget and still reads correctly.
    const field = buildLatentField(pointCountForViewport(window.innerWidth))
    field.material.uniforms.uPixelRatio.value = gl.getPixelRatio()
    ref.current = field
    scene.add(field.points)
    invalidate()
    return () => {
      scene.remove(field.points)
      field.dispose()
      ref.current = null
    }
  }, [scene, gl, invalidate])

  useEffect(() => void invalidate(), [size.width, size.height, invalidate])

  useFrame((state) => {
    const f = ref.current
    if (!f) return
    const s = sceneState
    const u = f.material.uniforms
    const root = document.documentElement

    const w = u.uW.value as number[]
    w[0] = s.wNoise
    w[1] = s.wCluster
    w[2] = s.wManifold
    w[3] = s.wGlyph
    w[4] = s.wStream

    // Entrance, as an offset that decays to nothing. The field starts scattered
    // far too wide and far too faint, then condenses. Because it is additive on
    // top of the scroll values rather than a competing tween, scrolling during
    // the entrance interrupts it gracefully instead of fighting it.
    const k = 1 - s.introT

    u.uTime.value = state.clock.elapsedTime
    u.uDrift.value = s.drift + k * 3.2
    u.uSize.value = s.size * (0.35 + 0.65 * s.introT)
    u.uAccentMix.value = s.accentMix
    u.uFocus.value = s.focus
    u.uOpacity.value = s.opacity * s.introT

    f.points.rotation.set(s.tilt, s.spin - k * 0.5, 0)
    camera.position.set(0, s.camY, s.camZ + k * 9)
    camera.lookAt(0, 0, 0)

    // --- theme: point colour, blend mode and CSS vars move together --------
    const t = s.theme
    ;(u.uBase.value as THREE.Color).copy(
      colA.set(THEME.dark.point).lerp(colB.set(THEME.light.point), t),
    )

    // Additive accumulation clips fast, so each point contributes far less on
    // black than it does under normal blending on the light theme.
    u.uAlpha.value = 0.3 + 0.55 * t

    // Additive glow is right on black but blows out to white on a light ground,
    // so the blend mode follows the theme.
    const wantAdditive = t < 0.5
    const isAdditive = f.material.blending === THREE.AdditiveBlending
    if (wantAdditive !== isAdditive) {
      f.material.blending = wantAdditive ? THREE.AdditiveBlending : THREE.NormalBlending
      f.material.needsUpdate = true
    }

    if (accentRef.current !== s.accent) {
      accentRef.current = s.accent
      ;(u.uAccent.value as THREE.Color).set(s.accent)
    }

    cssBg.set(THEME.dark.bg).lerp(colB.set(THEME.light.bg), t)
    cssFg.set(THEME.dark.fg).lerp(colB.set(THEME.light.fg), t)
    cssMuted.set(THEME.dark.muted).lerp(colB.set(THEME.light.muted), t)
    root.style.setProperty('--bg', `#${cssBg.getHexString()}`)
    root.style.setProperty('--fg', `#${cssFg.getHexString()}`)
    root.style.setProperty('--muted', `#${cssMuted.getHexString()}`)
    root.style.setProperty('--panel-in', s.panel.toFixed(3))
  })

  // Points are unlit — the shader owns their colour entirely, so there is
  // nothing to light and no meshes to render.
  return null
}
