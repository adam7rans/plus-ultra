import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToFederatedMessages, subscribeToFederatedTrades } from '../lib/federation'
import { useIsGridUp } from './useIsGridUp'
import type { FederatedMessage, FederatedTradeProposal } from '@plus-ultra/core'

export function useFederationChannel(
  channelId: string | null,
  myTribeEpub: string | null,
  myTribeEpriv: string | null,
  otherTribeEpub: string | null,
): {
  messages: FederatedMessage[]
  trades: FederatedTradeProposal[]
} {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): listMessages and listTrades both take channelId
  const convexMessages = useQuery(
    api.federation.listMessages,
    gridUp && channelId ? { channelId } : 'skip'
  )
  const convexTrades = useQuery(
    api.federation.listTrades,
    gridUp && channelId ? { channelId } : 'skip'
  )

  // Gun path (grid-down): existing subscriptions
  const [gunMessages, setGunMessages] = useState<FederatedMessage[]>([])
  const [gunTrades, setGunTrades] = useState<FederatedTradeProposal[]>([])

  useEffect(() => {
    if (gridUp || !channelId || !myTribeEpub || !myTribeEpriv || !otherTribeEpub) return
    const unsubMsgs = subscribeToFederatedMessages(
      channelId, myTribeEpub, myTribeEpriv, otherTribeEpub, setGunMessages,
    )
    const unsubTrades = subscribeToFederatedTrades(channelId, setGunTrades)
    return () => {
      unsubMsgs()
      unsubTrades()
    }
  }, [channelId, myTribeEpub, myTribeEpriv, otherTribeEpub, gridUp])

  return {
    messages: gridUp ? (convexMessages ?? []) as unknown as FederatedMessage[] : gunMessages,
    trades: gridUp ? (convexTrades ?? []) as unknown as FederatedTradeProposal[] : gunTrades,
  }
}
