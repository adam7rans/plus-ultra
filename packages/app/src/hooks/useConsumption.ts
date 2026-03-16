import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToConsumption } from '../lib/consumption'
import { computeBurnRate, computeDaysRemaining, getDepletionStatus, ASSET_BY_KEY, assetsNeeded } from '@plus-ultra/core'
import { useIsGridUp } from './useIsGridUp'
import type { ConsumptionEntry, AssetType, TribeAsset, DepletionStatus } from '@plus-ultra/core'

export interface AssetConsumptionData {
  entries: ConsumptionEntry[]     // all entries for this asset (sorted newest-first)
  burnRate: number | null         // units/day, null = no data
  daysRemaining: number           // Infinity if no burn rate
  status: DepletionStatus
}

export function useConsumption(
  tribeId: string | null,
  memberCount: number,
  inventory: TribeAsset[]
): Map<AssetType, AssetConsumptionData> {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.consumption.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<ConsumptionEntry[]>([])
  useEffect(() => {
    if (gridUp || !tribeId) return
    const unsub = subscribeToConsumption(tribeId, setGunData)
    return unsub
  }, [tribeId, gridUp])

  const allEntries = gridUp ? (convexData ?? []) as unknown as ConsumptionEntry[] : gunData

  const result = new Map<AssetType, AssetConsumptionData>()

  // Group entries by asset
  const byAsset = new Map<AssetType, ConsumptionEntry[]>()
  for (const entry of allEntries) {
    const list = byAsset.get(entry.asset) ?? []
    list.push(entry)
    byAsset.set(entry.asset, list)
  }

  const invMap = new Map(inventory.map(i => [i.asset, i.quantity]))

  for (const [asset, entries] of byAsset) {
    const sorted = [...entries].sort((a, b) => b.loggedAt - a.loggedAt)
    const burnRate = computeBurnRate(entries)
    const quantity = invMap.get(asset) ?? 0
    const daysRemaining = computeDaysRemaining(quantity, burnRate)
    const spec = ASSET_BY_KEY[asset]
    const needed = spec ? assetsNeeded(memberCount || 1, spec) : 0
    const status = getDepletionStatus(asset, quantity, burnRate, needed)
    result.set(asset, { entries: sorted, burnRate, daysRemaining, status })
  }

  return result
}
