import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./gun.js', () => {
  function chain(path: string[] = []): Record<string, unknown> {
    return {
      get(key: string) { return chain([...path, key]) },
      put(payload: unknown, ack?: (a: { err?: string }) => void) {
        ack?.({})
        return chain(path)
      },
      on() { return chain(path) },
      once() { return chain(path) },
      map() { return chain(path) },
      off() {},
    }
  }
  return { gun: chain() }
})

let _offlineSince: number | null = null
vi.mock('./offline-tracker.js', () => ({
  getOfflineSince: () => _offlineSince,
  setOfflineSince: (ts: number) => { _offlineSince = ts },
  clearOfflineSince: () => { _offlineSince = null },
  computeOfflineStage: () => 0,
}))

import { logTrainingSession, updateTrainingSession, deleteTrainingSession, approveLevelUp } from './training.js'
import { getDB } from './db.js'
import type { TrainingSession, MemberSkill } from '@plus-ultra/core'

// ── logTrainingSession ────────────────────────────────────────────────────────

describe('logTrainingSession', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes session to IDB training-sessions store', async () => {
    const session = await logTrainingSession('tribe-1', {
      title: 'First Aid Basics',
      skillRole: 'nurse',
      date: '2026-03-16',
      durationMinutes: 60,
      trainerId: 'trainer-1',
      attendees: ['member-1', 'member-2'],
      notes: 'Great session',
    }, 'trainer-1')

    const db = await getDB()
    const stored = await db.get('training-sessions', `tribe-1:${session.id}`)
    expect(stored).toBeDefined()
    const s = stored as TrainingSession
    expect(s.id).toBe(session.id)
    expect(s.tribeId).toBe('tribe-1')
    expect(s.title).toBe('First Aid Basics')
    expect(s.skillRole).toBe('nurse')
  })

  it('IDB key is tribeId:sessionId', async () => {
    const session = await logTrainingSession('tribe-key', {
      title: 'Navigation',
      skillRole: null,
      date: '2026-03-16',
      durationMinutes: 45,
      trainerId: 'trainer-1',
      attendees: ['member-1'],
      notes: '',
    }, 'trainer-1')

    const db = await getDB()
    const stored = await db.get('training-sessions', `tribe-key:${session.id}`)
    expect(stored).toBeDefined()
  })

  it('stores attendees as JSON string', async () => {
    const session = await logTrainingSession('tribe-attendees', {
      title: 'Comms Training',
      skillRole: null,
      date: '2026-03-16',
      durationMinutes: 30,
      trainerId: 'trainer-1',
      attendees: ['member-a', 'member-b', 'member-c'],
      notes: '',
    }, 'trainer-1')

    const db = await getDB()
    const stored = await db.get('training-sessions', `tribe-attendees:${session.id}`) as TrainingSession
    expect(typeof stored.attendeesJson).toBe('string')
    const parsed = JSON.parse(stored.attendeesJson)
    expect(parsed).toHaveLength(3)
    expect(parsed).toContain('member-a')
  })

  it('handles null skillRole', async () => {
    const session = await logTrainingSession('tribe-no-role', {
      title: 'General Prep',
      skillRole: null,
      date: '2026-03-16',
      durationMinutes: 30,
      trainerId: 'trainer-1',
      attendees: [],
      notes: '',
    }, 'trainer-1')

    const db = await getDB()
    const stored = await db.get('training-sessions', `tribe-no-role:${session.id}`) as TrainingSession
    expect(stored.skillRole).toBeNull()
  })

  it('sets loggedBy and loggedAt', async () => {
    const before = Date.now()
    const session = await logTrainingSession('tribe-meta-ts', {
      title: 'Shelter Building',
      skillRole: null,
      date: '2026-03-16',
      durationMinutes: 90,
      trainerId: 'trainer-pub',
      attendees: [],
      notes: '',
    }, 'trainer-pub')

    expect(session.loggedBy).toBe('trainer-pub')
    expect(session.loggedAt).toBeGreaterThanOrEqual(before)
  })

  it('returns a session with a non-empty id', async () => {
    const session = await logTrainingSession('tribe-id', {
      title: 'Test',
      skillRole: null,
      date: '2026-03-16',
      durationMinutes: 10,
      trainerId: 'trainer-1',
      attendees: [],
      notes: '',
    }, 'trainer-1')

    expect(typeof session.id).toBe('string')
    expect(session.id.length).toBeGreaterThan(0)
  })
})

// ── deleteTrainingSession ─────────────────────────────────────────────────────

describe('deleteTrainingSession', () => {
  beforeEach(() => { _offlineSince = null })

  it('removes session from IDB', async () => {
    const session = await logTrainingSession('tribe-del-ts', {
      title: 'To Delete',
      skillRole: null,
      date: '2026-03-16',
      durationMinutes: 20,
      trainerId: 'trainer-1',
      attendees: [],
      notes: '',
    }, 'trainer-1')

    const db = await getDB()
    const before = await db.get('training-sessions', `tribe-del-ts:${session.id}`)
    expect(before).toBeDefined()

    await deleteTrainingSession('tribe-del-ts', session.id)

    const after = await db.get('training-sessions', `tribe-del-ts:${session.id}`)
    expect(after).toBeUndefined()
  })

  it('does not affect other sessions', async () => {
    const s1 = await logTrainingSession('tribe-del-multi-ts', {
      title: 'Session A', skillRole: null, date: '2026-03-16', durationMinutes: 10, trainerId: 't', attendees: [], notes: '',
    }, 't')
    const s2 = await logTrainingSession('tribe-del-multi-ts', {
      title: 'Session B', skillRole: null, date: '2026-03-16', durationMinutes: 10, trainerId: 't', attendees: [], notes: '',
    }, 't')

    await deleteTrainingSession('tribe-del-multi-ts', s1.id)

    const db = await getDB()
    const remaining = await db.get('training-sessions', `tribe-del-multi-ts:${s2.id}`)
    expect(remaining).toBeDefined()
  })
})

// ── updateTrainingSession ─────────────────────────────────────────────────────

describe('updateTrainingSession', () => {
  beforeEach(() => { _offlineSince = null })

  it('updates title', async () => {
    const session = await logTrainingSession('tribe-upd', {
      title: 'Old Title',
      skillRole: null,
      date: '2026-03-16',
      durationMinutes: 30,
      trainerId: 'trainer-1',
      attendees: ['member-1'],
      notes: '',
    }, 'trainer-1')

    await updateTrainingSession('tribe-upd', session.id, { title: 'New Title' })

    const db = await getDB()
    const stored = await db.get('training-sessions', `tribe-upd:${session.id}`) as TrainingSession
    expect(stored.title).toBe('New Title')
  })

  it('updates attendeesJson when patch.attendees provided', async () => {
    const session = await logTrainingSession('tribe-upd-att', {
      title: 'Comms',
      skillRole: null,
      date: '2026-03-16',
      durationMinutes: 30,
      trainerId: 'trainer-1',
      attendees: ['member-1'],
      notes: '',
    }, 'trainer-1')

    await updateTrainingSession('tribe-upd-att', session.id, { attendees: ['member-1', 'member-2', 'member-3'] })

    const db = await getDB()
    const stored = await db.get('training-sessions', `tribe-upd-att:${session.id}`) as TrainingSession
    const parsed = JSON.parse(stored.attendeesJson)
    expect(parsed).toHaveLength(3)
    expect(parsed).toContain('member-2')
  })

  it('merges patch — preserves unchanged fields', async () => {
    const session = await logTrainingSession('tribe-upd-merge', {
      title: 'Preserve Me',
      skillRole: 'nurse' as const,
      date: '2026-03-16',
      durationMinutes: 45,
      trainerId: 'trainer-1',
      attendees: ['member-1'],
      notes: 'important note',
    }, 'trainer-1')

    await updateTrainingSession('tribe-upd-merge', session.id, { title: 'Updated Title' })

    const db = await getDB()
    const stored = await db.get('training-sessions', `tribe-upd-merge:${session.id}`) as TrainingSession
    expect(stored.skillRole).toBe('nurse')
    expect(stored.notes).toBe('important note')
    expect(stored.durationMinutes).toBe(45)
  })
})

// ── approveLevelUp ────────────────────────────────────────────────────────────

describe('approveLevelUp', () => {
  beforeEach(() => { _offlineSince = null })

  it('updates skill proficiency in IDB', async () => {
    const db = await getDB()
    await db.put('skills', {
      tribeId: 'tribe-1',
      memberId: 'member-1',
      role: 'nurse',
      proficiency: 'basic',
      vouchedBy: [],
    }, 'tribe-1:member-1__nurse')

    await approveLevelUp('tribe-1', 'member-1', 'nurse', 'verified_expert', 'approver-pub')

    const stored = await db.get('skills', 'tribe-1:member-1__nurse') as MemberSkill
    expect(stored.proficiency).toBe('verified_expert')
  })

  it('adds approverPub to vouchedBy', async () => {
    const db = await getDB()
    await db.put('skills', {
      tribeId: 'tribe-1',
      memberId: 'member-2',
      role: 'nurse',
      proficiency: 'intermediate',
      vouchedBy: [],
    }, 'tribe-1:member-2__nurse')

    await approveLevelUp('tribe-1', 'member-2', 'nurse', 'expert', 'approver-abc')

    const stored = await db.get('skills', 'tribe-1:member-2__nurse') as MemberSkill
    expect(stored.vouchedBy).toContain('approver-abc')
  })

  it('appends to existing vouchedBy array', async () => {
    const db = await getDB()
    await db.put('skills', {
      tribeId: 'tribe-1',
      memberId: 'member-3',
      role: 'nurse',
      proficiency: 'basic',
      vouchedBy: ['existing-voucher'],
    }, 'tribe-1:member-3__nurse')

    await approveLevelUp('tribe-1', 'member-3', 'nurse', 'intermediate', 'new-approver')

    const stored = await db.get('skills', 'tribe-1:member-3__nurse') as MemberSkill
    expect(stored.vouchedBy).toContain('existing-voucher')
    expect(stored.vouchedBy).toContain('new-approver')
    expect(stored.vouchedBy).toHaveLength(2)
  })

  it('is a no-op if skill not found', async () => {
    // Should not throw — skill doesn't exist
    await expect(
      approveLevelUp('tribe-1', 'nonexistent-member', 'nurse', 'expert', 'approver-pub')
    ).resolves.toBeUndefined()
  })

  it('does not create a new record if skill not found', async () => {
    await approveLevelUp('tribe-ghost', 'ghost-member', 'nurse', 'expert', 'approver-pub')

    const db = await getDB()
    const stored = await db.get('skills', 'tribe-ghost:ghost-member__nurse')
    expect(stored).toBeUndefined()
  })
})
