import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToEvents } from '../lib/events'
import { useIsGridUp } from './useIsGridUp'
import type { ScheduledEvent } from '@plus-ultra/core'

export function useEvents(tribeId: string | null): ScheduledEvent[] {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.events.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<ScheduledEvent[]>([])
  useEffect(() => {
    if (gridUp || !tribeId) return
    const unsub = subscribeToEvents(tribeId, setGunData)
    return unsub
  }, [tribeId, gridUp])

  return gridUp ? (convexData ?? []) as unknown as ScheduledEvent[] : gunData
}
