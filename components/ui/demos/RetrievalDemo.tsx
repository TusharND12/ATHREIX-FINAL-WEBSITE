'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * RETRIEVAL — k-nearest-neighbour search in an embedding space.
 *
 * A query lands in the middle of a corpus, a similarity radius grows outward,
 * documents ping as the frontier reaches them, and the top-k get pulled into
 * the result set with their scores. That is literally what vector search does,
 * and it is legible in about two seconds without a caption.
 *
 * Positions are generated from a fixed seed at module scope, never Math.random
 * during render — otherwise server and client disagree and React throws a
 * hydration mismatch.
 */
const CORPUS = (() => {
  let s = 20240917
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  return Array.from({ length: 58 }, (_, i) => {
    // sqrt() keeps the scatter uniform by area; without it everything crowds
    // into the middle and there is nothing to search through.
    const r = 84 * Math.sqrt(rnd())
    const a = rnd() * Math.PI * 2
    return { i, x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a), d: r }
  })
})()

const TOP_K = [...CORPUS].sort((a, b) => a.d - b.d).slice(0, 5)
const TOP_SET = new Set(TOP_K.map((p) => p.i))

export function RetrievalDemo() {
  const root = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 })

      tl.set('[data-hit]', { opacity: 0, scale: 0 })
        .set('[data-link]', { attr: { x2: 100, y2: 100 }, opacity: 0 })
        .set('[data-score]', { opacity: 0 })
        .set('[data-doc]', { opacity: 0.28 })

      // The similarity frontier sweeping outward.
      tl.fromTo(
        '[data-radius]',
        { attr: { r: 3 }, opacity: 0.9 },
        { attr: { r: 88 }, opacity: 0, duration: 1.5, ease: 'power2.out' },
        0,
      )

      // Each document lights as the frontier passes it — so the delay is its
      // actual distance, not an arbitrary stagger.
      CORPUS.forEach((p) => {
        const t = (p.d / 88) * 1.5
        tl.to(`[data-doc="${p.i}"]`, { opacity: 0.85, duration: 0.12 }, t).to(
          `[data-doc="${p.i}"]`,
          { opacity: TOP_SET.has(p.i) ? 1 : 0.22, duration: 0.45 },
          t + 0.12,
        )
      })

      // Results resolve: links draw back to the query, rings and scores appear.
      TOP_K.forEach((p, k) => {
        const t = 1.5 + k * 0.09
        tl.to('[data-link="' + k + '"]', { opacity: 0.55, duration: 0.1 }, t)
          .to(
            '[data-link="' + k + '"]',
            { attr: { x2: p.x, y2: p.y }, duration: 0.42, ease: 'power3.out' },
            t,
          )
          .to(
            '[data-hit="' + k + '"]',
            { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' },
            t + 0.1,
          )
          .to('[data-score="' + k + '"]', { opacity: 1, duration: 0.3 }, t + 0.22)
      })

      // Hold on the result, then clear for the next query.
      tl.to({}, { duration: 1.5 })
      tl.to(['[data-hit]', '[data-link]', '[data-score]'], {
        opacity: 0,
        duration: 0.4,
      })
    }, el)

    return () => ctx.revert()
  }, [])

  return (
    <svg ref={root} viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      {/* corpus */}
      {CORPUS.map((p) => (
        <circle
          key={p.i}
          data-doc={p.i}
          cx={p.x}
          cy={p.y}
          r={TOP_SET.has(p.i) ? 2.1 : 1.5}
          fill="var(--fg)"
          opacity={0.28}
        />
      ))}

      {/* links from query to results */}
      {TOP_K.map((_, k) => (
        <line
          key={k}
          data-link={k}
          x1={100}
          y1={100}
          x2={100}
          y2={100}
          stroke="var(--accent)"
          strokeWidth={0.6}
          opacity={0}
        />
      ))}

      {/* result rings */}
      {TOP_K.map((p, k) => (
        <g key={k} data-hit={k} opacity={0} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
          <circle cx={p.x} cy={p.y} r={5} fill="none" stroke="var(--accent)" strokeWidth={0.9} />
          <circle cx={p.x} cy={p.y} r={2.1} fill="var(--accent)" />
        </g>
      ))}

      {/* similarity scores — descending, as a real ranking would be */}
      {TOP_K.map((p, k) => (
        <text
          key={k}
          data-score={k}
          x={p.x + 7.5}
          y={p.y + 2.2}
          fill="var(--accent)"
          opacity={0}
          style={{ fontFamily: 'var(--font-code)', fontSize: '5.4px' }}
        >
          {(0.97 - k * 0.06).toFixed(2)}
        </text>
      ))}

      {/* the expanding similarity frontier */}
      <circle
        data-radius
        cx={100}
        cy={100}
        r={3}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={0.8}
      />

      {/* the query itself */}
      <g>
        <circle cx={100} cy={100} r={3.4} fill="var(--accent)" />
        <circle cx={100} cy={100} r={7} fill="none" stroke="var(--accent)" strokeWidth={0.5} opacity={0.5} />
      </g>
    </svg>
  )
}
