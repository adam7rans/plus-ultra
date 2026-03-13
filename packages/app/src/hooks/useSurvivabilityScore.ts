import { useEffect, useState } from 'react'
import { survivabilityScore, bucketScore, TIER_1_ROLES, ALL_ROLES, ROLE_BY_KEY, slotsNeeded } from '@plus-ultra/core'
import { subscribeToMembers } from '../lib/tribes'
import { subscribeToAllSkills } from '../lib/skills'
import type { Tribe, TribeMember, MemberSkill, SkillRole } from '@plus-ultra/core'

const ALL_ROLE_KEYS = ALL_ROLES

export interface SurvivabilityResult {
  score: number
  bucketScores: Record<SkillRole, number>
  members: TribeMember[]
  skills: MemberSkill[]
  criticalGaps: SkillRole[]   // Tier 1 roles at zero that are needed
  warnings: SkillRole[]       // Any role below minimum
}

// Stub tribe object for the algorithm
function makeTribeStub(tribeId: string): Tribe {
  return {
    id: tribeId, pub: '', priv: '', name: '', location: '',
    region: '', createdAt: 0, constitutionTemplate: 'council', founderId: '',
  }
}

export function useSurvivabilityScore(tribeId: string | null): SurvivabilityResult {
  const [members, setMembers] = useState<TribeMember[]>([])
  const [skills, setSkills] = useState<MemberSkill[]>([])

  useEffect(() => {
    if (!tribeId) return
    const unsubMembers = subscribeToMembers(tribeId, setMembers)
    const unsubSkills = subscribeToAllSkills(tribeId, setSkills)
    return () => {
      unsubMembers()
      unsubSkills()
    }
  }, [tribeId])

  if (!tribeId) {
    return {
      score: 0,
      bucketScores: Object.fromEntries(ALL_ROLE_KEYS.map(r => [r, 0])) as Record<SkillRole, number>,
      members: [],
      skills: [],
      criticalGaps: TIER_1_ROLES.filter(r => slotsNeeded(0, ROLE_BY_KEY[r]) > 0),
      warnings: [],
    }
  }

  const tribe = makeTribeStub(tribeId)
  const score = survivabilityScore(tribe, members, skills)
  const memberCount = members.length

  const bucketScores = Object.fromEntries(
    ALL_ROLE_KEYS.map(r => [r, bucketScore(r, members, skills)])
  ) as Record<SkillRole, number>

  // Critical gaps: Tier 1 roles that are needed (slots > 0) but have zero coverage
  const criticalGaps = TIER_1_ROLES.filter(r => {
    const spec = ROLE_BY_KEY[r]
    return slotsNeeded(memberCount, spec) > 0 && bucketScores[r] === 0
  })

  // Warnings: roles below 0.6 (below minimum coverage) that are needed
  const warnings = ALL_ROLE_KEYS.filter(r => {
    const spec = ROLE_BY_KEY[r]
    if (slotsNeeded(memberCount, spec) === 0) return false
    const s = bucketScores[r]
    return s > 0 && s < 0.6
  })

  return { score, bucketScores, members, skills, criticalGaps, warnings }
}
