'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Act } from '@/lib/acts'

gsap.registerPlugin(ScrollTrigger)

/**
 * One act's DOM. The text column pins for the whole act while the 3D
 * choreography for that act plays out behind it, then hands off to the next.
 *
 * The copy is real text in the DOM, not painted into the canvas — the page
 * must read correctly with JS animation off.
 */
export function Section({ act }: { act: Act }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const panel = el.querySelector('[data-panel]')
    if (!panel) return

    const ctx = gsap.context(() => {
      // Fade the text in at the top of the act and out at the bottom, so
      // consecutive pinned panels cross-dissolve instead of hard-cutting.
      gsap.fromTo(
        panel,
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 75%', end: 'top 25%', scrub: true },
        },
      )
      gsap.to(panel, {
        autoAlpha: 0,
        y: -24,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'bottom 75%', end: 'bottom 25%', scrub: true },
      })

      // Progress bar under the copy — how far through this act you are.
      const bar = el.querySelector('[data-bar]')
      if (bar) {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: true },
          },
        )
      }
    }, el)

    return () => ctx.revert()
  }, [])

  const hasCopy = Boolean(act.title || act.body)

  return (
    <section
      ref={ref}
      id={act.id}
      data-act={act.id}
      style={{ height: `${act.vh}vh` }}
      className="relative"
    >
      <div className="sticky top-0 flex h-screen items-center">
        {hasCopy && (
          <div
            data-panel
            className="relative z-10 w-full max-w-[26rem] px-6 md:px-14 lg:max-w-[30rem]"
          >
            {act.eyebrow && (
              <p
                className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em]"
                style={{ color: 'var(--accent)' }}
              >
                {act.eyebrow}
              </p>
            )}
            {act.title && (
              <h2
                className="whitespace-pre-line text-[clamp(2rem,4.4vw,3.4rem)] font-semibold leading-[1.06] tracking-[-0.02em]"
                style={{ color: act.eyebrow ? 'var(--accent)' : 'var(--fg)' }}
              >
                {act.title}
              </h2>
            )}
            {act.body && (
              <p
                className="mt-5 max-w-[34ch] text-[15px] leading-relaxed"
                style={{ color: 'var(--muted)' }}
              >
                {act.body}
              </p>
            )}
            <div
              data-bar
              className="mt-8 h-px w-40 origin-left"
              style={{ background: 'var(--accent)' }}
            />
          </div>
        )}
      </div>
    </section>
  )
}
