import { useMemo } from 'react'
import { checkLevelUpEligibility } from '@plus-ultra/core'
import type { MemberSkill, TrainingSession, TribeMember, SkillRole, LevelUpEligibilityResult } from '@plus-ultra/core'

export interface LevelUpQueueItem {
  memberId: string
  memberName: string
  role: SkillRole
  skill: MemberSkill
  eligibility: LevelUpEligibilityResult
}

export function useLevelUpQueue(
  skills: MemberSkill[],
  sessions: TrainingSession[],
  members: TribeMember[]
): LevelUpQueueItem[] {
  return useMemo(() => {
    const memberMap = new Map(members.map(m => [m.pubkey, m]))
    const queue: LevelUpQueueItem[] = []

    for (const skill of skills) {
      const eligibility = checkLevelUpEligibility(skill, sessions)
      if (!eligibility.eligible) continue
      const member = memberMap.get(skill.memberId)
      queue.push({
        memberId: skill.memberId,
        memberName: member?.displayName ?? skill.memberId.slice(0, 8),
        role: skill.role,
        skill,
        eligibility,
      })
    }

    return queue
  }, [skills, sessions, members])
}
