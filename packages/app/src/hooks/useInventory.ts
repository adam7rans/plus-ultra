import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToInventory } from '../lib/inventory'
import { useIsGridUp } from './useIsGridUp'
import type { TribeAsset } from '@plus-ultra/core'

export function useInventory(tribeId: string | null): TribeAsset[] {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.inventory.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<TribeAsset[]>([])
  useEffect(() => {
    if (gridUp || !tribeId) return
    const unsub = subscribeToInventory(tribeId, setGunData)
    return unsub
  }, [tribeId, gridUp])

  return gridUp ? (convexData ?? []) as unknown as TribeAsset[] : gunData
}
