'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { invalidate } from '@react-three/fiber'
import { buildTimeline } from './core/timeline'
import { sceneState } from './core/sceneState'
import { ACTS, ACT_RANGE } from '@/lib/acts'

gsap.registerPlugin(ScrollTrigger)

/**
 * Accent colour is interpolated across act boundaries rather than swapped, so
 * the heading, the scrubber playhead and (later) the aperture ring all sweep
 * from one section's colour to the next instead of blinking.
 */
function accentAt(p: number): string {
  for (let i = 0; i < ACTS.length; i++) {
    const { start, end } = ACT_RANGE[ACTS[i].id]
    if (p > end) continue
    const next = ACTS[i + 1] ?? ACTS[i]
    // Blend over the last 25% of each act into the next one's colour.
    const local = (p - start) / (end - start)
    const t = Math.max(0, (local - 0.75) / 0.25)
    return gsap.utils.interpolate(ACTS[i].accent, next.accent, t) as string
  }
  return ACTS[ACTS.length - 1].accent
}

/**
 * Wires Lenis (inertial scroll) to ScrollTrigger (pinning + scrub) to the
 * master timeline. This is the whole mechanism: scroll → progress → timeline.
 *
 * Honours prefers-reduced-motion by dropping the smoothing and the scrub lag,
 * so the page snaps between poses instead of animating between them.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cleanups: Array<() => void> = []

    // Always start at the top.
    //
    // The browser restores the previous scroll position asynchronously, after
    // this effect has already primed the timeline at progress 0 — so the page
    // and the choreography disagree about where we are, and the canvas can sit
    // blank until the first scroll input resyncs them.
    //
    // Beyond fixing that, landing someone in the middle of a scroll-driven
    // sequence on reload is the wrong behaviour for this kind of page: the acts
    // only make sense played in order from the start.
    const priorRestoration = history.scrollRestoration
    if (priorRestoration) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    cleanups.push(() => {
      if (priorRestoration) history.scrollRestoration = priorRestoration
    })

    if (!reduced) {
      const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.6 })
      const raf = (time: number) => lenis.raf(time * 1000)

      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)

      cleanups.push(() => {
        gsap.ticker.remove(raf)
        lenis.destroy()
      })
    }


    // The entrance. Long and slow on purpose — it is the first thing anyone
    // sees, and a field condensing out of nothing wants time to read.
    const intro = gsap.fromTo(
      sceneState,
      { introT: 0 },
      { introT: 1, duration: reduced ? 0.01 : 2.6, ease: 'power2.out' },
    )
    cleanups.push(() => intro.kill())

    const tl = buildTimeline()

    const st = ScrollTrigger.create({
      trigger: '#scroll-track',
      start: 'top top',
      end: 'bottom bottom',
      // The lag that makes the object feel like it has mass. Try 0.4 and 1.5
      // to feel the range; 0.8 is a good default for something this heavy.
      scrub: reduced ? false : 0.8,
      onUpdate: (self) => {
        sceneState.progress = self.progress
        tl.progress(self.progress)
        const root = document.documentElement.style
        root.setProperty('--sp', self.progress.toFixed(4))
        const accent = accentAt(self.progress)
        root.setProperty('--accent', accent)
        // The screen glow reads the accent from here, not from CSS.
        sceneState.accent = accent
        // Ask the demand-driven canvas for exactly one frame.
        invalidate()
      },
    })

    cleanups.push(() => {
      st.kill()
      tl.kill()
    })

    // Recompute trigger positions once the web fonts land.
    //
    // Headline reveals are one-shot fromTo tweens that set their hidden state
    // immediately and only clear it when their trigger fires. Trigger offsets
    // are measured at mount, but Space Grotesk arrives later and reflows every
    // section — so some triggers end up pointing at the wrong scroll position,
    // never fire, and their headline stays parked in its mask. (Seen live on
    // the Guardrails act: eyebrow and body present, h2 invisible.)
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => ScrollTrigger.refresh())
    }
    const refreshOnLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', refreshOnLoad)
    cleanups.push(() => window.removeEventListener('load', refreshOnLoad))

    // Prime the first frame so the hero is posed correctly before any scroll.
    // The rAF is insurance for the case where the canvas root has not finished
    // registering by the time this effect runs.
    tl.progress(0)
    invalidate()
    const primer = requestAnimationFrame(() => invalidate())
    cleanups.push(() => cancelAnimationFrame(primer))

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return null
}
