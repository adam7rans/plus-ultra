import { useState, useEffect } from 'react'
import { subscribeToPacePlan } from '../lib/comms'
import type { TribePacePlan } from '@plus-ultra/core'

export function usePacePlan(tribeId: string | null) {
  const [plan, setPlan] = useState<TribePacePlan | null>(null)

  useEffect(() => {
    if (!tribeId) return
    const unsub = subscribeToPacePlan(tribeId, setPlan)
    return unsub
  }, [tribeId])

  return { plan }
}
