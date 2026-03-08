import type { SkillRole, ProficiencyLevel, MemberSkill } from '../types/skills.js'
import type { Tribe, TribeMember } from '../types/tribe.js'

export const TIER_1_ROLES: SkillRole[] = ['medical', 'food_production', 'security_tactical', 'water_plumbing']
export const TIER_2_ROLES: SkillRole[] = ['electrical_solar', 'construction', 'cooking_preservation', 'comms_tech']
export const TIER_3_ROLES: SkillRole[] = ['teaching', 'strategy_leadership', 'drone_surveillance', 'hardware_repair']

const MINIMUMS: Record<SkillRole, (memberCount: number) => number> = {
  medical:              (n) => Math.ceil(n / 25),
  food_production:      (n) => Math.max(2, Math.ceil(n / 10)),
  security_tactical:    (n) => Math.max(1, Math.ceil(n / 20)),
  water_plumbing:       (_n) => 1,
  electrical_solar:     (_n) => 1,
  construction:         (n) => Math.max(1, Math.ceil(n / 30)),
  cooking_preservation: (n) => Math.max(1, Math.ceil(n / 25)),
  comms_tech:           (_n) => 1,
  teaching:             (_n) => 0,
  strategy_leadership:  (_n) => 0,
  drone_surveillance:   (_n) => 0,
  hardware_repair:      (_n) => 0,
}

const PROFICIENCY_WEIGHT: Record<ProficiencyLevel, number> = {
  basic: 0.5,
  intermediate: 0.75,
  expert: 1.0,
  verified_expert: 1.3,
}

export function bucketScore(role: SkillRole, members: TribeMember[], skills: MemberSkill[]): number {
  const qualified = skills.filter(s => s.role === role)
  if (qualified.length === 0) return 0

  const minimum = MINIMUMS[role](members.length)
  if (minimum === 0) {
    return Math.min(1, qualified.length / 3)
  }

  const effectiveCount = qualified.reduce((sum, s) => sum + PROFICIENCY_WEIGHT[s.proficiency], 0)
  const ratio = effectiveCount / minimum

  if (ratio === 0) return 0
  if (ratio < 1) return 0.6 * ratio
  if (ratio === 1) return 0.6
  return 0.6 + 0.4 * Math.min(1, (ratio - 1) / 2)
}

export function survivabilityScore(_tribe: Tribe, members: TribeMember[], skills: MemberSkill[]): number {
  const tier1Scores = TIER_1_ROLES.map(r => bucketScore(r, members, skills))
  const tier2Scores = TIER_2_ROLES.map(r => bucketScore(r, members, skills))
  const tier3Scores = TIER_3_ROLES.map(r => bucketScore(r, members, skills))

  const tier1Min = Math.min(...tier1Scores)
  const tier1Avg = tier1Scores.reduce((a, b) => a + b, 0) / tier1Scores.length
  const tier2Avg = tier2Scores.reduce((a, b) => a + b, 0) / tier2Scores.length
  const tier3Avg = tier3Scores.reduce((a, b) => a + b, 0) / tier3Scores.length

  const raw = (tier1Avg * 0.6) + (tier2Avg * 0.3) + (tier3Avg * 0.1)
  const score = Math.round(raw * 100)

  return tier1Min === 0 ? Math.min(25, score) : score
}
