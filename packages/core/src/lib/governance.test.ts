import { describe, it, expect } from 'vitest'
import {
  proposalDuration,
  isExpired,
  canVote,
  eligibleVoters,
  quorumRequired,
  computeOutcome,
} from './governance.js'
import type { Tribe, TribeMember } from '../types/tribe.js'
import type { Proposal, Vote } from '../types/proposals.js'

function makeTribe(template: Tribe['constitutionTemplate']): Tribe {
  return {
    id: 'tribe1',
    pub: 'pub',
    priv: 'priv',
    name: 'Test',
    location: 'Austin',
    region: 'texas',
    createdAt: 0,
    constitutionTemplate: template,
    founderId: 'founder',
  }
}

function makeMember(pubkey: string, role?: TribeMember['authorityRole'], status?: TribeMember['status']): TribeMember {
  return {
    pubkey,
    tribeId: 'tribe1',
    joinedAt: 0,
    lastSeen: 0,
    status: status ?? 'active',
    attachmentScore: 1,
    memberType: 'adult',
    displayName: pubkey,
    authorityRole: role,
  }
}

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 'p1',
    tribeId: 'tribe1',
    title: 'Test proposal',
    body: 'A proposal',
    scope: 'major',
    createdBy: 'member1',
    createdAt: 0,
    closesAt: Date.now() + 72 * 60 * 60 * 1000,
    status: 'open',
    outcome: 'none',
    closedAt: 0,
    closedBy: '',
    ...overrides,
  }
}

// ── proposalDuration ──────────────────────────────────────────────────────────

describe('proposalDuration', () => {
  it('returns 24h for council', () => {
    expect(proposalDuration(makeTribe('council'))).toBe(24 * 60 * 60 * 1000)
  })
  it('returns 48h for hybrid', () => {
    expect(proposalDuration(makeTribe('hybrid'))).toBe(48 * 60 * 60 * 1000)
  })
  it('returns 72h for direct_democracy', () => {
    expect(proposalDuration(makeTribe('direct_democracy'))).toBe(72 * 60 * 60 * 1000)
  })
})

// ── isExpired ─────────────────────────────────────────────────────────────────

describe('isExpired', () => {
  it('returns false for a future closesAt', () => {
    const p = makeProposal({ closesAt: Date.now() + 1000 })
    expect(isExpired(p)).toBe(false)
  })
  it('returns true for a past closesAt', () => {
    const p = makeProposal({ closesAt: Date.now() - 1000 })
    expect(isExpired(p)).toBe(true)
  })
})

// ── canVote ───────────────────────────────────────────────────────────────────

describe('canVote — council', () => {
  const tribe = makeTribe('council')
  const proposal = makeProposal()

  it('founder can vote', () => {
    const founder = makeMember('founder')  // founderId matches tribe.founderId
    expect(canVote(founder, tribe, proposal)).toBe(true)
  })
  it('elder_council can vote', () => {
    expect(canVote(makeMember('e', 'elder_council'), tribe, proposal)).toBe(true)
  })
  it('lead can vote', () => {
    expect(canVote(makeMember('l', 'lead'), tribe, proposal)).toBe(true)
  })
  it('member cannot vote', () => {
    expect(canVote(makeMember('m', 'member'), tribe, proposal)).toBe(false)
  })
  it('restricted cannot vote', () => {
    expect(canVote(makeMember('r', 'restricted'), tribe, proposal)).toBe(false)
  })
})

describe('canVote — direct_democracy', () => {
  const tribe = makeTribe('direct_democracy')
  const proposal = makeProposal()

  it('member can vote', () => {
    expect(canVote(makeMember('m', 'member'), tribe, proposal)).toBe(true)
  })
  it('lead can vote', () => {
    expect(canVote(makeMember('l', 'lead'), tribe, proposal)).toBe(true)
  })
  it('restricted cannot vote', () => {
    expect(canVote(makeMember('r', 'restricted'), tribe, proposal)).toBe(false)
  })
})

describe('canVote — hybrid', () => {
  const tribe = makeTribe('hybrid')

  it('operational scope: lead+ can vote', () => {
    const p = makeProposal({ scope: 'operational' })
    expect(canVote(makeMember('l', 'lead'), tribe, p)).toBe(true)
    expect(canVote(makeMember('m', 'member'), tribe, p)).toBe(false)
  })
  it('major scope: member+ can vote', () => {
    const p = makeProposal({ scope: 'major' })
    expect(canVote(makeMember('m', 'member'), tribe, p)).toBe(true)
    expect(canVote(makeMember('l', 'lead'), tribe, p)).toBe(true)
    expect(canVote(makeMember('r', 'restricted'), tribe, p)).toBe(false)
  })
})

// ── eligibleVoters ────────────────────────────────────────────────────────────

describe('eligibleVoters', () => {
  const tribe = makeTribe('direct_democracy')
  const proposal = makeProposal()
  const members = [
    makeMember('m1', 'member'),
    makeMember('m2', 'lead'),
    makeMember('m3', 'restricted'),
    makeMember('m4', 'member', 'departed'),
  ]

  it('excludes departed and restricted', () => {
    const eligible = eligibleVoters(members, tribe, proposal)
    expect(eligible.map(m => m.pubkey)).toEqual(['m1', 'm2'])
  })
})

// ── quorumRequired ────────────────────────────────────────────────────────────

describe('quorumRequired', () => {
  it('returns 1 for 0 eligible', () => { expect(quorumRequired(0)).toBe(1) })
  it('returns 1 for 1 eligible', () => { expect(quorumRequired(1)).toBe(1) })
  it('returns 1 for 2 eligible', () => { expect(quorumRequired(2)).toBe(1) })
  it('returns 2 for 3 eligible', () => { expect(quorumRequired(3)).toBe(2) })
  it('returns 3 for 5 eligible', () => { expect(quorumRequired(5)).toBe(3) })
  it('returns 5 for 10 eligible', () => { expect(quorumRequired(10)).toBe(5) })
})

// ── computeOutcome ────────────────────────────────────────────────────────────

function makeVotes(yesCount: number, noCount: number, abstainCount: number): Vote[] {
  const votes: Vote[] = []
  for (let i = 0; i < yesCount; i++) {
    votes.push({ proposalId: 'p1', tribeId: 'tribe1', memberPub: `y${i}`, choice: 'yes', castAt: 0 })
  }
  for (let i = 0; i < noCount; i++) {
    votes.push({ proposalId: 'p1', tribeId: 'tribe1', memberPub: `n${i}`, choice: 'no', castAt: 0 })
  }
  for (let i = 0; i < abstainCount; i++) {
    votes.push({ proposalId: 'p1', tribeId: 'tribe1', memberPub: `a${i}`, choice: 'abstain', castAt: 0 })
  }
  return votes
}

describe('computeOutcome', () => {
  const openProposal = makeProposal({ closesAt: Date.now() + 72 * 60 * 60 * 1000 })
  const expiredProposal = makeProposal({ closesAt: Date.now() - 1000 })

  it('returns passed when yes > no and yes >= quorum (early)', () => {
    // 5 eligible, quorum = 3; yes=3, no=1
    expect(computeOutcome(makeVotes(3, 1, 0), 5, openProposal)).toBe('passed')
  })

  it('returns undefined when not enough yes votes yet (open)', () => {
    // 5 eligible, quorum = 3; yes=2
    expect(computeOutcome(makeVotes(2, 0, 0), 5, openProposal)).toBeUndefined()
  })

  it('returns undefined when yes tied with no (open)', () => {
    // 4 eligible, quorum = 2; yes=2, no=2
    expect(computeOutcome(makeVotes(2, 2, 0), 4, openProposal)).toBeUndefined()
  })

  it('returns failed when expired and quorum not reached', () => {
    expect(computeOutcome(makeVotes(1, 0, 0), 5, expiredProposal)).toBe('failed')
  })

  it('returns failed when expired with zero votes', () => {
    expect(computeOutcome([], 3, expiredProposal)).toBe('failed')
  })

  it('returns failed when eligibleCount=0 and expired', () => {
    expect(computeOutcome([], 0, expiredProposal)).toBe('failed')
  })

  it('returns undefined when eligibleCount=0 and still open', () => {
    expect(computeOutcome([], 0, openProposal)).toBeUndefined()
  })

  it('abstentions do not count toward quorum', () => {
    // 5 eligible, quorum=3; yes=2, abstain=3 — should NOT pass
    expect(computeOutcome(makeVotes(2, 0, 3), 5, openProposal)).toBeUndefined()
  })

  it('passes when yes > no and hits quorum exactly', () => {
    // 6 eligible, quorum=3; yes=3, no=0
    expect(computeOutcome(makeVotes(3, 0, 0), 6, openProposal)).toBe('passed')
  })
})
