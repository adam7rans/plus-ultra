import { describe, it, expect, vi } from 'vitest'

// ── Gun mock ──────────────────────────────────────────────────────────────────

vi.mock('./gun.js', () => {
  function chain(path: string[] = []): Record<string, unknown> {
    return {
      get(key: string) { return chain([...path, key]) },
      put(payload: unknown) { return chain(path) },
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

import { updateAsset } from './inventory.js'
import { getDB } from './db.js'

// ── updateAsset ───────────────────────────────────────────────────────────────

describe('updateAsset', () => {
  it('writes asset to IDB inventory store', async () => {
    _offlineSince = null

    await updateAsset('tribe-1', 'food_reserve', 90, 'full pantry', 'member-1')

    const db = await getDB()
    const stored = await db.get('inventory', 'tribe-1:food_reserve')
    expect(stored).toBeDefined()
    const entry = stored as { asset: string; quantity: number; tribeId: string; notes: string }
    expect(entry.asset).toBe('food_reserve')
    expect(entry.quantity).toBe(90)
    expect(entry.tribeId).toBe('tribe-1')
    expect(entry.notes).toBe('full pantry')
  })

  it('IDB key is tribeId:assetType', async () => {
    _offlineSince = null

    await updateAsset('tribe-abc', 'water_reserve', 50, '', 'member-1')

    const db = await getDB()
    const stored = await db.get('inventory', 'tribe-abc:water_reserve')
    expect(stored).toBeDefined()
  })

  it('overwrites previous entry for same asset', async () => {
    _offlineSince = null

    await updateAsset('tribe-1', 'fuel_reserve', 100, 'full tank', 'member-1')
    await updateAsset('tribe-1', 'fuel_reserve', 50, 'half tank', 'member-1')

    const db = await getDB()
    const stored = await db.get('inventory', 'tribe-1:fuel_reserve') as { quantity: number }
    expect(stored.quantity).toBe(50)
  })

  it('sets updatedBy and updatedAt', async () => {
    _offlineSince = null
    const before = Date.now()

    await updateAsset('tribe-1', 'food_reserve', 30, '', 'bob-pub')

    const db = await getDB()
    const stored = await db.get('inventory', 'tribe-1:food_reserve') as {
      updatedBy: string; updatedAt: number
    }
    expect(stored.updatedBy).toBe('bob-pub')
    expect(stored.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('queues pending-sync when offline', async () => {
    _offlineSince = Date.now() - 3000

    await updateAsset('tribe-1', 'ammo_reserve', 200, '', 'member-1')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string; recordKey: string }
      return e.gunStore === 'inventory' && e.tribeId === 'tribe-1' && e.recordKey === 'ammo_reserve'
    })
    expect(syncEntry).toBeDefined()

    _offlineSince = null
  })

  it('does not queue pending-sync when online', async () => {
    _offlineSince = null

    await updateAsset('tribe-1', 'medical_supplies', 20, '', 'member-1')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { recordKey: string }
      return e.recordKey === 'medical_supplies'
    })
    expect(syncEntry).toBeUndefined()
  })

  it('stores multiple different assets independently', async () => {
    _offlineSince = null

    await updateAsset('tribe-1', 'food_reserve', 90, '', 'member-1')
    await updateAsset('tribe-1', 'water_reserve', 60, '', 'member-1')
    await updateAsset('tribe-1', 'fuel_reserve', 30, '', 'member-1')

    const db = await getDB()
    const food = await db.get('inventory', 'tribe-1:food_reserve') as { quantity: number }
    const water = await db.get('inventory', 'tribe-1:water_reserve') as { quantity: number }
    const fuel = await db.get('inventory', 'tribe-1:fuel_reserve') as { quantity: number }

    expect(food.quantity).toBe(90)
    expect(water.quantity).toBe(60)
    expect(fuel.quantity).toBe(30)
  })
})
