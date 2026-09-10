'use client'

import { useEffect, useRef } from 'react'
import { ACTS, ACT_RANGE } from '@/lib/acts'
import { sceneState } from '@/components/core/sceneState'

const TICKS = 64

/**
 * The instrument panel, bottom-right.
 *
 * It reads the same sceneState the field does, so these are the actual morph
 * weights driving the cloud — not a decorative animation that happens to look
 * busy. Watching noise fall as cluster rises is watching the page's mechanism,
 * and while building it is the fastest way to see whether a beat lands on the
 * section it belongs to.
 *
 * Updates are written straight to the DOM from a rAF loop. Putting a 60Hz
 * counter in React state would re-render this subtree every frame for nothing.
 */
export function Telemetry() {
  const actRef = useRef<HTMLSpanElement>(null)
  const idxRef = useRef<HTMLSpanElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    let lastAct = -1

    const tick = () => {
      const p = sceneState.progress

      // Which act are we in?
      let index = 0
      for (let i = 0; i < ACTS.length; i++) {
        const r = ACT_RANGE[ACTS[i].id]
        if (p >= r.start && p < r.end) {
          index = i
          break
        }
        if (p >= r.end) index = i
      }

      if (index !== lastAct) {
        lastAct = index
        if (actRef.current) actRef.current.textContent = ACTS[index].id.replace(/-/g, ' ')
        if (idxRef.current)
          idxRef.current.textContent = `${String(index + 1).padStart(2, '0')} / ${ACTS.length}`
      }

      if (pctRef.current) pctRef.current.textContent = `${(p * 100).toFixed(1)}%`

      // Live channel meters, straight off the values the scene is using.
      const bars = barsRef.current
      if (bars) {
        const vals = [
          sceneState.wNoise,
          sceneState.wCluster,
          sceneState.wManifold,
          sceneState.wGlyph,
          sceneState.wStream,
        ]
        for (let i = 0; i < vals.length; i++) {
          const el = bars.children[i]?.querySelector<HTMLElement>('[data-fill]')
          if (el) el.style.transform = `scaleX(${Math.min(1, Math.max(0, vals[i]))})`
        }
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <aside className="panel fixed bottom-6 right-6 z-40 hidden w-[268px] p-3.5 md:block">
      <div className="mb-3 flex items-baseline justify-between">
        <span ref={actRef} className="label" style={{ color: 'var(--accent)' }}>
          hero
        </span>
        <span ref={idxRef} className="readout" style={{ color: 'var(--muted)' }}>
          01 / {ACTS.length}
        </span>
      </div>

      {/* Channel meters — the three scalars that drive the whole page. */}
      <div ref={barsRef} className="mb-3 space-y-[5px]">
        {['noise', 'cluster', 'manifold', 'glyph', 'stream'].map((name) => (
          <div key={name} className="flex items-center gap-2.5">
            <span className="readout w-[52px] shrink-0" style={{ color: 'var(--muted)' }}>
              {name}
            </span>
            <span
              className="relative h-[3px] flex-1 overflow-hidden rounded-full"
              style={{ background: 'var(--hairline)' }}
            >
              <span
                data-fill
                className="absolute inset-0 origin-left rounded-full"
                style={{ background: 'var(--accent)', transform: 'scaleX(0)' }}
              />
            </span>
          </div>
        ))}
      </div>

      {/* Timeline strip. Tall ticks are act boundaries. */}
      <div className="relative flex h-7 items-center gap-[2px]">
        {Array.from({ length: TICKS }, (_, i) => {
          const bound = ACTS.some(
            (a) => Math.round(ACT_RANGE[a.id].start * TICKS) === i,
          )
          return (
            <span
              key={i}
              className="flex-1"
              style={{
                height: bound ? '13px' : '6px',
                background: `color-mix(in srgb, var(--fg) ${bound ? 40 : 18}%, transparent)`,
              }}
            />
          )
        })}
        <span
          className="pointer-events-none absolute top-1/2 h-[15px] w-[2px] -translate-y-1/2 rounded-full"
          style={{
            left: 'calc(var(--sp, 0) * 100%)',
            background: 'var(--accent)',
            boxShadow: '0 0 10px var(--accent)',
          }}
          aria-hidden="true"
        />
      </div>

      <div
        className="mt-3 flex items-center justify-between border-t pt-2.5"
        style={{ borderColor: 'var(--hairline)' }}
      >
        <span className="label" style={{ color: 'var(--muted)' }}>
          Scroll
        </span>
        <span ref={pctRef} className="readout" style={{ color: 'var(--fg)' }}>
          0.0%
        </span>
      </div>
    </aside>
  )
}
