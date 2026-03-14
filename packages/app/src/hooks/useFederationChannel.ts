import { useEffect, useState } from 'react'
import { subscribeToFederatedMessages, subscribeToFederatedTrades } from '../lib/federation'
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
  const [messages, setMessages] = useState<FederatedMessage[]>([])
  const [trades, setTrades] = useState<FederatedTradeProposal[]>([])

  useEffect(() => {
    if (!channelId || !myTribeEpub || !myTribeEpriv || !otherTribeEpub) return
    const unsubMsgs = subscribeToFederatedMessages(
      channelId, myTribeEpub, myTribeEpriv, otherTribeEpub, setMessages,
    )
    const unsubTrades = subscribeToFederatedTrades(channelId, setTrades)
    return () => {
      unsubMsgs()
      unsubTrades()
    }
  }, [channelId, myTribeEpub, myTribeEpriv, otherTribeEpub])

  return { messages, trades }
}
