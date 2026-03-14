import type { PsychDimensions, PsychArchetype } from '../types/psych.js'
import type { AuthorityRole } from '../types/tribe.js'

// ── Quiz scoring ───────────────────────────────────────────────────────────────

interface QuestionDelta {
  A: Partial<PsychDimensions>
  B?: Partial<PsychDimensions>
  C?: Partial<PsychDimensions>
  D?: Partial<PsychDimensions>
}

const QUESTION_DELTAS: Record<string, QuestionDelta> = {
  // Scenario questions (A/B/C/D)
  S1: {
    A: { leadershipStyle: +8, socialEnergy: +8 },   // volunteer to represent
    B: { leadershipStyle: -8, socialEnergy: -8 },   // delegate to someone else
    C: { leadershipStyle: +4 },
    D: { socialEnergy: +4 },
  },
  S2: {
    A: { decisionSpeed: +10, stressTolerance: +8 }, // act immediately
    B: { decisionSpeed: -10, stressTolerance: -5 }, // coordinate first
    C: { decisionSpeed: +5 },
    D: { stressTolerance: +4 },
  },
  S3: {
    A: { conflictApproach: +12 },   // intervene directly
    B: { conflictApproach: -12 },   // wait and observe
    C: { conflictApproach: +6 },
    D: { conflictApproach: -6 },
  },
  S4: {
    A: { riskAppetite: +10, decisionSpeed: +8 },  // go on the risky mission
    B: { riskAppetite: -10, decisionSpeed: -5 },  // ration what you have
    C: { riskAppetite: +5 },
    D: { decisionSpeed: +4 },
  },
  S5: {
    A: { stressTolerance: +12 },   // triage calmly
    B: { stressTolerance: -12 },   // freeze up
    C: { stressTolerance: +6 },
    D: { stressTolerance: -4 },
  },
  S6: {
    A: { socialEnergy: +12 },   // recharge with people
    B: { socialEnergy: -12 },   // recharge alone
    C: { socialEnergy: +6 },
    D: { socialEnergy: -4 },
  },
  S7: {
    A: { decisionSpeed: +8, riskAppetite: +8 },   // secure first, ask later
    B: { decisionSpeed: -8, riskAppetite: -8 },   // report first
    C: { decisionSpeed: +4 },
    D: { riskAppetite: +4 },
  },
  S8: {
    A: { leadershipStyle: +8, conflictApproach: -8 },  // accept the outcome
    B: { leadershipStyle: -8, conflictApproach: +8 },  // push back
    C: { leadershipStyle: +4 },
    D: { conflictApproach: +4 },
  },
  S9: {
    A: { socialEnergy: +8, decisionSpeed: +6 },   // introduce yourself
    B: { socialEnergy: -8, decisionSpeed: -4 },   // observe first
    C: { socialEnergy: +4 },
    D: { decisionSpeed: +3 },
  },
  S10: {
    A: { riskAppetite: +8, stressTolerance: +8 },  // immediate defense
    B: { riskAppetite: -8, stressTolerance: -5 },  // verify first
    C: { riskAppetite: +4 },
    D: { stressTolerance: +4 },
  },
  // Forced-rank pairs (A or B only)
  F1: {
    A: { decisionSpeed: +12 },   // decide fast, commit fully
    B: { decisionSpeed: -12 },   // consider all angles first
  },
  F2: {
    A: { leadershipStyle: -12 }, // leader sets clear direction (directive)
    B: { leadershipStyle: +12 }, // leader builds consensus (collaborative)
  },
  F3: {
    A: { riskAppetite: -12 },    // predictable outcomes
    B: { riskAppetite: +12 },    // bold moves
  },
  F4: {
    A: { socialEnergy: +12 },    // energy from people
    B: { socialEnergy: -12 },    // energy from quiet focus
  },
  F5: {
    A: { stressTolerance: -12 }, // act on instinct under pressure
    B: { stressTolerance: +12 }, // slow down, think under pressure
  },
  F6: {
    A: { conflictApproach: +12 }, // address conflict head-on
    B: { conflictApproach: -12 }, // pick battles carefully
  },
  F7: {
    A: { decisionSpeed: +12 },    // good decision now > perfect later
    B: { decisionSpeed: -12 },    // cost of wrong > cost of waiting
  },
  F8: {
    A: { riskAppetite: +12 },     // try new things, accept failure
    B: { riskAppetite: -12 },     // improve what works, avoid risk
  },
}

/** Score a completed quiz — returns PsychDimensions */
export function scoreQuiz(answers: Record<string, 'A' | 'B' | 'C' | 'D'>): PsychDimensions {
  const dims: PsychDimensions = {
    decisionSpeed: 50,
    stressTolerance: 50,
    leadershipStyle: 50,
    conflictApproach: 50,
    riskAppetite: 50,
    socialEnergy: 50,
  }

  for (const [qId, choice] of Object.entries(answers)) {
    const deltas = QUESTION_DELTAS[qId]
    if (!deltas) continue
    const delta = deltas[choice]
    if (!delta) continue
    for (const [dim, val] of Object.entries(delta) as [keyof PsychDimensions, number][]) {
      dims[dim] = Math.max(0, Math.min(100, dims[dim] + val))
    }
  }

  return dims
}

// ── Archetype computation ─────────────────────────────────────────────────────

// Archetype centroids for tie-breaking (6D points)
const ARCHETYPE_CENTROIDS: Record<PsychArchetype, PsychDimensions> = {
  Commander:  { decisionSpeed: 75, stressTolerance: 75, leadershipStyle: 30, conflictApproach: 70, riskAppetite: 60, socialEnergy: 55 },
  Scout:      { decisionSpeed: 75, stressTolerance: 55, leadershipStyle: 50, conflictApproach: 60, riskAppetite: 80, socialEnergy: 65 },
  Strategist: { decisionSpeed: 25, stressTolerance: 70, leadershipStyle: 50, conflictApproach: 40, riskAppetite: 30, socialEnergy: 40 },
  Connector:  { decisionSpeed: 50, stressTolerance: 55, leadershipStyle: 75, conflictApproach: 45, riskAppetite: 50, socialEnergy: 80 },
  Planner:    { decisionSpeed: 25, stressTolerance: 50, leadershipStyle: 50, conflictApproach: 40, riskAppetite: 30, socialEnergy: 30 },
  Sustainer:  { decisionSpeed: 50, stressTolerance: 75, leadershipStyle: 70, conflictApproach: 30, riskAppetite: 45, socialEnergy: 55 },
}

function euclideanDistance(a: PsychDimensions, b: PsychDimensions): number {
  return Math.sqrt(
    (a.decisionSpeed - b.decisionSpeed) ** 2 +
    (a.stressTolerance - b.stressTolerance) ** 2 +
    (a.leadershipStyle - b.leadershipStyle) ** 2 +
    (a.conflictApproach - b.conflictApproach) ** 2 +
    (a.riskAppetite - b.riskAppetite) ** 2 +
    (a.socialEnergy - b.socialEnergy) ** 2
  )
}

/** Derive archetype from dimensions */
export function computeArchetype(dims: PsychDimensions): PsychArchetype {
  const { decisionSpeed, stressTolerance, leadershipStyle, conflictApproach, riskAppetite, socialEnergy } = dims

  if (decisionSpeed > 65 && stressTolerance > 65 && leadershipStyle < 45) return 'Commander'
  if (riskAppetite > 65 && decisionSpeed > 60) return 'Scout'
  if (decisionSpeed < 40 && stressTolerance > 60 && riskAppetite < 50) return 'Strategist'
  if (socialEnergy > 65 && leadershipStyle > 60) return 'Connector'
  if (decisionSpeed < 40 && riskAppetite < 45 && socialEnergy < 50) return 'Planner'
  if (stressTolerance > 60 && leadershipStyle > 55 && conflictApproach < 45) return 'Sustainer'

  // Tie-breaking: pick nearest centroid
  let nearest: PsychArchetype = 'Sustainer'
  let minDist = Infinity
  for (const [archetype, centroid] of Object.entries(ARCHETYPE_CENTROIDS) as [PsychArchetype, PsychDimensions][]) {
    const d = euclideanDistance(dims, centroid)
    if (d < minDist) { minDist = d; nearest = archetype }
  }
  return nearest
}

// ── Dimension merging ─────────────────────────────────────────────────────────

/** Merge quiz dims + peer dims (weighted: quiz 70%, peer 30%) */
export function mergeProfileDimensions(
  quizDims: PsychDimensions,
  peerDims: Partial<PsychDimensions>,
  hasQuiz: boolean
): PsychDimensions {
  const keys: (keyof PsychDimensions)[] = [
    'decisionSpeed', 'stressTolerance', 'leadershipStyle',
    'conflictApproach', 'riskAppetite', 'socialEnergy',
  ]

  const result = {} as PsychDimensions
  for (const key of keys) {
    const peer = peerDims[key]
    const quiz = quizDims[key]
    if (peer !== undefined && hasQuiz) {
      result[key] = Math.round(quiz * 0.7 + peer * 0.3)
    } else if (peer !== undefined && !hasQuiz) {
      result[key] = Math.round(peer)
    } else {
      result[key] = quiz
    }
  }
  return result
}

// ── Big Five mapping ──────────────────────────────────────────────────────────

export interface BigFiveScores {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

/** Big Five labels for display (derived, not stored) */
export function toBigFive(dims: PsychDimensions): BigFiveScores {
  return {
    openness:          dims.riskAppetite,
    conscientiousness: 100 - dims.decisionSpeed,
    extraversion:      dims.socialEnergy,
    agreeableness:     Math.round((dims.leadershipStyle + (100 - dims.conflictApproach)) / 2),
    neuroticism:       100 - dims.stressTolerance,
  }
}

// ── Role fit scoring ──────────────────────────────────────────────────────────

/**
 * Role-fit score 0–1 for a given authority role.
 * founder/elder_council: high stress tolerance + moderate collaborative leadership
 * lead: balanced across dimensions
 * medic-ish: high stress tolerance + collaborative + low conflict
 */
export function roleFitScore(dims: PsychDimensions, role: AuthorityRole): number {
  const { stressTolerance, leadershipStyle, conflictApproach, decisionSpeed } = dims

  switch (role) {
    case 'founder': {
      // High stress tolerance, decisive, willing to assert
      const s = stressTolerance / 100
      const d = decisionSpeed / 100
      const c = conflictApproach / 100
      return Math.round(((s * 0.4 + d * 0.35 + c * 0.25)) * 100) / 100
    }
    case 'elder_council': {
      // High stress tolerance, collaborative leadership
      const s = stressTolerance / 100
      const l = leadershipStyle / 100  // high = collaborative
      const d = decisionSpeed / 100
      return Math.round(((s * 0.4 + l * 0.35 + d * 0.25)) * 100) / 100
    }
    case 'lead': {
      // Balanced — all dimensions contribute equally
      const avg = (stressTolerance + leadershipStyle + decisionSpeed + (100 - conflictApproach)) / 400
      return Math.round(avg * 100) / 100
    }
    case 'member': {
      // All members fit
      return 0.7
    }
    case 'restricted': {
      return 0.3
    }
  }
}

// ── Compatibility scoring ─────────────────────────────────────────────────────

/**
 * Compatibility score 0–1 between two members.
 * Uses both complementary (for some dims) and similar (for others) logic.
 */
export function compatibilityScore(a: PsychDimensions, b: PsychDimensions): number {
  // Complementary dims: leadershipStyle (directive + collaborative = good pair)
  // Similar dims: stressTolerance, riskAppetite (shared tolerance helps team cohesion)
  // Neutral: decisionSpeed, conflictApproach, socialEnergy

  // Complementary: score is higher when dims differ in meaningful way
  const leaderComplement = 1 - Math.abs(a.leadershipStyle - b.leadershipStyle) / 100
  const conflictComplement = 1 - Math.abs(a.conflictApproach - (100 - b.conflictApproach)) / 100

  // Similar: score is higher when dims are close
  const stressSimilar = 1 - Math.abs(a.stressTolerance - b.stressTolerance) / 100
  const riskSimilar = 1 - Math.abs(a.riskAppetite - b.riskAppetite) / 100

  // Neutral (moderate weighting)
  const decisionMid = 1 - Math.abs(a.decisionSpeed - b.decisionSpeed) / 200
  const socialMid = 1 - Math.abs(a.socialEnergy - b.socialEnergy) / 200

  const score = (
    leaderComplement * 0.2 +
    conflictComplement * 0.2 +
    stressSimilar * 0.25 +
    riskSimilar * 0.15 +
    decisionMid * 0.1 +
    socialMid * 0.1
  )

  return Math.round(score * 100) / 100
}
