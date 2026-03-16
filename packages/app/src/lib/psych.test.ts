import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./gun.js', () => {
  function chain(path: string[] = []): Record<string, unknown> {
    return {
      get(key: string) { return chain([...path, key]) },
      put(payload: unknown, ack?: (a: { err?: string }) => void) {
        ack?.({})
        return chain(path)
      },
      on() { return chain(path) },
      once() { return chain(path) },
      map() { return chain(path) },
      off() {},
    }
  }
  return { gun: chain() }
})

let _offlineSince: number | null = null
vi.mock('./offline-tracker.js', () => ({
  getOfflineSince: () => _offlineSince,
  setOfflineSince: (ts: number) => { _offlineSince = ts },
  clearOfflineSince: () => { _offlineSince = null },
  computeOfflineStage: () => 0,
}))

import { saveQuizResult, hasRatedThisWeek, submitPeerRating, recordVoteSignal } from './psych.js'
import { getDB } from './db.js'
import type { PsychProfile } from '@plus-ultra/core'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ARCHETYPES = ['Architect', 'Protector', 'Healer', 'Cultivator', 'Connector', 'Sustainer']
const answers = { q1: 'A', q2: 'B', q3: 'A', q4: 'C' } as Record<string, 'A' | 'B' | 'C' | 'D'>

// ── saveQuizResult ────────────────────────────────────────────────────────────

describe('saveQuizResult', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes profile to psych-profiles IDB store with key tribeId:memberPub', async () => {
    await saveQuizResult('tribe-1', 'member-1', answers)

    const db = await getDB()
    const stored = await db.get('psych-profiles', 'tribe-1:member-1')
    expect(stored).toBeDefined()
  })

  it('sets quizCompletedAt to a recent timestamp', async () => {
    const before = Date.now()
    await saveQuizResult('tribe-1', 'member-quiz-ts', answers)

    const db = await getDB()
    const stored = await db.get('psych-profiles', 'tribe-1:member-quiz-ts') as PsychProfile
    expect(stored.quizCompletedAt).toBeGreaterThanOrEqual(before)
  })

  it('computes a valid archetype', async () => {
    const profile = await saveQuizResult('tribe-1', 'member-arch', answers)

    expect(ARCHETYPES).toContain(profile.archetype)
  })

  it('stores a dimensions object with expected keys', async () => {
    const profile = await saveQuizResult('tribe-1', 'member-dims', answers)

    expect(profile.dimensions).toBeDefined()
    expect(typeof profile.dimensions.decisionSpeed).toBe('number')
    expect(typeof profile.dimensions.stressTolerance).toBe('number')
    expect(typeof profile.dimensions.leadershipStyle).toBe('number')
    expect(typeof profile.dimensions.conflictApproach).toBe('number')
    expect(typeof profile.dimensions.riskAppetite).toBe('number')
    expect(typeof profile.dimensions.socialEnergy).toBe('number')
  })

  it('preserves existing peerRatingCount when re-taking quiz', async () => {
    const db = await getDB()
    // Seed a profile with peerRatingCount=3
    const seedProfile: PsychProfile = {
      memberId: 'member-peer',
      tribeId: 'tribe-1',
      archetype: 'Sustainer',
      dimensions: {
        decisionSpeed: 50, stressTolerance: 50, leadershipStyle: 50,
        conflictApproach: 50, riskAppetite: 50, socialEnergy: 50,
      },
      quizCompletedAt: Date.now() - 100_000,
      lastUpdatedAt: Date.now() - 100_000,
      peerDimensions: {},
      peerRatingCount: 3,
    }
    await db.put('psych-profiles', seedProfile, 'tribe-1:member-peer')

    const profile = await saveQuizResult('tribe-1', 'member-peer', answers)

    expect(profile.peerRatingCount).toBe(3)
  })
})

// ── submitPeerRating ──────────────────────────────────────────────────────────

describe('submitPeerRating', () => {
  beforeEach(() => { _offlineSince = null })

  it('throws when ratedPub === raterPub', async () => {
    await expect(
      submitPeerRating('tribe-1', 'self-pub', 'self-pub', {
        stressTolerance: 70, leadershipStyle: 60, conflictApproach: 50,
      })
    ).rejects.toThrow('Cannot rate yourself')
  })

  it('stores peer rating in peer-ratings IDB store', async () => {
    await saveQuizResult('tribe-peer', 'rated-1', answers)

    await submitPeerRating('tribe-peer', 'rated-1', 'rater-1', {
      stressTolerance: 80, leadershipStyle: 70, conflictApproach: 60,
    })

    const db = await getDB()
    const allKeys = await db.getAllKeys('peer-ratings')
    const matchingKey = allKeys.find(k => String(k).startsWith('tribe-peer:rated-1:'))
    expect(matchingKey).toBeDefined()
  })

  it('updates peerDimensions on psych-profile for ratedPub', async () => {
    await saveQuizResult('tribe-peer2', 'rated-2', answers)

    await submitPeerRating('tribe-peer2', 'rated-2', 'rater-2', {
      stressTolerance: 90, leadershipStyle: 80, conflictApproach: 75,
    })

    const db = await getDB()
    const stored = await db.get('psych-profiles', 'tribe-peer2:rated-2') as PsychProfile
    expect(stored.peerDimensions.stressTolerance).toBe(90)
    expect(stored.peerDimensions.leadershipStyle).toBe(80)
    expect(stored.peerDimensions.conflictApproach).toBe(75)
  })

  it('clamps ratings above 100 to 100', async () => {
    await saveQuizResult('tribe-clamp', 'rated-clamp', answers)

    await submitPeerRating('tribe-clamp', 'rated-clamp', 'rater-clamp', {
      stressTolerance: 150, leadershipStyle: 200, conflictApproach: 999,
    })

    const db = await getDB()
    const stored = await db.get('psych-profiles', 'tribe-clamp:rated-clamp') as PsychProfile
    expect(stored.peerDimensions.stressTolerance).toBe(100)
    expect(stored.peerDimensions.leadershipStyle).toBe(100)
    expect(stored.peerDimensions.conflictApproach).toBe(100)
  })

  it('clamps ratings below 0 to 0', async () => {
    await saveQuizResult('tribe-clamp2', 'rated-clamp2', answers)

    await submitPeerRating('tribe-clamp2', 'rated-clamp2', 'rater-clamp2', {
      stressTolerance: -10, leadershipStyle: -50, conflictApproach: -1,
    })

    const db = await getDB()
    const stored = await db.get('psych-profiles', 'tribe-clamp2:rated-clamp2') as PsychProfile
    expect(stored.peerDimensions.stressTolerance).toBe(0)
    expect(stored.peerDimensions.leadershipStyle).toBe(0)
    expect(stored.peerDimensions.conflictApproach).toBe(0)
  })
})

// ── hasRatedThisWeek ──────────────────────────────────────────────────────────

describe('hasRatedThisWeek', () => {
  beforeEach(() => { _offlineSince = null })

  it('returns false before any rating is submitted', async () => {
    const result = await hasRatedThisWeek('tribe-hrw', 'rated-hrw', 'rater-hrw')
    expect(result).toBe(false)
  })

  it('returns true after a rating is submitted', async () => {
    await saveQuizResult('tribe-hrw2', 'rated-hrw2', answers)

    await submitPeerRating('tribe-hrw2', 'rated-hrw2', 'rater-hrw2', {
      stressTolerance: 70, leadershipStyle: 60, conflictApproach: 55,
    })

    const result = await hasRatedThisWeek('tribe-hrw2', 'rated-hrw2', 'rater-hrw2')
    expect(result).toBe(true)
  })
})

// ── recordVoteSignal ──────────────────────────────────────────────────────────

describe('recordVoteSignal', () => {
  beforeEach(() => { _offlineSince = null })

  it('is a no-op when profile does not exist', async () => {
    await expect(
      recordVoteSignal('tribe-rvs', 'nonexistent-member', 1)
    ).resolves.toBeUndefined()
  })

  it('increases decisionSpeed by 5 when hoursToVote < 2', async () => {
    await saveQuizResult('tribe-rvs2', 'member-fast', answers)

    const db = await getDB()
    const before = await db.get('psych-profiles', 'tribe-rvs2:member-fast') as PsychProfile
    const speedBefore = before.dimensions.decisionSpeed

    await recordVoteSignal('tribe-rvs2', 'member-fast', 1)

    const after = await db.get('psych-profiles', 'tribe-rvs2:member-fast') as PsychProfile
    expect(after.dimensions.decisionSpeed).toBe(Math.min(100, speedBefore + 5))
  })

  it('decreases decisionSpeed by 5 when hoursToVote > 24', async () => {
    await saveQuizResult('tribe-rvs3', 'member-slow', answers)

    const db = await getDB()
    const before = await db.get('psych-profiles', 'tribe-rvs3:member-slow') as PsychProfile
    const speedBefore = before.dimensions.decisionSpeed

    await recordVoteSignal('tribe-rvs3', 'member-slow', 48)

    const after = await db.get('psych-profiles', 'tribe-rvs3:member-slow') as PsychProfile
    expect(after.dimensions.decisionSpeed).toBe(Math.max(0, speedBefore - 5))
  })

  it('makes no change when hoursToVote is between 2 and 24', async () => {
    await saveQuizResult('tribe-rvs4', 'member-mid', answers)

    const db = await getDB()
    const before = await db.get('psych-profiles', 'tribe-rvs4:member-mid') as PsychProfile
    const speedBefore = before.dimensions.decisionSpeed

    await recordVoteSignal('tribe-rvs4', 'member-mid', 12)

    const after = await db.get('psych-profiles', 'tribe-rvs4:member-mid') as PsychProfile
    expect(after.dimensions.decisionSpeed).toBe(speedBefore)
  })
})
