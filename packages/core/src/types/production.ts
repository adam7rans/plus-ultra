import type { AssetType } from './assets.js'

export interface ProductionEntry {
  id: string
  tribeId: string
  assetType: AssetType
  amount: number
  periodDays: number    // how many days this output covers
  loggedAt: number      // epoch ms
  loggedBy: string      // memberPub
  source?: string       // free text: 'south garden', 'solar array', etc.
  notes?: string
}
