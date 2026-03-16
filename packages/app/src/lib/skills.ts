import { gun } from './gun'
import { getDB } from './db'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import { convexWrite } from './sync-adapter'
import type { MemberSkill, SkillRole, ProficiencyLevel } from '@plus-ultra/core'

// Composite key: memberId__role
export function skillKey(memberId: string, role: SkillRole): string {
  return `${memberId}__${role}`
}

export interface SkillOpts {
  specializations?: string[]
  yearsExperience?: string
  notes?: string
}

export async function declareSkill(
  tribeId: string,
  memberId: string,
  role: SkillRole,
  proficiency: ProficiencyLevel,
  opts?: SkillOpts
): Promise<void> {
  const skill: MemberSkill = {
    memberId,
    tribeId,
    role,
    proficiency,
    declaredAt: Date.now(),
    vouchedBy: [],
    ...(opts?.specializations?.length ? { specializations: opts.specializations } : {}),
    ...(opts?.yearsExperience ? { yearsExperience: opts.yearsExperience } : {}),
    ...(opts?.notes ? { notes: opts.notes } : {}),
  }

  // Write to IDB first (survives restarts)
  const db = await getDB()
  await db.put('skills', skill, `${tribeId}:${skillKey(memberId, role)}`)
  void convexWrite('skills.declare', { memberId, tribeId, role, proficiency, declaredAt: skill.declaredAt, vouchedBy: skill.vouchedBy ?? [], specializations: skill.specializations, yearsExperience: skill.yearsExperience, notes: skill.notes })

  // Gun for P2P sync (fire and forget)
  // Gun can't store JS arrays as node values; serialize specializations as JSON string
  const gunPayload: Record<string, unknown> = {
    ...skill,
    specializations: skill.specializations ? JSON.stringify(skill.specializations) : undefined,
  }

  await new Promise<void>((resolve) => {
    gun
      .get('tribes')
      .get(tribeId)
      .get('skills')
      .get(skillKey(memberId, role))
      .put(gunPayload as Record<string, unknown>, () => resolve())
  })

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `skills:${tribeId}:${skillKey(memberId, role)}:${Date.now()}`,
      gunStore: 'skills', tribeId, recordKey: skillKey(memberId, role),
      payload: gunPayload,
      convexMutation: 'skills.declare',
      convexArgs: { memberId, tribeId, role, proficiency, declaredAt: skill.declaredAt, vouchedBy: skill.vouchedBy ?? [], specializations: skill.specializations, yearsExperience: skill.yearsExperience, notes: skill.notes },
      queuedAt: Date.now(),
    })
  }
}

export async function vouchForSkill(
  tribeId: string,
  memberId: string,
  role: SkillRole,
  voucherPub: string
): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${skillKey(memberId, role)}`
  const existing = (await db.get('skills', key)) as MemberSkill | undefined
  if (!existing) return

  // Don't double-vouch
  if (existing.vouchedBy?.includes(voucherPub)) return

  const updated: MemberSkill = {
    ...existing,
    vouchedBy: [...(existing.vouchedBy ?? []), voucherPub],
  }

  // IDB first
  await db.put('skills', updated, key)
  void convexWrite('skills.vouch', { tribeId, memberId, role, voucherPub })

  // Gun fire-and-forget — vouchedBy as JSON string (Gun can't store arrays)
  gun
    .get('tribes')
    .get(tribeId)
    .get('skills')
    .get(skillKey(memberId, role))
    .put({ vouchedBy: JSON.stringify(updated.vouchedBy) } as unknown as Record<string, unknown>)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `skills:${tribeId}:${skillKey(memberId, role)}:${Date.now()}`,
      gunStore: 'skills', tribeId, recordKey: skillKey(memberId, role),
      payload: { vouchedBy: JSON.stringify(updated.vouchedBy) },
      convexMutation: 'skills.vouch',
      convexArgs: { tribeId, memberId, role, voucherPub },
      queuedAt: Date.now(),
    })
  }
}

export async function removeSkill(
  tribeId: string,
  memberId: string,
  role: SkillRole
): Promise<void> {
  const db = await getDB()
  await db.delete('skills', `${tribeId}:${skillKey(memberId, role)}`)

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
  }).catch(err => console.warn('[skills] IDB seed failed:', err))

  const ref = gun.get('tribes').get(tribeId).get('skills')

  function handleSkill(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      skillsMap.delete(key)
    } else {
      const s = data as Record<string, unknown>
      if (s.memberId && s.role && s.proficiency) {
        // Parse specializations back from JSON string (Gun can't store arrays natively)
        let parsedSpecs: string[] | undefined
        if (typeof s.specializations === 'string') {
          try { parsedSpecs = JSON.parse(s.specializations) } catch { parsedSpecs = undefined }
        } else if (Array.isArray(s.specializations)) {
          parsedSpecs = s.specializations as string[]
        }

        // Parse vouchedBy back from JSON string
        let parsedVouches: string[] = []
        if (typeof s.vouchedBy === 'string') {
          try { parsedVouches = JSON.parse(s.vouchedBy) } catch { parsedVouches = [] }
        } else if (Array.isArray(s.vouchedBy)) {
          parsedVouches = s.vouchedBy as string[]
        }

        const skill: MemberSkill = {
          ...(s as unknown as MemberSkill),
          specializations: parsedSpecs,
          vouchedBy: parsedVouches,
        }
        const local = skillsMap.get(key)
        if (!local || (skill.declaredAt ?? 0) >= (local.declaredAt ?? 0)) {
          skillsMap.set(key, skill)
          // persist Gun-received skills to IDB
          getDB().then(db => db.put('skills', skill, `${tribeId}:${key}`))
        }
      }
    }
    callback(Array.from(skillsMap.values()))
  }

  ref.map().once(handleSkill)
  ref.map().on(handleSkill)
  const poll = setInterval(() => ref.map().once(handleSkill), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}
