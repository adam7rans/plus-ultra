import type { MemberSkill, SkillRole, ProficiencyLevel } from '../types/skills.js'
import type { TrainingSession } from '../types/training.js'

export const LEVEL_UP_CRITERIA = {
  basic_to_intermediate: { hoursRequired: 8,  vouchesRequired: 1 },
  intermediate_to_expert: { hoursRequired: 40, vouchesRequired: 2 },
  // expert → verified_expert: cert-only path (verifyCertification auto-elevates)
} as const

function nextLevel(proficiency: ProficiencyLevel): ProficiencyLevel | null {
  if (proficiency === 'basic') return 'intermediate'
  if (proficiency === 'intermediate') return 'expert'
  return null
}

function criteriaKey(
  current: ProficiencyLevel
): keyof typeof LEVEL_UP_CRITERIA | null {
  if (current === 'basic') return 'basic_to_intermediate'
  if (current === 'intermediate') return 'intermediate_to_expert'
  return null
}

export function getTrainingHoursForSkill(
  memberId: string,
  role: SkillRole,
  sessions: TrainingSession[]
): number {
  let totalMinutes = 0
  for (const session of sessions) {
    // Member must be an attendee
    let attendees: string[] = []
    try { attendees = JSON.parse(session.attendeesJson) } catch { attendees = [] }
    if (!attendees.includes(memberId)) continue

    // Session must match role or be general (skillRole is null)
    if (session.skillRole !== null && session.skillRole !== role) continue

    totalMinutes += session.durationMinutes
  }
  return totalMinutes / 60
}

export interface LevelUpEligibilityResult {
  eligible: boolean
  nextLevel: ProficiencyLevel | null
  currentHours: number
  neededHours: number
  currentVouches: number
  neededVouches: number
}

export function checkLevelUpEligibility(
  skill: MemberSkill,
  sessions: TrainingSession[]
): LevelUpEligibilityResult {
  const key = criteriaKey(skill.proficiency)
  const next = nextLevel(skill.proficiency)

  if (!key || !next) {
    return {
      eligible: false,
      nextLevel: null,
      currentHours: 0,
      neededHours: 0,
      currentVouches: skill.vouchedBy.length,
      neededVouches: 0,
    }
  }

  const criteria = LEVEL_UP_CRITERIA[key]
  const currentHours = getTrainingHoursForSkill(skill.memberId, skill.role, sessions)
  const currentVouches = skill.vouchedBy.length

  return {
    eligible: currentHours >= criteria.hoursRequired && currentVouches >= criteria.vouchesRequired,
    nextLevel: next,
    currentHours,
    neededHours: criteria.hoursRequired,
    currentVouches,
    neededVouches: criteria.vouchesRequired,
  }
}
