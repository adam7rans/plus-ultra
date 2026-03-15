import { useEffect, useState } from 'react'
import { subscribeToBugOutPlans } from '../lib/bugout'
import type { BugOutPlan } from '@plus-ultra/core'

export function useBugOut(tribeId: string | null) {
  const [plans, setPlans] = useState<BugOutPlan[]>([])

  useEffect(() => {
    if (!tribeId) return
    return subscribeToBugOutPlans(tribeId, setPlans)
  }, [tribeId])

  const activePlan = plans.find(p => p.status === 'active') ?? null
  return { plans, activePlan }
}
