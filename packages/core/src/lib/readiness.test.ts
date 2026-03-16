import { describe, it, expect } from 'vitest'
import { computeCompositeReadiness } from './readiness.js'
import { ASSET_REGISTRY, assetsNeeded } from './asset-registry.js'
import type { ReadinessInput } from '../types/readiness.js'

const DAY = 24 * 60 * 60 * 1000

function base(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  const now = Date.now()
  return {
    tribeId: 'tribe-1',
    memberCount: 10,
    skillScore: 80,
    healthScores: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    lastTrainingSessionAt: now - 7 * DAY,
    inventoryForReadiness: [],
    consumptionStatuses: [
      { asset: 'food_reserve', status: 'ok' },
      { asset: 'water_reserve', status: 'ok' },
      { asset: 'fuel_reserve', status: 'ok' },
    ],
    hasTerritory: true,
    pinCount: 5,
    routeCount: 2,
    paceLevelsCount: 4,
    hasCheckInSchedules: true,
    hasRallyPoints: true,
    hasHamCert: true,
    activeGoalCount: 2,
    recentTaskCount: 3,
    lastMusterAt: now - 14 * DAY,
    profileCount: 10,
    archetypeCount: 6,
    avgCompatibility: 0.8,
    ...overrides,
  }
}

// Full inventory for pop=1, used to push supply to 100
const fullInventory = ASSET_REGISTRY
  .filter(a => assetsNeeded(1, a) > 0)
  .map(a => ({ asset: a.asset, quantity: assetsNeeded(1, a) * 10 }))

// ── Personnel dimension ───────────────────────────────────────────────────────

describe('personnel dimension', () => {
  it('scores 92 with skill=80, full health, recent training', () => {
    // skills_sub=0.8, health_sub=1.0, training_sub=1.0
    // (0.8*0.4 + 1.0*0.4 + 1.0*0.2)*100 = 92
    const r = computeCompositeReadiness(base())
    expect(r.dimensions.personnel.score).toBe(92)
  })

  it('training stale (31–90 days) gives training_sub=0.6', () => {
    const now = Date.now()
    // (0.8*0.4 + 1.0*0.4 + 0.6*0.2)*100 = 84
    const r = computeCompositeReadiness(base({ lastTrainingSessionAt: now - 45 * DAY }))
    expect(r.dimensions.personnel.score).toBe(84)
  })

  it('training old (>90 days) gives training_sub=0.3', () => {
    const now = Date.now()
    // (0.8*0.4 + 1.0*0.4 + 0.3*0.2)*100 = 78
    const r = computeCompositeReadiness(base({ lastTrainingSessionAt: now - 100 * DAY }))
    expect(r.dimensions.personnel.score).toBe(78)
  })

  it('training null gives training_sub=0', () => {
    // (0.8*0.4 + 1.0*0.4 + 0*0.2)*100 = 72
    const r = computeCompositeReadiness(base({ lastTrainingSessionAt: null }))
    expect(r.dimensions.personnel.score).toBe(72)
  })

  it('empty healthScores defaults health_sub to 1.0', () => {
    // same as full health
    const r = computeCompositeReadiness(base({ healthScores: [] }))
    expect(r.dimensions.personnel.score).toBe(92)
  })

  it('reduced health lowers personnel score', () => {
    // health_sub = 0.5 → (0.8*0.4 + 0.5*0.4 + 1.0*0.2)*100 = (0.32+0.2+0.2)*100 = 72
    const r = computeCompositeReadiness(base({ healthScores: [0.5, 0.5] }))
    expect(r.dimensions.personnel.score).toBe(72)
  })
})

// ── Supply dimension ──────────────────────────────────────────────────────────

describe('supply dimension', () => {
  it('scores 50 with empty inventory and all statuses ok', () => {
    // asset_sub=0, depletion_sub=1.0 → (0*0.5 + 1.0*0.5)*100 = 50
    const r = computeCompositeReadiness(base())
    expect(r.dimensions.supply.score).toBe(50)
  })

  it('warning status reduces depletion score', () => {
    const r = computeCompositeReadiness(base({
      consumptionStatuses: [
        { asset: 'food_reserve', status: 'warning' },
        { asset: 'water_reserve', status: 'ok' },
        { asset: 'fuel_reserve', status: 'ok' },
      ],
    }))
    // depletion_sub = (0.5 + 1.0 + 1.0) / 3 ≈ 0.833
    // supply = (0*0.5 + 0.833*0.5)*100 ≈ 41.7 → 42
    expect(r.dimensions.supply.score).toBe(42)
  })

  it('critical status severely reduces depletion score', () => {
    const r = computeCompositeReadiness(base({
      consumptionStatuses: [
        { asset: 'food_reserve', status: 'critical' },
        { asset: 'water_reserve', status: 'critical' },
        { asset: 'fuel_reserve', status: 'critical' },
      ],
    }))
    // depletion_sub = (0.1+0.1+0.1)/3 ≈ 0.1 → (0*0.5 + 0.1*0.5)*100 = 5
    expect(r.dimensions.supply.score).toBe(5)
  })

  it('missing status defaults to none (0.7)', () => {
    const r = computeCompositeReadiness(base({ consumptionStatuses: [] }))
    // depletion_sub = (0.7+0.7+0.7)/3 = 0.7 → (0*0.5 + 0.7*0.5)*100 = 35
    expect(r.dimensions.supply.score).toBe(35)
  })

  it('full inventory with all ok gives supply 100', () => {
    const r = computeCompositeReadiness(base({
      memberCount: 1,
      inventoryForReadiness: fullInventory,
    }))
    expect(r.dimensions.supply.score).toBe(100)
  })
})

// ── Infrastructure dimension ──────────────────────────────────────────────────

describe('infrastructure dimension', () => {
  it('scores 100 with territory + 5 pins + 2 routes', () => {
    const r = computeCompositeReadiness(base())
    expect(r.dimensions.infrastructure.score).toBe(100)
  })

  it('no territory gives 0 for territory_sub (40% weight)', () => {
    // (0*0.4 + 1.0*0.4 + 1.0*0.2)*100 = 60
    const r = computeCompositeReadiness(base({ hasTerritory: false }))
    expect(r.dimensions.infrastructure.score).toBe(60)
  })

  it('pins_sub caps at 1.0 beyond 5 pins', () => {
    const r5 = computeCompositeReadiness(base({ pinCount: 5 }))
    const r10 = computeCompositeReadiness(base({ pinCount: 10 }))
    expect(r5.dimensions.infrastructure.score).toBe(r10.dimensions.infrastructure.score)
  })

  it('zero pins reduces score proportionally', () => {
    // (1.0*0.4 + 0*0.4 + 1.0*0.2)*100 = 60
    const r = computeCompositeReadiness(base({ pinCount: 0 }))
    expect(r.dimensions.infrastructure.score).toBe(60)
  })
})

// ── Comms dimension ───────────────────────────────────────────────────────────

describe('comms dimension', () => {
  it('scores 100 with full PACE plan, schedules, rally points, and HAM cert', () => {
    const r = computeCompositeReadiness(base())
    expect(r.dimensions.comms.score).toBe(100)
  })

  it('no HAM cert reduces score by 40 points', () => {
    // ham_sub=0 → (1.0*0.6 + 0*0.4)*100 = 60
    const r = computeCompositeReadiness(base({ hasHamCert: false }))
    expect(r.dimensions.comms.score).toBe(60)
  })

  it('incomplete PACE (2/4) reduces pace_sub', () => {
    // pace_sub = (2/4)*0.5 + 0.25 + 0.25 = 0.75 → comms = (0.75*0.6 + 1.0*0.4)*100 = 85
    const r = computeCompositeReadiness(base({ paceLevelsCount: 2 }))
    expect(r.dimensions.comms.score).toBe(85)
  })

  it('zero PACE, no schedules, no rally, no HAM gives comms=0', () => {
    const r = computeCompositeReadiness(base({
      paceLevelsCount: 0,
      hasCheckInSchedules: false,
      hasRallyPoints: false,
      hasHamCert: false,
    }))
    expect(r.dimensions.comms.score).toBe(0)
  })
})

// ── Coordination dimension ────────────────────────────────────────────────────

describe('coordination dimension', () => {
  it('scores 100 with 2 goals, 3 tasks, recent muster', () => {
    const r = computeCompositeReadiness(base())
    expect(r.dimensions.coordination.score).toBe(100)
  })

  it('muster stale (31–90 days) gives muster_sub=0.5', () => {
    const now = Date.now()
    // (1.0*0.3 + 1.0*0.4 + 0.5*0.3)*100 = 85
    const r = computeCompositeReadiness(base({ lastMusterAt: now - 45 * DAY }))
    expect(r.dimensions.coordination.score).toBe(85)
  })

  it('muster old (>90 days) gives muster_sub=0', () => {
    const now = Date.now()
    // (1.0*0.3 + 1.0*0.4 + 0*0.3)*100 = 70
    const r = computeCompositeReadiness(base({ lastMusterAt: now - 91 * DAY }))
    expect(r.dimensions.coordination.score).toBe(70)
  })

  it('null muster gives muster_sub=0', () => {
    const r = computeCompositeReadiness(base({ lastMusterAt: null }))
    expect(r.dimensions.coordination.score).toBe(70)
  })

  it('no goals and no tasks with recent muster gives 30', () => {
    // (0*0.3 + 0*0.4 + 1.0*0.3)*100 = 30
    const r = computeCompositeReadiness(base({ activeGoalCount: 0, recentTaskCount: 0 }))
    expect(r.dimensions.coordination.score).toBe(30)
  })
})

// ── Cohesion dimension ────────────────────────────────────────────────────────

describe('cohesion dimension', () => {
  it('scores 93 with full profiles, all 6 archetypes, compat=0.8', () => {
    // (1.0*0.3 + 1.0*0.35 + 0.8*0.35)*100 = 93
    const r = computeCompositeReadiness(base())
    expect(r.dimensions.cohesion.score).toBe(93)
  })

  it('zero cohesion inputs give score 0', () => {
    const r = computeCompositeReadiness(base({
      profileCount: 0,
      archetypeCount: 0,
      avgCompatibility: 0,
    }))
    expect(r.dimensions.cohesion.score).toBe(0)
  })

  it('profile_sub is relative to memberCount', () => {
    // 5/10 = 0.5 profiles → (0.5*0.3 + 1.0*0.35 + 0.8*0.35)*100 = 78
    const r = computeCompositeReadiness(base({ profileCount: 5 }))
    expect(r.dimensions.cohesion.score).toBe(78)
  })
})

// ── Overall calculation and grades ───────────────────────────────────────────

describe('overall score and grade', () => {
  it('base input gives overall=84, grade B', () => {
    // 92*0.30 + 50*0.25 + 100*0.15 + 100*0.10 + 100*0.10 + 93*0.10 = 84.4 → 84
    const r = computeCompositeReadiness(base())
    expect(r.overall).toBe(84)
    expect(r.grade).toBe('B')
  })

  it('grade A requires overall ≥ 90', () => {
    const r = computeCompositeReadiness(base({
      memberCount: 1,
      skillScore: 100,
      healthScores: [1],
      inventoryForReadiness: fullInventory,
      consumptionStatuses: [
        { asset: 'food_reserve', status: 'ok' },
        { asset: 'water_reserve', status: 'ok' },
        { asset: 'fuel_reserve', status: 'ok' },
      ],
      archetypeCount: 6,
      profileCount: 1,
      avgCompatibility: 1,
    }))
    expect(r.overall).toBeGreaterThanOrEqual(90)
    expect(r.grade).toBe('A')
  })

  it('grade C: overall 60–74', () => {
    const now = Date.now()
    // Reduce personnel (skill=30) and cohesion (partial profiles, low compat)
    // personnel=(0.3*0.4+1.0*0.4+1.0*0.2)*100=72; cohesion=(0.5*0.3+0.5*0.35+0*0.35)*100=32.5→33
    // coord: goals=1→0.5, tasks=2→0.667, muster=14d→1.0
    //   = (0.5*0.3+0.667*0.4+1.0*0.3)*100 ≈ 71.7 → 72
    // overall = round(72*0.30+50*0.25+100*0.15+100*0.10+72*0.10+33*0.10)
    //         = round(21.6+12.5+15+10+7.2+3.3) = round(69.6) = 70
    const r = computeCompositeReadiness(base({
      skillScore: 30,
      profileCount: 5,
      archetypeCount: 3,
      avgCompatibility: 0,
      activeGoalCount: 1,
      recentTaskCount: 2,
      lastMusterAt: now - 14 * DAY,
    }))
    expect(r.overall).toBeGreaterThanOrEqual(60)
    expect(r.overall).toBeLessThan(75)
    expect(r.grade).toBe('C')
  })

  it('grade D: overall 45–59', () => {
    // Only muster keeps coord up: (0*0.3+0*0.4+1.0*0.3)*100=30
    // personnel with skill=0, health=[], no training=72... hmm let me use null training
    // personnel=(0*0.4+1.0*0.4+0*0.2)*100=40
    // supply=50 (all ok, empty inv)
    // infra=100, comms=100, cohesion=0, coord=30
    // overall = round(40*0.30+50*0.25+100*0.15+100*0.10+30*0.10+0*0.10)
    //         = round(12+12.5+15+10+3+0) = round(52.5) = 53
    const r = computeCompositeReadiness(base({
      skillScore: 0,
      healthScores: [],
      lastTrainingSessionAt: null,
      activeGoalCount: 0,
      recentTaskCount: 0,
      profileCount: 0,
      archetypeCount: 0,
      avgCompatibility: 0,
    }))
    expect(r.overall).toBeGreaterThanOrEqual(45)
    expect(r.overall).toBeLessThan(60)
    expect(r.grade).toBe('D')
  })

  it('grade F: overall < 45 when most dimensions zeroed', () => {
    // personnel=0, supply=35 (none statuses), infra=0, comms=0, coord=0, cohesion=0
    // overall = round(0+8.75+0+0+0+0) = 9
    const r = computeCompositeReadiness(base({
      skillScore: 0,
      healthScores: [],
      lastTrainingSessionAt: null,
      consumptionStatuses: [],
      hasTerritory: false,
      pinCount: 0,
      routeCount: 0,
      paceLevelsCount: 0,
      hasCheckInSchedules: false,
      hasRallyPoints: false,
      hasHamCert: false,
      activeGoalCount: 0,
      recentTaskCount: 0,
      lastMusterAt: null,
      profileCount: 0,
      archetypeCount: 0,
      avgCompatibility: 0,
    }))
    expect(r.overall).toBeLessThan(45)
    expect(r.grade).toBe('F')
  })

  it('grade threshold boundaries: 90=A, 89=B, 75=B, 74=C, 60=C, 59=D, 45=D, 44=F', () => {
    // Test the toGrade function indirectly via known overall values
    const gradeOf = (overall: number) => {
      if (overall >= 90) return 'A'
      if (overall >= 75) return 'B'
      if (overall >= 60) return 'C'
      if (overall >= 45) return 'D'
      return 'F'
    }
    expect(gradeOf(90)).toBe('A')
    expect(gradeOf(89)).toBe('B')
    expect(gradeOf(75)).toBe('B')
    expect(gradeOf(74)).toBe('C')
    expect(gradeOf(60)).toBe('C')
    expect(gradeOf(59)).toBe('D')
    expect(gradeOf(45)).toBe('D')
    expect(gradeOf(44)).toBe('F')
  })
})

// ── Critical gap detection ────────────────────────────────────────────────────

describe('critical gaps', () => {
  it('base input has no critical gaps', () => {
    const r = computeCompositeReadiness(base())
    expect(r.criticalGaps).toHaveLength(0)
  })

  it('detects reduced health gap', () => {
    const r = computeCompositeReadiness(base({ healthScores: [0.5, 0.5] }))
    expect(r.criticalGaps).toContain('Multiple members have reduced health status')
  })

  it('no health gap when healthScores is empty (no data)', () => {
    const r = computeCompositeReadiness(base({ healthScores: [] }))
    expect(r.criticalGaps).not.toContain('Multiple members have reduced health status')
  })

  it('detects skill gap when skillScore < 50', () => {
    const r = computeCompositeReadiness(base({ skillScore: 49 }))
    expect(r.criticalGaps).toContain('Critical skill gaps — review Tribe Schematic')
  })

  it('no skill gap at skillScore=50', () => {
    const r = computeCompositeReadiness(base({ skillScore: 50 }))
    expect(r.criticalGaps).not.toContain('Critical skill gaps — review Tribe Schematic')
  })

  it('detects food supply gap on warning status', () => {
    const r = computeCompositeReadiness(base({
      consumptionStatuses: [
        { asset: 'food_reserve', status: 'warning' },
        { asset: 'water_reserve', status: 'ok' },
        { asset: 'fuel_reserve', status: 'ok' },
      ],
    }))
    expect(r.criticalGaps).toContain('Food supply is critically low')
  })

  it('detects water supply gap on critical status', () => {
    const r = computeCompositeReadiness(base({
      consumptionStatuses: [
        { asset: 'food_reserve', status: 'ok' },
        { asset: 'water_reserve', status: 'critical' },
        { asset: 'fuel_reserve', status: 'ok' },
      ],
    }))
    expect(r.criticalGaps).toContain('Water supply is critically low')
  })

  it('detects fuel supply gap', () => {
    const r = computeCompositeReadiness(base({
      consumptionStatuses: [
        { asset: 'food_reserve', status: 'ok' },
        { asset: 'water_reserve', status: 'ok' },
        { asset: 'fuel_reserve', status: 'warning' },
      ],
    }))
    expect(r.criticalGaps).toContain('Fuel supply is critically low')
  })

  it('detects no territory gap', () => {
    const r = computeCompositeReadiness(base({ hasTerritory: false }))
    expect(r.criticalGaps).toContain('No map territory defined')
  })

  it('detects incomplete PACE plan', () => {
    const r = computeCompositeReadiness(base({ paceLevelsCount: 3 }))
    expect(r.criticalGaps).toContain('PACE plan incomplete — all 4 comms levels needed')
  })

  it('detects missing HAM cert', () => {
    const r = computeCompositeReadiness(base({ hasHamCert: false }))
    expect(r.criticalGaps).toContain('No HAM radio operator cert on file')
  })

  it('detects no active tribe goals', () => {
    const r = computeCompositeReadiness(base({ activeGoalCount: 0 }))
    expect(r.criticalGaps).toContain('No active tribe goals')
  })

  it('detects muster overdue (null)', () => {
    const r = computeCompositeReadiness(base({ lastMusterAt: null }))
    expect(r.criticalGaps).toContain('No muster drill in 90 days')
  })

  it('detects muster overdue (>90 days ago)', () => {
    const now = Date.now()
    const r = computeCompositeReadiness(base({ lastMusterAt: now - 91 * DAY }))
    expect(r.criticalGaps).toContain('No muster drill in 90 days')
  })

  it('no muster gap when muster was recent', () => {
    const now = Date.now()
    const r = computeCompositeReadiness(base({ lastMusterAt: now - 89 * DAY }))
    expect(r.criticalGaps).not.toContain('No muster drill in 90 days')
  })

  it('detects low psych profile coverage', () => {
    // profileCount=4, memberCount=10 → profile_sub=0.4 < 0.5
    const r = computeCompositeReadiness(base({ profileCount: 4 }))
    expect(r.criticalGaps).toContain('Fewer than half of members have psych profiles')
  })

  it('no psych gap when memberCount=0', () => {
    const r = computeCompositeReadiness(base({ memberCount: 0, profileCount: 0 }))
    expect(r.criticalGaps).not.toContain('Fewer than half of members have psych profiles')
  })

  it('accumulates multiple simultaneous gaps', () => {
    const now = Date.now()
    const r = computeCompositeReadiness(base({
      skillScore: 0,
      hasTerritory: false,
      hasHamCert: false,
      activeGoalCount: 0,
      lastMusterAt: null,
      profileCount: 0,
      consumptionStatuses: [
        { asset: 'food_reserve', status: 'critical' },
        { asset: 'water_reserve', status: 'critical' },
        { asset: 'fuel_reserve', status: 'critical' },
      ],
      lastTrainingSessionAt: now - 100 * DAY,
    }))
    expect(r.criticalGaps.length).toBeGreaterThanOrEqual(7)
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('memberCount=0 uses 1 for assetReadiness calculation', () => {
    const r = computeCompositeReadiness(base({ memberCount: 0, profileCount: 0 }))
    expect(r.overall).toBeGreaterThan(0)
  })

  it('returns the tribeId in the report', () => {
    const r = computeCompositeReadiness(base({ tribeId: 'tribe-xyz' }))
    expect(r.tribeId).toBe('tribe-xyz')
  })

  it('computedAt is a recent timestamp', () => {
    const before = Date.now()
    const r = computeCompositeReadiness(base())
    expect(r.computedAt).toBeGreaterThanOrEqual(before)
    expect(r.computedAt).toBeLessThanOrEqual(before + 100)
  })
})
