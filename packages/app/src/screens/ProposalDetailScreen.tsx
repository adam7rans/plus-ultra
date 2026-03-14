import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useTribe } from '../contexts/TribeContext'
import { useIdentity } from '../contexts/IdentityContext'
import { fetchTribeMeta } from '../lib/tribes'
import { useProposalDetail } from '../hooks/useProposals'
import { castVote, addComment, withdrawProposal, closeProposal } from '../lib/proposals'
import {
  getAuthority, canVote, eligibleVoters, quorumRequired, computeOutcome,
} from '@plus-ultra/core'
import type { Tribe, TribeMember, VoteChoice, PsychArchetype } from '@plus-ultra/core'
import { subscribeToMembers } from '../lib/tribes'
import { useTribePsychProfiles } from '../hooks/useTribePsychProfiles'

const ARCHETYPE_BADGE_COLORS: Record<PsychArchetype, string> = {
  Commander: 'bg-red-900/50 text-red-300 border-red-800',
  Scout:     'bg-amber-900/50 text-amber-300 border-amber-800',
  Strategist:'bg-blue-900/50 text-blue-300 border-blue-800',
  Connector: 'bg-green-900/50 text-green-300 border-green-800',
  Planner:   'bg-purple-900/50 text-purple-300 border-purple-800',
  Sustainer: 'bg-cyan-900/50 text-cyan-300 border-cyan-800',
}

function timeRemaining(closesAt: number): string {
  const diff = closesAt - Date.now()
  if (diff <= 0) return 'Voting closed'
  const h = Math.floor(diff / (60 * 60 * 1000))
  const m = Math.floor((diff % (60 * 60 * 1000)) / 60000)
  if (h > 0) return `Closes in ${h}h ${m}m`
  return `Closes in ${m}m`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function ProposalDetailScreen() {
  const { tribeId, proposalId } = useParams({ from: '/tribe/$tribeId/proposals/$proposalId' })
  const { identity } = useIdentity()
  const { myTribes: _myTribes } = useTribe()

  const [tribe, setTribe] = useState<Tribe | null>(null)
  const [members, setMembers] = useState<TribeMember[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [voting, setVoting] = useState(false)

  const { proposal, votes, comments, loading } = useProposalDetail(tribeId, proposalId)
  const psychProfiles = useTribePsychProfiles(tribeId)

  useEffect(() => {
    fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) })
    const unsub = subscribeToMembers(tribeId, setMembers)
    return unsub
  }, [tribeId])

  // Early-pass check: close proposal when quorum is reached before deadline
  useEffect(() => {
    if (!proposal || !tribe || proposal.status !== 'open' || !identity) return
    const eligible = eligibleVoters(members, tribe, proposal)
    const outcome = computeOutcome(votes, eligible.length, proposal)
    if (outcome != null) {
      closeProposal(tribeId, proposal.id, outcome, identity.pub)
    }
  }, [votes, proposal, tribe, members, tribeId, identity])

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center py-12 text-gray-400 text-sm animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Link to="/tribe/$tribeId/proposals" params={{ tribeId }} className="text-forest-400 text-sm mb-4 flex items-center gap-2">
          ← Proposals
        </Link>
        <div className="card text-center py-8 text-gray-400 text-sm">Proposal not found</div>
      </div>
    )
  }

  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember && tribe ? getAuthority(myMember, tribe) : 'member'
  const isOpen = proposal.status === 'open'
  const isHybrid = tribe?.constitutionTemplate === 'hybrid'
  const isCreator = proposal.createdBy === identity?.pub

  const eligible = tribe ? eligibleVoters(members, tribe, proposal) : []
  const quorum = quorumRequired(eligible.length)

  const yesCt = votes.filter(v => v.choice === 'yes').length
  const noCt = votes.filter(v => v.choice === 'no').length
  const abstainCt = votes.filter(v => v.choice === 'abstain').length

  const myVote = votes.find(v => v.memberPub === identity?.pub)
  const iAmEligible = !!(myMember && tribe && canVote(myMember, tribe, proposal))

  async function handleVote(choice: VoteChoice) {
    if (!identity || voting || !isOpen) return
    setVoting(true)
    try {
      await castVote(tribeId, proposal!.id, identity.pub, choice)
    } finally {
      setVoting(false)
    }
  }

  async function handleWithdraw() {
    if (!identity || !isOpen) return
    await withdrawProposal(tribeId, proposal!.id, identity.pub)
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!identity || !commentBody.trim() || posting) return
    setPosting(true)
    try {
      await addComment(tribeId, proposal!.id, identity.pub, commentBody.trim())
      setCommentBody('')
    } finally {
      setPosting(false)
    }
  }

  function memberName(pub: string): string {
    return members.find(m => m.pubkey === pub)?.displayName ?? pub.slice(0, 8) + '…'
  }

  const sortedComments = [...comments].sort((a, b) => a.postedAt - b.postedAt)

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link
        to="/tribe/$tribeId/proposals"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Proposals
      </Link>

      {/* Proposal header */}
      <div className="mb-5">
        <div className="flex items-start gap-2 mb-1">
          <h2 className="text-xl font-bold text-gray-100 flex-1">{proposal.title}</h2>
          {isHybrid && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-1 ${
              proposal.scope === 'major' ? 'bg-blue-900/50 text-blue-300' : 'bg-amber-900/50 text-amber-300'
            }`}>
              {proposal.scope}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 space-y-0.5">
          <div>By {memberName(proposal.createdBy)} · {formatDate(proposal.createdAt)}</div>
          <div className={isOpen ? 'text-forest-400' : 'text-gray-500'}>
            {isOpen ? timeRemaining(proposal.closesAt) : `Closed ${formatDate(proposal.closedAt)}`}
          </div>
        </div>
      </div>

      {/* Status badge */}
      {!isOpen && (
        <div className={`card py-2 text-center text-sm font-semibold mb-4 ${
          proposal.outcome === 'passed'
            ? 'border-forest-600 bg-forest-900/30 text-forest-300'
            : proposal.outcome === 'failed'
              ? 'border-danger-600/50 bg-danger-900/20 text-danger-400'
              : 'border-gray-700 bg-gray-900/30 text-gray-400'
        }`}>
          {proposal.outcome === 'passed' && 'Passed'}
          {proposal.outcome === 'failed' && 'Failed — quorum not reached'}
          {proposal.outcome === 'withdrawn' && 'Withdrawn'}
        </div>
      )}

      {/* Body */}
      {proposal.body && (
        <div className="card mb-4 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
          {proposal.body}
        </div>
      )}

      {/* Tally */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-widest">Tally</span>
          <span className="text-xs text-gray-500">
            {eligible.length} eligible · need {quorum} yes to pass
          </span>
        </div>
        <div className="flex gap-4 text-sm font-semibold mb-3">
          <span className="text-forest-400">Yes {yesCt}</span>
          <span className="text-danger-400">No {noCt}</span>
          <span className="text-gray-400">Abstain {abstainCt}</span>
        </div>
        {/* Quorum progress bar */}
        <div className="w-full bg-forest-950 rounded-full h-1.5">
          <div
            className="bg-forest-500 h-1.5 rounded-full transition-all"
            style={{ width: quorum > 0 ? `${Math.min(100, (yesCt / quorum) * 100)}%` : '0%' }}
          />
        </div>
        <div className="text-[10px] text-gray-500 mt-1">
          {yesCt}/{quorum} yes needed
        </div>
      </div>

      {/* Voter list */}
      {votes.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-2">Votes</h3>
          <div className="flex flex-wrap gap-1.5">
            {votes.map(v => {
              const archetype = psychProfiles.get(v.memberPub)?.archetype
              return (
                <span
                  key={v.memberPub}
                  className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    v.choice === 'yes'
                      ? 'border-forest-600 bg-forest-900/50 text-forest-300'
                      : v.choice === 'no'
                        ? 'border-danger-600/50 bg-danger-900/20 text-danger-400'
                        : 'border-gray-700 bg-gray-900/30 text-gray-400'
                  }`}
                >
                  {memberName(v.memberPub)} · {v.choice}
                  {archetype && (
                    <span className={`px-1 py-0.5 rounded text-[9px] border ${ARCHETYPE_BADGE_COLORS[archetype]}`}>
                      {archetype}
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Vote buttons */}
      {isOpen && (
        <div className="card mb-4">
          {iAmEligible ? (
            <>
              <div className="text-xs text-gray-400 mb-2">
                {myVote ? `Your vote: ${myVote.choice} (re-voting allowed)` : 'Cast your vote'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['yes', 'no', 'abstain'] as VoteChoice[]).map(choice => (
                  <button
                    key={choice}
                    className={`py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      myVote?.choice === choice
                        ? choice === 'yes'
                          ? 'border-forest-500 bg-forest-900/50 text-forest-300'
                          : choice === 'no'
                            ? 'border-danger-500/50 bg-danger-900/20 text-danger-400'
                            : 'border-gray-600 bg-gray-800/50 text-gray-300'
                        : 'border-forest-800 text-gray-400 hover:border-forest-600 hover:text-gray-200'
                    }`}
                    onClick={() => handleVote(choice)}
                    disabled={voting || myVote?.choice === choice}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500 text-center py-1">
              {myAuth === 'restricted'
                ? 'Restricted members cannot vote'
                : 'You are not eligible to vote on this proposal'}
            </p>
          )}
        </div>
      )}

      {/* Withdraw button */}
      {isOpen && isCreator && (
        <div className="mb-4">
          <button
            className="btn-secondary w-full text-sm text-danger-400 border-danger-800 hover:border-danger-600"
            onClick={handleWithdraw}
          >
            Withdraw Proposal
          </button>
        </div>
      )}

      {/* Comments */}
      <div className="mb-4">
        <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-3">
          Discussion ({sortedComments.length})
        </h3>
        {sortedComments.length === 0 ? (
          <p className="text-xs text-gray-500 mb-3">No comments yet</p>
        ) : (
          <div className="space-y-2 mb-3">
            {sortedComments.map(c => (
              <div key={c.id} className="card py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-300">{memberName(c.authorPub)}</span>
                  <span className="text-[10px] text-gray-500">{formatDate(c.postedAt)}</span>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Comment input — available on open and closed proposals */}
        {identity && (
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              placeholder="Add a comment..."
              maxLength={500}
            />
            <button
              type="submit"
              className="btn-primary text-sm px-3 py-1.5 flex-shrink-0"
              disabled={posting || !commentBody.trim()}
            >
              {posting ? '...' : 'Post'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
