/**
 * The bridge between GSAP and Three.js.
 *
 * GSAP tweens this plain object. `useFrame` reads it and applies it to the
 * scene. React never re-renders as a result of scrolling — that is the whole
 * point. If you find yourself putting any of this in useState, stop.
 */
export type SceneState = {
  /** 0 = assembled, 1 = fully exploded. Drives every part at once. */
  explode: number
  /** 0 = solid flat-shaded, 1 = line-art blueprint. Crossfades the two meshes. */
  blueprint: number
  /** 0 = dark theme, 1 = light theme. Drives CSS vars *and* material colours. */
  theme: number
  /** Camera, in world units. */
  camX: number
  camY: number
  camZ: number
  /** Model rotation, in radians. */
  rotX: number
  rotY: number
  /**
   * 0 = DOM aperture stage hidden, 1 = visible.
   *
   * Starts at 1: the hero runs a live demo inside the lens from the first
   * frame. It has to drop to 0 as soon as the core starts rotating, because
   * the stage is a flat DOM circle and cannot follow the ring into perspective.
   */
  stage: number
  /** Global scroll progress, mirrored here for the scrubber UI. */
  progress: number
}

export const sceneState: SceneState = {
  explode: 0,
  blueprint: 0,
  theme: 0,
  camX: 0,
  camY: 0,
  camZ: 11.4,
  rotX: -0.13,
  rotY: -0.24,
  stage: 1,
  progress: 0,
}

/** How far parts travel at explode = 1, in world units. */
export const EXPLODE_SPREAD = 2.4

/** Palette endpoints for the two themes. */
export const THEME = {
  dark: { bg: '#0d0f12', fg: '#f2f0ec', muted: '#7c828c', solid: '#585e68', line: '#f2f0ec' },
  light: { bg: '#e8e6e1', fg: '#1a1c20', muted: '#6b7079', solid: '#c9c5bc', line: '#33363c' },
} as const
