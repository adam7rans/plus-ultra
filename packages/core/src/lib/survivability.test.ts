import { describe, it, expect } from 'vitest'
import { survivabilityScore, bucketScore, roleScore, domainScore } from './survivability.js'
import { slotsNeeded, ROLE_BY_KEY, totalSlotsNeeded, activeRoles } from './role-registry.js'
import type { Tribe } from '../types/tribe.js'
import type { TribeMember } from '../types/tribe.js'
import type { MemberSkill } from '../types/skills.js'

const mockTribe: Tribe = {
  id: 'test-tribe',
  pub: 'pub',
  priv: 'priv',
  name: 'Test Tribe',
  location: 'Austin',
  region: 'texas',
  createdAt: Date.now(),
  constitutionTemplate: 'council',
  founderId: 'founder-pub',
}

function makeMember(pubkey: string): TribeMember {
  return {
    pubkey,
    tribeId: 'test-tribe',
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    status: 'active',
    attachmentScore: 1.0,
    memberType: 'adult',
    displayName: pubkey,
  }
}

function makeSkill(memberId: string, role: MemberSkill['role'], proficiency: MemberSkill['proficiency'] = 'expert'): MemberSkill {
  return { memberId, tribeId: 'test-tribe', role, proficiency, declaredAt: Date.now(), vouchedBy: [] }
}

describe('slotsNeeded scaling', () => {
  it('linear roles scale with population', () => {
    const spec = ROLE_BY_KEY['tactical_shooter']
    expect(slotsNeeded(30, spec)).toBe(4)    // max(2, ceil(30/8)) = 4
    expect(slotsNeeded(150, spec)).toBe(19)  // ceil(150/8) = 19
    expect(slotsNeeded(500, spec)).toBe(63)  // ceil(500/8) = 63
  })

  it('sqrt roles grow sub-linearly', () => {
    const spec = ROLE_BY_KEY['squad_leader']
    const at30 = slotsNeeded(30, spec)
    const at150 = slotsNeeded(150, spec)
    const at500 = slotsNeeded(500, spec)
    expect(at30).toBeGreaterThanOrEqual(1)
    expect(at150).toBeGreaterThan(at30)
    expect(at500).toBeGreaterThan(at150)
    // sqrt grows much slower than linear
    expect(at500).toBeLessThan(at150 * 3)
  })

  it('log roles grow very slowly', () => {
    const spec = ROLE_BY_KEY['strategic_commander']
    expect(slotsNeeded(30, spec)).toBeGreaterThanOrEqual(1)
    expect(slotsNeeded(10000, spec)).toBeLessThanOrEqual(10) // capped
  })

  it('fixed roles stay constant', () => {
    const spec = ROLE_BY_KEY['well_driller']
    expect(slotsNeeded(30, spec)).toBe(1)
    expect(slotsNeeded(500, spec)).toBe(1)
  })

  it('roles below minPop return 0', () => {
    const spec = ROLE_BY_KEY['k9_handler'] // minPop: 75
    expect(slotsNeeded(30, spec)).toBe(0)
    expect(slotsNeeded(75, spec)).toBeGreaterThanOrEqual(1)
  })

  it('totalSlotsNeeded grows with population', () => {
    const at30 = totalSlotsNeeded(30)
    const at150 = totalSlotsNeeded(150)
    const at500 = totalSlotsNeeded(500)
    expect(at30).toBeGreaterThan(20)
    expect(at150).toBeGreaterThan(at30)
    expect(at500).toBeGreaterThan(at150)
  })

  it('activeRoles increases with population as thresholds are met', () => {
    const at30 = activeRoles(30)
    const at150 = activeRoles(150)
    expect(at150.length).toBeGreaterThanOrEqual(at30.length)
  })
})

describe('survivabilityScore', () => {
  it('returns 0 for empty tribe', () => {
    expect(survivabilityScore(mockTribe, [], [])).toBe(0)
  })

  it('caps at 25 if any Tier 1 domain is zero', () => {
    const members = [makeMember('a')]
    // Fill some tier 1 roles but leave medical empty
    const skills: MemberSkill[] = [
      makeSkill('a', 'farmer'),
      makeSkill('a', 'tactical_shooter'),
      makeSkill('a', 'well_driller'),
    ]
    const score = survivabilityScore(mockTribe, members, skills)
    expect(score).toBeLessThanOrEqual(25)
  })

  it('goes above 25 when all Tier 1 domains have good coverage', () => {
    const members = [makeMember('a'), makeMember('b'), makeMember('c')]
    const skills: MemberSkill[] = [
      // Medical (cover all minPop=0 roles)
      makeSkill('a', 'physician', 'verified_expert'),
      makeSkill('a', 'nurse', 'verified_expert'),
      makeSkill('a', 'paramedic', 'verified_expert'),
      makeSkill('a', 'pharmacist', 'verified_expert'),
      // Food (cover minPop=0 roles)
      makeSkill('b', 'farmer', 'verified_expert'),
      makeSkill('b', 'livestock_handler', 'verified_expert'),
      makeSkill('b', 'hunter', 'verified_expert'),
      makeSkill('b', 'forager', 'verified_expert'),
      makeSkill('b', 'food_preserver', 'verified_expert'),
      // Security (cover minPop=0 roles)
      makeSkill('c', 'tactical_shooter', 'verified_expert'),
      makeSkill('c', 'squad_leader', 'verified_expert'),
      makeSkill('c', 'combat_medic', 'verified_expert'),
      // Water
      makeSkill('c', 'well_driller', 'verified_expert'),
      makeSkill('c', 'water_treatment', 'verified_expert'),
      makeSkill('c', 'plumber', 'verified_expert'),
    ]
    const score = survivabilityScore(mockTribe, members, skills)
    expect(score).toBeGreaterThan(25)
  })

  it('verified_expert counts more than basic', () => {
    const members = [makeMember('a')]
    const basicSkills: MemberSkill[] = [
      makeSkill('a', 'physician', 'basic'),
      makeSkill('a', 'farmer', 'basic'),
      makeSkill('a', 'tactical_shooter', 'basic'),
      makeSkill('a', 'well_driller', 'basic'),
    ]
    const expertSkills: MemberSkill[] = [
      makeSkill('a', 'physician', 'verified_expert'),
      makeSkill('a', 'farmer', 'verified_expert'),
      makeSkill('a', 'tactical_shooter', 'verified_expert'),
      makeSkill('a', 'well_driller', 'verified_expert'),
    ]
    const basicScore = survivabilityScore(mockTribe, members, basicSkills)
    const expertScore = survivabilityScore(mockTribe, members, expertSkills)
    expect(expertScore).toBeGreaterThan(basicScore)
  })

  it('overfilled roles do not exceed 100', () => {
    const members = Array.from({ length: 10 }, (_, i) => makeMember(`member-${i}`))
    const skills: MemberSkill[] = members.flatMap(m => [
      makeSkill(m.pubkey, 'physician', 'verified_expert'),
      makeSkill(m.pubkey, 'nurse', 'verified_expert'),
      makeSkill(m.pubkey, 'farmer', 'verified_expert'),
      makeSkill(m.pubkey, 'hunter', 'verified_expert'),
      makeSkill(m.pubkey, 'tactical_shooter', 'verified_expert'),
      makeSkill(m.pubkey, 'well_driller', 'verified_expert'),
      makeSkill(m.pubkey, 'electrician', 'verified_expert'),
      makeSkill(m.pubkey, 'carpenter', 'verified_expert'),
      makeSkill(m.pubkey, 'ham_radio_operator', 'verified_expert'),
      makeSkill(m.pubkey, 'cook', 'verified_expert'),
    ])
    const score = survivabilityScore(mockTribe, members, skills)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('roleScore', () => {
  it('returns 0 with no qualified members', () => {
    expect(roleScore('physician', 0, [])).toBe(0)
  })

  it('returns 0.6 at exactly minimum coverage', () => {
    const skills = [makeSkill('a', 'well_driller', 'expert')] // fixed base:1, expert weight 1.0
    expect(roleScore('well_driller', 1, skills)).toBe(0.6)
  })
})

describe('domainScore', () => {
  it('returns 1 when all domain roles are below minPop', () => {
    // At pop 10, many roles have minPop > 10 — if all roles in a domain are inactive, score = 1
    const score = domainScore('craft', 10, []) // craft roles all have minPop >= 50
    expect(score).toBe(1)
  })

  it('returns 0 when active roles have no coverage', () => {
    // medical roles are active at pop 30 (physician, nurse, paramedic, pharmacist have minPop 0)
    const score = domainScore('medical', 30, [])
    expect(score).toBe(0)
  })
})
