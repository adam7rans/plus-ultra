import { useEffect, useState } from 'react'
import { subscribeToProposals, subscribeToVotes, subscribeToComments } from '../lib/proposals'
import type { Proposal, Vote, ProposalComment } from '@plus-ultra/core'

export function useProposals(tribeId: string | null): { proposals: Proposal[]; loading: boolean } {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tribeId) return
    setLoading(true)
    const unsub = subscribeToProposals(tribeId, (p) => {
      setProposals(p)
      setLoading(false)
    })
    return unsub
  }, [tribeId])

  return { proposals, loading }
}

export function useProposalDetail(
  tribeId: string | null,
  proposalId: string | null,
): { proposal: Proposal | null; votes: Vote[]; comments: ProposalComment[]; loading: boolean } {
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [comments, setComments] = useState<ProposalComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tribeId || !proposalId) return
    setLoading(true)

    const unsubProposals = subscribeToProposals(tribeId, (all) => {
      const found = all.find(p => p.id === proposalId) ?? null
      setProposal(found)
      setLoading(false)
    })

    const unsubVotes = subscribeToVotes(tribeId, proposalId, setVotes)
    const unsubComments = subscribeToComments(tribeId, proposalId, setComments)

    return () => {
      unsubProposals()
      unsubVotes()
      unsubComments()
    }
  }, [tribeId, proposalId])

  return { proposal, votes, comments, loading }
}
