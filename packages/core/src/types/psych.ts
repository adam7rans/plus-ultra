export interface PsychDimensions {
  decisionSpeed: number     // 0–100: Deliberate → Decisive
  stressTolerance: number   // 0–100: Reactive → Resilient
  leadershipStyle: number   // 0–100: Directive → Collaborative
  conflictApproach: number  // 0–100: Avoidant → Assertive
  riskAppetite: number      // 0–100: Conservative → Bold
  socialEnergy: number      // 0–100: Introverted → Extraverted
}

export type PsychArchetype = 'Commander' | 'Scout' | 'Strategist' | 'Connector' | 'Planner' | 'Sustainer'

export interface PsychProfile {
  memberId: string          // pubkey
  tribeId: string
  archetype: PsychArchetype
  dimensions: PsychDimensions
  quizCompletedAt: number | null   // null = peer/passive only
  lastUpdatedAt: number
  peerDimensions: Partial<PsychDimensions>   // avg of all peer ratings received
  peerRatingCount: number
}

export interface PeerRating {
  id: string                // `${ratedPub}:${raterWeekHash}`
  tribeId: string
  ratedPub: string
  stressTolerance: number
  leadershipStyle: number
  conflictApproach: number
  ratedAt: number
}
