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

import { getGridState, setGridState, clearGridState } from './grid-state.js'
import { getDB } from './db.js'
import type { GridState } from '@plus-ultra/core'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeState(tribeId: string, overrides?: Partial<GridState>): GridState {
  return {
    tribeId,
    mode: 'normal',
    isSimulation: false,
    setBy: 'member-1',
    setByName: 'Alice',
    setAt: Date.now(),
    expiresAt: Date.now() + 3_600_000,
    ...overrides,
  }
}

// ── getGridState ──────────────────────────────────────────────────────────────

describe('getGridState', () => {
  beforeEach(() => { _offlineSince = null })

  it('returns null when no state has been set', async () => {
    const result = await getGridState('tribe-gs-empty')
    expect(result).toBeNull()
  })

  it('returns the stored GridState after setGridState', async () => {
    const state = makeState('tribe-gs-get')
    await setGridState(state)

    const result = await getGridState('tribe-gs-get')
    expect(result).not.toBeNull()
    expect(result!.tribeId).toBe('tribe-gs-get')
    expect(result!.mode).toBe('normal')
  })
})

// ── setGridState ──────────────────────────────────────────────────────────────

describe('setGridState', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes state to grid-state IDB store keyed by tribeId', async () => {
    const state = makeState('tribe-gs-set')
    await setGridState(state)

    const db = await getDB()
    const stored = await db.get('grid-state', 'tribe-gs-set')
    expect(stored).toBeDefined()
    const s = stored as GridState
    expect(s.tribeId).toBe('tribe-gs-set')
    expect(s.mode).toBe('normal')
    expect(s.setBy).toBe('member-1')
    expect(s.setByName).toBe('Alice')
  })

  it('stores all fields including optional message', async () => {
    const state = makeState('tribe-gs-msg', { mode: 'emergency', message: 'Lockdown active' })
    await setGridState(state)

    const db = await getDB()
    const stored = await db.get('grid-state', 'tribe-gs-msg') as GridState
    expect(stored.mode).toBe('emergency')
    expect(stored.message).toBe('Lockdown active')
  })

  it('can be read back via getGridState', async () => {
    const state = makeState('tribe-gs-roundtrip', { mode: 'elevated', isSimulation: true })
    await setGridState(state)

    const result = await getGridState('tribe-gs-roundtrip')
    expect(result).not.toBeNull()
    expect(result!.mode).toBe('elevated')
    expect(result!.isSimulation).toBe(true)
  })

  it('overwrites existing state for the same tribe', async () => {
    await setGridState(makeState('tribe-gs-overwrite', { mode: 'normal' }))
    await setGridState(makeState('tribe-gs-overwrite', { mode: 'emergency' }))

    const result = await getGridState('tribe-gs-overwrite')
    expect(result!.mode).toBe('emergency')
  })

  it('queues pending-sync when offline', async () => {
    _offlineSince = Date.now() - 3000

    const state = makeState('tribe-gs-offline')
    await setGridState(state)
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string }
      return e.gunStore === 'grid-state' && e.tribeId === 'tribe-gs-offline'
    })
    expect(syncEntry).toBeDefined()

    _offlineSince = null
  })

  it('offline pending-sync has gunPath targeting the grid-state node', async () => {
    _offlineSince = Date.now() - 1000

    const state = makeState('tribe-gs-path')
    await setGridState(state)
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string }
      return e.gunStore === 'grid-state' && e.tribeId === 'tribe-gs-path'
    })
    expect(syncEntry).toBeDefined()
    const entry = syncEntry as { gunPath?: string[] }
    expect(entry.gunPath).toEqual(['tribes', 'tribe-gs-path', 'grid-state'])

    _offlineSince = null
  })

  it('does not queue pending-sync when online', async () => {
    const state = makeState('tribe-gs-online')
    await setGridState(state)
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string }
      return e.gunStore === 'grid-state' && e.tribeId === 'tribe-gs-online'
    })
    expect(syncEntry).toBeUndefined()
  })
})

// ── clearGridState ────────────────────────────────────────────────────────────

describe('clearGridState', () => {
  beforeEach(() => { _offlineSince = null })

  it('removes grid state from IDB', async () => {
    const state = makeState('tribe-gs-clear')
    await setGridState(state)

    const db = await getDB()
    const before = await db.get('grid-state', 'tribe-gs-clear')
    expect(before).toBeDefined()

    await clearGridState('tribe-gs-clear')

    const after = await db.get('grid-state', 'tribe-gs-clear')
    expect(after).toBeUndefined()
  })

  it('getGridState returns null after clearGridState', async () => {
    const state = makeState('tribe-gs-clear-read')
    await setGridState(state)

    const before = await getGridState('tribe-gs-clear-read')
    expect(before).not.toBeNull()

    await clearGridState('tribe-gs-clear-read')

    const after = await getGridState('tribe-gs-clear-read')
    expect(after).toBeNull()
  })

  it('is a no-op when no state exists', async () => {
    await expect(
      clearGridState('tribe-gs-clear-empty')
    ).resolves.toBeUndefined()
  })
})
