import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToProposals, subscribeToVotes, subscribeToComments } from '../lib/proposals'
import { useIsGridUp } from './useIsGridUp'
import type { Proposal, Vote, ProposalComment } from '@plus-ultra/core'

export function useProposals(tribeId: string | null): { proposals: Proposal[]; loading: boolean } {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.proposals.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<Proposal[]>([])
  const [gunLoading, setGunLoading] = useState(true)
  useEffect(() => {
    if (gridUp || !tribeId) return
    setGunLoading(true)
    const unsub = subscribeToProposals(tribeId, (p) => {
      setGunData(p)
      setGunLoading(false)
    })
    return unsub
  }, [tribeId, gridUp])

  if (gridUp) {
    return {
      proposals: (convexData ?? []) as unknown as Proposal[],
      loading: convexData === undefined,
    }
  }
  return { proposals: gunData, loading: gunLoading }
}

export function useProposalDetail(
  tribeId: string | null,
  proposalId: string | null,
): { proposal: Proposal | null; votes: Vote[]; comments: ProposalComment[]; loading: boolean } {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time
  const convexProposals = useQuery(
    api.proposals.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )
  const convexVotes = useQuery(
    api.proposals.listVotes,
    gridUp && proposalId ? { proposalId } : 'skip'
  )
  const convexComments = useQuery(
    api.proposals.listComments,
    gridUp && proposalId ? { proposalId } : 'skip'
  )

  // Gun path (grid-down): existing subscriptions
  const [gunProposal, setGunProposal] = useState<Proposal | null>(null)
  const [gunVotes, setGunVotes] = useState<Vote[]>([])
  const [gunComments, setGunComments] = useState<ProposalComment[]>([])
  const [gunLoading, setGunLoading] = useState(true)

  useEffect(() => {
    if (gridUp || !tribeId || !proposalId) return
    setGunLoading(true)

    const unsubProposals = subscribeToProposals(tribeId, (all) => {
      const found = all.find(p => p.id === proposalId) ?? null
      setGunProposal(found)
      setGunLoading(false)
    })

    const unsubVotes = subscribeToVotes(tribeId, proposalId, setGunVotes)
    const unsubComments = subscribeToComments(tribeId, proposalId, setGunComments)

    return () => {
      unsubProposals()
      unsubVotes()
      unsubComments()
    }
  }, [tribeId, proposalId, gridUp])

  if (gridUp) {
    const allProposals = (convexProposals ?? []) as unknown as Proposal[]
    const proposal = allProposals.find(p => p.id === proposalId) ?? null
    return {
      proposal,
      votes: (convexVotes ?? []) as unknown as Vote[],
      comments: (convexComments ?? []) as unknown as ProposalComment[],
      loading: convexProposals === undefined || convexVotes === undefined || convexComments === undefined,
    }
  }
  return { proposal: gunProposal, votes: gunVotes, comments: gunComments, loading: gunLoading }
}
