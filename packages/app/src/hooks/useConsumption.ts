import { useEffect, useState } from 'react'
import { subscribeToConsumption } from '../lib/consumption'
import { computeBurnRate, computeDaysRemaining, getDepletionStatus, ASSET_BY_KEY, assetsNeeded } from '@plus-ultra/core'
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
  const [allEntries, setAllEntries] = useState<ConsumptionEntry[]>([])

  useEffect(() => {
    if (!tribeId) return
    const unsub = subscribeToConsumption(tribeId, setAllEntries)
    return unsub
  }, [tribeId])

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
