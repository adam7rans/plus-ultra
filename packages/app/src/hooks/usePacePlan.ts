import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToPacePlan } from '../lib/comms'
import { useIsGridUp } from './useIsGridUp'
import type { TribePacePlan } from '@plus-ultra/core'

export function usePacePlan(tribeId: string | null) {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.comms.getPacePlan,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<TribePacePlan | null>(null)
  useEffect(() => {
    if (gridUp || !tribeId) return
    const unsub = subscribeToPacePlan(tribeId, setGunData)
    return unsub
  }, [tribeId, gridUp])

  const plan = gridUp ? (convexData ?? null) as unknown as TribePacePlan | null : gunData
  return { plan }
}
