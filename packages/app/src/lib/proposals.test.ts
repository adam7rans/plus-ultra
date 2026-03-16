import { describe, it, expect, vi } from 'vitest'

// ── Mock gun and offline-tracker before importing proposals ───────────────────

const capturedPuts: { path: string[]; payload: unknown }[] = []

vi.mock('./gun.js', () => {
  function chain(path: string[] = []): Record<string, unknown> {
    return {
      get(key: string) { return chain([...path, key]) },
      put(payload: unknown) {
        capturedPuts.push({ path, payload })
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

// offline-tracker: default to online
let _offlineSince: number | null = null
vi.mock('./offline-tracker.js', () => ({
  getOfflineSince: () => _offlineSince,
  setOfflineSince: (ts: number) => { _offlineSince = ts },
  clearOfflineSince: () => { _offlineSince = null },
  computeOfflineStage: () => 0,
}))

import { createProposal, castVote } from './proposals.js'
import { getDB } from './db.js'

const mockTribe = {
  id: 'tribe-1',
  pub: 'tribe-pub',
  priv: 'tribe-priv',
  name: 'Test Tribe',
  location: 'Nowhere',
  region: 'test',
  createdAt: Date.now(),
  constitutionTemplate: 'direct_democracy' as const,
  founderId: 'founder-pub',
}

// ── createProposal ─────────────────────────────────────────────────────────────

describe('createProposal', () => {
  it('stores proposal in IDB proposals store', async () => {
    _offlineSince = null // online

    const proposal = await createProposal(
      'tribe-1',
      { title: 'Test Proposal', body: 'Body text', scope: 'major' },
      'author-pub',
      mockTribe,
    )

    const db = await getDB()
    const stored = await db.get('proposals', `tribe-1:${proposal.id}`)
    expect(stored).toBeDefined()
    const p = stored as typeof proposal
    expect(p.title).toBe('Test Proposal')
    expect(p.tribeId).toBe('tribe-1')
    expect(p.createdBy).toBe('author-pub')
    expect(p.status).toBe('open')
  })

  it('returns a proposal with all required fields', async () => {
    _offlineSince = null

    const proposal = await createProposal(
      'tribe-1',
      { title: 'My Proposal', body: 'Details', scope: 'minor' },
      'author-pub',
      mockTribe,
    )

    expect(proposal.id).toBeTruthy()
    expect(proposal.tribeId).toBe('tribe-1')
    expect(proposal.title).toBe('My Proposal')
    expect(proposal.scope).toBe('minor')
    expect(proposal.status).toBe('open')
    expect(proposal.outcome).toBe('none')
    expect(proposal.createdAt).toBeGreaterThan(0)
    expect(proposal.closesAt).toBeGreaterThan(proposal.createdAt)
  })

  it('queues a pending-sync when offline', async () => {
    _offlineSince = Date.now() - 5000 // set offline

    const proposal = await createProposal(
      'tribe-1',
      { title: 'Offline Proposal', body: 'Made while offline', scope: 'major' },
      'author-pub',
      mockTribe,
    )

    // Allow pending sync to be written (addPendingSync is void async)
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncForProposal = allSyncs.find(s => {
      const entry = s as { gunStore: string; tribeId: string; recordKey: string }
      return entry.gunStore === 'proposals' &&
             entry.tribeId === 'tribe-1' &&
             entry.recordKey === proposal.id
    })
    expect(syncForProposal).toBeDefined()

    _offlineSince = null // reset
  })

  it('does not queue a pending-sync when online', async () => {
    _offlineSince = null

    const proposal = await createProposal(
      'tribe-1',
      { title: 'Online Proposal', body: 'Made while online', scope: 'major' },
      'author-pub',
      mockTribe,
    )

    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncForProposal = allSyncs.find(s => {
      const entry = s as { recordKey: string }
      return entry.recordKey === proposal.id
    })
    expect(syncForProposal).toBeUndefined()
  })
})

// ── castVote ──────────────────────────────────────────────────────────────────

describe('castVote', () => {
  it('stores vote in IDB proposal-votes store', async () => {
    _offlineSince = null

    await castVote('tribe-1', 'prop-1', 'member-pub', 'yes')

    const db = await getDB()
    const stored = await db.get('proposal-votes', 'prop-1:member-pub')
    expect(stored).toBeDefined()
    const vote = stored as { choice: string; memberPub: string; proposalId: string }
    expect(vote.choice).toBe('yes')
    expect(vote.memberPub).toBe('member-pub')
    expect(vote.proposalId).toBe('prop-1')
  })

  it('queues offline vote with NESTED gunPath (bug regression)', async () => {
    _offlineSince = Date.now() - 1000

    const tribeId = 'tribe-1'
    const proposalId = 'prop-abc'
    const memberPub = 'voter-pub'

    await castVote(tribeId, proposalId, memberPub, 'no')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')

    // Find the vote sync
    const voteSync = allSyncs.find(s => {
      const entry = s as { gunStore: string; tribeId: string }
      return entry.gunStore === 'proposal-votes' && entry.tribeId === tribeId
    })

    expect(voteSync).toBeDefined()

    // KEY ASSERTION: gunPath must be the nested 5-segment path
    const entry = voteSync as { gunPath?: string[] }
    expect(entry.gunPath).toEqual(['tribes', tribeId, 'proposal-votes', proposalId, memberPub])

    _offlineSince = null
  })

  it('online vote does not queue a pending-sync', async () => {
    _offlineSince = null

    await castVote('tribe-1', 'prop-online', 'voter-pub', 'abstain')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const voteSync = allSyncs.find(s => {
      const entry = s as { recordKey: string }
      return entry.recordKey === 'prop-online:voter-pub'
    })
    expect(voteSync).toBeUndefined()
  })

  it('vote payload is stored in IDB with correct key format: proposalId:memberPub', async () => {
    _offlineSince = null

    await castVote('tribe-1', 'prop-key-test', 'pub-key-test', 'yes')

    const db = await getDB()
    const stored = await db.get('proposal-votes', 'prop-key-test:pub-key-test')
    expect(stored).toBeDefined()
  })

  it('multiple voters can vote on the same proposal', async () => {
    _offlineSince = null

    await castVote('tribe-1', 'prop-multi', 'voter-a', 'yes')
    await castVote('tribe-1', 'prop-multi', 'voter-b', 'no')
    await castVote('tribe-1', 'prop-multi', 'voter-c', 'yes')

    const db = await getDB()
    const a = await db.get('proposal-votes', 'prop-multi:voter-a')
    const b = await db.get('proposal-votes', 'prop-multi:voter-b')
    const c = await db.get('proposal-votes', 'prop-multi:voter-c')

    expect((a as { choice: string }).choice).toBe('yes')
    expect((b as { choice: string }).choice).toBe('no')
    expect((c as { choice: string }).choice).toBe('yes')
  })
})
