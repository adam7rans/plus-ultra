import { describe, it, expect } from 'vitest'
import { assetsNeeded, assetReadiness, assetsSummary, ASSET_BY_KEY, ASSET_REGISTRY } from './asset-registry.js'

describe('assetsNeeded scaling', () => {
  it('shelter scales linearly — 1 per 4 people', () => {
    const spec = ASSET_BY_KEY['shelter_housing']
    expect(assetsNeeded(12, spec)).toBe(3)
    expect(assetsNeeded(150, spec)).toBe(38)
  })

  it('food reserve is fixed at 90 days regardless of population', () => {
    const spec = ASSET_BY_KEY['food_reserve']
    expect(assetsNeeded(30, spec)).toBe(90)
    expect(assetsNeeded(500, spec)).toBe(90)
  })

  it('assets below minPop return 0', () => {
    const spec = ASSET_BY_KEY['school']
    expect(assetsNeeded(30, spec)).toBe(0)
    expect(assetsNeeded(50, spec)).toBeGreaterThanOrEqual(1)
  })

  it('agricultural land scales — 1 acre per 4 people', () => {
    const spec = ASSET_BY_KEY['agricultural_land']
    expect(assetsNeeded(150, spec)).toBe(38)
  })

  it('firearms scale — 1 per 3 people', () => {
    const spec = ASSET_BY_KEY['firearm']
    expect(assetsNeeded(30, spec)).toBe(10)
    expect(assetsNeeded(150, spec)).toBe(50)
  })
})

describe('assetReadiness', () => {
  it('returns 0 with no inventory', () => {
    const score = assetReadiness(30, [])
    expect(score).toBe(0)
  })

  it('returns 1 when fully stocked', () => {
    const inventory = ASSET_REGISTRY
      .filter(a => assetsNeeded(1, a) > 0)
      .map(a => ({ asset: a.asset, quantity: assetsNeeded(1, a) * 10 }))
    const score = assetReadiness(1, inventory)
    expect(score).toBe(1)
  })

  it('partial inventory gives partial score', () => {
    const score = assetReadiness(30, [{ asset: 'shelter_housing', quantity: 8 }])
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })
})

describe('assetsSummary', () => {
  it('returns all categories', () => {
    const summary = assetsSummary(150)
    expect(summary.land).toBeDefined()
    expect(summary.structures).toBeDefined()
    expect(summary.equipment).toBeDefined()
    expect(summary.vehicles).toBeDefined()
    expect(summary.stores).toBeDefined()
  })

  it('more assets are needed at larger populations', () => {
    const small = assetsSummary(30)
    const large = assetsSummary(500)
    const smallTotal = Object.values(small).reduce((s, c) => s + c.total, 0)
    const largeTotal = Object.values(large).reduce((s, c) => s + c.total, 0)
    expect(largeTotal).toBeGreaterThanOrEqual(smallTotal)
  })
})
