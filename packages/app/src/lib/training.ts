import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import type { TrainingSession, MemberSkill, SkillRole, ProficiencyLevel } from '@plus-ultra/core'

// ─── Gun SEA-safe helpers (inlined per project convention) ───────────────────

function gunEscape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (typeof v === 'string' && v.startsWith('SEA{')) {
      out[k] = '~' + v
    } else {
      out[k] = v
    }
  }
  return out
}

function gunUnescape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.startsWith('~SEA{')) {
      out[k] = v.slice(1)
    } else {
      out[k] = v
    }
  }
  return out
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export interface LogSessionParams {
  title: string
  skillRole: SkillRole | null
  date: number
  durationMinutes: number
  trainerId: string
  attendees: string[]
  notes: string
}

export async function logTrainingSession(
  tribeId: string,
  params: LogSessionParams,
  loggedBy: string
): Promise<TrainingSession> {
  const session: TrainingSession = {
    id: nanoid(),
    tribeId,
    title: params.title,
    skillRole: params.skillRole,
    date: params.date,
    durationMinutes: params.durationMinutes,
    trainerId: params.trainerId,
    attendeesJson: JSON.stringify(params.attendees),
    notes: params.notes,
    loggedBy,
    loggedAt: Date.now(),
  }

  const db = await getDB()
  await db.put('training-sessions', session, `${tribeId}:${session.id}`)

  const gunPayload = gunEscape({
    ...session,
    skillRole: session.skillRole ?? '',
  } as unknown as Record<string, unknown>)

  gun.get('tribes').get(tribeId).get('training-sessions').get(session.id).put(gunPayload)

  return session
}

export async function updateTrainingSession(
  tribeId: string,
  sessionId: string,
  patch: Partial<Omit<TrainingSession, 'id' | 'tribeId' | 'loggedBy' | 'loggedAt'>> & { attendees?: string[] }
): Promise<void> {
  const db = await getDB()
  const existing = (await db.get('training-sessions', `${tribeId}:${sessionId}`)) as TrainingSession | undefined
  if (!existing) return

  const updated: TrainingSession = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.skillRole !== undefined ? { skillRole: patch.skillRole } : {}),
    ...(patch.date !== undefined ? { date: patch.date } : {}),
    ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
    ...(patch.trainerId !== undefined ? { trainerId: patch.trainerId } : {}),
    ...(patch.attendees !== undefined ? { attendeesJson: JSON.stringify(patch.attendees) } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  }

  await db.put('training-sessions', updated, `${tribeId}:${sessionId}`)

  const gunPayload = gunEscape({
    ...updated,
    skillRole: updated.skillRole ?? '',
  } as unknown as Record<string, unknown>)

  gun.get('tribes').get(tribeId).get('training-sessions').get(sessionId).put(gunPayload)
}

export async function deleteTrainingSession(
  tribeId: string,
  sessionId: string
): Promise<void> {
  const db = await getDB()
  await db.delete('training-sessions', `${tribeId}:${sessionId}`)
  gun.get('tribes').get(tribeId).get('training-sessions').get(sessionId).put(null as unknown as Record<string, unknown>)
}

// ─── Level-up approval (manual write-through, NOT declareSkill) ───────────────

export async function approveLevelUp(
  tribeId: string,
  memberId: string,
  role: SkillRole,
  newProficiency: ProficiencyLevel,
  approverPub: string
): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${memberId}__${role}`
  const existing = (await db.get('skills', key)) as MemberSkill | undefined
  if (!existing) return

  const updated: MemberSkill = {
    ...existing,
    proficiency: newProficiency,
    vouchedBy: [...(existing.vouchedBy ?? []), approverPub],
    declaredAt: Date.now(),
  }

  await db.put('skills', updated, key)

  const gunPayload: Record<string, unknown> = {
    ...updated,
    specializations: updated.specializations ? JSON.stringify(updated.specializations) : undefined,
    vouchedBy: JSON.stringify(updated.vouchedBy),
  }

  gun
    .get('tribes')
    .get(tribeId)
    .get('skills')
    .get(`${memberId}__${role}`)
    .put(gunPayload as Record<string, unknown>)
}

// ─── Subscription ─────────────────────────────────────────────────────────────

function parseSession(d: Record<string, unknown>, tribeId: string): TrainingSession | null {
  if (!d.id || !d.title) return null
  const rawRole = d.skillRole as string | undefined
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    title: d.title as string,
    skillRole: rawRole === '' || rawRole === undefined ? null : rawRole as SkillRole,
    date: (d.date as number) ?? 0,
    durationMinutes: (d.durationMinutes as number) ?? 0,
    trainerId: (d.trainerId as string) ?? '',
    attendeesJson: (d.attendeesJson as string) ?? '[]',
    notes: (d.notes as string) ?? '',
    loggedBy: (d.loggedBy as string) ?? '',
    loggedAt: (d.loggedAt as number) ?? 0,
  }
}

export function subscribeToTrainingSessions(
  tribeId: string,
  callback: (sessions: TrainingSession[]) => void
): () => void {
  const map = new Map<string, TrainingSession>()

  // Seed from IDB
  getDB().then(db => db.getAll('training-sessions')).then(all => {
    for (const raw of all) {
      const s = raw as TrainingSession
      if (s.tribeId === tribeId && s.id) map.set(s.id, s)
    }
    if (map.size > 0) callback(Array.from(map.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('training-sessions')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      map.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const s = parseSession(raw, tribeId)
      if (s) {
        const existing = map.get(key)
        map.set(key, existing ? { ...existing, ...s } : s)
        getDB().then(db => db.put('training-sessions', map.get(key)!, `${tribeId}:${key}`))
      }
    }
    callback(Array.from(map.values()))
  }

  ref.map().once(handle)
  ref.map().on(handle)
  const poll = setInterval(() => ref.map().once(handle), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}
