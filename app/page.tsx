import { ACTS } from '@/lib/acts'
import { Section } from '@/components/ui/Section'
import { CapabilityPanel } from '@/components/ui/CapabilityPanel'
import { Atmosphere, CornerFrame } from '@/components/ui/Atmosphere'
import { SiteHeader } from '@/components/ui/SiteHeader'
import { Telemetry } from '@/components/ui/Telemetry'
import { ActCounter } from '@/components/ui/ActCounter'

export default function Home() {
  return (
    <>
      {/* Effect layers: canvas (z0) → bloom/vignette/grain (z1-3) → stage (z10)
          → copy (z10) → chrome (z40). */}
      <Atmosphere />

      {/* Keeps the copy legible over the full-bleed point field. */}
      <div className="scrim" aria-hidden="true" />

      {/* Capability readouts, opposite the copy. */}
      <CapabilityPanel />

      {/* The scroll track. Its total height is the sum of every act's `vh`, and
          it is the ScrollTrigger trigger for the master timeline. */}
      <main id="scroll-track" className="relative z-10">
        {ACTS.map((act, i) => (
          <Section key={act.id} act={act} index={i} />
        ))}
      </main>

      <SiteHeader />
      <Telemetry />
      <ActCounter />
      <CornerFrame />
    </>
  )
}
