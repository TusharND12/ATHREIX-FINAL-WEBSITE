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
 * The copy is real text in the DOM, not painted into the canvas — the page must
 * read correctly with JS animation off.
 */
export function Section({ act, index }: { act: Act; index: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const panel = el.querySelector('[data-panel]')
    if (!panel) return

    const ctx = gsap.context(() => {
      const lines = el.querySelectorAll('[data-line]')

      // Headline lines rise out of their masks. At this type size a rise reads
      // as intent; a plain fade reads as a page that has not finished loading.
      if (lines.length) {
        gsap.fromTo(
          lines,
          { yPercent: 108 },
          {
            yPercent: 0,
            ease: 'expo.out',
            duration: 1.1,
            stagger: 0.075,
            scrollTrigger: { trigger: el, start: 'top 68%' },
          },
        )
      }

      gsap.fromTo(
        panel,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 78%', end: 'top 30%', scrub: true },
        },
      )
      gsap.to(panel, {
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'bottom 72%', end: 'bottom 26%', scrub: true },
      })

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
  const lines = act.title?.split('\n') ?? []

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
            className="relative z-10 w-full max-w-[27rem] px-6 md:px-12 lg:max-w-[33rem]"
          >
            <div className="mb-5 flex items-center gap-3">
              <span
                className="h-px w-8"
                style={{ background: 'var(--accent)' }}
                aria-hidden="true"
              />
              <span className="label" style={{ color: 'var(--accent)' }}>
                {act.eyebrow ?? String(index + 1).padStart(2, '0')}
              </span>
            </div>

            {lines.length > 0 && (
              <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
                {lines.map((line, i) => (
                  <span key={i} className="line-mask">
                    <span
                      data-line
                      className="line-inner"
                      style={{ color: act.eyebrow ? 'var(--accent)' : 'var(--fg)' }}
                    >
                      {line}
                    </span>
                  </span>
                ))}
              </h2>
            )}

            {act.body && (
              <p
                className="mt-6 max-w-[38ch] text-[15px] leading-[1.65]"
                style={{ color: 'var(--muted)' }}
              >
                {act.body}
              </p>
            )}

            {act.cta && (
              <a
                href={act.cta.href}
                className="panel mt-8 inline-flex items-center gap-2.5 px-5 py-3 text-[14px] font-medium transition-transform hover:-translate-y-0.5"
              >
                {act.cta.label}
                <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
                  &rarr;
                </span>
              </a>
            )}

            <div
              data-bar
              className="mt-9 h-px w-44 origin-left"
              style={{ background: 'var(--accent)' }}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </section>
  )
}
