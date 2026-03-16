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

vi.mock('./notifications.js', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./push.js', () => ({
  triggerPush: vi.fn().mockResolvedValue(undefined),
}))

import { initiateMuster, respondToMuster, closeMuster, getActiveMuster, getMusterResponses } from './rollcall.js'
import { getDB } from './db.js'
import type { MusterCall, MusterResponse } from '@plus-ultra/core'

// ── initiateMuster ────────────────────────────────────────────────────────────

describe('initiateMuster', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes muster to IDB muster-calls store', async () => {
    const muster = await initiateMuster('tribe-1', 'initiator-pub', 'Alice', 'drill')

    const db = await getDB()
    const stored = await db.get('muster-calls', `tribe-1:${muster.id}`)
    expect(stored).toBeDefined()
    const m = stored as MusterCall
    expect(m.tribeId).toBe('tribe-1')
    expect(m.initiatedBy).toBe('initiator-pub')
    expect(m.initiatedByName).toBe('Alice')
    expect(m.reason).toBe('drill')
  })

  it('returns muster with status=active', async () => {
    const muster = await initiateMuster('tribe-1', 'initiator-pub', 'Alice', 'drill')

    expect(muster.status).toBe('active')
    expect(muster.id).toBeTruthy()
    expect(muster.initiatedAt).toBeGreaterThan(0)
  })

  it('IDB key is tribeId:musterId', async () => {
    const muster = await initiateMuster('tribe-abc', 'pub-1', 'Bob', 'drill')

    const db = await getDB()
    const stored = await db.get('muster-calls', `tribe-abc:${muster.id}`)
    expect(stored).toBeDefined()
  })

  it('stores optional message', async () => {
    const muster = await initiateMuster('tribe-1', 'pub-1', 'Alice', 'drill', 'All hands now')

    const db = await getDB()
    const stored = await db.get('muster-calls', `tribe-1:${muster.id}`) as MusterCall
    expect(stored.message).toBe('All hands now')
  })
})

// ── respondToMuster ───────────────────────────────────────────────────────────

describe('respondToMuster', () => {
  beforeEach(() => { _offlineSince = null })

  it('IDB key is musterId:memberPub', async () => {
    await respondToMuster('tribe-1', 'muster-abc', 'member-pub', 'Carol', 'present')

    const db = await getDB()
    const stored = await db.get('muster-responses', 'muster-abc:member-pub')
    expect(stored).toBeDefined()
  })

  it('stores status in muster-responses', async () => {
    await respondToMuster('tribe-1', 'muster-xyz', 'member-1', 'Dave', 'injured')

    const db = await getDB()
    const stored = await db.get('muster-responses', 'muster-xyz:member-1') as MusterResponse
    expect(stored.status).toBe('injured')
    expect(stored.memberPub).toBe('member-1')
    expect(stored.memberName).toBe('Dave')
    expect(stored.musterId).toBe('muster-xyz')
  })

  it('stores all response statuses', async () => {
    await respondToMuster('tribe-1', 'muster-s', 'mem-a', 'A', 'present')
    await respondToMuster('tribe-1', 'muster-s', 'mem-b', 'B', 'absent')
    await respondToMuster('tribe-1', 'muster-s', 'mem-c', 'C', 'injured')

    const db = await getDB()
    const a = await db.get('muster-responses', 'muster-s:mem-a') as MusterResponse
    const b = await db.get('muster-responses', 'muster-s:mem-b') as MusterResponse
    const c = await db.get('muster-responses', 'muster-s:mem-c') as MusterResponse
    expect(a.status).toBe('present')
    expect(b.status).toBe('absent')
    expect(c.status).toBe('injured')
  })

  it('stores optional location and note', async () => {
    await respondToMuster('tribe-1', 'muster-opts', 'mem-1', 'Eve', 'present', {
      location: 'Main gate', note: 'Ready',
    })

    const db = await getDB()
    const stored = await db.get('muster-responses', 'muster-opts:mem-1') as MusterResponse
    expect(stored.location).toBe('Main gate')
    expect(stored.note).toBe('Ready')
  })
})

// ── closeMuster ───────────────────────────────────────────────────────────────

describe('closeMuster', () => {
  beforeEach(() => { _offlineSince = null })

  it('sets status=closed and closedAt', async () => {
    const muster = await initiateMuster('tribe-1', 'pub-1', 'Alice', 'drill')
    const before = Date.now()
    await closeMuster('tribe-1', muster.id)

    const db = await getDB()
    const stored = await db.get('muster-calls', `tribe-1:${muster.id}`) as MusterCall
    expect(stored.status).toBe('closed')
    expect(stored.closedAt).toBeGreaterThanOrEqual(before)
  })

  it('is a no-op when muster does not exist', async () => {
    await expect(closeMuster('tribe-1', 'nonexistent-muster')).resolves.toBeUndefined()
  })
})

// ── getActiveMuster ───────────────────────────────────────────────────────────

describe('getActiveMuster', () => {
  beforeEach(() => { _offlineSince = null })

  it('returns null when no active muster exists', async () => {
    const result = await getActiveMuster('tribe-empty')
    expect(result).toBeNull()
  })

  it('returns active muster after initiate', async () => {
    const muster = await initiateMuster('tribe-active', 'pub-1', 'Alice', 'drill')

    const result = await getActiveMuster('tribe-active')
    expect(result).not.toBeNull()
    expect(result!.id).toBe(muster.id)
    expect(result!.status).toBe('active')
  })

  it('returns null after close', async () => {
    const muster = await initiateMuster('tribe-close', 'pub-1', 'Alice', 'drill')
    await closeMuster('tribe-close', muster.id)

    const result = await getActiveMuster('tribe-close')
    expect(result).toBeNull()
  })

  it('does not return musters from other tribes', async () => {
    await initiateMuster('tribe-other', 'pub-1', 'Alice', 'drill')

    const result = await getActiveMuster('tribe-mine')
    expect(result).toBeNull()
  })
})

// ── getMusterResponses ────────────────────────────────────────────────────────

describe('getMusterResponses', () => {
  beforeEach(() => { _offlineSince = null })

  it('returns empty array when no responses', async () => {
    const results = await getMusterResponses('muster-none')
    expect(results).toEqual([])
  })

  it('returns all responses for a muster', async () => {
    const muster = await initiateMuster('tribe-resp', 'pub-1', 'Alice', 'drill')
    await respondToMuster('tribe-resp', muster.id, 'mem-1', 'Bob', 'present')
    await respondToMuster('tribe-resp', muster.id, 'mem-2', 'Carol', 'absent')

    const responses = await getMusterResponses(muster.id)
    expect(responses).toHaveLength(2)
    const pubs = responses.map(r => r.memberPub)
    expect(pubs).toContain('mem-1')
    expect(pubs).toContain('mem-2')
  })

  it('does not return responses from other musters', async () => {
    await respondToMuster('tribe-1', 'other-muster', 'mem-x', 'X', 'present')

    const responses = await getMusterResponses('my-muster')
    expect(responses.find(r => r.memberPub === 'mem-x')).toBeUndefined()
  })
})
