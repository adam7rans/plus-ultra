import { describe, it, expect, vi } from 'vitest'

// ── Configurable Gun mock — controls ack result per put call ──────────────────

let _putAcks: Array<'success' | 'error'> = []

vi.mock('./gun.js', () => {
  function chain(path: string[] = []): Record<string, unknown> {
    return {
      get(key: string) { return chain([...path, key]) },
      put(payload: unknown, ack?: (a: { err?: string }) => void) {
        const mode = _putAcks.shift() ?? 'success'
        if (mode === 'error') ack?.({ err: 'gun error' })
        else ack?.({})
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

import { addPendingSync, flushPendingSyncs } from './sync-queue.js'
import { getDB } from './db.js'
import type { PendingSync } from './sync-queue.js'

function makeEntry(id: string, overrides: Partial<PendingSync> = {}): PendingSync {
  return {
    id,
    gunStore: 'inventory',
    tribeId: 'tribe-1',
    recordKey: 'food_reserve',
    payload: { quantity: 50 },
    queuedAt: Date.now(),
    ...overrides,
  }
}

// ── Queue accumulation ────────────────────────────────────────────────────────

describe('queue accumulation', () => {
  it('multiple entries accumulate in pending-syncs IDB store', async () => {
    await addPendingSync(makeEntry('e1'))
    await addPendingSync(makeEntry('e2'))
    await addPendingSync(makeEntry('e3'))

    const db = await getDB()
    const syncs = await db.getAll('pending-syncs')
    expect(syncs).toHaveLength(3)
  })

  it('entries from different modules co-exist', async () => {
    await addPendingSync(makeEntry('skills:t1:nurse', { gunStore: 'skills', recordKey: 'nurse' }))
    await addPendingSync(makeEntry('inventory:t1:food', { gunStore: 'inventory', recordKey: 'food_reserve' }))
    await addPendingSync(makeEntry('events:t1:evt1', { gunStore: 'events', recordKey: 'evt-1' }))

    const db = await getDB()
    const syncs = await db.getAll('pending-syncs')
    expect(syncs).toHaveLength(3)
    const stores = syncs.map(s => (s as { gunStore: string }).gunStore)
    expect(stores).toContain('skills')
    expect(stores).toContain('inventory')
    expect(stores).toContain('events')
  })

  it('entries across multiple tribes are stored independently', async () => {
    await addPendingSync(makeEntry('t1-inv', { tribeId: 'tribe-alpha' }))
    await addPendingSync(makeEntry('t2-inv', { tribeId: 'tribe-beta' }))
    await addPendingSync(makeEntry('t3-inv', { tribeId: 'tribe-gamma' }))

    const db = await getDB()
    const syncs = await db.getAll('pending-syncs')
    expect(syncs).toHaveLength(3)
  })

  it('duplicate id overwrites existing entry', async () => {
    await addPendingSync(makeEntry('dup', { payload: { quantity: 10 } }))
    await addPendingSync(makeEntry('dup', { payload: { quantity: 99 } }))

    const db = await getDB()
    const syncs = await db.getAll('pending-syncs')
    expect(syncs).toHaveLength(1)
    expect((syncs[0] as { payload: { quantity: number } }).payload.quantity).toBe(99)
  })
})

// ── Flush: success ────────────────────────────────────────────────────────────

describe('flush success', () => {
  it('removes all entries from IDB after ACK success', async () => {
    _putAcks = ['success', 'success', 'success']
    await addPendingSync(makeEntry('f1'))
    await addPendingSync(makeEntry('f2'))
    await addPendingSync(makeEntry('f3'))

    await flushPendingSyncs()

    const db = await getDB()
    expect(await db.getAll('pending-syncs')).toHaveLength(0)
  })

  it('no-ops cleanly on empty queue', async () => {
    await expect(flushPendingSyncs()).resolves.toBeUndefined()
  })

  it('flushes single entry', async () => {
    _putAcks = ['success']
    await addPendingSync(makeEntry('solo'))
    await flushPendingSyncs()

    const db = await getDB()
    expect(await db.getAll('pending-syncs')).toHaveLength(0)
  })
})

// ── Flush: failure ────────────────────────────────────────────────────────────

describe('flush failure', () => {
  it('keeps entry when Gun returns an error ack', async () => {
    _putAcks = ['error']
    await addPendingSync(makeEntry('err-1'))

    await flushPendingSyncs()

    const db = await getDB()
    const remaining = await db.getAll('pending-syncs')
    expect(remaining).toHaveLength(1)
    expect((remaining[0] as PendingSync).id).toBe('err-1')
  })

  it('partial flush: successful entries removed, errored entries remain', async () => {
    _putAcks = ['success', 'error', 'success']
    await addPendingSync(makeEntry('p1'))
    await addPendingSync(makeEntry('p2'))
    await addPendingSync(makeEntry('p3'))

    await flushPendingSyncs()

    const db = await getDB()
    const remaining = await db.getAll('pending-syncs')
    expect(remaining).toHaveLength(1)
    expect((remaining[0] as PendingSync).id).toBe('p2')
  })

  it('all fail: nothing removed', async () => {
    _putAcks = ['error', 'error']
    await addPendingSync(makeEntry('all-fail-1'))
    await addPendingSync(makeEntry('all-fail-2'))

    await flushPendingSyncs()

    const db = await getDB()
    expect(await db.getAll('pending-syncs')).toHaveLength(2)
  })
})

// ── Explicit gunPath (nested path regression) ─────────────────────────────────

describe('explicit gunPath', () => {
  it('nested 5-segment path survives accumulation', async () => {
    await addPendingSync({
      id: 'votes:tribe-x:prop-1:member-a',
      gunPath: ['tribes', 'tribe-x', 'proposal-votes', 'prop-1', 'member-a'],
      gunStore: 'proposal-votes',
      tribeId: 'tribe-x',
      recordKey: 'member-a',
      payload: { vote: 'yes' },
      queuedAt: Date.now(),
    })

    const db = await getDB()
    const syncs = await db.getAll('pending-syncs')
    const entry = syncs[0] as { gunPath: string[] }
    expect(entry.gunPath).toEqual(['tribes', 'tribe-x', 'proposal-votes', 'prop-1', 'member-a'])
  })

  it('nested path entry is deleted on ACK success', async () => {
    _putAcks = ['success']
    await addPendingSync({
      id: 'votes:tribe-y:prop-2:member-b',
      gunPath: ['tribes', 'tribe-y', 'proposal-votes', 'prop-2', 'member-b'],
      gunStore: 'proposal-votes',
      tribeId: 'tribe-y',
      recordKey: 'member-b',
      payload: { vote: 'no' },
      queuedAt: Date.now(),
    })

    await flushPendingSyncs()

    const db = await getDB()
    expect(await db.getAll('pending-syncs')).toHaveLength(0)
  })
})
