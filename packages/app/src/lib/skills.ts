import { gun } from './gun'
import { getDB } from './db'
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

  // Write to IDB first (survives restarts)
  const db = await getDB()
  await db.put('skills', skill, `${tribeId}:${skillKey(memberId, role)}`)

  // Gun for P2P sync (fire and forget)
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

  // Seed from IDB immediately (survives restarts)
  getDB().then(db => db.getAll('skills')).then(all => {
    for (const s of all) {
      const skill = s as MemberSkill
      if (skill.tribeId === tribeId && skill.memberId && skill.role && skill.proficiency) {
        skillsMap.set(skillKey(skill.memberId, skill.role), skill)
      }
    }
    if (skillsMap.size > 0) callback(Array.from(skillsMap.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('skills')

  function handleSkill(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      skillsMap.delete(key)
    } else {
      const s = data as Record<string, unknown>
      if (s.memberId && s.role && s.proficiency) {
        const skill = s as unknown as MemberSkill
        skillsMap.set(key, skill)
        // persist Gun-received skills to IDB
        getDB().then(db => db.put('skills', skill, `${tribeId}:${key}`))
      }
    }
    callback(Array.from(skillsMap.values()))
  }

  // once() requests current state from relay
  ref.map().once(handleSkill)
  // on() for live updates
  ref.map().on(handleSkill)

  return () => {
    ref.map().off()
  }
}
