import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToBugOutPlans } from '../lib/bugout'
import { useIsGridUp } from './useIsGridUp'
import type { BugOutPlan } from '@plus-ultra/core'

export function useBugOut(tribeId: string | null) {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.bugout.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<BugOutPlan[]>([])
  useEffect(() => {
    if (gridUp || !tribeId) return
    return subscribeToBugOutPlans(tribeId, setGunData)
  }, [tribeId, gridUp])

  const plans = gridUp ? (convexData ?? []) as unknown as BugOutPlan[] : gunData
  const activePlan = plans.find(p => p.status === 'active') ?? null
  return { plans, activePlan }
}
