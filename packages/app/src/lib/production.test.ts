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

import { logProductionEntry, getProductionEntries } from './production.js'
import { getDB } from './db.js'
import type { ProductionEntry } from '@plus-ultra/core'

// ── logProductionEntry ────────────────────────────────────────────────────────

describe('logProductionEntry', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes entry to production-log IDB store', async () => {
    const entry = await logProductionEntry('tribe-1', 'food_reserve', 50, 7, 'member-1')

    const db = await getDB()
    const stored = await db.get('production-log', `tribe-1:${entry.id}`)
    expect(stored).toBeDefined()
    const e = stored as ProductionEntry
    expect(e.assetType).toBe('food_reserve')
    expect(e.amount).toBe(50)
    expect(e.periodDays).toBe(7)
    expect(e.tribeId).toBe('tribe-1')
    expect(e.loggedBy).toBe('member-1')
  })

  it('IDB key is tribeId:entryId', async () => {
    const entry = await logProductionEntry('tribe-key', 'food_reserve', 10, 1, 'member-1')

    const db = await getDB()
    const stored = await db.get('production-log', `tribe-key:${entry.id}`)
    expect(stored).toBeDefined()
  })

  it('auto-generates id and sets loggedAt', async () => {
    const before = Date.now()

    const entry = await logProductionEntry('tribe-1', 'food_reserve', 20, 1, 'member-1')

    expect(entry.id).toBeTruthy()
    expect(entry.loggedAt).toBeGreaterThanOrEqual(before)
  })

  it('stores optional source and notes when provided', async () => {
    const entry = await logProductionEntry(
      'tribe-1', 'food_reserve', 30, 14, 'member-1',
      { source: 'greenhouse', notes: 'tomatoes and squash' }
    )

    const db = await getDB()
    const stored = await db.get('production-log', `tribe-1:${entry.id}`) as ProductionEntry
    expect(stored.source).toBe('greenhouse')
    expect(stored.notes).toBe('tomatoes and squash')
  })

  it('source and notes are undefined when not provided', async () => {
    const entry = await logProductionEntry('tribe-1', 'food_reserve', 10, 1, 'member-1')

    const db = await getDB()
    const stored = await db.get('production-log', `tribe-1:${entry.id}`) as ProductionEntry
    expect(stored.source).toBeUndefined()
    expect(stored.notes).toBeUndefined()
  })

  it('queues pending-sync when offline', async () => {
    _offlineSince = Date.now() - 3000

    const entry = await logProductionEntry('tribe-offline', 'food_reserve', 5, 1, 'member-1')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string; recordKey: string }
      return e.gunStore === 'production' &&
             e.tribeId === 'tribe-offline' &&
             e.recordKey === entry.id
    })
    expect(syncEntry).toBeDefined()

    _offlineSince = null
  })

  it('does not queue pending-sync when online', async () => {
    const entry = await logProductionEntry('tribe-online', 'food_reserve', 5, 1, 'member-1')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { recordKey: string }
      return e.recordKey === entry.id
    })
    expect(syncEntry).toBeUndefined()
  })
})

// ── getProductionEntries ──────────────────────────────────────────────────────

describe('getProductionEntries', () => {
  beforeEach(() => { _offlineSince = null })

  it('returns empty array when no entries exist for tribe', async () => {
    const entries = await getProductionEntries('tribe-empty-prod')
    expect(entries).toEqual([])
  })

  it('returns entries for the requested tribe', async () => {
    await logProductionEntry('tribe-prod-a', 'food_reserve', 10, 1, 'member-1')
    await logProductionEntry('tribe-prod-a', 'food_reserve', 20, 1, 'member-1')

    const entries = await getProductionEntries('tribe-prod-a')
    expect(entries.length).toBeGreaterThanOrEqual(2)
    expect(entries.every(e => e.tribeId === 'tribe-prod-a')).toBe(true)
  })

  it('filters out entries from other tribes', async () => {
    await logProductionEntry('tribe-prod-b', 'food_reserve', 99, 1, 'member-1')
    await logProductionEntry('tribe-prod-c', 'food_reserve', 77, 1, 'member-1')

    const entries = await getProductionEntries('tribe-prod-b')
    expect(entries.every(e => e.tribeId === 'tribe-prod-b')).toBe(true)
    expect(entries.some(e => e.tribeId === 'tribe-prod-c')).toBe(false)
  })

  it('returns entries sorted by loggedAt descending', async () => {
    const tribeId = 'tribe-sorted-prod'

    // Log with small delays so loggedAt values differ
    const e1 = await logProductionEntry(tribeId, 'food_reserve', 10, 1, 'member-1')
    await new Promise(r => setTimeout(r, 5))
    const e2 = await logProductionEntry(tribeId, 'food_reserve', 20, 1, 'member-1')
    await new Promise(r => setTimeout(r, 5))
    const e3 = await logProductionEntry(tribeId, 'food_reserve', 30, 1, 'member-1')

    const entries = await getProductionEntries(tribeId)
    const ids = entries.map(e => e.id)
    const posE3 = ids.indexOf(e3.id)
    const posE2 = ids.indexOf(e2.id)
    const posE1 = ids.indexOf(e1.id)

    // Most recent first
    expect(posE3).toBeLessThan(posE2)
    expect(posE2).toBeLessThan(posE1)
  })

  it('each returned entry has all required fields', async () => {
    const tribeId = 'tribe-fields-prod'
    await logProductionEntry(tribeId, 'food_reserve', 40, 3, 'member-2')

    const entries = await getProductionEntries(tribeId)
    const entry = entries[0]
    expect(entry.id).toBeTruthy()
    expect(entry.tribeId).toBe(tribeId)
    expect(entry.assetType).toBe('food_reserve')
    expect(entry.amount).toBe(40)
    expect(entry.periodDays).toBe(3)
    expect(entry.loggedAt).toBeGreaterThan(0)
    expect(entry.loggedBy).toBe('member-2')
  })
})
