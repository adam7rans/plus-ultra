import { assetReadiness } from './asset-registry.js'
import type { AssetType } from '../types/assets.js'
import type {
  ReadinessInput,
  CompositeReadinessReport,
  ReadinessDimensionResult,
  ReadinessFactor,
} from '../types/readiness.js'

function toGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

function statusScore(s: string): number {
  if (s === 'ok') return 1.0
  if (s === 'warning') return 0.5
  if (s === 'critical') return 0.1
  return 0.7 // 'none' or unknown
}

export function computeCompositeReadiness(input: ReadinessInput): CompositeReadinessReport {
  const now = Date.now()
  const d30 = 30 * 24 * 60 * 60 * 1000
  const d90 = 90 * 24 * 60 * 60 * 1000

  // ── Personnel ────────────────────────────────────────────────────
  const skills_sub = input.skillScore / 100
  const health_sub =
    input.healthScores.length > 0
      ? input.healthScores.reduce((a, b) => a + b, 0) / input.healthScores.length
      : 1.0
  const training_sub =
    input.lastTrainingSessionAt === null
      ? 0.0
      : now - input.lastTrainingSessionAt <= d30
      ? 1.0
      : now - input.lastTrainingSessionAt <= d90
      ? 0.6
      : 0.3

  const personnelScore = (skills_sub * 0.4 + health_sub * 0.4 + training_sub * 0.2) * 100
  const personnelFactors: ReadinessFactor[] = [
    { label: 'Skills coverage', value: skills_sub, ok: skills_sub >= 0.5 },
    { label: 'Member health', value: health_sub, ok: health_sub >= 0.7 },
    { label: 'Training recency', value: training_sub, ok: training_sub >= 0.6 },
  ]
  const personnel: ReadinessDimensionResult = {
    score: Math.round(personnelScore),
    factors: personnelFactors,
  }

  // ── Supply ───────────────────────────────────────────────────────
  const asset_sub = assetReadiness(
    Math.max(input.memberCount, 1),
    input.inventoryForReadiness as { asset: AssetType; quantity: number }[],
  )

  const criticalAssets = ['food_reserve', 'water_reserve', 'fuel_reserve']
  const relevantStatuses = criticalAssets.map(a => {
    const found = input.consumptionStatuses.find(s => s.asset === a)
    return found ? found.status : 'none'
  })
  const depletion_sub =
    relevantStatuses.reduce((sum, s) => sum + statusScore(s), 0) / relevantStatuses.length

  const supplyScore = (asset_sub * 0.5 + depletion_sub * 0.5) * 100
  const supply: ReadinessDimensionResult = {
    score: Math.round(supplyScore),
    factors: [
      { label: 'Asset readiness', value: asset_sub, ok: asset_sub >= 0.5 },
      { label: 'Food reserve', value: statusScore(relevantStatuses[0]), ok: relevantStatuses[0] === 'ok' },
      { label: 'Water reserve', value: statusScore(relevantStatuses[1]), ok: relevantStatuses[1] === 'ok' },
      { label: 'Fuel reserve', value: statusScore(relevantStatuses[2]), ok: relevantStatuses[2] === 'ok' },
    ],
  }

  // ── Infrastructure ───────────────────────────────────────────────
  const territory_sub = input.hasTerritory ? 1.0 : 0.0
  const pins_sub = Math.min(1, input.pinCount / 5)
  const routes_sub = Math.min(1, input.routeCount / 2)
  const infraScore = (territory_sub * 0.4 + pins_sub * 0.4 + routes_sub * 0.2) * 100
  const infrastructure: ReadinessDimensionResult = {
    score: Math.round(infraScore),
    factors: [
      { label: 'Territory defined', value: territory_sub, ok: territory_sub >= 1.0 },
      { label: 'Map pins placed', value: pins_sub, ok: pins_sub >= 1.0 },
      { label: 'Routes planned', value: routes_sub, ok: routes_sub >= 1.0 },
    ],
  }

  // ── Comms ────────────────────────────────────────────────────────
  const pace_sub =
    (input.paceLevelsCount / 4) * 0.5 +
    (input.hasCheckInSchedules ? 0.25 : 0) +
    (input.hasRallyPoints ? 0.25 : 0)
  const ham_sub = input.hasHamCert ? 1.0 : 0.0
  const commsScore = (pace_sub * 0.6 + ham_sub * 0.4) * 100
  const comms: ReadinessDimensionResult = {
    score: Math.round(commsScore),
    factors: [
      { label: 'PACE plan completeness', value: pace_sub, ok: pace_sub >= 0.75 },
      { label: 'HAM radio certification', value: ham_sub, ok: ham_sub >= 1.0 },
    ],
  }

  // ── Coordination ─────────────────────────────────────────────────
  const goals_sub = Math.min(1, input.activeGoalCount / 2)
  const tasks_sub = Math.min(1, input.recentTaskCount / 3)
  const muster_sub =
    input.lastMusterAt === null
      ? 0.0
      : now - input.lastMusterAt <= d30
      ? 1.0
      : now - input.lastMusterAt <= d90
      ? 0.5
      : 0.0
  const coordScore = (goals_sub * 0.3 + tasks_sub * 0.4 + muster_sub * 0.3) * 100
  const coordination: ReadinessDimensionResult = {
    score: Math.round(coordScore),
    factors: [
      { label: 'Active goals', value: goals_sub, ok: goals_sub >= 0.5 },
      { label: 'Recent task activity', value: tasks_sub, ok: tasks_sub >= 0.5 },
      { label: 'Muster recency', value: muster_sub, ok: muster_sub >= 0.5 },
    ],
  }

  // ── Cohesion ─────────────────────────────────────────────────────
  const profile_sub = input.profileCount / Math.max(input.memberCount, 1)
  const archetype_sub = input.archetypeCount / 6
  const compat_sub = input.avgCompatibility
  const cohesionScore = (profile_sub * 0.3 + archetype_sub * 0.35 + compat_sub * 0.35) * 100
  const cohesion: ReadinessDimensionResult = {
    score: Math.round(cohesionScore),
    factors: [
      { label: 'Psych profile coverage', value: profile_sub, ok: profile_sub >= 0.5 },
      { label: 'Archetype diversity', value: archetype_sub, ok: archetype_sub >= 0.5 },
      { label: 'Team compatibility', value: compat_sub, ok: compat_sub >= 0.5 },
    ],
  }

  // ── Overall ──────────────────────────────────────────────────────
  const overall = Math.round(
    personnel.score * 0.30 +
    supply.score * 0.25 +
    infrastructure.score * 0.15 +
    comms.score * 0.10 +
    coordination.score * 0.10 +
    cohesion.score * 0.10,
  )

  // ── Critical gaps ────────────────────────────────────────────────
  const criticalGaps: string[] = []
  if (input.healthScores.length > 0 && health_sub < 0.7) {
    criticalGaps.push('Multiple members have reduced health status')
  }
  if (skills_sub < 0.5) {
    criticalGaps.push('Critical skill gaps — review Tribe Schematic')
  }
  for (const { asset, label } of [
    { asset: 'food_reserve', label: 'Food' },
    { asset: 'water_reserve', label: 'Water' },
    { asset: 'fuel_reserve', label: 'Fuel' },
  ]) {
    const found = input.consumptionStatuses.find(s => s.asset === asset)
    if (found && (found.status === 'critical' || found.status === 'warning')) {
      criticalGaps.push(`${label} supply is critically low`)
    }
  }
  if (!input.hasTerritory) {
    criticalGaps.push('No map territory defined')
  }
  if (input.paceLevelsCount < 4) {
    criticalGaps.push('PACE plan incomplete — all 4 comms levels needed')
  }
  if (!input.hasHamCert) {
    criticalGaps.push('No HAM radio operator cert on file')
  }
  if (input.activeGoalCount === 0) {
    criticalGaps.push('No active tribe goals')
  }
  if (input.lastMusterAt === null || now - input.lastMusterAt > d90) {
    criticalGaps.push('No muster drill in 90 days')
  }
  if (input.memberCount > 0 && profile_sub < 0.5) {
    criticalGaps.push('Fewer than half of members have psych profiles')
  }

  return {
    tribeId: input.tribeId,
    overall,
    grade: toGrade(overall),
    dimensions: { personnel, supply, infrastructure, comms, coordination, cohesion },
    criticalGaps,
    computedAt: now,
  }
}
