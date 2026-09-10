'use client'

import { useEffect, useState } from 'react'
import { ACT_RANGE } from '@/lib/acts'
import { sceneState } from '@/components/core/sceneState'
import { HeroDemo } from './demos/HeroDemo'
import { RetrievalDemo } from './demos/RetrievalDemo'
import { InferenceDemo } from './demos/InferenceDemo'
import { GuardrailsDemo } from './demos/GuardrailsDemo'

/**
 * The DOM layer that renders on the laptop display.
 *
 * Position and size come from --st-x / --st-y / --st-w / --st-h, which Rig
 * writes each frame by projecting the laptop display into screen space —
 * nothing here is hardcoded, so it stays registered at any viewport size.
 *
 * Only the active capability's demo is mounted. That is not just tidiness: each
 * demo runs an infinite GSAP timeline, and mounting all three would leave two
 * of them animating off-screen forever.
 */
const DEMOS = [
  { id: 'hero', Component: HeroDemo },
  { id: 'cap-retrieval', Component: RetrievalDemo },
  { id: 'cap-inference', Component: InferenceDemo },
  { id: 'cap-guardrails', Component: GuardrailsDemo },
] as const

export function ApertureStage() {
  const [active, setActive] = useState(-1)

  useEffect(() => {
    let raf = 0
    let last = -1

    const tick = () => {
      const p = sceneState.progress
      let next = -1
      for (let i = 0; i < DEMOS.length; i++) {
        const r = ACT_RANGE[DEMOS[i].id]
        if (p >= r.start && p < r.end) {
          next = i
          break
        }
      }
      // Guarded so React re-renders three times over the whole page, not sixty
      // times a second.
      if (next !== last) {
        last = next
        setActive(next)
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const Active = active >= 0 ? DEMOS[active].Component : null

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-10"
      style={{
        transform:
          'translate(calc(var(--st-x, 50vw) - var(--st-w, 0px) / 2), calc(var(--st-y, 50vh) - var(--st-h, 0px) / 2))',
        width: 'var(--st-w, 0px)',
        height: 'var(--st-h, 0px)',
        opacity: 'var(--stage-in, 0)',
      }}
      aria-hidden="true"
    >
      <div className="relative h-full w-full overflow-hidden rounded-[3px]">
        {/* The demos are square (200x200 viewBox). The display is not, so the
            demo is sized off height and centred, leaving side gutters — which
            is exactly how a square readout would sit on a real screen. */}
        {Active && (
          <div
            key={DEMOS[active].id}
            className="absolute inset-y-[3%] left-1/2 aspect-square -translate-x-1/2 animate-[fadeIn_600ms_ease-out]"
          >
            <Active />
          </div>
        )}
      </div>
    </div>
  )
}
