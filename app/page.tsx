import { ACTS } from '@/lib/acts'
import { Section } from '@/components/ui/Section'
import { ApertureStage } from '@/components/ui/ApertureStage'
import { Scrubber } from '@/components/ui/Scrubber'

export default function Home() {
  return (
    <>
      {/* The DOM layer registered to the 3D aperture. Sits above the canvas,
          below the text. */}
      <ApertureStage />

      {/* The scroll track. Its total height is the sum of every act's `vh`,
          and it is the ScrollTrigger trigger for the master timeline. */}
      <main id="scroll-track" className="relative z-10">
        {ACTS.map((act) => (
          <Section key={act.id} act={act} />
        ))}
      </main>

      <Scrubber />
    </>
  )
}
