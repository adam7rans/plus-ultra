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

import { logExpense, deleteExpense, logContribution, deleteContribution, computeMemberBalance } from './finance.js'
import { getDB } from './db.js'
import type { TribeExpense, FundContribution } from '@plus-ultra/core'

// ── logExpense ────────────────────────────────────────────────────────────────

describe('logExpense', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes expense to IDB tribe-expenses store', async () => {
    const id = await logExpense('tribe-1', {
      category: 'supplies',
      description: 'First aid kit',
      amountDollars: 25,
      currency: 'USD',
      paidBy: 'alice',
      splitAmong: ['alice', 'bob'],
    }, 'alice')

    const db = await getDB()
    const stored = await db.get('tribe-expenses', `tribe-1:${id}`)
    expect(stored).toBeDefined()
    const e = stored as TribeExpense
    expect(e.id).toBe(id)
    expect(e.tribeId).toBe('tribe-1')
    expect(e.description).toBe('First aid kit')
    expect(e.paidBy).toBe('alice')
  })

  it('IDB key is tribeId:id', async () => {
    const id = await logExpense('tribe-key', {
      category: 'supplies',
      description: 'Rope',
      amountDollars: 10,
      currency: 'USD',
      paidBy: 'bob',
      splitAmong: ['bob'],
    }, 'bob')

    const db = await getDB()
    const stored = await db.get('tribe-expenses', `tribe-key:${id}`)
    expect(stored).toBeDefined()
  })

  it('converts amountDollars to amountCents', async () => {
    const id = await logExpense('tribe-cents', {
      category: 'supplies',
      description: 'Water filters',
      amountDollars: 49.99,
      currency: 'USD',
      paidBy: 'alice',
      splitAmong: ['alice'],
    }, 'alice')

    const db = await getDB()
    const stored = await db.get('tribe-expenses', `tribe-cents:${id}`) as TribeExpense
    expect(stored.amountCents).toBe(4999)
  })

  it('rounds amountCents correctly', async () => {
    const id = await logExpense('tribe-round', {
      category: 'supplies',
      description: 'Batteries',
      amountDollars: 9.999,
      currency: 'USD',
      paidBy: 'alice',
      splitAmong: ['alice'],
    }, 'alice')

    const db = await getDB()
    const stored = await db.get('tribe-expenses', `tribe-round:${id}`) as TribeExpense
    expect(stored.amountCents).toBe(1000)
  })

  it('stores splitAmong as array in IDB', async () => {
    const id = await logExpense('tribe-split', {
      category: 'supplies',
      description: 'Tent',
      amountDollars: 120,
      currency: 'USD',
      paidBy: 'alice',
      splitAmong: ['alice', 'bob', 'carol'],
    }, 'alice')

    const db = await getDB()
    const stored = await db.get('tribe-expenses', `tribe-split:${id}`) as TribeExpense
    expect(Array.isArray(stored.splitAmong)).toBe(true)
    expect(stored.splitAmong).toHaveLength(3)
  })

  it('sets loggedBy and loggedAt', async () => {
    const before = Date.now()
    const id = await logExpense('tribe-meta', {
      category: 'supplies',
      description: 'Map',
      amountDollars: 5,
      currency: 'USD',
      paidBy: 'alice',
      splitAmong: ['alice'],
    }, 'alice')

    const db = await getDB()
    const stored = await db.get('tribe-expenses', `tribe-meta:${id}`) as TribeExpense
    expect(stored.loggedBy).toBe('alice')
    expect(stored.loggedAt).toBeGreaterThanOrEqual(before)
  })

  it('returns a non-empty string id', async () => {
    const id = await logExpense('tribe-id', {
      category: 'supplies',
      description: 'Test',
      amountDollars: 1,
      currency: 'USD',
      paidBy: 'alice',
      splitAmong: ['alice'],
    }, 'alice')

    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
})

// ── deleteExpense ─────────────────────────────────────────────────────────────

describe('deleteExpense', () => {
  beforeEach(() => { _offlineSince = null })

  it('removes expense from IDB', async () => {
    const id = await logExpense('tribe-del-exp', {
      category: 'supplies',
      description: 'Gloves',
      amountDollars: 8,
      currency: 'USD',
      paidBy: 'bob',
      splitAmong: ['bob'],
    }, 'bob')

    const db = await getDB()
    const before = await db.get('tribe-expenses', `tribe-del-exp:${id}`)
    expect(before).toBeDefined()

    await deleteExpense('tribe-del-exp', id)

    const after = await db.get('tribe-expenses', `tribe-del-exp:${id}`)
    expect(after).toBeUndefined()
  })

  it('does not affect other expenses', async () => {
    const id1 = await logExpense('tribe-del-multi', {
      category: 'supplies', description: 'A', amountDollars: 1, currency: 'USD', paidBy: 'alice', splitAmong: ['alice'],
    }, 'alice')
    const id2 = await logExpense('tribe-del-multi', {
      category: 'supplies', description: 'B', amountDollars: 2, currency: 'USD', paidBy: 'alice', splitAmong: ['alice'],
    }, 'alice')

    await deleteExpense('tribe-del-multi', id1)

    const db = await getDB()
    const remaining = await db.get('tribe-expenses', `tribe-del-multi:${id2}`)
    expect(remaining).toBeDefined()
  })
})

// ── logContribution ───────────────────────────────────────────────────────────

describe('logContribution', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes contribution to IDB tribe-contributions store', async () => {
    const id = await logContribution('tribe-1', {
      memberPub: 'alice',
      amountDollars: 50,
      currency: 'USD',
    })

    const db = await getDB()
    const stored = await db.get('tribe-contributions', `tribe-1:${id}`)
    expect(stored).toBeDefined()
    const c = stored as FundContribution
    expect(c.id).toBe(id)
    expect(c.tribeId).toBe('tribe-1')
    expect(c.memberPub).toBe('alice')
  })

  it('IDB key is tribeId:id', async () => {
    const id = await logContribution('tribe-contrib-key', {
      memberPub: 'bob',
      amountDollars: 20,
      currency: 'USD',
    })

    const db = await getDB()
    const stored = await db.get('tribe-contributions', `tribe-contrib-key:${id}`)
    expect(stored).toBeDefined()
  })

  it('converts amountDollars to amountCents', async () => {
    const id = await logContribution('tribe-contrib-cents', {
      memberPub: 'carol',
      amountDollars: 75.50,
      currency: 'USD',
    })

    const db = await getDB()
    const stored = await db.get('tribe-contributions', `tribe-contrib-cents:${id}`) as FundContribution
    expect(stored.amountCents).toBe(7550)
  })

  it('stores optional note', async () => {
    const id = await logContribution('tribe-contrib-note', {
      memberPub: 'alice',
      amountDollars: 10,
      currency: 'USD',
      note: 'monthly dues',
    })

    const db = await getDB()
    const stored = await db.get('tribe-contributions', `tribe-contrib-note:${id}`) as FundContribution
    expect(stored.note).toBe('monthly dues')
  })

  it('sets contributedAt timestamp', async () => {
    const before = Date.now()
    const id = await logContribution('tribe-contrib-ts', {
      memberPub: 'alice',
      amountDollars: 5,
      currency: 'USD',
    })

    const db = await getDB()
    const stored = await db.get('tribe-contributions', `tribe-contrib-ts:${id}`) as FundContribution
    expect(stored.contributedAt).toBeGreaterThanOrEqual(before)
  })
})

// ── deleteContribution ────────────────────────────────────────────────────────

describe('deleteContribution', () => {
  beforeEach(() => { _offlineSince = null })

  it('removes contribution from IDB', async () => {
    const id = await logContribution('tribe-del-contrib', {
      memberPub: 'alice',
      amountDollars: 15,
      currency: 'USD',
    })

    const db = await getDB()
    const before = await db.get('tribe-contributions', `tribe-del-contrib:${id}`)
    expect(before).toBeDefined()

    await deleteContribution('tribe-del-contrib', id)

    const after = await db.get('tribe-contributions', `tribe-del-contrib:${id}`)
    expect(after).toBeUndefined()
  })
})

// ── computeMemberBalance ──────────────────────────────────────────────────────

describe('computeMemberBalance', () => {
  const exp: TribeExpense = {
    id: 'e1',
    tribeId: 't',
    category: 'supplies',
    description: 'Test',
    amountCents: 3000,
    currency: 'USD',
    paidBy: 'alice',
    splitAmong: ['alice', 'bob'],
    loggedAt: 0,
    loggedBy: 'alice',
  }

  it('payer gets credit for others\' shares', () => {
    // alice paid $30, split 2 ways → alice is owed $15 (1500 cents) from bob
    const balance = computeMemberBalance('alice', [exp], [])
    expect(balance).toBe(1500)
  })

  it('participant owes their share', () => {
    // bob owes $15 (1500 cents) to alice
    const balance = computeMemberBalance('bob', [exp], [])
    expect(balance).toBe(-1500)
  })

  it('non-participant has zero balance from expense', () => {
    const balance = computeMemberBalance('carol', [exp], [])
    expect(balance).toBe(0)
  })

  it('contribution adds to balance', () => {
    const contrib: FundContribution = {
      id: 'c1',
      tribeId: 't',
      memberPub: 'alice',
      amountCents: 500,
      currency: 'USD',
      contributedAt: 0,
    }
    const balance = computeMemberBalance('alice', [], [contrib])
    expect(balance).toBe(500)
  })

  it('contribution only applies to contributing member', () => {
    const contrib: FundContribution = {
      id: 'c2',
      tribeId: 't',
      memberPub: 'alice',
      amountCents: 500,
      currency: 'USD',
      contributedAt: 0,
    }
    const balance = computeMemberBalance('bob', [], [contrib])
    expect(balance).toBe(0)
  })

  it('combines expense balance and contribution', () => {
    const contrib: FundContribution = {
      id: 'c3',
      tribeId: 't',
      memberPub: 'alice',
      amountCents: 200,
      currency: 'USD',
      contributedAt: 0,
    }
    // alice owed 1500 from expense + 200 contribution = 1700
    const balance = computeMemberBalance('alice', [exp], [contrib])
    expect(balance).toBe(1700)
  })

  it('handles three-way split correctly', () => {
    const threeWay: TribeExpense = {
      id: 'e3',
      tribeId: 't',
      category: 'supplies',
      description: 'Tent',
      amountCents: 3000,
      currency: 'USD',
      paidBy: 'alice',
      splitAmong: ['alice', 'bob', 'carol'],
      loggedAt: 0,
      loggedBy: 'alice',
    }
    // alice paid $30, split 3 ways → alice owed $20 from bob+carol (2000 cents)
    expect(computeMemberBalance('alice', [threeWay], [])).toBe(2000)
    // bob owes $10 (1000 cents)
    expect(computeMemberBalance('bob', [threeWay], [])).toBe(-1000)
    // carol owes $10 (1000 cents)
    expect(computeMemberBalance('carol', [threeWay], [])).toBe(-1000)
  })

  it('returns 0 for empty expenses and contributions', () => {
    expect(computeMemberBalance('alice', [], [])).toBe(0)
  })
})
