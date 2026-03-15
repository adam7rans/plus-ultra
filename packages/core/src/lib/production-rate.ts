import type { ProductionEntry } from '../types/production.js'

const PRODUCTION_WINDOW_DAYS = 30

// Returns units/day, or null if no entries in the rolling 30-day window
export function computeProductionRate(entries: ProductionEntry[]): number | null {
  const cutoff = Date.now() - PRODUCTION_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const recent = entries.filter(e => e.loggedAt >= cutoff)
  if (recent.length === 0) return null

  const totalAmount = recent.reduce((sum, e) => sum + e.amount, 0)
  const totalDays = recent.reduce((sum, e) => sum + e.periodDays, 0)
  if (totalDays === 0) return null

  return totalAmount / totalDays
}

// Returns net units/day (positive = surplus, negative = depleting), or null if both are null
export function computeNetRate(productionRate: number | null, burnRate: number | null): number | null {
  if (productionRate === null && burnRate === null) return null
  return (productionRate ?? 0) - (burnRate ?? 0)
}

// Returns Infinity if netRate >= 0 (surplus or balanced), else currentStock / |netRate|
export function computeNetDaysRemaining(currentStock: number, netRate: number | null): number {
  if (netRate === null || netRate >= 0) return Infinity
  return currentStock / Math.abs(netRate)
}
