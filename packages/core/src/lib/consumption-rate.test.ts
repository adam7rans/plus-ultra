import { describe, it, expect } from 'vitest'
import {
  computeBurnRate,
  computeDaysRemaining,
  getDepletionStatus,
} from './consumption-rate.js'
import type { ConsumptionEntry } from '../types/consumption.js'

const DAY = 24 * 60 * 60 * 1000

function entry(overrides: Partial<ConsumptionEntry> = {}): ConsumptionEntry {
  return {
    id: 'e1',
    tribeId: 'tribe-1',
    asset: 'food_reserve',
    amount: 10,
    periodDays: 1,
    loggedAt: Date.now() - DAY, // yesterday — within 30-day window
    loggedBy: 'member-1',
    notes: '',
    ...overrides,
  }
}

// ── computeBurnRate ───────────────────────────────────────────────────────────

describe('computeBurnRate', () => {
  it('returns null for empty entry list', () => {
    expect(computeBurnRate([])).toBeNull()
  })

  it('returns null when all entries are older than 30 days', () => {
    const old = entry({ loggedAt: Date.now() - 35 * DAY })
    expect(computeBurnRate([old])).toBeNull()
  })

  it('computes amount/days for single recent entry', () => {
    const e = entry({ amount: 30, periodDays: 3 })
    expect(computeBurnRate([e])).toBe(10) // 30/3
  })

  it('sums multiple recent entries', () => {
    const e1 = entry({ amount: 20, periodDays: 4 })
    const e2 = entry({ amount: 10, periodDays: 2, id: 'e2' })
    // (20+10) / (4+2) = 30/6 = 5
    expect(computeBurnRate([e1, e2])).toBe(5)
  })

  it('ignores entries older than 30 days', () => {
    const recent = entry({ amount: 10, periodDays: 1 })
    const old = entry({ amount: 999, periodDays: 1, loggedAt: Date.now() - 31 * DAY, id: 'e2' })
    expect(computeBurnRate([recent, old])).toBe(10) // 10/1
  })

  it('returns null when total periodDays is 0', () => {
    const e = entry({ amount: 5, periodDays: 0 })
    expect(computeBurnRate([e])).toBeNull()
  })

  it('uses exactly the 30-day boundary', () => {
    const justInside = entry({ loggedAt: Date.now() - 29 * DAY })
    expect(computeBurnRate([justInside])).not.toBeNull()

    const justOutside = entry({ loggedAt: Date.now() - 31 * DAY })
    expect(computeBurnRate([justOutside])).toBeNull()
  })
})

// ── computeDaysRemaining ──────────────────────────────────────────────────────

describe('computeDaysRemaining', () => {
  it('returns Infinity when burnRate is null', () => {
    expect(computeDaysRemaining(100, null)).toBe(Infinity)
  })

  it('returns Infinity when burnRate is 0', () => {
    expect(computeDaysRemaining(100, 0)).toBe(Infinity)
  })

  it('returns quantity / burnRate', () => {
    expect(computeDaysRemaining(90, 3)).toBe(30)
    expect(computeDaysRemaining(14, 2)).toBe(7)
  })

  it('returns fractional days for non-divisible values', () => {
    expect(computeDaysRemaining(10, 3)).toBeCloseTo(3.333, 3)
  })

  it('returns 0 when quantity is 0', () => {
    expect(computeDaysRemaining(0, 5)).toBe(0)
  })
})

// ── getDepletionStatus ────────────────────────────────────────────────────────

describe('getDepletionStatus', () => {
  it('returns "none" for assets not in thresholds', () => {
    expect(getDepletionStatus('shelter_housing', 10, 1, 5)).toBe('none')
    expect(getDepletionStatus('school', 1, null, 1)).toBe('none')
  })

  // food_reserve: days type, warn=14, crit=7
  describe('food_reserve (days type)', () => {
    it('returns "ok" when burnRate is null (Infinity days)', () => {
      expect(getDepletionStatus('food_reserve', 100, null, 0)).toBe('ok')
    })

    it('returns "ok" when burnRate is 0 (Infinity days)', () => {
      expect(getDepletionStatus('food_reserve', 100, 0, 0)).toBe('ok')
    })

    it('returns "ok" when days remaining > 14', () => {
      // 30/1 = 30 days
      expect(getDepletionStatus('food_reserve', 30, 1, 0)).toBe('ok')
    })

    it('returns "warning" at exactly 14 days remaining', () => {
      expect(getDepletionStatus('food_reserve', 14, 1, 0)).toBe('warning')
    })

    it('returns "warning" between 7 and 14 days remaining', () => {
      // 10/1 = 10 days
      expect(getDepletionStatus('food_reserve', 10, 1, 0)).toBe('warning')
    })

    it('returns "critical" at exactly 7 days remaining', () => {
      expect(getDepletionStatus('food_reserve', 7, 1, 0)).toBe('critical')
    })

    it('returns "critical" below 7 days remaining', () => {
      // 3/1 = 3 days
      expect(getDepletionStatus('food_reserve', 3, 1, 0)).toBe('critical')
    })
  })

  // water_reserve: days type, warn=7, crit=3
  describe('water_reserve (days type)', () => {
    it('returns "ok" when days > 7', () => {
      expect(getDepletionStatus('water_reserve', 14, 1, 0)).toBe('ok')
    })

    it('returns "warning" between 3 and 7 days', () => {
      expect(getDepletionStatus('water_reserve', 5, 1, 0)).toBe('warning')
    })

    it('returns "critical" at 2 days remaining', () => {
      expect(getDepletionStatus('water_reserve', 2, 1, 0)).toBe('critical')
    })
  })

  // fuel_reserve: same thresholds as water (warn=7, crit=3)
  describe('fuel_reserve (days type)', () => {
    it('returns "warning" at 6 days remaining', () => {
      expect(getDepletionStatus('fuel_reserve', 6, 1, 0)).toBe('warning')
    })

    it('returns "critical" at 2 days remaining', () => {
      expect(getDepletionStatus('fuel_reserve', 2, 1, 0)).toBe('critical')
    })
  })

  // ammo_reserve: pct type, warn=0.25, crit=0.10
  describe('ammo_reserve (pct type)', () => {
    it('returns "ok" when ratio > 25%', () => {
      // 30/100 = 0.30 > 0.25
      expect(getDepletionStatus('ammo_reserve', 30, null, 100)).toBe('ok')
    })

    it('returns "warning" at exactly 25% remaining', () => {
      // 25/100 = 0.25
      expect(getDepletionStatus('ammo_reserve', 25, null, 100)).toBe('warning')
    })

    it('returns "warning" between 10% and 25%', () => {
      // 15/100 = 0.15
      expect(getDepletionStatus('ammo_reserve', 15, null, 100)).toBe('warning')
    })

    it('returns "critical" at exactly 10%', () => {
      expect(getDepletionStatus('ammo_reserve', 10, null, 100)).toBe('critical')
    })

    it('returns "critical" below 10%', () => {
      expect(getDepletionStatus('ammo_reserve', 5, null, 100)).toBe('critical')
    })

    it('returns "ok" when needed=0 (ratio defaults to 1)', () => {
      expect(getDepletionStatus('ammo_reserve', 0, null, 0)).toBe('ok')
    })
  })
})
