'use client'

/**
 * Top chrome: the mark, a thin nav, and a live status pill.
 *
 * The hairline under the bar doubles as the page progress bar — it reads --sp,
 * so it costs no JavaScript and stays perfectly in sync with the choreography.
 */
export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="flex items-center justify-between px-6 py-5 md:px-12">
        <a href="#" className="group flex items-center gap-3" aria-label="Athreix home">
          {/* The mark: a triangle cut by a bar, drawn rather than imported so it
              inherits the accent and needs no asset. */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M11 2.6 20 19.4H2L11 2.6Z" stroke="var(--accent)" strokeWidth="1.4" />
            <path d="M6.6 14.4h8.8" stroke="var(--fg)" strokeWidth="1.4" />
          </svg>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Athreix</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {['System', 'Capabilities', 'Approach'].map((item) => (
            <a
              key={item}
              href="#"
              className="label transition-opacity hover:opacity-100"
              style={{ color: 'var(--muted)', opacity: 0.85 }}
            >
              {item}
            </a>
          ))}
          <a
            href="#"
            className="panel label px-3 py-2 transition-transform hover:-translate-y-px"
            style={{ color: 'var(--fg)' }}
          >
            Start a project
          </a>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
            aria-hidden="true"
          />
          <span className="label" style={{ color: 'var(--muted)' }}>
            Live
          </span>
        </div>
      </div>

      {/* Page progress. Pure CSS off --sp. */}
      <div className="relative h-px w-full" style={{ background: 'var(--hairline)' }}>
        <div
          className="absolute left-0 top-0 h-px origin-left"
          style={{
            width: '100%',
            transform: 'scaleX(var(--sp, 0))',
            background: 'var(--accent)',
          }}
          aria-hidden="true"
        />
      </div>
    </header>
  )
}
