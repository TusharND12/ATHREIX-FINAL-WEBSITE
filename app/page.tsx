import { ACTS } from '@/lib/acts'
import { Section } from '@/components/ui/Section'
import { ApertureStage } from '@/components/ui/ApertureStage'
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

      {/* The DOM layer registered to the 3D aperture. */}
      <ApertureStage />

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
