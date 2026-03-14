import { useEffect, useState } from 'react'
import { subscribeToTrainingSessions } from '../lib/training'
import type { TrainingSession } from '@plus-ultra/core'

export function useTrainingSessions(tribeId: string | null): { sessions: TrainingSession[]; loading: boolean } {
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tribeId) return
    setLoading(true)
    const unsub = subscribeToTrainingSessions(tribeId, (s) => {
      setSessions(s)
      setLoading(false)
    })
    return unsub
  }, [tribeId])

  return { sessions, loading }
}
