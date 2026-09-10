/**
 * The scroll script.
 *
 * Single source of truth for pacing. `vh` is how many viewport heights each act
 * occupies; the master timeline derives its positions from these numbers, so
 * changing a `vh` here re-times the choreography to match.
 */

export type Act = {
  id: string
  /**
   * Height of the act, in viewport heights.
   *
   * The copy is pinned with position:sticky, so it only holds still for
   * (vh - 100). Any act with copy wants 140+; below about 130 the text is
   * sliding the whole way past and never settles to be read.
   */
  vh: number
  accent: string
  eyebrow?: string
  title?: string
  body?: string
  /** Positioning lockup above the headline. Letters reveal on load. */
  badge?: string
  cta?: { label: string; href: string }
  /** Shows the floating capability panel. */
  demo?: 'retrieval' | 'inference' | 'guardrails'
}

export const ACTS: Act[] = [
  {
    id: 'hero',
    vh: 130,
    accent: '#7c8cff',
    badge: 'ATHREIX — AI-NATIVE SYSTEMS',
    title: 'Intelligence,\nengineered.',
    body: 'Athreix builds AI systems that hold up in production — not demos that fall over in week two.',
  },
  {
    id: 'ingest',
    vh: 140,
    accent: '#4d9fff',
    eyebrow: 'Ingestion',
    title: 'Everything\nyou know.',
    body: 'Documents, tickets, code, conversations. Pulled in continuously, not dumped once and left to rot.',
  },
  {
    id: 'embed',
    vh: 160,
    accent: '#22d3ee',
    eyebrow: 'Embeddings',
    title: 'Meaning,\nnot keywords.',
    body: 'Everything you know, placed in a space where related things sit near each other — and stay there as the corpus grows.',
  },
  {
    id: 'retrieve',
    vh: 150,
    accent: '#2ee6a8',
    eyebrow: 'Retrieval',
    title: 'Find the one\nthing that matters.',
    body: 'Hybrid search and reranking that narrows millions of points to the handful worth reasoning over — with citations back to source.',
    demo: 'retrieval',
  },
  {
    id: 'reason',
    vh: 165,
    accent: '#b6f34a',
    eyebrow: 'Reasoning',
    title: 'Structure out\nof chaos.',
    body: 'The shape a model learns is not a list. It is a surface — and following it is what turns retrieval into an answer.',
    demo: 'inference',
  },
  {
    id: 'guardrails',
    vh: 165,
    accent: '#ff8f3f',
    eyebrow: 'Guardrails',
    title: 'Every answer,\naccountable.',
    body: 'Policies versioned, decisions logged, failures reproducible. The parts of an AI system that survive an audit.',
    demo: 'guardrails',
  },
  {
    id: 'resolve',
    vh: 150,
    accent: '#ff5a5f',
    eyebrow: 'The system',
    title: 'One system,\nnot eight.',
    body: 'Ingestion through inference, wired as a single machine instead of a pile of services taped together.',
  },
  {
    id: 'deliver',
    vh: 145,
    accent: '#e879f9',
    eyebrow: 'In production',
    title: 'Answers, at the\nrate you need them.',
    body: 'Routing, caching and distillation that keep latency and cost flat while volume climbs.',
  },
  {
    id: 'outro',
    vh: 145,
    accent: '#7c8cff',
    title: 'Build it with us.',
    body: 'Tell us what you are trying to ship. We will tell you what it actually takes.',
    cta: { label: 'Start a project', href: 'mailto:tech@athreix.com' },
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

export const at = (id: string) => ACT_RANGE[id].start
export const dur = (id: string) => ACT_RANGE[id].end - ACT_RANGE[id].start
