import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Gun mock — configurable once() data ───────────────────────────────────────

let _onceData: unknown = null

vi.mock('./gun.js', () => {
  function chain(path: string[] = []): Record<string, unknown> {
    return {
      get(key: string) { return chain([...path, key]) },
      put(payload: unknown, ack?: (a: { err?: string }) => void) {
        ack?.({})
        return chain(path)
      },
      on() { return chain(path) },
      once(cb?: (data: unknown, key: string) => void) {
        if (cb) cb(_onceData, path[path.length - 1] ?? '')
        return chain(path)
      },
      map() { return chain(path) },
      off() {},
    }
  }
  return { gun: chain() }
})

vi.mock('gun/sea', () => ({
  default: {
    pair: vi.fn().mockResolvedValue({
      pub: 'tribe-pub-key',
      priv: 'tribe-priv-key',
      epub: 'tribe-epub-key',
      epriv: 'tribe-epriv-key',
    }),
  },
}))

let _offlineSince: number | null = null
vi.mock('./offline-tracker.js', () => ({
  getOfflineSince: () => _offlineSince,
  setOfflineSince: (ts: number) => { _offlineSince = ts },
  clearOfflineSince: () => { _offlineSince = null },
  computeOfflineStage: () => 0,
}))

vi.mock('./identity.js', () => ({
  shortId: (pub: string) => pub.slice(0, 8),
  loadIdentity: vi.fn().mockResolvedValue(null),
  generateIdentity: vi.fn(),
  saveDisplayName: vi.fn(),
  markBackedUp: vi.fn(),
}))

import {
  createTribe,
  validateAndConsumeToken,
  joinTribe,
  getMyTribes,
  leaveTribe,
} from './tribes.js'
import { getDB } from './db.js'
import type { Tribe } from '@plus-ultra/core'

const founderPub = 'founder-pub-key-abc123'

function makeTribeParams(overrides: Partial<{ name: string; location: string; region: string }> = {}) {
  return {
    name: overrides.name ?? 'Test Tribe',
    location: overrides.location ?? 'Denver',
    region: overrides.region ?? 'Rocky Mountain',
    constitutionTemplate: 'council' as const,
  }
}

// ── createTribe ───────────────────────────────────────────────────────────────

describe('createTribe', () => {
  beforeEach(() => {
    _offlineSince = null
    _onceData = null
  })

  it('stores tribe in my-tribes IDB store', async () => {
    const tribe = await createTribe(makeTribeParams({ name: 'Iron Mountain' }), founderPub)

    const db = await getDB()
    const stored = await db.get('my-tribes', tribe.id)
    expect(stored).toBeDefined()
    const t = stored as { tribeId: string; name: string; location: string }
    expect(t.tribeId).toBe(tribe.id)
    expect(t.name).toBe('Iron Mountain')
  })

  it('caches tribe metadata in tribe-cache store', async () => {
    const tribe = await createTribe(makeTribeParams({ name: 'Steel Ridge' }), founderPub)

    const db = await getDB()
    const cached = await db.get('tribe-cache', tribe.id)
    expect(cached).toBeDefined()
  })

  it('writes founder as first member in IDB', async () => {
    const tribe = await createTribe(makeTribeParams({ name: 'Pine Valley' }), founderPub)

    const db = await getDB()
    const member = await db.get('members', `${tribe.id}:${founderPub}`)
    expect(member).toBeDefined()
    const m = member as { pubkey: string; authorityRole: string; status: string }
    expect(m.pubkey).toBe(founderPub)
    expect(m.authorityRole).toBe('founder')
    expect(m.status).toBe('active')
  })

  it('normalizes region to lowercase with dashes', async () => {
    const tribe = await createTribe(makeTribeParams({ region: 'Rocky Mountain' }), founderPub)
    expect(tribe.region).toBe('rocky-mountain')
  })

  it('sets founderId to founderPub', async () => {
    const tribe = await createTribe(makeTribeParams(), founderPub)
    expect(tribe.founderId).toBe(founderPub)
  })

  it('returns tribe with pub from SEA.pair()', async () => {
    const tribe = await createTribe(makeTribeParams(), founderPub)
    expect(tribe.pub).toBe('tribe-pub-key')
    expect(tribe.priv).toBe('tribe-priv-key')
  })

  it('queues pending-sync for member write when offline', async () => {
    _offlineSince = Date.now() - 2000
    const tribe = await createTribe(makeTribeParams({ name: 'Offline Tribe' }), founderPub)

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const memberSync = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string }
      return e.gunStore === 'members' && e.tribeId === tribe.id
    })
    expect(memberSync).toBeDefined()
    _offlineSince = null
  })
})

// ── validateAndConsumeToken ───────────────────────────────────────────────────

describe('validateAndConsumeToken', () => {
  it('returns valid:true when token not in Gun (offline mode — null data)', async () => {
    _onceData = null
    const result = await validateAndConsumeToken('tribe-1', 'token-abc')
    expect(result.valid).toBe(true)
  })

  it('returns valid:true when token data is not an object', async () => {
    _onceData = 'not-an-object'
    const result = await validateAndConsumeToken('tribe-1', 'token-str')
    expect(result.valid).toBe(true)
  })

  it('returns valid:false for already-used token', async () => {
    _onceData = { used: true, expiresAt: Date.now() + 10000 }
    const result = await validateAndConsumeToken('tribe-1', 'token-used')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/already used/i)
  })

  it('returns valid:false for expired token', async () => {
    _onceData = { used: false, expiresAt: Date.now() - 1000 }
    const result = await validateAndConsumeToken('tribe-1', 'token-expired')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/expired/i)
  })

  it('returns valid:true for valid unused non-expired token', async () => {
    _onceData = { used: false, expiresAt: Date.now() + 10000 }
    const result = await validateAndConsumeToken('tribe-1', 'token-valid')
    expect(result.valid).toBe(true)
  })
})

// ── getMyTribes ───────────────────────────────────────────────────────────────

describe('getMyTribes', () => {
  it('returns empty array when no tribes joined', async () => {
    const tribes = await getMyTribes()
    expect(tribes).toHaveLength(0)
  })

  it('returns tribes after createTribe', async () => {
    _offlineSince = null
    _onceData = null
    await createTribe(makeTribeParams({ name: 'My Tribe', location: 'Home' }), founderPub)

    const tribes = await getMyTribes()
    expect(tribes.length).toBeGreaterThan(0)
    expect(tribes[0].name).toBe('My Tribe')
    expect(tribes[0].location).toBe('Home')
  })

  it('returns tribeId, name, location, joinedAt fields', async () => {
    _offlineSince = null
    _onceData = null
    const before = Date.now()
    await createTribe(makeTribeParams({ name: 'Fields Tribe' }), founderPub)

    const tribes = await getMyTribes()
    const t = tribes.find(x => x.name === 'Fields Tribe')
    expect(t).toBeDefined()
    expect(t!.tribeId).toBeDefined()
    expect(t!.joinedAt).toBeGreaterThanOrEqual(before)
  })
})

// ── joinTribe ─────────────────────────────────────────────────────────────────

describe('joinTribe', () => {
  it('writes member to IDB after joining', async () => {
    _offlineSince = null
    _onceData = { used: false, expiresAt: Date.now() + 10000 }

    const tribeId = 'join-tribe-1'
    const memberPub = 'new-member-pub'

    // Pre-seed tribe-cache so fetchTribeMeta returns from IDB (no Gun timeout)
    const db = await getDB()
    const fakeTribe: Tribe = {
      id: tribeId,
      pub: 'pub-key',
      priv: '',
      name: 'Join Tribe',
      location: 'X',
      region: 'y',
      createdAt: Date.now(),
      constitutionTemplate: 'council',
      founderId: founderPub,
    }
    await db.put('tribe-cache', fakeTribe, tribeId)

    await joinTribe(tribeId, 'valid-token', memberPub, 'New Member')

    const member = await db.get('members', `${tribeId}:${memberPub}`)
    expect(member).toBeDefined()
    const m = member as { pubkey: string; status: string }
    expect(m.pubkey).toBe(memberPub)
    expect(m.status).toBe('active')
  })

  it('adds tribe to my-tribes after joining', async () => {
    _offlineSince = null
    _onceData = { used: false, expiresAt: Date.now() + 10000 }

    const tribeId = 'join-tribe-2'

    const db = await getDB()
    const fakeTribe: Tribe = {
      id: tribeId,
      pub: 'pub-key',
      priv: '',
      name: 'Join Test',
      location: 'Y',
      region: 'z',
      createdAt: Date.now(),
      constitutionTemplate: 'council',
      founderId: founderPub,
    }
    await db.put('tribe-cache', fakeTribe, tribeId)

    await joinTribe(tribeId, 'valid-token', 'member-pub-2')

    const stored = await db.get('my-tribes', tribeId)
    expect(stored).toBeDefined()
    const t = stored as { tribeId: string }
    expect(t.tribeId).toBe(tribeId)
  })

  it('throws if token is invalid', async () => {
    _onceData = { used: true }
    await expect(
      joinTribe('tribe-x', 'bad-token', 'member-pub')
    ).rejects.toThrow()
  })
})

// ── leaveTribe ────────────────────────────────────────────────────────────────

describe('leaveTribe', () => {
  it('removes tribe from my-tribes', async () => {
    _offlineSince = null
    _onceData = null
    const tribe = await createTribe(makeTribeParams({ name: 'Leave Tribe' }), founderPub)

    await leaveTribe(tribe.id, founderPub)

    const db = await getDB()
    const stored = await db.get('my-tribes', tribe.id)
    expect(stored).toBeUndefined()
  })

  it('removes tribe from tribe-cache', async () => {
    _offlineSince = null
    _onceData = null
    const tribe = await createTribe(makeTribeParams({ name: 'Leave Cache' }), founderPub)

    await leaveTribe(tribe.id, founderPub)

    const db = await getDB()
    const cached = await db.get('tribe-cache', tribe.id)
    expect(cached).toBeUndefined()
  })

  it('marks member as departed in IDB', async () => {
    _offlineSince = null
    _onceData = null
    const tribe = await createTribe(makeTribeParams({ name: 'Depart Tribe' }), founderPub)

    await leaveTribe(tribe.id, founderPub)

    const db = await getDB()
    const member = await db.get('members', `${tribe.id}:${founderPub}`)
    expect(member).toBeDefined()
    const m = member as { status: string }
    expect(m.status).toBe('departed')
  })
})
