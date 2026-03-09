import { useEffect, useState } from 'react'
import {
  subscribeTribeChannel,
  subscribeDMChannel,
  loadCachedMessages,
  markChannelRead,
  dmChannelId,
} from '../lib/messaging'
import type { Message } from '@plus-ultra/core'

export function useTribeChannel(tribeId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Load cache first for instant display
    loadCachedMessages('tribe-wide').then(cached => {
      if (!cancelled) {
        setMessages(cached)
        setLoading(false)
      }
    })

    // Then subscribe to live updates
    const unsub = subscribeTribeChannel(tribeId, msgs => {
      if (!cancelled) {
        setMessages(msgs)
        setLoading(false)
      }
    })

    void markChannelRead('tribe-wide')

    return () => {
      cancelled = true
      unsub()
    }
  }, [tribeId])

  return { messages, loading }
}

export function useDMChannel(myPub: string, theirPub: string) {
  const channelId = dmChannelId(myPub, theirPub)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    loadCachedMessages(channelId).then(cached => {
      if (!cancelled) {
        setMessages(cached)
        setLoading(false)
      }
    })

    const unsub = subscribeDMChannel(channelId, msgs => {
      if (!cancelled) {
        setMessages(msgs)
        setLoading(false)
      }
    })

    void markChannelRead(channelId)

    return () => {
      cancelled = true
      unsub()
    }
  }, [channelId])

  return { messages, loading, channelId }
}
