import gsap from 'gsap'
import { at, dur } from '@/lib/acts'
import { sceneState } from './sceneState'

/**
 * The master timeline. One paused timeline, total duration 1, driven directly
 * by scroll progress. Every position and duration below is expressed in
 * progress units taken from lib/acts.ts, so re-pacing the page is a matter of
 * editing `vh` numbers there — not re-keying anything here.
 */
export function buildTimeline() {
  const s = sceneState
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })

  // --- ACT 0 — HERO: core face-on, a slow push in ---------------------------
  tl.fromTo(s, { camZ: 11.4 }, { camZ: 10.4, duration: dur('hero') }, at('hero'))
    // A slight three-quarter tilt from frame one. Dead-on, a cylindrical object
    // reads as a flat disc — the real GLB will have a front element that carries
    // a face-on pose, but until then the tilt is what sells the dimensionality.
    .fromTo(
      s,
      { rotY: -0.24, rotX: -0.13 },
      { rotY: -0.09, rotX: -0.07, duration: dur('hero') },
      at('hero'),
    )

  // --- ACT 1 — ORBIT: pull back and swing into a three-quarter view ---------
  // The hero demo has to go before the tilt does; a flat DOM circle cannot
  // follow the aperture into perspective and the mismatch is obvious.
  tl.to(s, { stage: 0, duration: dur('orbit') * 0.28 }, at('orbit'))
    .to(s, { camZ: 13.2, camY: 1.4, duration: dur('orbit') }, at('orbit'))
    .to(s, { rotY: Math.PI * 0.42, rotX: -0.28, duration: dur('orbit') }, at('orbit'))

  // --- ACT 2 — EXPLODE: one scalar pulls every part apart -------------------
  tl.to(s, { explode: 1, duration: dur('explode') }, at('explode'))
    .to(s, { rotY: Math.PI * 0.78, camZ: 15.0, duration: dur('explode') }, at('explode'))

  // --- ACT 3 — BLUEPRINT: solid crossfades to line-art, theme inverts -------
  // Both transitions run over the first third of the act so the rest of the
  // scroll is spent reading the annotations, not waiting for the fade.
  tl.to(s, { blueprint: 1, duration: dur('blueprint') * 0.3 }, at('blueprint'))
    .to(s, { theme: 1, duration: dur('blueprint') * 0.3 }, at('blueprint') + dur('blueprint') * 0.08)
    .to(
      s,
      { rotY: Math.PI * 1.15, rotX: -0.1, camY: 0.2, duration: dur('blueprint') },
      at('blueprint'),
    )

  // --- ACT 4 — ENTER: reassemble, drop the blueprint, fly into the face -----
  tl.to(
    s,
    { explode: 0, blueprint: 0, theme: 0, duration: dur('enter') * 0.55 },
    at('enter'),
  )
    .to(
      s,
      { rotY: Math.PI * 2, rotX: 0, camY: 0, duration: dur('enter') * 0.55 },
      at('enter'),
    )
    .to(s, { camZ: 8.15, duration: dur('enter') * 0.6 }, at('enter') + dur('enter') * 0.4)
    .to(s, { stage: 1, duration: dur('enter') * 0.3 }, at('enter') + dur('enter') * 0.7)

  // --- ACT 5-7 — CAPABILITIES: camera holds, the aperture is the stage ------
  // Barely anything moves in 3D here on purpose. The DOM demos carry these
  // sections; the core just breathes so the frame does not feel frozen.
  const caps = ['cap-retrieval', 'cap-inference', 'cap-guardrails']
  caps.forEach((id, i) => {
    tl.to(s, { rotY: Math.PI * 2 + (i + 1) * 0.06, duration: dur(id) }, at(id))
  })

  // --- ACT 8 — MODULAR: back out, invert again, scatter the parts -----------
  tl.to(s, { stage: 0, duration: dur('modular') * 0.2 }, at('modular'))
    .to(s, { camZ: 15.5, duration: dur('modular') * 0.45 }, at('modular'))
    // Blueprint leads the theme flip slightly. If the solids are still visible
    // when the background goes light they wash out into it for a beat.
    .to(s, { blueprint: 1, duration: dur('modular') * 0.22 }, at('modular') + dur('modular') * 0.18)
    .to(s, { theme: 1, duration: dur('modular') * 0.3 }, at('modular') + dur('modular') * 0.28)
    .to(
      s,
      { explode: 1.35, rotY: Math.PI * 2.5, rotX: -0.22, duration: dur('modular') * 0.8 },
      at('modular') + dur('modular') * 0.2,
    )

  // --- ACT 9 — OUTRO: settle back to a calm, assembled, dark hero pose ------
  tl.to(
    s,
    { explode: 0, blueprint: 0, theme: 0, camZ: 11.4, rotX: 0, rotY: Math.PI * 2.5, duration: dur('outro') },
    at('outro'),
  )

  return tl
}
