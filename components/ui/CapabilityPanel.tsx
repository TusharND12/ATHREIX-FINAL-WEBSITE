'use client'

import { useEffect, useState } from 'react'
import { ACT_RANGE } from '@/lib/acts'
import { sceneState } from '@/components/core/sceneState'
import { RetrievalDemo } from './demos/RetrievalDemo'
import { InferenceDemo } from './demos/InferenceDemo'
import { GuardrailsDemo } from './demos/GuardrailsDemo'

/**
 * The capability readouts.
 *
 * The field has no screen to project onto, so the demos live in an instrument
 * panel of their own, sitting opposite the copy. Only the active one is
 * mounted: each runs an infinite GSAP timeline, and mounting all three would
 * leave two animating off-screen forever.
 */
const DEMOS = [
  { id: 'retrieve', label: 'kNN retrieval', Component: RetrievalDemo },
  { id: 'reason', label: 'Routing / cache', Component: InferenceDemo },
  { id: 'guardrails', label: 'Policy gate', Component: GuardrailsDemo },
] as const

export function CapabilityPanel() {
  const [active, setActive] = useState(-1)

  useEffect(() => {
    let raf = 0
    let last = -1
    const tick = () => {
      const p = sceneState.progress
      let next = -1
      for (let i = 0; i < DEMOS.length; i++) {
        const r = ACT_RANGE[DEMOS[i].id]
        if (r && p >= r.start && p < r.end) {
          next = i
          break
        }
      }
      // Guarded so React re-renders three times over the page, not 60x a second.
      if (next !== last) {
        last = next
        setActive(next)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const entry = active >= 0 ? DEMOS[active] : null

  return (
    <div
      className="pointer-events-none fixed right-6 top-1/2 z-20 hidden -translate-y-1/2 lg:block"
      style={{ opacity: 'var(--panel-in, 0)', transition: 'opacity 320ms linear' }}
      aria-hidden="true"
    >
      <div className="panel w-[330px] p-3">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="label" style={{ color: 'var(--accent)' }}>
            {entry?.label ?? ''}
          </span>
          <span className="label" style={{ color: 'var(--muted)' }}>
            live
          </span>
        </div>
        <div className="aspect-square w-full">
          {entry && (
            <div key={entry.id} className="h-full w-full animate-[fadeIn_500ms_ease-out]">
              <entry.Component />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
