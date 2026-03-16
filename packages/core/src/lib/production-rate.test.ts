import { describe, it, expect } from 'vitest'
import {
  computeProductionRate,
  computeNetRate,
  computeNetDaysRemaining,
} from './production-rate.js'
import type { ProductionEntry } from '../types/production.js'

const DAY = 24 * 60 * 60 * 1000

function entry(overrides: Partial<ProductionEntry> = {}): ProductionEntry {
  return {
    id: 'p1',
    tribeId: 'tribe-1',
    assetType: 'food_reserve',
    amount: 10,
    periodDays: 1,
    loggedAt: Date.now() - DAY,
    loggedBy: 'member-1',
    ...overrides,
  }
}

// ── computeProductionRate ─────────────────────────────────────────────────────

describe('computeProductionRate', () => {
  it('returns null for empty entry list', () => {
    expect(computeProductionRate([])).toBeNull()
  })

  it('returns null when all entries are older than 30 days', () => {
    const old = entry({ loggedAt: Date.now() - 35 * DAY })
    expect(computeProductionRate([old])).toBeNull()
  })

  it('computes amount/days for single recent entry', () => {
    const e = entry({ amount: 60, periodDays: 3 })
    expect(computeProductionRate([e])).toBe(20)
  })

  it('sums multiple recent entries', () => {
    const e1 = entry({ amount: 20, periodDays: 4 })
    const e2 = entry({ amount: 10, periodDays: 2, id: 'p2' })
    expect(computeProductionRate([e1, e2])).toBe(5) // 30/6
  })

  it('ignores entries older than 30 days', () => {
    const recent = entry({ amount: 10, periodDays: 2 })
    const old = entry({ amount: 999, periodDays: 1, loggedAt: Date.now() - 31 * DAY, id: 'p2' })
    expect(computeProductionRate([recent, old])).toBe(5) // 10/2
  })

  it('returns null when total periodDays is 0', () => {
    const e = entry({ amount: 5, periodDays: 0 })
    expect(computeProductionRate([e])).toBeNull()
  })
})

// ── computeNetRate ────────────────────────────────────────────────────────────

describe('computeNetRate', () => {
  it('returns null when both rates are null', () => {
    expect(computeNetRate(null, null)).toBeNull()
  })

  it('returns -burnRate when productionRate is null (treats as 0)', () => {
    expect(computeNetRate(null, 5)).toBe(-5)
  })

  it('returns productionRate when burnRate is null (treats as 0)', () => {
    expect(computeNetRate(3, null)).toBe(3)
  })

  it('returns production - burn', () => {
    expect(computeNetRate(10, 3)).toBe(7)  // surplus
    expect(computeNetRate(2, 5)).toBe(-3)  // deficit
    expect(computeNetRate(5, 5)).toBe(0)   // balanced
  })

  it('returns 0 when rates are equal (balanced)', () => {
    expect(computeNetRate(7, 7)).toBe(0)
  })
})

// ── computeNetDaysRemaining ───────────────────────────────────────────────────

describe('computeNetDaysRemaining', () => {
  it('returns Infinity when netRate is null', () => {
    expect(computeNetDaysRemaining(100, null)).toBe(Infinity)
  })

  it('returns Infinity when netRate is 0 (balanced — never depletes)', () => {
    expect(computeNetDaysRemaining(100, 0)).toBe(Infinity)
  })

  it('returns Infinity when netRate is positive (surplus)', () => {
    expect(computeNetDaysRemaining(100, 5)).toBe(Infinity)
    expect(computeNetDaysRemaining(0, 1)).toBe(Infinity)
  })

  it('returns stock / |netRate| when netRate is negative (deficit)', () => {
    expect(computeNetDaysRemaining(30, -3)).toBe(10)
    expect(computeNetDaysRemaining(100, -4)).toBe(25)
  })

  it('returns 0 when stock is 0 and rate is negative', () => {
    expect(computeNetDaysRemaining(0, -5)).toBe(0)
  })

  it('handles fractional result', () => {
    expect(computeNetDaysRemaining(10, -3)).toBeCloseTo(3.333, 3)
  })
})
