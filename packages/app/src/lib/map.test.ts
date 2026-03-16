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

import { saveTerritory, addPin, updatePin, deletePin, addPatrolRoute, deletePatrolRoute } from './map.js'
import { getDB } from './db.js'
import type { TribeMapPin, PatrolRoute } from '@plus-ultra/core'

// ── saveTerritory ─────────────────────────────────────────────────────────────

describe('saveTerritory', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes territory to map-territory IDB store with tribeId as key', async () => {
    await saveTerritory('tribe-1', [{ lat: 1.0, lng: 2.0 }, { lat: 3.0, lng: 4.0 }], 'member-1')

    const db = await getDB()
    const stored = await db.get('map-territory', 'tribe-1')
    expect(stored).toBeDefined()
  })

  it('stores polygonJson as a JSON string of the polygon', async () => {
    const polygon = [{ lat: 10.5, lng: 20.5 }, { lat: 11.0, lng: 21.0 }, { lat: 10.0, lng: 21.5 }]
    await saveTerritory('tribe-poly', polygon, 'member-1')

    const db = await getDB()
    const stored = await db.get('map-territory', 'tribe-poly') as { polygonJson: string }
    expect(typeof stored.polygonJson).toBe('string')
    expect(JSON.parse(stored.polygonJson)).toEqual(polygon)
  })

  it('queues pending-sync with correct gunPath when offline', async () => {
    _offlineSince = Date.now() - 2000

    await saveTerritory('tribe-offline', [{ lat: 0, lng: 0 }], 'member-1')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string }
      return e.gunStore === 'map-territory' && e.tribeId === 'tribe-offline'
    })
    expect(syncEntry).toBeDefined()
    const e = syncEntry as { gunPath: string[] }
    expect(e.gunPath).toEqual(['tribes', 'tribe-offline', 'map-territory'])

    _offlineSince = null
  })

  it('does not queue pending-sync when online', async () => {
    await saveTerritory('tribe-online-terr', [{ lat: 5, lng: 5 }], 'member-1')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string }
      return e.gunStore === 'map-territory' && e.tribeId === 'tribe-online-terr'
    })
    expect(syncEntry).toBeUndefined()
  })
})

// ── addPin ────────────────────────────────────────────────────────────────────

describe('addPin', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes pin to map-pins IDB store', async () => {
    const pin = await addPin(
      'tribe-1',
      { assetType: 'cache', label: 'North Cache', notes: 'buried', lat: 47.6, lng: -122.3 },
      'member-1',
    )

    const db = await getDB()
    const stored = await db.get('map-pins', `tribe-1:${pin.id}`)
    expect(stored).toBeDefined()
  })

  it('IDB key is tribeId:pin.id', async () => {
    const pin = await addPin(
      'tribe-key',
      { assetType: 'cache', label: 'Test Pin', notes: '', lat: 0, lng: 0 },
      'member-1',
    )

    const db = await getDB()
    const stored = await db.get('map-pins', `tribe-key:${pin.id}`)
    expect(stored).toBeDefined()
    const p = stored as TribeMapPin
    expect(p.id).toBe(pin.id)
  })

  it('stores lat and lng correctly', async () => {
    const pin = await addPin(
      'tribe-latLng',
      { assetType: 'cache', label: 'Geo Pin', notes: '', lat: 51.5074, lng: -0.1278 },
      'member-1',
    )

    const db = await getDB()
    const stored = await db.get('map-pins', `tribe-latLng:${pin.id}`) as TribeMapPin
    expect(stored.lat).toBe(51.5074)
    expect(stored.lng).toBe(-0.1278)
  })

  it('stores assetType and label', async () => {
    const pin = await addPin(
      'tribe-1',
      { assetType: 'cache', label: 'Supply Cache', notes: 'week 4', lat: 1, lng: 2 },
      'author-pub',
    )

    const db = await getDB()
    const stored = await db.get('map-pins', `tribe-1:${pin.id}`) as TribeMapPin
    expect(stored.assetType).toBe('cache')
    expect(stored.label).toBe('Supply Cache')
    expect(stored.createdBy).toBe('author-pub')
  })
})

// ── updatePin ─────────────────────────────────────────────────────────────────

describe('updatePin', () => {
  beforeEach(() => { _offlineSince = null })

  it('updates the label of an existing pin', async () => {
    const pin = await addPin(
      'tribe-upd',
      { assetType: 'cache', label: 'Old Label', notes: '', lat: 10, lng: 20 },
      'member-1',
    )

    await updatePin('tribe-upd', pin.id, { label: 'New Label' })

    const db = await getDB()
    const stored = await db.get('map-pins', `tribe-upd:${pin.id}`) as TribeMapPin
    expect(stored.label).toBe('New Label')
  })

  it('updates lat and lng coordinates', async () => {
    const pin = await addPin(
      'tribe-coords',
      { assetType: 'cache', label: 'Movable Pin', notes: '', lat: 0, lng: 0 },
      'member-1',
    )

    await updatePin('tribe-coords', pin.id, { lat: 48.85, lng: 2.35 })

    const db = await getDB()
    const stored = await db.get('map-pins', `tribe-coords:${pin.id}`) as TribeMapPin
    expect(stored.lat).toBe(48.85)
    expect(stored.lng).toBe(2.35)
  })

  it('preserves unchanged fields after update', async () => {
    const pin = await addPin(
      'tribe-preserve',
      { assetType: 'cache', label: 'Keep Me', notes: 'important', lat: 5, lng: 6 },
      'member-preserveauthor',
    )

    await updatePin('tribe-preserve', pin.id, { label: 'Updated Label' })

    const db = await getDB()
    const stored = await db.get('map-pins', `tribe-preserve:${pin.id}`) as TribeMapPin
    expect(stored.notes).toBe('important')
    expect(stored.lat).toBe(5)
    expect(stored.lng).toBe(6)
    expect(stored.assetType).toBe('cache')
    expect(stored.createdBy).toBe('member-preserveauthor')
  })

  it('is a no-op when pin does not exist', async () => {
    await expect(
      updatePin('tribe-1', 'nonexistent-pin-id', { label: 'Ghost' })
    ).resolves.toBeUndefined()
  })
})

// ── deletePin ─────────────────────────────────────────────────────────────────

describe('deletePin', () => {
  beforeEach(() => { _offlineSince = null })

  it('removes pin from map-pins IDB store', async () => {
    const pin = await addPin(
      'tribe-del',
      { assetType: 'cache', label: 'To Delete', notes: '', lat: 0, lng: 0 },
      'member-1',
    )

    const db = await getDB()
    const before = await db.get('map-pins', `tribe-del:${pin.id}`)
    expect(before).toBeDefined()

    await deletePin('tribe-del', pin.id)

    const after = await db.get('map-pins', `tribe-del:${pin.id}`)
    expect(after).toBeUndefined()
  })

  it('is a no-op for non-existent pin', async () => {
    await expect(
      deletePin('tribe-1', 'ghost-pin-id')
    ).resolves.toBeUndefined()
  })
})

// ── addPatrolRoute ────────────────────────────────────────────────────────────

describe('addPatrolRoute', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes patrol route to patrol-routes IDB store', async () => {
    const route = await addPatrolRoute(
      'tribe-1',
      { name: 'North Perimeter', waypointsJson: '[]', notes: 'nightly', assignedTo: 'member-1', scheduleEventId: 'evt-1' },
      'author-pub',
    )

    const db = await getDB()
    const stored = await db.get('patrol-routes', `tribe-1:${route.id}`)
    expect(stored).toBeDefined()
  })

  it('IDB key is tribeId:route.id', async () => {
    const route = await addPatrolRoute(
      'tribe-route-key',
      { name: 'East Patrol', waypointsJson: '[]', notes: '', assignedTo: 'member-2', scheduleEventId: '' },
      'author-pub',
    )

    const db = await getDB()
    const stored = await db.get('patrol-routes', `tribe-route-key:${route.id}`)
    expect(stored).toBeDefined()
    const r = stored as PatrolRoute
    expect(r.id).toBe(route.id)
  })

  it('stores route fields correctly', async () => {
    const route = await addPatrolRoute(
      'tribe-1',
      {
        name: 'South Gate',
        waypointsJson: '[{"lat":1,"lng":2}]',
        notes: 'dawn shift',
        assignedTo: 'member-3',
        scheduleEventId: 'evt-42',
      },
      'patrol-author',
    )

    const db = await getDB()
    const stored = await db.get('patrol-routes', `tribe-1:${route.id}`) as PatrolRoute
    expect(stored.name).toBe('South Gate')
    expect(stored.waypointsJson).toBe('[{"lat":1,"lng":2}]')
    expect(stored.assignedTo).toBe('member-3')
    expect(stored.scheduleEventId).toBe('evt-42')
    expect(stored.createdBy).toBe('patrol-author')
  })

  it('auto-generates id and sets createdAt', async () => {
    const before = Date.now()
    const route = await addPatrolRoute(
      'tribe-1',
      { name: 'West Perimeter', waypointsJson: '[]', notes: '', assignedTo: '', scheduleEventId: '' },
      'member-1',
    )

    expect(route.id).toBeTruthy()
    expect(route.createdAt).toBeGreaterThanOrEqual(before)
  })
})

// ── deletePatrolRoute ─────────────────────────────────────────────────────────

describe('deletePatrolRoute', () => {
  beforeEach(() => { _offlineSince = null })

  it('removes patrol route from patrol-routes IDB store', async () => {
    const route = await addPatrolRoute(
      'tribe-del-route',
      { name: 'Doomed Route', waypointsJson: '[]', notes: '', assignedTo: '', scheduleEventId: '' },
      'member-1',
    )

    const db = await getDB()
    const before = await db.get('patrol-routes', `tribe-del-route:${route.id}`)
    expect(before).toBeDefined()

    await deletePatrolRoute('tribe-del-route', route.id)

    const after = await db.get('patrol-routes', `tribe-del-route:${route.id}`)
    expect(after).toBeUndefined()
  })

  it('is a no-op for non-existent route', async () => {
    await expect(
      deletePatrolRoute('tribe-1', 'ghost-route-id')
    ).resolves.toBeUndefined()
  })
})
