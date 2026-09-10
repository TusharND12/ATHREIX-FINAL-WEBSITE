/**
 * The bridge between GSAP and Three.js.
 *
 * GSAP tweens this plain object; `useFrame` reads it and pushes it into shader
 * uniforms. React never re-renders as a result of scrolling — that is the whole
 * point. If you find yourself putting any of this in useState, stop.
 */
export type SceneState = {
  /** Morph weights. These five are the heart of the whole page. */
  wNoise: number
  wCluster: number
  wManifold: number
  wGlyph: number
  wStream: number

  /** Per-point wander. Keeps a section you linger on from looking frozen. */
  drift: number
  /** Point size, in shader units. */
  size: number
  /** How much of the cloud takes the accent colour. */
  accentMix: number
  /** Cluster index to spotlight, or -1 for all. */
  focus: number
  /** Global fade. */
  opacity: number

  /** Whole-field orientation. */
  spin: number
  tilt: number

  /** Camera, in world units. */
  camY: number
  camZ: number

  /** 0 = dark theme, 1 = light theme. Drives CSS vars *and* point colours. */
  theme: number

  /** 0 = capability panel hidden, 1 = visible. */
  panel: number

  /** Current accent as a CSS string. Written by SmoothScroll. */
  accent: string

  /**
   * Entrance, 0 -> 1. Not a loading screen: the field arrives unformed and
   * condenses into the hero state, so the entrance is part of the world rather
   * than a panel sitting on top of it.
   *
   * Applied by Rig as a decaying offset on top of whatever the scroll timeline
   * says, so the two never fight over the same properties.
   */
  introT: number

  /** Global scroll progress, mirrored for the chrome. */
  progress: number
}

export const sceneState: SceneState = {
  wNoise: 1,
  wCluster: 0,
  wManifold: 0,
  wGlyph: 0,
  wStream: 0,
  drift: 0.38,
  size: 4.0,
  accentMix: 0.55,
  focus: -1,
  opacity: 1,
  spin: 0,
  tilt: 0,
  camY: 0,
  camZ: 15.5,
  theme: 0,
  panel: 0,
  accent: '#7c8cff',
  introT: 0,
  progress: 0,
}

/** Palette endpoints for the two themes. */
export const THEME = {
  dark: { bg: '#07080b', fg: '#f2f0ec', muted: '#7c828c', point: '#8f9aad' },
  light: { bg: '#e8e6e1', fg: '#16181c', muted: '#6b7079', point: '#3a3f47' },
} as const
