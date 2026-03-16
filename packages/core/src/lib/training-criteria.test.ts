import { describe, it, expect } from 'vitest'
import {
  getTrainingHoursForSkill,
  checkLevelUpEligibility,
  LEVEL_UP_CRITERIA,
} from './training-criteria.js'
import type { TrainingSession } from '../types/training.js'
import type { MemberSkill } from '../types/skills.js'

function session(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 's1',
    tribeId: 'tribe-1',
    title: 'Field session',
    skillRole: 'nurse',
    date: Date.now(),
    durationMinutes: 60,
    trainerId: 'trainer-1',
    attendeesJson: JSON.stringify(['member-1']),
    notes: '',
    loggedBy: 'trainer-1',
    loggedAt: Date.now(),
    ...overrides,
  }
}

function skill(overrides: Partial<MemberSkill> = {}): MemberSkill {
  return {
    memberId: 'member-1',
    tribeId: 'tribe-1',
    role: 'nurse',
    proficiency: 'basic',
    declaredAt: Date.now(),
    vouchedBy: [],
    ...overrides,
  }
}

// ── getTrainingHoursForSkill ──────────────────────────────────────────────────

describe('getTrainingHoursForSkill', () => {
  it('returns 0 for empty session list', () => {
    expect(getTrainingHoursForSkill('member-1', 'nurse', [])).toBe(0)
  })

  it('counts hours when member is in attendees and role matches', () => {
    const s = session({ durationMinutes: 120 }) // 2 hours
    expect(getTrainingHoursForSkill('member-1', 'nurse', [s])).toBe(2)
  })

  it('converts minutes to hours', () => {
    const s = session({ durationMinutes: 90 })
    expect(getTrainingHoursForSkill('member-1', 'nurse', [s])).toBe(1.5)
  })

  it('excludes sessions where member is not an attendee', () => {
    const s = session({ attendeesJson: JSON.stringify(['other-member']) })
    expect(getTrainingHoursForSkill('member-1', 'nurse', [s])).toBe(0)
  })

  it('excludes sessions for a different skill role', () => {
    const s = session({ skillRole: 'paramedic' })
    expect(getTrainingHoursForSkill('member-1', 'nurse', [s])).toBe(0)
  })

  it('counts sessions with skillRole=null (general training) for any role', () => {
    const s = session({ skillRole: null })
    expect(getTrainingHoursForSkill('member-1', 'nurse', [s])).toBe(1)
    expect(getTrainingHoursForSkill('member-1', 'farmer', [s])).toBe(1)
  })

  it('sums hours across multiple qualifying sessions', () => {
    const s1 = session({ durationMinutes: 60 })
    const s2 = session({ id: 's2', durationMinutes: 120 })
    const s3 = session({ id: 's3', skillRole: 'farmer' }) // different role — excluded
    expect(getTrainingHoursForSkill('member-1', 'nurse', [s1, s2, s3])).toBe(3)
  })

  it('handles malformed attendeesJson without crashing (returns 0)', () => {
    const s = session({ attendeesJson: 'INVALID JSON {{{' })
    expect(getTrainingHoursForSkill('member-1', 'nurse', [s])).toBe(0)
  })

  it('handles empty attendeesJson array', () => {
    const s = session({ attendeesJson: '[]' })
    expect(getTrainingHoursForSkill('member-1', 'nurse', [s])).toBe(0)
  })
})

// ── checkLevelUpEligibility ───────────────────────────────────────────────────

describe('checkLevelUpEligibility', () => {
  it('basic→intermediate requires 8 hours and 1 vouch', () => {
    expect(LEVEL_UP_CRITERIA.basic_to_intermediate.hoursRequired).toBe(8)
    expect(LEVEL_UP_CRITERIA.basic_to_intermediate.vouchesRequired).toBe(1)
  })

  it('intermediate→expert requires 40 hours and 2 vouches', () => {
    expect(LEVEL_UP_CRITERIA.intermediate_to_expert.hoursRequired).toBe(40)
    expect(LEVEL_UP_CRITERIA.intermediate_to_expert.vouchesRequired).toBe(2)
  })

  it('basic with 8h + 1 vouch is eligible for intermediate', () => {
    const s = session({ durationMinutes: 480 }) // 8 hours
    const result = checkLevelUpEligibility(skill({ vouchedBy: ['voucher-1'] }), [s])
    expect(result.eligible).toBe(true)
    expect(result.nextLevel).toBe('intermediate')
    expect(result.currentHours).toBe(8)
    expect(result.currentVouches).toBe(1)
  })

  it('basic with 8h but 0 vouches is not eligible', () => {
    const s = session({ durationMinutes: 480 })
    const result = checkLevelUpEligibility(skill(), [s])
    expect(result.eligible).toBe(false)
    expect(result.nextLevel).toBe('intermediate')
  })

  it('basic with 1 vouch but only 7h is not eligible', () => {
    const s = session({ durationMinutes: 420 }) // 7 hours
    const result = checkLevelUpEligibility(skill({ vouchedBy: ['voucher-1'] }), [s])
    expect(result.eligible).toBe(false)
    expect(result.currentHours).toBe(7)
    expect(result.neededHours).toBe(8)
  })

  it('intermediate with 40h + 2 vouches is eligible for expert', () => {
    const s = session({ durationMinutes: 2400 }) // 40 hours
    const result = checkLevelUpEligibility(
      skill({ proficiency: 'intermediate', vouchedBy: ['v1', 'v2'] }),
      [s],
    )
    expect(result.eligible).toBe(true)
    expect(result.nextLevel).toBe('expert')
    expect(result.currentHours).toBe(40)
  })

  it('expert is at plateau — eligible:false, nextLevel:null', () => {
    const result = checkLevelUpEligibility(skill({ proficiency: 'expert' }), [])
    expect(result.eligible).toBe(false)
    expect(result.nextLevel).toBeNull()
    expect(result.neededHours).toBe(0)
    expect(result.neededVouches).toBe(0)
  })

  it('verified_expert is at plateau — eligible:false, nextLevel:null', () => {
    const result = checkLevelUpEligibility(skill({ proficiency: 'verified_expert' }), [])
    expect(result.eligible).toBe(false)
    expect(result.nextLevel).toBeNull()
  })

  it('only counts hours from sessions this member attended for this role', () => {
    const rightSession = session({ durationMinutes: 480 }) // 8 hours for nurse
    const wrongRole = session({ id: 's2', skillRole: 'farmer', durationMinutes: 480 })
    const wrongMember = session({ id: 's3', attendeesJson: JSON.stringify(['other-member']), durationMinutes: 480 })
    const result = checkLevelUpEligibility(
      skill({ vouchedBy: ['v1'] }),
      [rightSession, wrongRole, wrongMember],
    )
    expect(result.currentHours).toBe(8) // only the right session
    expect(result.eligible).toBe(true)
  })
})
