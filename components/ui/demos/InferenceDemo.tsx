'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * INFERENCE — routing and caching holding latency flat as volume climbs.
 *
 * Requests arrive from the left at an accelerating rate, hit a router, and are
 * sent down one of three lanes: a cache hit that returns almost instantly, a
 * small distilled model, or the full model. Underneath, throughput climbs while
 * the p95 latency trace stays flat — which is the entire claim the section
 * makes, drawn rather than asserted.
 */
const LANES = [
  { y: 62, label: 'cache', speed: 0.42, share: 0.5 },
  { y: 84, label: 'small', speed: 0.78, share: 0.32 },
  { y: 106, label: 'large', speed: 1.25, share: 0.18 },
]

const X_IN = 34
const X_ROUTER = 74
const X_OUT = 166

/** Which lane a given request index takes — deterministic, roughly by share. */
function laneFor(i: number) {
  const r = ((i * 2654435761) % 100) / 100
  if (r < LANES[0].share) return 0
  if (r < LANES[0].share + LANES[1].share) return 1
  return 2
}

const PACKETS = Array.from({ length: 22 }, (_, i) => ({ i, lane: laneFor(i) }))

export function InferenceDemo() {
  const root = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1 })

      PACKETS.forEach((p) => {
        const lane = LANES[p.lane]
        // Arrival interval tightens as the loop progresses: volume climbing.
        const t = p.i * 0.22 - p.i * p.i * 0.0035
        const sel = `[data-pkt="${p.i}"]`

        tl.set(sel, { opacity: 0, attr: { cx: X_IN, cy: 84 } }, t)
          .to(sel, { opacity: 1, duration: 0.1 }, t)
          // in to the router
          .to(sel, { attr: { cx: X_ROUTER, cy: 84 }, duration: 0.34, ease: 'none' }, t)
          // fan out to its lane
          .to(sel, { attr: { cy: lane.y }, duration: 0.16, ease: 'power2.inOut' }, t + 0.34)
          // and across — lane speed is the whole point
          .to(sel, { attr: { cx: X_OUT }, duration: lane.speed, ease: 'none' }, t + 0.42)
          .to(sel, { opacity: 0, duration: 0.14 }, t + 0.42 + lane.speed)
      })

      // Router pulses on each arrival.
      PACKETS.forEach((p) => {
        const t = p.i * 0.22 - p.i * p.i * 0.0035 + 0.3
        tl.fromTo(
          '[data-router-ring]',
          { attr: { r: 5 }, opacity: 0.8 },
          { attr: { r: 12 }, opacity: 0, duration: 0.45, ease: 'power2.out' },
          t,
        )
      })

      // Throughput rises; latency does not.
      tl.fromTo(
        '[data-throughput]',
        { attr: { width: 2 } },
        { attr: { width: 56 }, duration: 4.4, ease: 'power1.in' },
        0,
      )
      const rps = { v: 120 }
      tl.to(
        rps,
        {
          v: 4800,
          duration: 4.4,
          ease: 'power1.in',
          onUpdate: () => {
            const node = el.querySelector('[data-rps]')
            if (node) node.textContent = String(Math.round(rps.v / 20) * 20)
          },
        },
        0,
      )

      tl.to({}, { duration: 0.8 })
    }, el)

    return () => ctx.revert()
  }, [])

  return (
    <svg ref={root} viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      {/* lanes */}
      {LANES.map((l) => (
        <g key={l.label}>
          <line
            x1={X_ROUTER}
            y1={l.y}
            x2={X_OUT}
            y2={l.y}
            stroke="var(--fg)"
            strokeWidth={0.4}
            opacity={0.16}
            strokeDasharray="2 3"
          />
          <text
            x={X_OUT + 4}
            y={l.y + 2}
            fill="var(--muted)"
            style={{ fontFamily: 'var(--font-code)', fontSize: '5px' }}
          >
            {l.label}
          </text>
        </g>
      ))}

      {/* inbound */}
      <line
        x1={X_IN}
        y1={84}
        x2={X_ROUTER}
        y2={84}
        stroke="var(--fg)"
        strokeWidth={0.4}
        opacity={0.16}
        strokeDasharray="2 3"
      />

      {/* router */}
      <circle data-router-ring cx={X_ROUTER} cy={84} r={5} fill="none" stroke="var(--accent)" strokeWidth={0.7} opacity={0} />
      <circle cx={X_ROUTER} cy={84} r={4.6} fill="none" stroke="var(--accent)" strokeWidth={0.9} />
      <circle cx={X_ROUTER} cy={84} r={1.7} fill="var(--accent)" />

      {/* requests */}
      {PACKETS.map((p) => (
        <circle key={p.i} data-pkt={p.i} cx={X_IN} cy={84} r={1.9} fill="var(--accent)" opacity={0} />
      ))}

      {/* readouts */}
      <g>
        <text x={34} y={140} fill="var(--muted)" style={{ fontFamily: 'var(--font-code)', fontSize: '5px', letterSpacing: '0.14em' }}>
          THROUGHPUT
        </text>
        <rect x={34} y={144} width={56} height={2.4} rx={1.2} fill="var(--fg)" opacity={0.14} />
        <rect data-throughput x={34} y={144} width={2} height={2.4} rx={1.2} fill="var(--accent)" />
        <text data-rps x={34} y={158} fill="var(--fg)" style={{ fontFamily: 'var(--font-code)', fontSize: '7px' }}>
          120
        </text>
        <text x={62} y={158} fill="var(--muted)" style={{ fontFamily: 'var(--font-code)', fontSize: '5px' }}>
          req/s
        </text>
      </g>

      <g>
        <text x={112} y={140} fill="var(--muted)" style={{ fontFamily: 'var(--font-code)', fontSize: '5px', letterSpacing: '0.14em' }}>
          P95 LATENCY
        </text>
        {/* Deliberately flat. The line not moving is the point. */}
        <path
          d="M112 149 L128 148.4 L140 149.4 L152 148.6 L166 149"
          fill="none"
          stroke="var(--accent)"
          strokeWidth={0.9}
        />
        <text x={112} y={158} fill="var(--fg)" style={{ fontFamily: 'var(--font-code)', fontSize: '7px' }}>
          41
        </text>
        <text x={126} y={158} fill="var(--muted)" style={{ fontFamily: 'var(--font-code)', fontSize: '5px' }}>
          ms
        </text>
      </g>
    </svg>
  )
}
