import { describe, it, expect } from 'vitest'
import {
  canEditInventory,
  getAffinityAssets,
  getAffinityDomains,
  getEditableCategories,
} from './role-affinity.js'

// ── canEditInventory ──────────────────────────────────────────────────────────

describe('canEditInventory', () => {
  it('quartermaster can edit all 5 categories', () => {
    const categories = ['land', 'structures', 'equipment', 'vehicles', 'stores'] as const
    for (const cat of categories) {
      expect(canEditInventory(['quartermaster'], cat)).toBe(true)
    }
  })

  it('physician can edit equipment and stores', () => {
    expect(canEditInventory(['physician'], 'equipment')).toBe(true)
    expect(canEditInventory(['physician'], 'stores')).toBe(true)
  })

  it('physician cannot edit land, structures, or vehicles', () => {
    expect(canEditInventory(['physician'], 'land')).toBe(false)
    expect(canEditInventory(['physician'], 'structures')).toBe(false)
    expect(canEditInventory(['physician'], 'vehicles')).toBe(false)
  })

  it('vehicle_mechanic can edit vehicles only', () => {
    expect(canEditInventory(['vehicle_mechanic'], 'vehicles')).toBe(true)
    expect(canEditInventory(['vehicle_mechanic'], 'equipment')).toBe(false)
    expect(canEditInventory(['vehicle_mechanic'], 'stores')).toBe(false)
  })

  it('farmer can edit land and stores', () => {
    expect(canEditInventory(['farmer'], 'land')).toBe(true)
    expect(canEditInventory(['farmer'], 'stores')).toBe(true)
    expect(canEditInventory(['farmer'], 'equipment')).toBe(false)
  })

  it('surveyor can edit land only', () => {
    expect(canEditInventory(['surveyor'], 'land')).toBe(true)
    expect(canEditInventory(['surveyor'], 'structures')).toBe(false)
  })

  it('roles with empty permissions return false for all categories', () => {
    const noPermRoles = ['dentist', 'sniper', 'squad_leader', 'teacher', 'diplomat'] as const
    const categories = ['land', 'structures', 'equipment', 'vehicles', 'stores'] as const
    for (const role of noPermRoles) {
      for (const cat of categories) {
        expect(canEditInventory([role], cat)).toBe(false)
      }
    }
  })

  it('empty roles array always returns false', () => {
    expect(canEditInventory([], 'equipment')).toBe(false)
  })

  it('any role in array with matching permission grants access', () => {
    // dentist has no permissions, but physician does
    expect(canEditInventory(['dentist', 'physician'], 'equipment')).toBe(true)
  })

  it('multiple restricted roles still return false', () => {
    expect(canEditInventory(['dentist', 'sniper'], 'equipment')).toBe(false)
  })
})

// ── getAffinityAssets ─────────────────────────────────────────────────────────

describe('getAffinityAssets', () => {
  it('returns empty array for empty roles', () => {
    expect(getAffinityAssets([])).toHaveLength(0)
  })

  it('unknown/missing role key is skipped without crashing', () => {
    expect(() => getAffinityAssets(['unknown_role' as never])).not.toThrow()
    expect(getAffinityAssets(['unknown_role' as never])).toHaveLength(0)
  })

  it('physician (medical domain) returns medical assets', () => {
    const assets = getAffinityAssets(['physician'])
    expect(assets).toContain('medical_kit')
    expect(assets).toContain('medical_supplies')
  })

  it('quartermaster (logistics domain) returns logistics assets', () => {
    const assets = getAffinityAssets(['quartermaster'])
    expect(assets).toContain('food_reserve')
    expect(assets).toContain('fuel_reserve')
  })

  it('farmer (food domain) returns food assets', () => {
    const assets = getAffinityAssets(['farmer'])
    expect(assets).toContain('agricultural_land')
    expect(assets).toContain('seed_stock')
  })

  it('deduplicates assets when multiple roles share the same domain', () => {
    const assets = getAffinityAssets(['physician', 'nurse'])
    const unique = new Set(assets)
    expect(assets.length).toBe(unique.size)
  })

  it('combining roles from different domains yields union of their assets', () => {
    const medical = getAffinityAssets(['physician'])
    const food = getAffinityAssets(['farmer'])
    const combined = getAffinityAssets(['physician', 'farmer'])
    // combined should contain all from both (at minimum)
    for (const asset of medical) {
      expect(combined).toContain(asset)
    }
    for (const asset of food) {
      expect(combined).toContain(asset)
    }
  })
})

// ── getAffinityDomains ────────────────────────────────────────────────────────

describe('getAffinityDomains', () => {
  it('returns empty array for empty roles', () => {
    expect(getAffinityDomains([])).toHaveLength(0)
  })

  it('physician (medical domain) returns medical + logistics affinity', () => {
    const domains = getAffinityDomains(['physician'])
    expect(domains).toContain('medical')
    expect(domains).toContain('logistics')
  })

  it('tactical_shooter (security domain) returns security + comms', () => {
    const domains = getAffinityDomains(['tactical_shooter'])
    expect(domains).toContain('security')
    expect(domains).toContain('comms')
  })

  it('deduplicates domains from multiple roles', () => {
    const domains = getAffinityDomains(['physician', 'nurse'])
    const unique = new Set(domains)
    expect(domains.length).toBe(unique.size)
  })
})

// ── getEditableCategories ─────────────────────────────────────────────────────

describe('getEditableCategories', () => {
  it('returns empty array for roles with no permissions', () => {
    expect(getEditableCategories(['dentist'])).toHaveLength(0)
    expect(getEditableCategories([])).toHaveLength(0)
  })

  it('quartermaster returns all 5 categories', () => {
    const cats = getEditableCategories(['quartermaster'])
    expect(cats.length).toBe(5)
    expect(cats).toContain('land')
    expect(cats).toContain('structures')
    expect(cats).toContain('equipment')
    expect(cats).toContain('vehicles')
    expect(cats).toContain('stores')
  })

  it('deduplicates categories when multiple roles share permissions', () => {
    const cats = getEditableCategories(['physician', 'nurse']) // both have equipment + stores
    const unique = new Set(cats)
    expect(cats.length).toBe(unique.size)
  })

  it('union of roles yields union of their categories', () => {
    const physicianCats = getEditableCategories(['physician'])  // equipment, stores
    const farmerCats = getEditableCategories(['farmer'])        // land, stores
    const combined = getEditableCategories(['physician', 'farmer'])
    // Should contain all categories from both
    for (const cat of [...physicianCats, ...farmerCats]) {
      expect(combined).toContain(cat)
    }
  })
})
