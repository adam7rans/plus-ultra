import type { Tribe, TribeMember } from '../types/tribe.js'
import type { Proposal, Vote, ProposalOutcome } from '../types/proposals.js'
import { getAuthority } from './permissions.js'

const AUTHORITY_RANK: Record<string, number> = {
  founder:       4,
  elder_council: 3,
  lead:          2,
  member:        1,
  restricted:    0,
}

/** Returns the voting deadline in ms for a tribe's governance model */
export function proposalDuration(tribe: Tribe): number {
  switch (tribe.constitutionTemplate) {
    case 'council':           return 24 * 60 * 60 * 1000  // 24h
    case 'hybrid':            return 48 * 60 * 60 * 1000  // 48h
    case 'direct_democracy':  return 72 * 60 * 60 * 1000  // 72h
  }
}

/** Returns true if the proposal's voting window has closed */
export function isExpired(proposal: Proposal): boolean {
  return Date.now() > proposal.closesAt
}

/**
 * Returns true if this member is eligible to vote on this proposal.
 * - restricted members: never
 * - council template: lead+ (rank ≥ 2)
 * - direct_democracy: member+ (rank ≥ 1)
 * - hybrid: depends on scope — 'operational' → lead+, 'major' → member+
 */
export function canVote(member: TribeMember, tribe: Tribe, proposal: Proposal): boolean {
  const auth = getAuthority(member, tribe)
  const rank = AUTHORITY_RANK[auth] ?? 0

  if (rank === 0) return false  // restricted

  switch (tribe.constitutionTemplate) {
    case 'council':
      return rank >= 2
    case 'direct_democracy':
      return rank >= 1
    case 'hybrid':
      return proposal.scope === 'operational' ? rank >= 2 : rank >= 1
  }
}

/**
 * Returns the list of non-departed members who are eligible to vote on this proposal.
 */
export function eligibleVoters(members: TribeMember[], tribe: Tribe, proposal: Proposal): TribeMember[] {
  return members.filter(m => m.status !== 'departed' && canVote(m, tribe, proposal))
}

/**
 * Returns the minimum number of yes-votes needed to pass.
 * Always at least 1.
 */
export function quorumRequired(eligibleCount: number): number {
  return Math.max(1, Math.ceil(eligibleCount / 2))
}

/**
 * Computes the current outcome of a proposal.
 * - Returns 'passed' if yes > no AND yes >= quorumRequired (fires before deadline)
 * - Returns 'failed' if the deadline has passed and the above conditions are not met
 * - Returns undefined if neither condition is true yet
 * - eligibleCount=0 → 'failed' if expired, undefined otherwise
 */
export function computeOutcome(
  votes: Vote[],
  eligibleCount: number,
  proposal: Proposal,
  now: number = Date.now(),
): ProposalOutcome | undefined {
  const yes = votes.filter(v => v.choice === 'yes').length
  const no = votes.filter(v => v.choice === 'no').length
  const quorum = quorumRequired(eligibleCount)

  if (yes > no && yes >= quorum) return 'passed'

  const expired = now > proposal.closesAt
  if (expired) return 'failed'

  return undefined
}
