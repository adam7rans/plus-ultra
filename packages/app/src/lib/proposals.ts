import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { addPendingSync } from './sync-queue'
import { getOfflineSince } from './offline-tracker'
import type { Tribe } from '@plus-ultra/core'
import type { Proposal, Vote, ProposalComment, ProposalScope, VoteChoice, ProposalOutcome } from '@plus-ultra/core'
import { proposalDuration } from '@plus-ultra/core'

// ─── Gun SEA-safe helpers (inlined per project convention) ───────────────────

function gunEscape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (typeof v === 'string' && v.startsWith('SEA{')) {
      out[k] = '~' + v
    } else {
      out[k] = v
    }
  }
  return out
}

function gunUnescape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.startsWith('~SEA{')) {
      out[k] = v.slice(1)
    } else {
      out[k] = v
    }
  }
  return out
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createProposal(
  tribeId: string,
  params: { title: string; body: string; scope: ProposalScope },
  authorPub: string,
  tribe: Tribe,
): Promise<Proposal> {
  const now = Date.now()
  const proposal: Proposal = {
    id: nanoid(),
    tribeId,
    title: params.title,
    body: params.body,
    scope: params.scope,
    createdBy: authorPub,
    createdAt: now,
    closesAt: now + proposalDuration(tribe),
    status: 'open',
    outcome: 'none',
    closedAt: 0,
    closedBy: '',
  }

  const db = await getDB()
  await db.put('proposals', proposal, `${tribeId}:${proposal.id}`)

  const proposalPayload = gunEscape(proposal as unknown as Record<string, unknown>)
  gun
    .get('tribes').get(tribeId)
    .get('proposals').get(proposal.id)
    .put(proposalPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `proposals:${tribeId}:${proposal.id}`,
      gunStore: 'proposals', tribeId, recordKey: proposal.id,
      payload: proposalPayload,
      queuedAt: Date.now(),
    })
  }

  return proposal
}

export async function castVote(
  tribeId: string,
  proposalId: string,
  memberPub: string,
  choice: VoteChoice,
): Promise<void> {
  const vote: Vote = {
    proposalId,
    tribeId,
    memberPub,
    choice,
    castAt: Date.now(),
  }

  const db = await getDB()
  await db.put('proposal-votes', vote, `${proposalId}:${memberPub}`)

  const votePayload = gunEscape(vote as unknown as Record<string, unknown>)
  gun
    .get('tribes').get(tribeId)
    .get('proposal-votes').get(proposalId)
    .get(memberPub)
    .put(votePayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `proposal-votes:${tribeId}:${proposalId}:${memberPub}`,
      gunPath: ['tribes', tribeId, 'proposal-votes', proposalId, memberPub],
      gunStore: 'proposal-votes', tribeId, recordKey: `${proposalId}:${memberPub}`,
      payload: votePayload,
      queuedAt: Date.now(),
    })
  }
}

export async function addComment(
  tribeId: string,
  proposalId: string,
  authorPub: string,
  body: string,
): Promise<ProposalComment> {
  const comment: ProposalComment = {
    id: nanoid(),
    proposalId,
    tribeId,
    authorPub,
    body,
    postedAt: Date.now(),
  }

  const db = await getDB()
  await db.put('proposal-comments', comment, `${proposalId}:${comment.id}`)

  const commentPayload = gunEscape(comment as unknown as Record<string, unknown>)
  gun
    .get('tribes').get(tribeId)
    .get('proposal-comments').get(comment.id)
    .put(commentPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `proposal-comments:${tribeId}:${comment.id}`,
      gunStore: 'proposal-comments', tribeId, recordKey: comment.id,
      payload: commentPayload,
      queuedAt: Date.now(),
    })
  }

  return comment
}

export async function withdrawProposal(
  tribeId: string,
  proposalId: string,
  requesterPub: string,
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('proposals', `${tribeId}:${proposalId}`)
  if (!existing) return
  const p = existing as Proposal
  if (p.createdBy !== requesterPub) return

  const updated: Proposal = {
    ...p,
    status: 'withdrawn',
    outcome: 'withdrawn',
    closedAt: Date.now(),
    closedBy: requesterPub,
  }
  await db.put('proposals', updated, `${tribeId}:${proposalId}`)

  const withdrawPayload = gunEscape({ status: 'withdrawn', outcome: 'withdrawn', closedAt: updated.closedAt, closedBy: requesterPub } as Record<string, unknown>)
  gun
    .get('tribes').get(tribeId)
    .get('proposals').get(proposalId)
    .put(withdrawPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `proposals:${tribeId}:${proposalId}`,
      gunStore: 'proposals', tribeId, recordKey: proposalId,
      payload: withdrawPayload,
      queuedAt: Date.now(),
    })
  }
}

export async function closeProposal(
  tribeId: string,
  proposalId: string,
  outcome: ProposalOutcome,
  closedBy: string,
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('proposals', `${tribeId}:${proposalId}`)
  if (!existing) return
  const p = existing as Proposal
  if (p.status !== 'open') return  // idempotent — skip if already closed

  const updated: Proposal = {
    ...p,
    status: 'closed',
    outcome,
    closedAt: Date.now(),
    closedBy,
  }
  await db.put('proposals', updated, `${tribeId}:${proposalId}`)

  const closePayload = gunEscape({ status: 'closed', outcome, closedAt: updated.closedAt, closedBy } as Record<string, unknown>)
  gun
    .get('tribes').get(tribeId)
    .get('proposals').get(proposalId)
    .put(closePayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `proposals:${tribeId}:${proposalId}`,
      gunStore: 'proposals', tribeId, recordKey: proposalId,
      payload: closePayload,
      queuedAt: Date.now(),
    })
  }
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

function parseProposal(d: Record<string, unknown>, tribeId: string): Proposal | null {
  if (!d.id || !d.title) return null
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    title: d.title as string,
    body: (d.body as string) ?? '',
    scope: (d.scope as Proposal['scope']) ?? 'major',
    createdBy: (d.createdBy as string) ?? '',
    createdAt: (d.createdAt as number) ?? 0,
    closesAt: (d.closesAt as number) ?? 0,
    status: (d.status as Proposal['status']) ?? 'open',
    outcome: (d.outcome as Proposal['outcome']) ?? 'none',
    closedAt: (d.closedAt as number) ?? 0,
    closedBy: (d.closedBy as string) ?? '',
  }
}

export function subscribeToProposals(
  tribeId: string,
  callback: (proposals: Proposal[]) => void,
): () => void {
  const proposalsMap = new Map<string, Proposal>()

  // Seed from IDB
  getDB().then(db => db.getAll('proposals')).then(all => {
    for (const raw of all) {
      const p = raw as Proposal
      if (p.tribeId === tribeId && p.id) proposalsMap.set(p.id, p)
    }
    if (proposalsMap.size > 0) callback(Array.from(proposalsMap.values()))
  }).catch(err => console.warn('[proposals] IDB seed failed:', err))

  const ref = gun.get('tribes').get(tribeId).get('proposals')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      proposalsMap.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const p = parseProposal(raw, tribeId)
      if (p) {
        // Merge with existing to handle partial Gun updates (e.g. close patch)
        const existing = proposalsMap.get(key)
        const merged: Proposal = existing ? { ...existing, ...p } : p
        proposalsMap.set(key, merged)
        getDB().then(db => db.put('proposals', merged, `${tribeId}:${key}`))
      }
    }
    callback(Array.from(proposalsMap.values()))
  }

  ref.map().once(handle)
  ref.map().on(handle)

  // 2s poll fallback (same pattern as messaging.ts)
  const poll = setInterval(() => ref.map().once(handle), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}

export function subscribeToVotes(
  tribeId: string,
  proposalId: string,
  callback: (votes: Vote[]) => void,
): () => void {
  // Map keyed by memberPub — last arrival wins
  const votesMap = new Map<string, Vote>()

  // Seed from IDB
  getDB().then(async db => {
    const all = await db.getAll('proposal-votes')
    for (const raw of all) {
      const v = raw as Vote
      if (v.proposalId === proposalId) votesMap.set(v.memberPub, v)
    }
    if (votesMap.size > 0) callback(Array.from(votesMap.values()))
  })

  // Subscribe at the correct level — not .map() on the parent node
  const ref = gun.get('tribes').get(tribeId).get('proposal-votes').get(proposalId)

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      votesMap.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      if (raw.memberPub && raw.choice) {
        const vote: Vote = {
          proposalId: (raw.proposalId as string) ?? proposalId,
          tribeId: (raw.tribeId as string) ?? tribeId,
          memberPub: raw.memberPub as string,
          choice: raw.choice as VoteChoice,
          castAt: (raw.castAt as number) ?? 0,
        }
        votesMap.set(vote.memberPub, vote)
        getDB().then(db => db.put('proposal-votes', vote, `${proposalId}:${vote.memberPub}`))
      }
    }
    callback(Array.from(votesMap.values()))
  }

  ref.map().once(handle)
  ref.map().on(handle)

  const poll = setInterval(() => ref.map().once(handle), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}

export function subscribeToComments(
  tribeId: string,
  proposalId: string,
  callback: (comments: ProposalComment[]) => void,
): () => void {
  const commentsMap = new Map<string, ProposalComment>()

  // Seed from IDB
  getDB().then(async db => {
    const all = await db.getAll('proposal-comments')
    for (const raw of all) {
      const c = raw as ProposalComment
      if (c.proposalId === proposalId) commentsMap.set(c.id, c)
    }
    if (commentsMap.size > 0) callback(Array.from(commentsMap.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('proposal-comments')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      commentsMap.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      if (raw.id && raw.authorPub && (raw.proposalId as string) === proposalId) {
        const comment: ProposalComment = {
          id: raw.id as string,
          proposalId: raw.proposalId as string,
          tribeId: (raw.tribeId as string) ?? tribeId,
          authorPub: raw.authorPub as string,
          body: (raw.body as string) ?? '',
          postedAt: (raw.postedAt as number) ?? 0,
        }
        commentsMap.set(comment.id, comment)
        getDB().then(db => db.put('proposal-comments', comment, `${proposalId}:${comment.id}`))
      }
    }
    callback(Array.from(commentsMap.values()))
  }

  ref.map().once(handle)
  ref.map().on(handle)

  const poll = setInterval(() => ref.map().once(handle), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}
