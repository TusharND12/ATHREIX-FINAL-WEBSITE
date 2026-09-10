'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * GUARDRAILS — decisions passing a policy gate, and the audit trail it leaves.
 *
 * Calls descend through a policy checkpoint that sweeps continuously. Most pass
 * and continue; a minority are held, diverted, and written to an append-only
 * log with a content hash. The log filling up is the substance of the claim —
 * "every decision logged" is only credible if you can see the ledger.
 */
const LANES = [46, 62, 78, 94, 110]
const HELD = new Set([2, 7, 11])

const CALLS = Array.from({ length: 14 }, (_, i) => ({
  i,
  x: LANES[i % LANES.length],
  held: HELD.has(i % 13),
}))

/** Stable pseudo-hashes. Generated once at module scope so SSR matches. */
const HASHES = (() => {
  let s = 77003
  const hex = '0123456789abcdef'
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 6 }, () => {
      s = (s * 1664525 + 1013904223) >>> 0
      return hex[s % 16]
    }).join(''),
  )
})()

const GATE_Y = 104
const LOG_X = 132

export function GuardrailsDemo() {
  const root = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1 })

      // The gate sweeping, continuously and independently.
      gsap.fromTo(
        '[data-sweep]',
        { attr: { x1: 34, x2: 52 }, opacity: 0 },
        {
          attr: { x1: 106, x2: 124 },
          opacity: 1,
          duration: 1.5,
          ease: 'none',
          repeat: -1,
          yoyo: true,
        },
      )

      let logged = 0

      CALLS.forEach((c) => {
        const t = c.i * 0.42
        const sel = `[data-call="${c.i}"]`

        tl.set(sel, { opacity: 0, attr: { cx: c.x, cy: 40 } }, t)
          .to(sel, { opacity: 1, duration: 0.12 }, t)
          .to(sel, { attr: { cy: GATE_Y - 6 }, duration: 0.62, ease: 'none' }, t)

        if (c.held) {
          // Held at the gate, then diverted into the ledger.
          const row = logged++
          tl.to(sel, { attr: { r: 3.4 }, duration: 0.14, ease: 'back.out(3)' }, t + 0.62)
            .to(
              sel,
              { attr: { cx: LOG_X - 5, cy: 62 + row * 13 }, duration: 0.5, ease: 'power2.inOut' },
              t + 0.76,
            )
            .to(sel, { opacity: 0, duration: 0.2 }, t + 1.24)
            .to(`[data-log="${row}"]`, { opacity: 1, duration: 0.3 }, t + 1.18)
            .fromTo(
              '[data-flag]',
              { attr: { cx: c.x, cy: GATE_Y }, opacity: 0.9, scale: 1 },
              { opacity: 0, duration: 0.5, ease: 'power2.out' },
              t + 0.62,
            )
        } else {
          // Passes: a tick at the gate, then straight through.
          tl.to(sel, { attr: { cy: 168 }, duration: 0.7, ease: 'none' }, t + 0.62)
            .to(sel, { opacity: 0, duration: 0.2 }, t + 1.14)
            .fromTo(
              '[data-pass]',
              { attr: { cx: c.x, cy: GATE_Y }, opacity: 0.85 },
              { opacity: 0, duration: 0.45, ease: 'power2.out' },
              t + 0.62,
            )
        }
      })

      tl.to({}, { duration: 1.2 })
      tl.to('[data-log]', { opacity: 0, duration: 0.4 })
    }, el)

    return () => ctx.revert()
  }, [])

  return (
    <svg ref={root} viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      {/* lanes */}
      {LANES.map((x) => (
        <line
          key={x}
          x1={x}
          y1={40}
          x2={x}
          y2={168}
          stroke="var(--fg)"
          strokeWidth={0.35}
          opacity={0.12}
          strokeDasharray="2 4"
        />
      ))}

      {/* the policy gate */}
      <line x1={34} y1={GATE_Y} x2={124} y2={GATE_Y} stroke="var(--fg)" strokeWidth={0.5} opacity={0.3} />
      <line data-sweep x1={34} y1={GATE_Y} x2={52} y2={GATE_Y} stroke="var(--accent)" strokeWidth={1.6} />
      <text
        x={34}
        y={GATE_Y - 6}
        fill="var(--muted)"
        style={{ fontFamily: 'var(--font-code)', fontSize: '4.6px', letterSpacing: '0.16em' }}
      >
        POLICY
      </text>

      {/* calls in flight */}
      {CALLS.map((c) => (
        <circle
          key={c.i}
          data-call={c.i}
          cx={c.x}
          cy={40}
          r={2.2}
          fill={c.held ? 'var(--fg)' : 'var(--accent)'}
          opacity={0}
        />
      ))}

      {/* gate feedback markers */}
      <circle data-pass cx={0} cy={GATE_Y} r={5.5} fill="none" stroke="var(--accent)" strokeWidth={0.8} opacity={0} />
      <circle data-flag cx={0} cy={GATE_Y} r={6.5} fill="none" stroke="var(--fg)" strokeWidth={0.9} opacity={0} />

      {/* the ledger */}
      <text
        x={LOG_X}
        y={48}
        fill="var(--muted)"
        style={{ fontFamily: 'var(--font-code)', fontSize: '4.6px', letterSpacing: '0.16em' }}
      >
        AUDIT LOG
      </text>
      <line x1={LOG_X} y1={52} x2={LOG_X + 36} y2={52} stroke="var(--fg)" strokeWidth={0.35} opacity={0.22} />

      {HASHES.map((h, r) => (
        <g key={h} data-log={r} opacity={0}>
          <rect x={LOG_X} y={57 + r * 13} width={36} height={9} rx={1.5} fill="var(--fg)" opacity={0.07} />
          <circle cx={LOG_X + 4} cy={61.5 + r * 13} r={1.3} fill="var(--accent)" />
          <text
            x={LOG_X + 8}
            y={63.5 + r * 13}
            fill="var(--fg)"
            opacity={0.75}
            style={{ fontFamily: 'var(--font-code)', fontSize: '5px' }}
          >
            {h}
          </text>
        </g>
      ))}
    </svg>
  )
}
