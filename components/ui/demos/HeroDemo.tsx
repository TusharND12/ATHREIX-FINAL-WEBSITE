'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * HERO — a live signal readout, running from the first frame.
 *
 * Not a loop of canned keyframes: the radial activation ring and the token
 * waveform are evaluated from summed sine waves every frame, so the motion
 * never repeats exactly and the object reads as something running rather than
 * something playing back.
 *
 * Driven by rAF writing SVG attributes directly rather than ~110 individual
 * GSAP tweens. At this element count that difference is the whole frame budget.
 */
const TICKS = 64
const BARS = 44

const TICK_R0 = 62
const TICK_R1 = 78

// Precomputed unit vectors — trig for 64 ticks every frame is pure waste.
const TICK_GEO = Array.from({ length: TICKS }, (_, i) => {
  const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2
  return { cos: Math.cos(a), sin: Math.sin(a) }
})

const READOUTS = [
  ['THROUGHPUT', '1,284', 'tok/s'],
  ['CONTEXT', '128', 'K'],
  ['P95', '41', 'ms'],
  ['UPTIME', '99.98', '%'],
]

export function HeroDemo() {
  const root = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return

    const ticks = Array.from(el.querySelectorAll<SVGLineElement>('[data-tick]'))
    const bars = Array.from(el.querySelectorAll<SVGLineElement>('[data-bar]'))
    const t0 = performance.now()
    let raf = 0

    const loop = () => {
      const t = (performance.now() - t0) / 1000

      // Activation ring. Two incommensurate frequencies per tick, so the
      // pattern drifts instead of visibly cycling.
      for (let i = 0; i < ticks.length; i++) {
        const a = i / TICKS
        const v =
          0.3 +
          0.7 *
            Math.abs(
              Math.sin(t * 1.15 + a * Math.PI * 8) * Math.sin(t * 0.41 + a * Math.PI * 2.6),
            )
        const g = TICK_GEO[i]
        const r = TICK_R0 + (TICK_R1 - TICK_R0) * v
        ticks[i].setAttribute('x2', String(100 + g.cos * r))
        ticks[i].setAttribute('y2', String(100 + g.sin * r))
        ticks[i].setAttribute('opacity', String(0.3 + 0.7 * v))
      }

      // Token waveform. An envelope keeps the ends short so it reads as a
      // signal sitting inside the lens rather than a bar chart hitting the edge.
      for (let i = 0; i < bars.length; i++) {
        const a = i / (BARS - 1)
        const env = Math.sin(a * Math.PI) ** 0.7
        const v =
          Math.sin(t * 2.1 + a * 9.2) * 0.5 +
          Math.sin(t * 1.3 - a * 5.1) * 0.32 +
          Math.sin(t * 3.7 + a * 2.2) * 0.18
        const h = 2 + Math.abs(v) * 34 * env
        bars[i].setAttribute('y1', String(100 - h))
        bars[i].setAttribute('y2', String(100 + h))
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const ctx = gsap.context(() => {
      // Inference pulses leaving the core.
      gsap.fromTo(
        '[data-pulse]',
        { attr: { r: 8 }, opacity: 0.55 },
        {
          attr: { r: 58 },
          opacity: 0,
          duration: 2.6,
          ease: 'power2.out',
          repeat: -1,
          stagger: { each: 0.87, repeat: -1 },
        },
      )

      gsap.to('[data-scan]', {
        rotation: 360,
        transformOrigin: '100px 100px',
        duration: 9,
        ease: 'none',
        repeat: -1,
      })

      gsap.to('[data-core]', {
        attr: { r: 4.6 },
        duration: 0.9,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      })

      // Cycle the readout.
      const tl = gsap.timeline({ repeat: -1 })
      READOUTS.forEach((r, i) => {
        tl.to('[data-readout]', {
          opacity: 0,
          duration: 0.25,
          onComplete: () => {
            const label = el.querySelector('[data-ro-label]')
            const value = el.querySelector('[data-ro-value]')
            const unit = el.querySelector('[data-ro-unit]')
            if (label) label.textContent = r[0]
            if (value) value.textContent = r[1]
            if (unit) unit.textContent = r[2]
          },
        })
          .to('[data-readout]', { opacity: 1, duration: 0.3 })
          .to({}, { duration: i === READOUTS.length - 1 ? 1.6 : 1.6 })
      })
    }, el)

    return () => {
      cancelAnimationFrame(raf)
      ctx.revert()
    }
  }, [])

  return (
    <svg ref={root} viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      {/* activation ring */}
      {TICK_GEO.map((g, i) => (
        <line
          key={i}
          data-tick
          x1={100 + g.cos * TICK_R0}
          y1={100 + g.sin * TICK_R0}
          x2={100 + g.cos * TICK_R1}
          y2={100 + g.sin * TICK_R1}
          stroke="var(--accent)"
          strokeWidth={1.7}
          strokeLinecap="round"
          opacity={0.4}
        />
      ))}

      {/* inner guide rings */}
      <circle cx={100} cy={100} r={57} fill="none" stroke="var(--fg)" strokeWidth={0.35} opacity={0.1} />
      <circle cx={100} cy={100} r={40} fill="none" stroke="var(--fg)" strokeWidth={0.35} opacity={0.07} />

      {/* rotating scan */}
      <g data-scan>
        <line x1={100} y1={100} x2={100} y2={44} stroke="var(--accent)" strokeWidth={0.6} opacity={0.35} />
        <circle cx={100} cy={44} r={1.6} fill="var(--accent)" opacity={0.8} />
      </g>

      {/* inference pulses */}
      {[0, 1, 2].map((i) => (
        <circle key={i} data-pulse cx={100} cy={100} r={8} fill="none" stroke="var(--accent)" strokeWidth={0.7} opacity={0} />
      ))}

      {/* token waveform */}
      {Array.from({ length: BARS }, (_, i) => {
        const x = 100 + (i - (BARS - 1) / 2) * 2.15
        return (
          <line
            key={i}
            data-bar
            x1={x}
            y1={96}
            x2={x}
            y2={104}
            stroke="var(--accent)"
            strokeWidth={1.8}
            strokeLinecap="round"
            opacity={0.9}
          />
        )
      })}

      {/* core */}
      <circle data-core cx={100} cy={100} r={3.4} fill="var(--accent)" />

      {/* live readout */}
      <g data-readout>
        <text
          data-ro-label
          x={100}
          y={148}
          textAnchor="middle"
          fill="var(--muted)"
          style={{ fontFamily: 'var(--font-code)', fontSize: '5px', letterSpacing: '0.2em' }}
        >
          THROUGHPUT
        </text>
        <text
          x={100}
          y={160}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-code)', fontSize: '9px' }}
        >
          <tspan data-ro-value fill="var(--fg)">
            1,284
          </tspan>
          <tspan data-ro-unit fill="var(--muted)" dx="3" style={{ fontSize: '5px' }}>
            tok/s
          </tspan>
        </text>
      </g>
    </svg>
  )
}
