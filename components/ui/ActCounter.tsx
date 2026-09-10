'use client'

import { useEffect, useRef } from 'react'
import { ACTS, ACT_RANGE } from '@/lib/acts'
import { sceneState } from '@/components/core/sceneState'

/**
 * Bottom-left slide counter. Deliberately large and quiet — it gives the page a
 * sense of place ("four of ten") that a progress bar alone does not, and it is
 * the one piece of chrome that stays legible on a phone.
 */
export function ActCounter() {
  const numRef = useRef<HTMLSpanElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    let last = -1

    const tick = () => {
      const p = sceneState.progress
      let index = 0
      for (let i = 0; i < ACTS.length; i++) {
        if (p >= ACT_RANGE[ACTS[i].id].end) index = i + 1
      }
      index = Math.min(index, ACTS.length - 1)

      if (index !== last) {
        last = index
        if (numRef.current) numRef.current.textContent = String(index + 1).padStart(2, '0')
        if (nameRef.current) nameRef.current.textContent = ACTS[index].id.replace(/-/g, ' ')
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="fixed bottom-6 left-6 z-40 flex items-end gap-3 md:left-12" aria-hidden="true">
      <span
        ref={numRef}
        className="font-[family-name:var(--font-code)] text-[34px] leading-none tracking-[-0.04em]"
        style={{ color: 'var(--accent)' }}
      >
        01
      </span>
      <div className="mb-1 flex flex-col gap-1">
        <span className="label" style={{ color: 'var(--muted)' }}>
          / {String(ACTS.length).padStart(2, '0')}
        </span>
        <span ref={nameRef} className="label" style={{ color: 'var(--fg)' }}>
          hero
        </span>
      </div>
    </div>
  )
}
