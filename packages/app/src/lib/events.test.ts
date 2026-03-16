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

import { createEvent, updateEvent, deleteEvent, cancelEvent } from './events.js'
import { getDB } from './db.js'
import type { ScheduledEvent } from '@plus-ultra/core'

// ── Helpers ───────────────────────────────────────────────────────────────────

function baseParams() {
  return {
    type: 'training' as const,
    title: 'Morning Drill',
    description: 'Daily training session',
    startAt: Date.now() + 3600_000,
    durationMin: 60,
    recurrence: { frequency: 'once' as const },
    assignedTo: ['member-1', 'member-2'],
    location: 'Main Hall',
  }
}

// ── createEvent ───────────────────────────────────────────────────────────────

describe('createEvent', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes event to events IDB store', async () => {
    const event = await createEvent('tribe-1', 'member-1', baseParams())

    const db = await getDB()
    const stored = await db.get('events', `tribe-1:${event.id}`)
    expect(stored).toBeDefined()
    const e = stored as ScheduledEvent
    expect(e.title).toBe('Morning Drill')
    expect(e.tribeId).toBe('tribe-1')
    expect(e.type).toBe('training')
  })

  it('IDB key is tribeId:eventId', async () => {
    const event = await createEvent('tribe-key', 'member-1', baseParams())

    const db = await getDB()
    const stored = await db.get('events', `tribe-key:${event.id}`)
    expect(stored).toBeDefined()
  })

  it('sets cancelled to false on creation', async () => {
    const event = await createEvent('tribe-1', 'member-1', baseParams())

    const db = await getDB()
    const stored = await db.get('events', `tribe-1:${event.id}`) as ScheduledEvent
    expect(stored.cancelled).toBe(false)
  })

  it('stores assignedTo as array (not JSON string) in IDB', async () => {
    const params = { ...baseParams(), assignedTo: ['alpha', 'bravo', 'charlie'] }
    const event = await createEvent('tribe-1', 'member-1', params)

    const db = await getDB()
    const stored = await db.get('events', `tribe-1:${event.id}`) as ScheduledEvent
    expect(Array.isArray(stored.assignedTo)).toBe(true)
    expect(stored.assignedTo).toEqual(['alpha', 'bravo', 'charlie'])
  })

  it('auto-generates id and sets createdAt', async () => {
    const before = Date.now()
    const event = await createEvent('tribe-1', 'member-1', baseParams())

    expect(event.id).toBeTruthy()
    expect(event.createdAt).toBeGreaterThanOrEqual(before)
    expect(event.createdBy).toBe('member-1')
  })

  it('queues pending-sync when offline', async () => {
    _offlineSince = Date.now() - 3000

    const event = await createEvent('tribe-offline', 'member-1', baseParams())
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string; recordKey: string }
      return e.gunStore === 'events' &&
             e.tribeId === 'tribe-offline' &&
             e.recordKey === event.id
    })
    expect(syncEntry).toBeDefined()

    _offlineSince = null
  })

  it('does not queue pending-sync when online', async () => {
    const event = await createEvent('tribe-online', 'member-1', baseParams())
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { recordKey: string }
      return e.recordKey === event.id
    })
    expect(syncEntry).toBeUndefined()
  })
})

// ── updateEvent ───────────────────────────────────────────────────────────────

describe('updateEvent', () => {
  beforeEach(() => { _offlineSince = null })

  it('updates a field and returns the updated event', async () => {
    const event = await createEvent('tribe-1', 'member-1', baseParams())

    const updated = await updateEvent('tribe-1', event.id, { title: 'Updated Drill' })

    expect(updated).not.toBeNull()
    expect(updated!.title).toBe('Updated Drill')

    const db = await getDB()
    const stored = await db.get('events', `tribe-1:${event.id}`) as ScheduledEvent
    expect(stored.title).toBe('Updated Drill')
  })

  it('preserves unchanged fields after update', async () => {
    const event = await createEvent('tribe-1', 'member-1', baseParams())

    await updateEvent('tribe-1', event.id, { title: 'New Title' })

    const db = await getDB()
    const stored = await db.get('events', `tribe-1:${event.id}`) as ScheduledEvent
    expect(stored.type).toBe('training')
    expect(stored.location).toBe('Main Hall')
    expect(stored.cancelled).toBe(false)
  })

  it('returns null when event does not exist', async () => {
    const result = await updateEvent('tribe-1', 'nonexistent-event-id', { title: 'Ghost' })
    expect(result).toBeNull()
  })

  it('queues pending-sync when offline', async () => {
    const event = await createEvent('tribe-upd-offline', 'member-1', baseParams())

    _offlineSince = Date.now() - 1000
    await updateEvent('tribe-upd-offline', event.id, { durationMin: 90 })
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string; recordKey: string }
      return e.gunStore === 'events' &&
             e.tribeId === 'tribe-upd-offline' &&
             e.recordKey === event.id
    })
    expect(syncEntry).toBeDefined()

    _offlineSince = null
  })
})

// ── deleteEvent ───────────────────────────────────────────────────────────────

describe('deleteEvent', () => {
  beforeEach(() => { _offlineSince = null })

  it('removes event from events IDB store', async () => {
    const event = await createEvent('tribe-del', 'member-1', baseParams())

    const db = await getDB()
    const before = await db.get('events', `tribe-del:${event.id}`)
    expect(before).toBeDefined()

    await deleteEvent('tribe-del', event.id)

    const after = await db.get('events', `tribe-del:${event.id}`)
    expect(after).toBeUndefined()
  })

  it('is a no-op for non-existent event', async () => {
    await expect(
      deleteEvent('tribe-1', 'ghost-event-id')
    ).resolves.toBeUndefined()
  })
})

// ── cancelEvent ───────────────────────────────────────────────────────────────

describe('cancelEvent', () => {
  beforeEach(() => { _offlineSince = null })

  it('sets cancelled to true in IDB', async () => {
    const event = await createEvent('tribe-cancel', 'member-1', baseParams())

    await cancelEvent('tribe-cancel', event.id)

    const db = await getDB()
    const stored = await db.get('events', `tribe-cancel:${event.id}`) as ScheduledEvent
    expect(stored.cancelled).toBe(true)
  })

  it('preserves other fields when cancelling', async () => {
    const event = await createEvent('tribe-cancel-2', 'member-1', baseParams())

    await cancelEvent('tribe-cancel-2', event.id)

    const db = await getDB()
    const stored = await db.get('events', `tribe-cancel-2:${event.id}`) as ScheduledEvent
    expect(stored.title).toBe('Morning Drill')
    expect(stored.type).toBe('training')
  })

  it('queues pending-sync when offline', async () => {
    const event = await createEvent('tribe-cancel-offline', 'member-1', baseParams())

    _offlineSince = Date.now() - 2000
    await cancelEvent('tribe-cancel-offline', event.id)
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string; recordKey: string }
      return e.gunStore === 'events' &&
             e.tribeId === 'tribe-cancel-offline' &&
             e.recordKey === event.id
    })
    expect(syncEntry).toBeDefined()

    _offlineSince = null
  })

  it('does not queue pending-sync when online', async () => {
    const event = await createEvent('tribe-cancel-online', 'member-1', baseParams())
    await cancelEvent('tribe-cancel-online', event.id)
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { recordKey: string }
      return e.recordKey === event.id
    })
    expect(syncEntry).toBeUndefined()
  })
})
