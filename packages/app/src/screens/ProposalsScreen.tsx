import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useTribe } from '../contexts/TribeContext'
import { useIdentity } from '../contexts/IdentityContext'
import { fetchTribeMeta } from '../lib/tribes'
import { useProposals } from '../hooks/useProposals'
import { closeProposal } from '../lib/proposals'
import { getDB } from '../lib/db'
import {
  getAuthority, eligibleVoters, computeOutcome,
} from '@plus-ultra/core'
import type { Tribe, TribeMember, Proposal, Vote } from '@plus-ultra/core'
import { subscribeToMembers } from '../lib/tribes'
import { useOfflineStage } from '../hooks/useOfflineStage'
import OfflineStageBanner from '../components/OfflineStageBanner'

type FilterTab = 'open' | 'closed' | 'all'

function governanceBanner(tribe: Tribe): string {
  switch (tribe.constitutionTemplate) {
    case 'council':          return 'Council · 24h · Leads+ vote'
    case 'direct_democracy': return 'Direct Democracy · 72h · All members vote'
    case 'hybrid':           return 'Hybrid · 48h · Scope-dependent voting'
  }
}

function timeRemaining(closesAt: number): string {
  const diff = closesAt - Date.now()
  if (diff <= 0) return 'Closed'
  const h = Math.floor(diff / (60 * 60 * 1000))
  const m = Math.floor((diff % (60 * 60 * 1000)) / 60000)
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

export default function ProposalsScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/proposals' })
  const { identity } = useIdentity()
  const { myTribes } = useTribe()
  const localRef = myTribes.find(t => t.tribeId === tribeId)

  const [tribe, setTribe] = useState<Tribe | null>(null)
  const [members, setMembers] = useState<TribeMember[]>([])
  const [filter, setFilter] = useState<FilterTab>('open')
  const { offlineStage, offlineSince } = useOfflineStage()

  const { proposals, loading } = useProposals(tribeId)

  useEffect(() => {
    fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) })
    const unsub = subscribeToMembers(tribeId, setMembers)
    return unsub
  }, [tribeId])

  // Auto-close expired proposals (with 1-min buffer)
  useEffect(() => {
    if (!tribe || !identity) return
    const timer = setTimeout(async () => {
      const open = proposals.filter(p => p.status === 'open')
      for (const p of open) {
        if (Date.now() - p.closesAt < 60_000) continue  // 1-min buffer
        // Load IDB votes
        const db = await getDB()
        const allVotes = await db.getAll('proposal-votes')
        const votes = (allVotes as Vote[]).filter(v => v.proposalId === p.id)
        const eligible = eligibleVoters(members, tribe, p)
        const outcome = computeOutcome(votes, eligible.length, p)
        if (outcome != null) {
          await closeProposal(tribeId, p.id, outcome, 'system')
        }
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [tribeId, tribe, identity, proposals, members])

  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember && tribe ? getAuthority(myMember, tribe) : 'member'
  const canCreate = myAuth !== 'restricted'

  const filtered = proposals.filter(p => {
    if (filter === 'open') return p.status === 'open'
    if (filter === 'closed') return p.status !== 'open'
    return true
  }).sort((a, b) => b.createdAt - a.createdAt)

  const tribeName = tribe?.name ?? localRef?.name ?? ''

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← {tribeName || 'Dashboard'}
      </Link>

      <OfflineStageBanner stage={offlineStage} offlineSince={offlineSince} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-100">Proposals</h2>
        {canCreate && (
          <Link
            to="/tribe/$tribeId/proposals/new"
            params={{ tribeId }}
            className="btn-primary text-sm px-3 py-1.5"
          >
            + New
          </Link>
        )}
      </div>

      {tribe && (
        <div className="card bg-forest-950 py-2 text-xs text-forest-300 mb-4">
          {governanceBanner(tribe)}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-forest-900/50 rounded-lg p-1">
        {(['open', 'closed', 'all'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
              filter === tab
                ? 'bg-forest-700 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm animate-pulse">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-400 text-sm">
            {filter === 'open' ? 'No open proposals' : 'No proposals yet'}
          </p>
          {canCreate && filter === 'open' && (
            <Link
              to="/tribe/$tribeId/proposals/new"
              params={{ tribeId }}
              className="mt-3 inline-block text-forest-400 text-sm hover:text-forest-300"
            >
              Create the first one →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <ProposalCard key={p.id} proposal={p} tribeId={tribeId} tribe={tribe} members={members} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProposalCard({
  proposal,
  tribeId,
  tribe,
}: {
  proposal: Proposal
  tribeId: string
  tribe: Tribe | null
  members?: TribeMember[]
}) {
  const isOpen = proposal.status === 'open'
  const isHybrid = tribe?.constitutionTemplate === 'hybrid'

  return (
    <Link
      to="/tribe/$tribeId/proposals/$proposalId"
      params={{ tribeId, proposalId: proposal.id }}
      className="card block hover:border-forest-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-100 text-sm leading-snug">{proposal.title}</span>
          {isHybrid && (
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              proposal.scope === 'major'
                ? 'bg-blue-900/50 text-blue-300'
                : 'bg-amber-900/50 text-amber-300'
            }`}>
              {proposal.scope}
            </span>
          )}
        </div>
        <StatusBadge proposal={proposal} />
      </div>

      <div className="text-xs text-gray-400">
        {isOpen ? timeRemaining(proposal.closesAt) : outcomeLabel(proposal.outcome)}
      </div>
    </Link>
  )
}

function StatusBadge({ proposal }: { proposal: Proposal }) {
  if (proposal.status === 'open') {
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-forest-900 text-forest-300 flex-shrink-0">Open</span>
  }
  if (proposal.outcome === 'passed') {
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-forest-900/80 text-forest-400 flex-shrink-0">Passed</span>
  }
  if (proposal.outcome === 'failed') {
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-danger-900/50 text-danger-400 flex-shrink-0">Failed</span>
  }
  return <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400 flex-shrink-0">Withdrawn</span>
}

function outcomeLabel(outcome: Proposal['outcome']): string {
  if (outcome === 'passed') return 'Passed'
  if (outcome === 'failed') return 'Failed'
  if (outcome === 'withdrawn') return 'Withdrawn'
  return 'Closed'
}
