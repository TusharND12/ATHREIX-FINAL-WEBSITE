import gsap from 'gsap'
import { at, dur } from '@/lib/acts'
import { sceneState } from './sceneState'

/**
 * The master timeline. One paused timeline, total duration 1, driven directly
 * by scroll progress. Every position and duration is expressed in progress
 * units taken from lib/acts.ts, so re-pacing the page means editing `vh`
 * numbers there — not re-keying anything here.
 *
 * Rotation is kept deliberately shallow throughout. The cluster is made of flat
 * panels; swing it far and you are looking at the backs of screens, which reads
 * as a mistake rather than a reveal. Depth comes from the devices' own
 * arrangement instead.
 */
export function buildTimeline() {
  const s = sceneState
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })

  // --- HERO — the estate, square-on, display live --------------------------
  tl.fromTo(s, { camZ: 13.9 }, { camZ: 12.9, duration: dur('hero') }, at('hero'))
    .fromTo(
      s,
      { rotY: -0.06, rotX: -0.07 },
      { rotY: 0.02, rotX: -0.04, duration: dur('hero') },
      at('hero'),
    )

  // --- ORBIT — turn the array to inspect it --------------------------------
  // The stage goes first: it is a flat DOM rectangle and cannot follow the
  // display into perspective, so it hands off before the tilt begins.
  tl.to(s, { stage: 0, duration: dur('orbit') * 0.28 }, at('orbit'))
    .to(s, { camZ: 15.6, camY: 1.9, duration: dur('orbit') }, at('orbit'))
    .to(s, { rotY: 0.38, rotX: -0.24, duration: dur('orbit') }, at('orbit'))

  // --- EXPLODE — the estate separates --------------------------------------
  tl.to(s, { explode: 1, duration: dur('explode') }, at('explode'))
    .to(s, { rotY: 0.62, rotX: -0.3, camZ: 19.4, duration: dur('explode') }, at('explode'))

  // --- BLUEPRINT — line art, theme inverts ---------------------------------
  // Settles back toward square-on: the annotations are meant to be read, and a
  // steep angle makes an exploded diagram illegible.
  tl.to(s, { blueprint: 1, duration: dur('blueprint') * 0.13 }, at('blueprint'))
    .to(s, { theme: 1, duration: dur('blueprint') * 0.13 }, at('blueprint') + dur('blueprint') * 0.04)
    .to(
      s,
      { rotY: 0.12, rotX: -0.06, camY: 0.4, duration: dur('blueprint') },
      at('blueprint'),
    )

  // --- ENTER — reassemble and push in to the display -----------------------
  tl.to(s, { explode: 0, duration: dur('enter') * 0.55 }, at('enter'))
    .to(s, { blueprint: 0, theme: 0, duration: dur('enter') * 0.16 }, at('enter'))
    .to(s, { rotY: 0, rotX: 0, camY: 0, duration: dur('enter') * 0.55 }, at('enter'))
    .to(s, { camZ: 7.4, camX: -2.0, duration: dur('enter') * 0.6 }, at('enter') + dur('enter') * 0.4)
    .to(s, { stage: 1, duration: dur('enter') * 0.3 }, at('enter') + dur('enter') * 0.7)

  // --- CAPABILITIES — camera holds on the display --------------------------
  // Almost nothing moves in 3D here on purpose. The demos on the screen carry
  // these sections; the cluster only breathes so the frame is not frozen.
  const caps = ['cap-retrieval', 'cap-inference', 'cap-guardrails']
  caps.forEach((id, i) => {
    tl.to(s, { rotY: (i + 1) * 0.012, duration: dur(id) }, at(id))
  })

  // --- MODULAR — back out, invert, scatter ---------------------------------
  tl.to(s, { stage: 0, duration: dur('modular') * 0.2 }, at('modular'))
    .to(s, { camZ: 19.8, camX: 0, duration: dur('modular') * 0.45 }, at('modular'))
    // Blueprint leads the theme flip. If the solids are still visible when the
    // background goes light they wash out into it for a beat.
    .to(s, { blueprint: 1, duration: dur('modular') * 0.1 }, at('modular') + dur('modular') * 0.2)
    .to(s, { theme: 1, duration: dur('modular') * 0.1 }, at('modular') + dur('modular') * 0.24)
    .to(
      s,
      { explode: 1.3, rotY: -0.34, rotX: -0.26, duration: dur('modular') * 0.8 },
      at('modular') + dur('modular') * 0.2,
    )

  // --- OUTRO — settle back to the assembled hero pose ----------------------
  tl.to(
    s,
    {
      explode: 0,
      blueprint: 0,
      theme: 0,
      camX: 0,
      duration: dur('outro') * 0.14,
    },
    at('outro'),
  ).to(
    s,
    { camZ: 13.6, rotX: -0.05, rotY: 0, duration: dur('outro') * 0.6 },
    at('outro'),
  )

  return tl
}
