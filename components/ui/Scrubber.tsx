'use client'

import { ACTS, TOTAL_VH } from '@/lib/acts'

/**
 * The timeline scrubber, bottom-right. Reads --sp (scroll progress 0..1),
 * which SmoothScroll writes on every scroll update.
 *
 * It is not decoration: while building the choreography it is the fastest way
 * to see which act you are in and whether the pacing in lib/acts.ts is right.
 * The taller ticks are act boundaries, so you can watch the 3D beats land (or
 * not land) on the section they belong to.
 */
const TICKS = 60

export function Scrubber() {
  // Act boundaries as fractions, used to mark the strip.
  const bounds = new Set<number>()
  let cursor = 0
  for (const a of ACTS) {
    bounds.add(Math.round((cursor / TOTAL_VH) * TICKS))
    cursor += a.vh
  }

  return (
    <div className="fixed bottom-6 right-6 z-20 hidden select-none md:block">
      <div
        className="relative flex h-9 items-center gap-[3px] rounded-md px-2"
        style={{ background: 'color-mix(in srgb, var(--fg) 8%, transparent)' }}
      >
        {Array.from({ length: TICKS }, (_, i) => (
          <span
            key={i}
            className="w-px"
            style={{
              height: bounds.has(i) ? '16px' : '8px',
              background: `color-mix(in srgb, var(--fg) ${bounds.has(i) ? 45 : 22}%, transparent)`,
            }}
          />
        ))}

        {/* Playhead */}
        <span
          className="pointer-events-none absolute top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full"
          style={{
            left: `calc(8px + var(--sp, 0) * (100% - 16px))`,
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent)',
          }}
        />
      </div>
    </div>
  )
}
