import { describe, it, expect, vi } from 'vitest'

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

const mockNotify = vi.fn().mockResolvedValue(undefined)
vi.mock('./notifications.js', () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
}))

import { logConsumption, deleteConsumptionEntry } from './consumption.js'
import { getDB } from './db.js'
import type { ConsumptionEntry } from '@plus-ultra/core'

// ── logConsumption ────────────────────────────────────────────────────────────

describe('logConsumption', () => {
  it('writes entry to consumption-log IDB store', async () => {
    _offlineSince = null

    const entry = await logConsumption(
      'tribe-log-1', 'food_reserve', 5, 1, 'member-1', 'weekly log', 10
    )

    const db = await getDB()
    const stored = await db.get('consumption-log', `tribe-log-1:${entry.id}`)
    expect(stored).toBeDefined()
    const e = stored as ConsumptionEntry
    expect(e.id).toBe(entry.id)
    expect(e.asset).toBe('food_reserve')
    expect(e.amount).toBe(5)
    expect(e.periodDays).toBe(1)
    expect(e.tribeId).toBe('tribe-log-1')
    expect(e.notes).toBe('weekly log')
    expect(e.loggedBy).toBe('member-1')
  })

  it('IDB key is tribeId:entryId', async () => {
    _offlineSince = null

    const entry = await logConsumption(
      'tribe-key-fmt', 'water_reserve', 2, 1, 'member-1', '', 5
    )

    const db = await getDB()
    const stored = await db.get('consumption-log', `tribe-key-fmt:${entry.id}`)
    expect(stored).toBeDefined()
  })

  it('sets loggedAt to current timestamp', async () => {
    _offlineSince = null
    const before = Date.now()

    const entry = await logConsumption(
      'tribe-ts', 'food_reserve', 1, 1, 'member-1', '', 5
    )

    expect(entry.loggedAt).toBeGreaterThanOrEqual(before)
  })

  it('auto-decrements inventory by consumed amount', async () => {
    _offlineSince = null

    const tribeId = 'tribe-decrement'
    // Seed initial inventory
    const db = await getDB()
    await db.put('inventory', {
      asset: 'food_reserve',
      quantity: 100,
      tribeId,
      notes: '',
      updatedBy: 'system',
      updatedAt: Date.now(),
    }, `${tribeId}:food_reserve`)

    await logConsumption(tribeId, 'food_reserve', 20, 1, 'member-1', '', 10)

    const updated = await db.get('inventory', `${tribeId}:food_reserve`) as { quantity: number }
    expect(updated.quantity).toBe(80)
  })

  it('does not decrement below zero', async () => {
    _offlineSince = null

    const tribeId = 'tribe-floor'
    const db = await getDB()
    await db.put('inventory', {
      asset: 'water_reserve',
      quantity: 3,
      tribeId,
      notes: '',
      updatedBy: 'system',
      updatedAt: Date.now(),
    }, `${tribeId}:water_reserve`)

    await logConsumption(tribeId, 'water_reserve', 10, 1, 'member-1', '', 5)

    const updated = await db.get('inventory', `${tribeId}:water_reserve`) as { quantity: number }
    expect(updated.quantity).toBe(0)
  })

  it('queues pending-sync when offline', async () => {
    _offlineSince = Date.now() - 3000

    const entry = await logConsumption(
      'tribe-offline', 'fuel_reserve', 5, 1, 'member-1', '', 10
    )
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string; recordKey: string }
      return e.gunStore === 'consumption-log' && e.tribeId === 'tribe-offline' && e.recordKey === entry.id
    })
    expect(syncEntry).toBeDefined()

    _offlineSince = null
  })

  it('does not queue pending-sync when online', async () => {
    _offlineSince = null

    const entry = await logConsumption(
      'tribe-online', 'food_reserve', 2, 1, 'member-1', '', 5
    )
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

// ── alert deduplication ───────────────────────────────────────────────────────

describe('alert deduplication', () => {
  it('fires notify when depletion status first becomes critical', async () => {
    _offlineSince = null
    mockNotify.mockClear()

    const tribeId = 'tribe-alert-1'
    const db = await getDB()
    // Seed inventory at 5 units — with burnRate=2/day → 2.5 days remaining → critical (< 7)
    await db.put('inventory', {
      asset: 'food_reserve', quantity: 5, tribeId, notes: '', updatedBy: 'sys', updatedAt: Date.now(),
    }, `${tribeId}:food_reserve`)

    await logConsumption(tribeId, 'food_reserve', 2, 1, 'member-1', '', 5)

    expect(mockNotify).toHaveBeenCalledTimes(1)
    const call = mockNotify.mock.calls[0][1] as { type: string }
    expect(call.type).toBe('resource_critical')
  })

  it('does not re-fire notify when status stays critical on second log', async () => {
    _offlineSince = null
    mockNotify.mockClear()

    const tribeId = 'tribe-alert-2'
    const db = await getDB()
    // Seed inventory at 8 units
    await db.put('inventory', {
      asset: 'food_reserve', quantity: 8, tribeId, notes: '', updatedBy: 'sys', updatedAt: Date.now(),
    }, `${tribeId}:food_reserve`)

    // First call: newQty=6, burnRate=2/day → 3 days → critical → notify fires
    await logConsumption(tribeId, 'food_reserve', 2, 1, 'member-1', '', 5)
    expect(mockNotify).toHaveBeenCalledTimes(1)

    // Second call: newQty=4, burnRate still ≥ 2/day → still critical → no duplicate notify
    await logConsumption(tribeId, 'food_reserve', 2, 1, 'member-1', '', 5)
    expect(mockNotify).toHaveBeenCalledTimes(1) // still 1, not 2
  })

  it('fires warning notify when status changes to warning', async () => {
    _offlineSince = null
    mockNotify.mockClear()

    const tribeId = 'tribe-alert-3'
    const db = await getDB()
    // Seed inventory at 50 units — with burnRate=2/day → 25 days → ok (> 14)
    // After one log of 20 units: newQty=30, burnRate=20/1=20/day → 30/20=1.5 days → critical
    // After one log of 2 units over 15 days: newQty=28, burnRate=(20+2)/(1+15)=22/16≈1.375/day → ~20 days → ok
    // Actually, let's just test warning directly.
    // qty=20 units, burnRate=2/day → 10 days → warning (7 ≤ 10 < 14)
    await db.put('inventory', {
      asset: 'food_reserve', quantity: 22, tribeId, notes: '', updatedBy: 'sys', updatedAt: Date.now(),
    }, `${tribeId}:food_reserve`)

    // Consume 2 units over 1 day → newQty=20, burnRate=2/day → 10 days → warning
    await logConsumption(tribeId, 'food_reserve', 2, 1, 'member-1', '', 5)

    expect(mockNotify).toHaveBeenCalledTimes(1)
    const call = mockNotify.mock.calls[0][1] as { type: string }
    expect(call.type).toBe('resource_warning')
  })
})

// ── deleteConsumptionEntry ────────────────────────────────────────────────────

describe('deleteConsumptionEntry', () => {
  it('removes entry from consumption-log IDB store', async () => {
    _offlineSince = null

    const entry = await logConsumption(
      'tribe-del', 'fuel_reserve', 3, 1, 'member-1', '', 5
    )

    const db = await getDB()
    const before = await db.get('consumption-log', `tribe-del:${entry.id}`)
    expect(before).toBeDefined()

    await deleteConsumptionEntry('tribe-del', entry.id)

    const after = await db.get('consumption-log', `tribe-del:${entry.id}`)
    expect(after).toBeUndefined()
  })
})
