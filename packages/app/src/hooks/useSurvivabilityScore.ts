import { useEffect, useState } from 'react'
import { survivabilityScore, bucketScore, TIER_1_ROLES, TIER_2_ROLES, TIER_3_ROLES } from '@plus-ultra/core'
import { subscribeToMembers } from '../lib/tribes'
import { subscribeToAllSkills } from '../lib/skills'
import type { Tribe, TribeMember, MemberSkill, SkillRole } from '@plus-ultra/core'

const ALL_ROLES = [...TIER_1_ROLES, ...TIER_2_ROLES, ...TIER_3_ROLES]

export interface SurvivabilityResult {
  score: number
  bucketScores: Record<SkillRole, number>
  members: TribeMember[]
  skills: MemberSkill[]
  criticalGaps: SkillRole[]   // Tier 1 roles at zero
  warnings: SkillRole[]       // Any role below minimum
}

// Stub tribe object for the algorithm (priv not needed for scoring)
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
      bucketScores: Object.fromEntries(ALL_ROLES.map(r => [r, 0])) as Record<SkillRole, number>,
      members: [],
      skills: [],
      criticalGaps: [...TIER_1_ROLES],
      warnings: [...ALL_ROLES],
    }
  }

  const tribe = makeTribeStub(tribeId)
  const score = survivabilityScore(tribe, members, skills)

  const bucketScores = Object.fromEntries(
    ALL_ROLES.map(r => [r, bucketScore(r, members, skills)])
  ) as Record<SkillRole, number>

  const criticalGaps = TIER_1_ROLES.filter(r => bucketScores[r] === 0)

  // Roles below 0.6 (i.e. below minimum coverage)
  const warnings = ALL_ROLES.filter(r => {
    const s = bucketScores[r]
    return s > 0 && s < 0.6
  })

  return { score, bucketScores, members, skills, criticalGaps, warnings }
}
