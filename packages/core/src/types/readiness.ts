export interface ReadinessFactor {
  label: string
  value: number   // 0–1
  ok: boolean     // whether this factor is healthy
}

export interface ReadinessDimensionResult {
  score: number   // 0–100
  factors: ReadinessFactor[]
}

export interface CompositeReadinessReport {
  tribeId: string
  overall: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  dimensions: {
    personnel: ReadinessDimensionResult
    supply: ReadinessDimensionResult
    infrastructure: ReadinessDimensionResult
    comms: ReadinessDimensionResult
    coordination: ReadinessDimensionResult
    cohesion: ReadinessDimensionResult
  }
  criticalGaps: string[]
  computedAt: number
}

export interface ReadinessInput {
  tribeId: string
  memberCount: number
  // Personnel
  skillScore: number                    // 0–100
  healthScores: number[]                // 0–1 per member
  lastTrainingSessionAt: number | null  // ms epoch
  // Supply
  inventoryForReadiness: { asset: string; quantity: number }[]
  consumptionStatuses: { asset: string; status: string }[]
  // Infrastructure
  hasTerritory: boolean
  pinCount: number
  routeCount: number
  // Comms
  paceLevelsCount: number               // 0–4
  hasCheckInSchedules: boolean
  hasRallyPoints: boolean
  hasHamCert: boolean
  // Coordination
  activeGoalCount: number
  recentTaskCount: number               // tasks updated in last 30d
  lastMusterAt: number | null
  // Cohesion
  profileCount: number
  archetypeCount: number                // unique archetypes present
  avgCompatibility: number              // 0–1, default 0.5 if no data
}
