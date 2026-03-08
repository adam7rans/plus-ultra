import { describe, it, expect } from 'vitest'
import { survivabilityScore, bucketScore } from './survivability.js'
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
    displayName: pubkey,
  }
}

function makeSkill(memberId: string, role: MemberSkill['role'], proficiency: MemberSkill['proficiency'] = 'expert'): MemberSkill {
  return { memberId, tribeId: 'test-tribe', role, proficiency, declaredAt: Date.now(), vouchedBy: [] }
}

describe('survivabilityScore', () => {
  it('returns 0 for empty tribe', () => {
    expect(survivabilityScore(mockTribe, [], [])).toBe(0)
  })

  it('caps at 25 if any Tier 1 bucket is zero', () => {
    const members = [makeMember('a')]
    // Only fill non-medical tier 1 buckets — medical is zero
    const skills: MemberSkill[] = [
      makeSkill('a', 'food_production'),
      makeSkill('a', 'security_tactical'),
      makeSkill('a', 'water_plumbing'),
    ]
    const score = survivabilityScore(mockTribe, members, skills)
    expect(score).toBeLessThanOrEqual(25)
  })

  it('goes above 25 when all Tier 1 buckets are filled', () => {
    const members = [makeMember('a')]
    const skills: MemberSkill[] = [
      makeSkill('a', 'medical'),
      makeSkill('a', 'food_production'),
      makeSkill('a', 'security_tactical'),
      makeSkill('a', 'water_plumbing'),
    ]
    const score = survivabilityScore(mockTribe, members, skills)
    expect(score).toBeGreaterThan(25)
  })

  it('verified_expert counts more than basic', () => {
    const members = [makeMember('a')]
    const basicSkills: MemberSkill[] = [makeSkill('a', 'medical', 'basic'), makeSkill('a', 'food_production', 'basic'), makeSkill('a', 'security_tactical', 'basic'), makeSkill('a', 'water_plumbing', 'basic')]
    const expertSkills: MemberSkill[] = [makeSkill('a', 'medical', 'verified_expert'), makeSkill('a', 'food_production', 'verified_expert'), makeSkill('a', 'security_tactical', 'verified_expert'), makeSkill('a', 'water_plumbing', 'verified_expert')]
    const basicScore = survivabilityScore(mockTribe, members, basicSkills)
    const expertScore = survivabilityScore(mockTribe, members, expertSkills)
    expect(expertScore).toBeGreaterThan(basicScore)
  })

  it('overfilled buckets do not exceed 100', () => {
    const members = Array.from({ length: 10 }, (_, i) => makeMember(`member-${i}`))
    const skills: MemberSkill[] = members.flatMap(m => [
      makeSkill(m.pubkey, 'medical', 'verified_expert'),
      makeSkill(m.pubkey, 'food_production', 'verified_expert'),
      makeSkill(m.pubkey, 'security_tactical', 'verified_expert'),
      makeSkill(m.pubkey, 'water_plumbing', 'verified_expert'),
      makeSkill(m.pubkey, 'electrical_solar', 'verified_expert'),
      makeSkill(m.pubkey, 'construction', 'verified_expert'),
      makeSkill(m.pubkey, 'cooking_preservation', 'verified_expert'),
      makeSkill(m.pubkey, 'comms_tech', 'verified_expert'),
    ])
    const score = survivabilityScore(mockTribe, members, skills)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('bucketScore', () => {
  it('returns 0 with no qualified members', () => {
    expect(bucketScore('medical', [], [])).toBe(0)
  })

  it('returns 0.6 at exactly minimum coverage', () => {
    const members = [makeMember('a')]
    const skills = [makeSkill('a', 'water_plumbing', 'expert')] // minimum is 1, expert weight is 1.0 so ratio = 1
    expect(bucketScore('water_plumbing', members, skills)).toBe(0.6)
  })
})
