import { describe, it, expect } from 'vitest'
import { currentAttachmentScore } from './membership.js'
import type { TribeMember } from '../types/tribe.js'

const DAY = 24 * 60 * 60 * 1000

function member(overrides: Partial<TribeMember> = {}): TribeMember {
  return {
    pubkey: 'pub-1',
    tribeId: 'tribe-1',
    joinedAt: Date.now() - 30 * DAY,
    lastSeen: Date.now() - DAY,
    status: 'active',
    attachmentScore: 0.8,
    memberType: 'adult',
    displayName: 'Alice',
    ...overrides,
  }
}

// ── active status ─────────────────────────────────────────────────────────────

describe('active status', () => {
  it('returns the original score with no decay', () => {
    expect(currentAttachmentScore(member())).toBe(0.8)
  })

  it('returns the original score regardless of lastSeen', () => {
    const m = member({ lastSeen: Date.now() - 100 * DAY })
    expect(currentAttachmentScore(m)).toBe(0.8)
  })
})

// ── away_declared status ──────────────────────────────────────────────────────

describe('away_declared status', () => {
  it('returns original score when not yet overdue (before declaredReturnAt)', () => {
    const m = member({
      status: 'away_declared',
      attachmentScore: 0.9,
      declaredReturnAt: Date.now() + 7 * DAY, // returns in 7 days
    })
    expect(currentAttachmentScore(m)).toBe(0.9)
  })

  it('decays 5% per day after declaredReturnAt has passed', () => {
    const m = member({
      status: 'away_declared',
      attachmentScore: 0.8,
      declaredReturnAt: Date.now() - 10 * DAY, // 10 days overdue
    })
    // 0.8 - (10 * 0.05) = 0.8 - 0.5 = 0.3
    const score = currentAttachmentScore(m)
    expect(score).toBeCloseTo(0.3, 5)
  })

  it('clamps to 0 when overdue long enough to go negative', () => {
    const m = member({
      status: 'away_declared',
      attachmentScore: 0.5,
      declaredReturnAt: Date.now() - 20 * DAY, // would decay to -0.5
    })
    expect(currentAttachmentScore(m)).toBe(0)
  })

  it('falls back to original score when declaredReturnAt is undefined', () => {
    const m = member({
      status: 'away_declared',
      attachmentScore: 0.7,
      declaredReturnAt: undefined,
    })
    expect(currentAttachmentScore(m)).toBe(0.7)
  })
})

// ── away_undeclared status ────────────────────────────────────────────────────

describe('away_undeclared status', () => {
  it('decays 5% per day since lastSeen', () => {
    const m = member({
      status: 'away_undeclared',
      attachmentScore: 0.8,
      lastSeen: Date.now() - 4 * DAY, // 4 days ago
    })
    // 0.8 - (4 * 0.05) = 0.8 - 0.2 = 0.6
    const score = currentAttachmentScore(m)
    expect(score).toBeCloseTo(0.6, 5)
  })

  it('clamps to 0, never goes negative', () => {
    const m = member({
      status: 'away_undeclared',
      attachmentScore: 0.5,
      lastSeen: Date.now() - 20 * DAY, // would decay to -0.5
    })
    expect(currentAttachmentScore(m)).toBe(0)
  })

  it('exact 10-day boundary: 0.5 score decays to exactly 0', () => {
    const m = member({
      status: 'away_undeclared',
      attachmentScore: 0.5,
      lastSeen: Date.now() - 10 * DAY, // 10 * 0.05 = 0.5 decay → 0
    })
    expect(currentAttachmentScore(m)).toBeCloseTo(0, 5)
  })

  it('day 1 of absence: minimal decay', () => {
    const m = member({
      status: 'away_undeclared',
      attachmentScore: 1.0,
      lastSeen: Date.now() - 1 * DAY,
    })
    // 1.0 - 0.05 = 0.95
    expect(currentAttachmentScore(m)).toBeCloseTo(0.95, 5)
  })
})

// ── edge cases ────────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('score of 0 stays 0 for active member', () => {
    const m = member({ attachmentScore: 0, status: 'active' })
    expect(currentAttachmentScore(m)).toBe(0)
  })

  it('score of 1.0 for active member stays 1.0', () => {
    const m = member({ attachmentScore: 1.0, status: 'active' })
    expect(currentAttachmentScore(m)).toBe(1.0)
  })

  it('unknown/other status returns original score', () => {
    const m = member({ status: 'departed' as 'active' })
    expect(currentAttachmentScore(m)).toBe(0.8)
  })
})
