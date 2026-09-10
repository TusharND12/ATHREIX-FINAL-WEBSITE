'use client'

/**
 * The DOM layer that sits inside the 3D aperture.
 *
 * Position and radius come from --ap-x / --ap-y / --ap-r, which Rig writes
 * every frame by projecting the aperture ring into screen space. Nothing here
 * is hardcoded — resize the window and it stays registered.
 *
 * In Phase 5 this is where the real capability demos live (token streams,
 * attention grids, latency histograms). For now it holds a placeholder shape
 * plus an alignment ring, so any registration drift is immediately visible.
 */
export function ApertureStage({ debug = true }: { debug?: boolean }) {
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
        {debug && (
          <div
            className="absolute inset-0 rounded-full border border-dashed"
            style={{ borderColor: 'color-mix(in srgb, var(--accent) 55%, transparent)' }}
          />
        )}

        {/* Placeholder demo: swap for the real per-capability animations. */}
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="animate-[spin_9s_linear_infinite] rounded-[18%]"
            style={{
              width: 'calc(var(--ap-r, 0px) * 0.46)',
              height: 'calc(var(--ap-r, 0px) * 0.46)',
              background: 'var(--accent)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
