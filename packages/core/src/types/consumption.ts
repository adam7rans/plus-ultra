import type { AssetType } from './assets.js'

export interface ConsumptionEntry {
  id: string
  tribeId: string
  asset: AssetType
  amount: number        // units consumed (same unit as TribeAsset.quantity)
  periodDays: number    // actual calendar days this consumption covers (≥1)
  loggedAt: number      // epoch ms
  loggedBy: string      // pubkey
  notes: string         // '' if empty
}
