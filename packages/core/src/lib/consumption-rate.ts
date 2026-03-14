import type { ConsumptionEntry } from '../types/consumption.js'
import type { AssetType } from '../types/assets.js'

const BURN_WINDOW_DAYS = 30

// Returns units/day, or null if no entries in window
export function computeBurnRate(entries: ConsumptionEntry[]): number | null {
  const cutoff = Date.now() - BURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const recent = entries.filter(e => e.loggedAt >= cutoff)
  if (recent.length === 0) return null

  const totalAmount = recent.reduce((sum, e) => sum + e.amount, 0)
  const totalDays = recent.reduce((sum, e) => sum + e.periodDays, 0)
  if (totalDays === 0) return null

  return totalAmount / totalDays
}

// Returns days remaining, or Infinity if burnRate is 0 or null
export function computeDaysRemaining(quantity: number, burnRate: number | null): number {
  if (burnRate === null || burnRate === 0) return Infinity
  return quantity / burnRate
}

export type DepletionStatus = 'ok' | 'warning' | 'critical' | 'none'

export const DEPLETION_THRESHOLDS: Partial<Record<AssetType, {
  type: 'days' | 'pct'
  warn: number
  crit: number
}>> = {
  food_reserve:     { type: 'days', warn: 14, crit: 7  },
  water_reserve:    { type: 'days', warn: 7,  crit: 3  },
  fuel_reserve:     { type: 'days', warn: 7,  crit: 3  },
  ammo_reserve:     { type: 'pct',  warn: 0.25, crit: 0.10 },
  medical_supplies: { type: 'days', warn: 14, crit: 7  },
}

// quantity = current stock; burnRate = units/day (null = no data)
// needed = assetsNeeded(memberCount, spec) — used for pct-type assets
export function getDepletionStatus(
  asset: AssetType,
  quantity: number,
  burnRate: number | null,
  needed: number
): DepletionStatus {
  const threshold = DEPLETION_THRESHOLDS[asset]
  if (!threshold) return 'none'

  if (threshold.type === 'days') {
    const days = computeDaysRemaining(quantity, burnRate)
    if (days === Infinity) return 'ok'
    if (days <= threshold.crit) return 'critical'
    if (days <= threshold.warn) return 'warning'
    return 'ok'
  } else {
    // pct type — ratio of current to needed
    const ratio = needed > 0 ? quantity / needed : 1
    if (ratio <= threshold.crit) return 'critical'
    if (ratio <= threshold.warn) return 'warning'
    return 'ok'
  }
}
