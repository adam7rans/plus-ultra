import { describe, it, expect } from 'vitest'
import { getTribeScale, getNextScale, scaleProgress, SCALE_LEVELS } from './tribe-scale.js'

describe('getTribeScale', () => {
  it('1 person is fireteam', () => {
    expect(getTribeScale(1).scale).toBe('fireteam')
  })

  it('12 people is fireteam', () => {
    expect(getTribeScale(12).scale).toBe('fireteam')
  })

  it('13 people is cell', () => {
    expect(getTribeScale(13).scale).toBe('cell')
  })

  it('30 people is cell', () => {
    expect(getTribeScale(30).scale).toBe('cell')
  })

  it('31 people is tribe', () => {
    expect(getTribeScale(31).scale).toBe('tribe')
  })

  it('150 people is tribe', () => {
    expect(getTribeScale(150).scale).toBe('tribe')
  })

  it('151 people is village', () => {
    expect(getTribeScale(151).scale).toBe('village')
  })

  it('501 people is town', () => {
    expect(getTribeScale(501).scale).toBe('town')
  })

  it('2001 people is settlement', () => {
    expect(getTribeScale(2001).scale).toBe('settlement')
  })
})

describe('getNextScale', () => {
  it('fireteam → cell', () => {
    expect(getNextScale(5)?.scale).toBe('cell')
  })

  it('settlement has no next', () => {
    expect(getNextScale(5000)).toBeNull()
  })
})

describe('scaleProgress', () => {
  it('returns 0 at start of a scale', () => {
    expect(scaleProgress(1)).toBe(0)
  })

  it('returns value between 0 and 1 mid-scale', () => {
    const progress = scaleProgress(75)
    expect(progress).toBeGreaterThan(0)
    expect(progress).toBeLessThan(1)
  })

  it('returns 1 at max scale', () => {
    expect(scaleProgress(10000)).toBe(1)
  })
})

describe('SCALE_LEVELS', () => {
  it('has 6 levels', () => {
    expect(SCALE_LEVELS).toHaveLength(6)
  })

  it('each level has role slots and asset counts', () => {
    for (const level of SCALE_LEVELS) {
      expect(level.roleSlots).toBeGreaterThan(0)
      expect(level.assetCount).toBeGreaterThan(0)
    }
  })

  it('role slots increase with scale', () => {
    for (let i = 1; i < SCALE_LEVELS.length; i++) {
      expect(SCALE_LEVELS[i].roleSlots).toBeGreaterThanOrEqual(SCALE_LEVELS[i - 1].roleSlots)
    }
  })
})
