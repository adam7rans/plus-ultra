import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToTrainingSessions } from '../lib/training'
import { useIsGridUp } from './useIsGridUp'
import type { TrainingSession } from '@plus-ultra/core'

export function useTrainingSessions(tribeId: string | null): { sessions: TrainingSession[]; loading: boolean } {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.training.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<TrainingSession[]>([])
  const [gunLoading, setGunLoading] = useState(true)
  useEffect(() => {
    if (gridUp || !tribeId) return
    setGunLoading(true)
    const unsub = subscribeToTrainingSessions(tribeId, (s) => {
      setGunData(s)
      setGunLoading(false)
    })
    return unsub
  }, [tribeId, gridUp])

  if (gridUp) {
    return {
      sessions: (convexData ?? []) as unknown as TrainingSession[],
      loading: convexData === undefined,
    }
  }
  return { sessions: gunData, loading: gunLoading }
}
