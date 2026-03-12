import { useEffect, useState } from 'react'
import { subscribeToEvents } from '../lib/events'
import type { ScheduledEvent } from '@plus-ultra/core'

export function useEvents(tribeId: string | null): ScheduledEvent[] {
  const [events, setEvents] = useState<ScheduledEvent[]>([])

  useEffect(() => {
    if (!tribeId) return
    const unsub = subscribeToEvents(tribeId, setEvents)
    return unsub
  }, [tribeId])

  return events
}
