/**
 * The scroll script.
 *
 * This is the single source of truth for pacing. `vh` is how many viewport
 * heights each act occupies; the master timeline derives its positions from
 * these numbers, so changing a `vh` here re-times the 3D choreography to match.
 * Tune the feel here first, before touching timeline.ts.
 */

export type Act = {
  id: string
  vh: number
  /** Accent colour for this act (headings, aperture ring, demo). */
  accent: string
  eyebrow?: string
  title?: string
  body?: string
  /** Shows the DOM demo layer registered to the 3D aperture. */
  stage?: boolean
}

export const ACTS: Act[] = [
  {
    id: 'hero',
    vh: 120,
    accent: '#ff5a5f',
    title: 'Intelligence,\nengineered.',
    body: 'Athreix builds AI systems that hold up in production — not demos that fall over in week two.',
  },
  {
    id: 'orbit',
    vh: 100,
    accent: '#ff5a5f',
  },
  {
    id: 'explode',
    vh: 140,
    accent: '#ff8f3f',
    eyebrow: 'The system',
    title: 'One system.\nEvery layer.',
    body: 'Ingestion through inference, wired as one machine instead of eight services taped together.',
  },
  {
    id: 'blueprint',
    vh: 180,
    accent: '#ff8f3f',
    eyebrow: 'Anatomy',
    title: 'The complete\nAI stack.',
    body: 'Every part is ours, documented, and swappable. Nothing is a black box you inherit.',
  },
  {
    id: 'enter',
    vh: 120,
    accent: '#2ee6a8',
  },
  {
    id: 'cap-retrieval',
    vh: 110,
    accent: '#2ee6a8',
    eyebrow: 'Capability',
    title: 'Retrieval that\nactually retrieves.',
    body: 'Hybrid search, reranking, and citation tracing so answers can be checked, not trusted.',
    stage: true,
  },
  {
    id: 'cap-inference',
    vh: 110,
    accent: '#4d9fff',
    eyebrow: 'Capability',
    title: 'Inference\nunder budget.',
    body: 'Routing, caching and distillation that hold latency and cost flat as volume climbs.',
    stage: true,
  },
  {
    id: 'cap-guardrails',
    vh: 110,
    accent: '#22d3ee',
    eyebrow: 'Capability',
    title: 'Guardrails\nyou can audit.',
    body: 'Every decision logged, every policy versioned, every failure reproducible.',
    stage: true,
  },
  {
    id: 'modular',
    vh: 160,
    accent: '#b6f34a',
    eyebrow: 'Modular',
    title: 'Only what\nyou need.',
    body: 'Take the whole stack or one layer. The parts do not require each other to work.',
  },
  {
    id: 'outro',
    vh: 100,
    accent: '#ff5a5f',
    title: 'Build it with us.',
    body: 'Tell us what you are trying to ship. We will tell you what it actually takes.',
  },
]

export const TOTAL_VH = ACTS.reduce((n, a) => n + a.vh, 0)

/** Normalised [start, end] of each act in 0..1 scroll-progress space. */
export const ACT_RANGE: Record<string, { start: number; end: number }> = (() => {
  const out: Record<string, { start: number; end: number }> = {}
  let cursor = 0
  for (const a of ACTS) {
    const start = cursor / TOTAL_VH
    cursor += a.vh
    out[a.id] = { start, end: cursor / TOTAL_VH }
  }
  return out
})()

/** Convenience: start position of an act, in timeline-progress units. */
export const at = (id: string) => ACT_RANGE[id].start
/** Convenience: duration of an act, in timeline-progress units. */
export const dur = (id: string) => ACT_RANGE[id].end - ACT_RANGE[id].start
