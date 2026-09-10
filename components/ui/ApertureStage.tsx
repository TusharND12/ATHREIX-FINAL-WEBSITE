'use client'

import { useEffect, useState } from 'react'
import { ACT_RANGE } from '@/lib/acts'
import { sceneState } from '@/components/core/sceneState'
import { RetrievalDemo } from './demos/RetrievalDemo'
import { InferenceDemo } from './demos/InferenceDemo'
import { GuardrailsDemo } from './demos/GuardrailsDemo'

/**
 * The DOM layer that sits inside the 3D aperture.
 *
 * Position and radius come from --ap-x / --ap-y / --ap-r, which Rig writes each
 * frame by projecting the aperture ring into screen space — nothing here is
 * hardcoded, so it stays registered at any viewport size.
 *
 * Only the active capability's demo is mounted. That is not just tidiness: each
 * demo runs an infinite GSAP timeline, and mounting all three would leave two
 * of them animating off-screen forever.
 */
const DEMOS = [
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
          'translate(calc(var(--ap-x, 50vw) - var(--ap-r, 0px)), calc(var(--ap-y, 50vh) - var(--ap-r, 0px)))',
        width: 'calc(var(--ap-r, 0px) * 2)',
        height: 'calc(var(--ap-r, 0px) * 2)',
        opacity: 'var(--stage-in, 0)',
      }}
      aria-hidden="true"
    >
      <div className="relative h-full w-full overflow-hidden rounded-full">
        {/* Inner hairline, just inside the 3D ring, to seat the demo in the lens. */}
        <div
          className="absolute inset-[6%] rounded-full"
          style={{ border: '1px solid color-mix(in srgb, var(--fg) 10%, transparent)' }}
        />

        {/* The demos are drawn in a 200-unit box whose content spans roughly
            30–170. Inset so that content clears the circular edge rather than
            being clipped by it. */}
        {Active && (
          <div
            key={DEMOS[active].id}
            className="absolute inset-[3%] animate-[fadeIn_600ms_ease-out]"
          >
            <Active />
          </div>
        )}
      </div>
    </div>
  )
}
