import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import {
  subscribeTribeChannel,
  subscribeDMChannel,
  loadCachedMessages,
  markChannelRead,
  dmChannelId,
} from '../lib/messaging'
import { useIsGridUp } from './useIsGridUp'
import type { Message } from '@plus-ultra/core'

export function useTribeChannel(tribeId: string) {
  const gridUp = useIsGridUp()
  // The tribe-wide channel id is 'tribe-wide'
  const channelId = 'tribe-wide'

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.messages.listByChannel,
    gridUp ? { channelId } : 'skip'
  )

  // Gun path (grid-down): existing subscription + cache
  const [gunMessages, setGunMessages] = useState<Message[]>([])
  const [gunLoading, setGunLoading] = useState(true)

  useEffect(() => {
    if (gridUp) return
    let cancelled = false

    // Load cache first for instant display
    loadCachedMessages(channelId).then(cached => {
      if (!cancelled) {
        setGunMessages(cached)
        setGunLoading(false)
      }
    })

    // Then subscribe to live updates
    const unsub = subscribeTribeChannel(tribeId, msgs => {
      if (!cancelled) {
        setGunMessages(msgs)
        setGunLoading(false)
      }
    })

    void markChannelRead(channelId)

    return () => {
      cancelled = true
      unsub()
    }
  }, [tribeId, gridUp])

  useEffect(() => {
    if (!gridUp) return
    void markChannelRead(channelId)
  }, [gridUp])

  const messages = gridUp ? (convexData ?? []) as unknown as Message[] : gunMessages
  const loading = gridUp ? convexData === undefined : gunLoading

  function inject(msg: Message) {
    if (!gridUp) {
      setGunMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg].sort((a, b) => a.sentAt - b.sentAt)
      })
    }
  }

  return { messages, loading, inject }
}

export function useDMChannel(myPub: string, theirPub: string) {
  const channelId = dmChannelId(myPub, theirPub)
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.messages.listByChannel,
    gridUp ? { channelId } : 'skip'
  )

  // Gun path (grid-down): existing subscription + cache
  const [gunMessages, setGunMessages] = useState<Message[]>([])
  const [gunLoading, setGunLoading] = useState(true)

  useEffect(() => {
    if (gridUp) return
    let cancelled = false

    loadCachedMessages(channelId).then(cached => {
      if (!cancelled) {
        setGunMessages(cached)
        setGunLoading(false)
      }
    })

    const unsub = subscribeDMChannel(channelId, msgs => {
      if (!cancelled) {
        setGunMessages(msgs)
        setGunLoading(false)
      }
    })

    void markChannelRead(channelId)

    return () => {
      cancelled = true
      unsub()
    }
  }, [channelId, gridUp])

  useEffect(() => {
    if (!gridUp) return
    void markChannelRead(channelId)
  }, [channelId, gridUp])

  const messages = gridUp ? (convexData ?? []) as unknown as Message[] : gunMessages
  const loading = gridUp ? convexData === undefined : gunLoading

  // Optimistically add a sent message to local state immediately,
  // without waiting for the Gun map().on() callback to fire
  function inject(msg: Message) {
    if (!gridUp) {
      setGunMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg].sort((a, b) => a.sentAt - b.sentAt)
      })
    }
  }

  return { messages, loading, channelId, inject }
}
