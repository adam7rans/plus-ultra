import { gun } from './gun'
import type { MemberSkill, SkillRole, ProficiencyLevel } from '@plus-ultra/core'

// Composite key: memberId__role
function skillKey(memberId: string, role: SkillRole): string {
  return `${memberId}__${role}`
}

export async function declareSkill(
  tribeId: string,
  memberId: string,
  role: SkillRole,
  proficiency: ProficiencyLevel
): Promise<void> {
  const skill: MemberSkill = {
    memberId,
    tribeId,
    role,
    proficiency,
    declaredAt: Date.now(),
    vouchedBy: [],
  }

  return new Promise((resolve) => {
    gun
      .get('tribes')
      .get(tribeId)
      .get('skills')
      .get(skillKey(memberId, role))
      .put(skill as unknown as Record<string, unknown>, () => resolve())
  })
}

export async function removeSkill(
  tribeId: string,
  memberId: string,
  role: SkillRole
): Promise<void> {
  return new Promise((resolve) => {
    gun
      .get('tribes')
      .get(tribeId)
      .get('skills')
      .get(skillKey(memberId, role))
      .put(null as unknown as Record<string, unknown>, () => resolve())
  })
}

export async function getMySkills(tribeId: string, memberId: string): Promise<MemberSkill[]> {
  return new Promise((resolve) => {
    const results: MemberSkill[] = []
    const timeout = setTimeout(() => resolve(results), 3000)

    gun
      .get('tribes')
      .get(tribeId)
      .get('skills')
      .once((data: unknown) => {
        clearTimeout(timeout)
        if (!data || typeof data !== 'object') return resolve([])
        const obj = data as Record<string, unknown>
        for (const [key, val] of Object.entries(obj)) {
          if (key === '_' || !key.startsWith(memberId)) continue
          if (!val || typeof val !== 'object') continue
          const s = val as Record<string, unknown>
          if (s.memberId === memberId) {
            results.push(s as unknown as MemberSkill)
          }
        }
        resolve(results)
      })
  })
}

export function subscribeToAllSkills(
  tribeId: string,
  callback: (skills: MemberSkill[]) => void
): () => void {
  const skillsMap = new Map<string, MemberSkill>()

  const ref = gun.get('tribes').get(tribeId).get('skills')

  ref.map().on((data: unknown, key: string) => {
    if (!data || typeof data !== 'object' || key === '_') {
      skillsMap.delete(key)
    } else {
      const s = data as Record<string, unknown>
      if (s.memberId && s.role && s.proficiency) {
        skillsMap.set(key, s as unknown as MemberSkill)
      }
    }
    callback(Array.from(skillsMap.values()))
  })

  return () => {
    ref.map().off()
  }
}
