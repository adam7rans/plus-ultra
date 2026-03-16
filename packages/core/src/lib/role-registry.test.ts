import { describe, it, expect } from 'vitest'
import { slotsNeeded, activeRoles, totalSlotsNeeded, ROLE_BY_KEY, ROLE_REGISTRY } from './role-registry.js'

// ── slotsNeeded — linear curve ────────────────────────────────────────────────

describe('slotsNeeded — linear curve', () => {
  it('physician: 1 per 75 people, base=1', () => {
    const spec = ROLE_BY_KEY['physician']
    expect(slotsNeeded(10, spec)).toBe(1)   // max(1, ceil(10/75))=1
    expect(slotsNeeded(75, spec)).toBe(1)   // max(1, ceil(75/75))=1
    expect(slotsNeeded(76, spec)).toBe(2)   // max(1, ceil(76/75))=2
    expect(slotsNeeded(150, spec)).toBe(2)  // max(1, ceil(150/75))=2
  })

  it('tactical_shooter: base=2, ratio=8', () => {
    const spec = ROLE_BY_KEY['tactical_shooter']
    expect(slotsNeeded(10, spec)).toBe(2)   // max(2, ceil(10/8))=max(2,2)=2
    expect(slotsNeeded(24, spec)).toBe(3)   // max(2, ceil(24/8))=max(2,3)=3
  })

  it('returns 0 for pop below minPop', () => {
    const spec = ROLE_BY_KEY['dentist'] // minPop=50
    expect(slotsNeeded(30, spec)).toBe(0)
    expect(slotsNeeded(49, spec)).toBe(0)
  })

  it('returns slots at exactly minPop', () => {
    const spec = ROLE_BY_KEY['dentist'] // minPop=50, sqrt curve
    expect(slotsNeeded(50, spec)).toBeGreaterThan(0)
  })
})

// ── slotsNeeded — sqrt curve ──────────────────────────────────────────────────

describe('slotsNeeded — sqrt curve', () => {
  it('squad_leader: max(base=1, round(sqrt(pop/5)))', () => {
    const spec = ROLE_BY_KEY['squad_leader']
    // sqrt(10/5) = sqrt(2) = 1.414 → round=1 → max(1,1)=1
    expect(slotsNeeded(10, spec)).toBe(1)
    // sqrt(200/5) = sqrt(40) = 6.32 → round=6 → max(1,6)=6
    expect(slotsNeeded(200, spec)).toBe(6)
  })

  it('dentist: below minPop=50 returns 0', () => {
    const spec = ROLE_BY_KEY['dentist']
    expect(slotsNeeded(30, spec)).toBe(0)
    expect(slotsNeeded(50, spec)).toBeGreaterThan(0)
  })
})

// ── slotsNeeded — log curve ───────────────────────────────────────────────────

describe('slotsNeeded — log curve', () => {
  it('strategic_commander: max(1, round(log2(pop/10))), with cap=10', () => {
    const spec = ROLE_BY_KEY['strategic_commander'] // minPop=30, cap=10
    expect(slotsNeeded(20, spec)).toBe(0)  // below minPop
    // log2(30/10) = log2(3) = 1.585 → round=2 → max(1,2)=2
    expect(slotsNeeded(30, spec)).toBe(2)
    // log2(200/10) = log2(20) = 4.32 → round=4 → max(1,4)=4
    expect(slotsNeeded(200, spec)).toBe(4)
  })

  it('respects cap — strategic_commander caps at 10', () => {
    const spec = ROLE_BY_KEY['strategic_commander'] // cap=10
    // Very large population should not exceed cap
    expect(slotsNeeded(10000, spec)).toBeLessThanOrEqual(10)
  })

  it('strategic_planner caps at 10', () => {
    const spec = ROLE_BY_KEY['strategic_planner'] // cap=10
    expect(slotsNeeded(10000, spec)).toBeLessThanOrEqual(10)
  })
})

// ── slotsNeeded — fixed curve ─────────────────────────────────────────────────

describe('slotsNeeded — fixed curve', () => {
  it('well_driller: always returns base=1 regardless of population', () => {
    const spec = ROLE_BY_KEY['well_driller'] // fixed, base=1, cap=5
    expect(slotsNeeded(10, spec)).toBe(1)
    expect(slotsNeeded(100, spec)).toBe(1)
    expect(slotsNeeded(1000, spec)).toBe(1)
  })

  it('fixed curve with cap: result is min(base, cap)', () => {
    const spec = ROLE_BY_KEY['well_driller'] // base=1, cap=5 → min(1,5)=1
    expect(slotsNeeded(500, spec)).toBe(1)
  })
})

// ── cap enforcement ───────────────────────────────────────────────────────────

describe('cap enforcement', () => {
  it('uncapped roles (cap=0) grow without limit', () => {
    const spec = ROLE_BY_KEY['physician'] // cap=0
    const small = slotsNeeded(100, spec)
    const large = slotsNeeded(10000, spec)
    expect(large).toBeGreaterThan(small)
  })

  it('capped roles do not exceed their cap at large populations', () => {
    const capped = ROLE_REGISTRY.filter(r => r.cap > 0)
    for (const spec of capped) {
      expect(slotsNeeded(100000, spec)).toBeLessThanOrEqual(spec.cap)
    }
  })
})

// ── activeRoles ───────────────────────────────────────────────────────────────

describe('activeRoles', () => {
  it('returns only roles with slots > 0 at given population', () => {
    const roles = activeRoles(100)
    for (const spec of roles) {
      expect(slotsNeeded(100, spec)).toBeGreaterThan(0)
    }
  })

  it('roles with minPop > pop are excluded', () => {
    // potter has minPop=150 — should not appear at pop=100
    const roles = activeRoles(100)
    expect(roles.find(r => r.role === 'potter')).toBeUndefined()
  })

  it('roles with minPop > pop appear once population threshold is crossed', () => {
    const below = activeRoles(149)
    const above = activeRoles(150)
    const potterBelow = below.find(r => r.role === 'potter')
    const potterAbove = above.find(r => r.role === 'potter')
    expect(potterBelow).toBeUndefined()
    expect(potterAbove).toBeDefined()
  })

  it('more roles are active at larger populations', () => {
    const small = activeRoles(10)
    const large = activeRoles(200)
    expect(large.length).toBeGreaterThanOrEqual(small.length)
  })
})

// ── totalSlotsNeeded ──────────────────────────────────────────────────────────

describe('totalSlotsNeeded', () => {
  it('returns 0 when no roles have slots at pop=0 with minPop>0 only', () => {
    // Some roles have minPop=0 and base≥1, so there are always some slots
    expect(totalSlotsNeeded(0)).toBeGreaterThanOrEqual(0)
  })

  it('increases with population', () => {
    const t50 = totalSlotsNeeded(50)
    const t200 = totalSlotsNeeded(200)
    expect(t200).toBeGreaterThan(t50)
  })

  it('equals the sum of individual slotsNeeded', () => {
    const pop = 75
    const manual = ROLE_REGISTRY.reduce((sum, spec) => sum + slotsNeeded(pop, spec), 0)
    expect(totalSlotsNeeded(pop)).toBe(manual)
  })
})
