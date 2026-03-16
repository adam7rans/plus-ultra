import { useEffect, useState, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToProduction, logProductionEntry } from '../lib/production'
import { computeProductionRate } from '@plus-ultra/core'
import { useIsGridUp } from './useIsGridUp'
import type { ProductionEntry, AssetType } from '@plus-ultra/core'

export function useProduction(tribeId: string | null) {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.production.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<ProductionEntry[]>([])
  useEffect(() => {
    if (gridUp || !tribeId) return
    const unsub = subscribeToProduction(tribeId, all => {
      setGunData([...all].sort((a, b) => b.loggedAt - a.loggedAt))
    })
    return unsub
  }, [tribeId, gridUp])

  const entries = gridUp
    ? ([...(convexData ?? [])].sort((a, b) => b.loggedAt - a.loggedAt) as unknown as ProductionEntry[])
    : gunData

  // Compute per-asset production rates
  const rateByAsset = new Map<AssetType, number | null>()
  const byAsset = new Map<AssetType, ProductionEntry[]>()
  for (const e of entries) {
    const list = byAsset.get(e.assetType) ?? []
    list.push(e)
    byAsset.set(e.assetType, list)
  }
  for (const [asset, assetEntries] of byAsset) {
    rateByAsset.set(asset, computeProductionRate(assetEntries))
  }

  const logProduction = useCallback(
    (assetType: AssetType, amount: number, periodDays: number, opts?: { source?: string; notes?: string }) => {
      if (!tribeId) return Promise.resolve(null as unknown as ProductionEntry)
      return logProductionEntry(tribeId, assetType, amount, periodDays, '', opts)
    },
    [tribeId]
  )

  return { entries, rateByAsset, logProduction }
}
