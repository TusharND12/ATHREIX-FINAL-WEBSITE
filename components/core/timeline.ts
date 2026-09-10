import gsap from 'gsap'
import { at, dur } from '@/lib/acts'
import { sceneState } from './sceneState'

/**
 * The master timeline. One paused timeline, total duration 1, driven directly
 * by scroll progress. Positions come from lib/acts.ts, so re-pacing the page
 * means editing `vh` numbers there — not re-keying anything here.
 *
 * The five morph weights are the spine. Each act hands off by fading its weight
 * out while the next fades in, which is why intermediate scroll positions look
 * like real in-between shapes rather than a cut.
 */

const KEYS = {
  noise: 'wNoise',
  cluster: 'wCluster',
  manifold: 'wManifold',
  glyph: 'wGlyph',
  stream: 'wStream',
} as const

/** Crossfade the field from one target layout to another over an act. */
function morph(
  tl: gsap.core.Timeline,
  actId: string,
  from: keyof typeof KEYS,
  to: keyof typeof KEYS,
  opts: { at?: number; span?: number } = {},
) {
  const s = sceneState
  const start = at(actId) + dur(actId) * (opts.at ?? 0)
  const span = dur(actId) * (opts.span ?? 1)
  tl.to(s, { [KEYS[from]]: 0, duration: span }, start)
  tl.to(s, { [KEYS[to]]: 1, duration: span }, start)
}

export function buildTimeline() {
  const s = sceneState
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })

  // --- HERO — a drifting field of noise ------------------------------------
  tl.fromTo(s, { camZ: 16.5 }, { camZ: 15.2, duration: dur('hero') }, at('hero'))
    .fromTo(s, { spin: 0 }, { spin: 0.16, duration: dur('hero') }, at('hero'))

  // --- INGEST — the cloud pulls inward and begins to settle ----------------
  tl.to(s, { camZ: 13.4, drift: 0.2, duration: dur('ingest') }, at('ingest'))
    .to(s, { spin: 0.42, duration: dur('ingest') }, at('ingest'))

  // --- EMBED — noise resolves into clusters --------------------------------
  // The most important beat on the page: unstructured input visibly acquiring
  // structure. Give it most of the act.
  morph(tl, 'embed', 'noise', 'cluster', { span: 0.72 })
  tl.to(s, { drift: 0.1, size: 4.3, duration: dur('embed') }, at('embed'))
    .to(s, { spin: 0.85, tilt: -0.12, duration: dur('embed') }, at('embed'))

  // --- RETRIEVE — one cluster is spotlighted, the rest recede --------------
  tl.to(s, { focus: 3, duration: 0.001 }, at('retrieve') + dur('retrieve') * 0.2)
    .to(s, { camZ: 10.6, duration: dur('retrieve') }, at('retrieve'))
    .to(s, { spin: 1.22, duration: dur('retrieve') }, at('retrieve'))
    .to(s, { panel: 1, duration: dur('retrieve') * 0.12 }, at('retrieve') + dur('retrieve') * 0.18)
    // Release the spotlight before the manifold forms, or the fold looks broken.
    .to(s, { focus: -1, duration: 0.001 }, at('retrieve') + dur('retrieve') * 0.88)

  // --- REASON — clusters fold into a manifold ------------------------------
  // Camera lifts and the field tilts: a swiss roll seen edge-on is a smear, and
  // the whole point of this beat is that the structure is legible.
  morph(tl, 'reason', 'cluster', 'manifold', { span: 0.72 })
  tl.to(s, { camZ: 12.4, camY: 1.8, duration: dur('reason') }, at('reason'))
    .to(s, { spin: 1.95, tilt: -0.34, duration: dur('reason') }, at('reason'))

  // --- GUARDRAILS — theme inverts; the audit moment ------------------------
  // The field holds its shape and the page changes around it, which reads as
  // inspection rather than transformation. The flip is fast on purpose: at
  // theme 0.5 the ground and the points lerp to nearly the same value and
  // contrast collapses, so we snap through that midpoint rather than easing.
  tl.to(s, { theme: 1, duration: dur('guardrails') * 0.1 }, at('guardrails'))
    .to(s, { accentMix: 0.3, size: 3.4, duration: dur('guardrails') * 0.16 }, at('guardrails'))
    .to(s, { spin: 2.7, tilt: -0.12, camY: 0.6, duration: dur('guardrails') }, at('guardrails'))
    .to(
      s,
      { theme: 0, accentMix: 0.6, size: 4.2, duration: dur('guardrails') * 0.1 },
      at('guardrails') + dur('guardrails') * 0.86,
    )

  // --- RESOLVE — the manifold collapses into the mark ----------------------
  // Spin and tilt unwind to zero, otherwise the mark reads as a skewed smear
  // instead of a logo.
  morph(tl, 'resolve', 'manifold', 'glyph', { span: 0.76 })
  tl.to(s, { panel: 0, duration: dur('resolve') * 0.12 }, at('resolve'))
    .to(
      s,
      { spin: Math.PI * 2, tilt: 0, camY: 0, camZ: 11.5, drift: 0.045, duration: dur('resolve') * 0.8 },
      at('resolve'),
    )
    .to(s, { size: 3.6, duration: dur('resolve') * 0.8 }, at('resolve'))

  // --- DELIVER — the mark breaks into a stream flowing at the viewer -------
  morph(tl, 'deliver', 'glyph', 'stream', { span: 0.62 })
  tl.to(s, { camZ: 8.2, drift: 0.09, size: 3.9, duration: dur('deliver') }, at('deliver'))

  // --- OUTRO — settles back to a calm field --------------------------------
  morph(tl, 'outro', 'stream', 'noise', { span: 0.6 })
  tl.to(s, { camZ: 15.4, drift: 0.32, duration: dur('outro') }, at('outro'))

  return tl
}
