import { gun } from './gun'
import { getDB } from './db'
import { scoreQuiz, computeArchetype, mergeProfileDimensions } from '@plus-ultra/core'
import type { PsychProfile, PsychDimensions, PeerRating } from '@plus-ultra/core'

// ─── Gun SEA-safe helpers (inlined per project convention) ────────────────────

function gunEscape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (typeof v === 'string' && v.startsWith('SEA{')) {
      out[k] = '~' + v
    } else {
      out[k] = v
    }
  }
  return out
}

function gunUnescape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.startsWith('~SEA{')) {
      out[k] = v.slice(1)
    } else {
      out[k] = v
    }
  }
  return out
}

// ─── Week hash ────────────────────────────────────────────────────────────────

/** Deterministic week identifier: `${raterPub.slice(0, 8)}:${tribeId.slice(0, 8)}:${isoWeek}` */
function weekHash(raterPub: string, tribeId: string): string {
  const now = new Date()
  // ISO week: year + week number
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  const isoWeek = `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
  return `${raterPub.slice(0, 8)}:${tribeId.slice(0, 8)}:${isoWeek}`
}

// ─── Profile serialization ────────────────────────────────────────────────────

function serializeProfile(profile: PsychProfile): Record<string, unknown> {
  return gunEscape({
    memberId: profile.memberId,
    tribeId: profile.tribeId,
    archetype: profile.archetype,
    quizCompletedAt: profile.quizCompletedAt ?? 0,
    lastUpdatedAt: profile.lastUpdatedAt,
    peerRatingCount: profile.peerRatingCount,
    // Flatten dimensions
    d_decisionSpeed: profile.dimensions.decisionSpeed,
    d_stressTolerance: profile.dimensions.stressTolerance,
    d_leadershipStyle: profile.dimensions.leadershipStyle,
    d_conflictApproach: profile.dimensions.conflictApproach,
    d_riskAppetite: profile.dimensions.riskAppetite,
    d_socialEnergy: profile.dimensions.socialEnergy,
    // Flatten peer dimensions
    pd_decisionSpeed: profile.peerDimensions.decisionSpeed ?? -1,
    pd_stressTolerance: profile.peerDimensions.stressTolerance ?? -1,
    pd_leadershipStyle: profile.peerDimensions.leadershipStyle ?? -1,
    pd_conflictApproach: profile.peerDimensions.conflictApproach ?? -1,
    pd_riskAppetite: profile.peerDimensions.riskAppetite ?? -1,
    pd_socialEnergy: profile.peerDimensions.socialEnergy ?? -1,
  })
}

function deserializeProfile(raw: Record<string, unknown>): PsychProfile | null {
  const obj = gunUnescape(raw)
  if (!obj.memberId || !obj.tribeId) return null

  const peerDimensions: Partial<PsychDimensions> = {}
  if (typeof obj.pd_stressTolerance === 'number' && obj.pd_stressTolerance >= 0) peerDimensions.stressTolerance = obj.pd_stressTolerance
  if (typeof obj.pd_leadershipStyle === 'number' && obj.pd_leadershipStyle >= 0) peerDimensions.leadershipStyle = obj.pd_leadershipStyle
  if (typeof obj.pd_conflictApproach === 'number' && obj.pd_conflictApproach >= 0) peerDimensions.conflictApproach = obj.pd_conflictApproach
  if (typeof obj.pd_decisionSpeed === 'number' && obj.pd_decisionSpeed >= 0) peerDimensions.decisionSpeed = obj.pd_decisionSpeed
  if (typeof obj.pd_riskAppetite === 'number' && obj.pd_riskAppetite >= 0) peerDimensions.riskAppetite = obj.pd_riskAppetite
  if (typeof obj.pd_socialEnergy === 'number' && obj.pd_socialEnergy >= 0) peerDimensions.socialEnergy = obj.pd_socialEnergy

  const quizCompletedAt = typeof obj.quizCompletedAt === 'number' && obj.quizCompletedAt > 0
    ? obj.quizCompletedAt
    : null

  return {
    memberId: obj.memberId as string,
    tribeId: obj.tribeId as string,
    archetype: (obj.archetype as PsychProfile['archetype']) ?? 'Sustainer',
    quizCompletedAt,
    lastUpdatedAt: (obj.lastUpdatedAt as number) ?? Date.now(),
    peerRatingCount: (obj.peerRatingCount as number) ?? 0,
    dimensions: {
      decisionSpeed: (obj.d_decisionSpeed as number) ?? 50,
      stressTolerance: (obj.d_stressTolerance as number) ?? 50,
      leadershipStyle: (obj.d_leadershipStyle as number) ?? 50,
      conflictApproach: (obj.d_conflictApproach as number) ?? 50,
      riskAppetite: (obj.d_riskAppetite as number) ?? 50,
      socialEnergy: (obj.d_socialEnergy as number) ?? 50,
    },
    peerDimensions,
  }
}

// ─── Save quiz result ─────────────────────────────────────────────────────────

export async function saveQuizResult(
  tribeId: string,
  memberPub: string,
  answers: Record<string, 'A' | 'B' | 'C' | 'D'>
): Promise<PsychProfile> {
  const db = await getDB()
  const key = `${tribeId}:${memberPub}`

  // Load existing profile to preserve peer data
  const existing = await db.get('psych-profiles', key)
  const existingProfile = existing ? deserializeProfile(existing as Record<string, unknown>) : null

  const quizDims = scoreQuiz(answers)
  const peerDims = existingProfile?.peerDimensions ?? {}
  const merged = mergeProfileDimensions(quizDims, peerDims, true)

  const profile: PsychProfile = {
    memberId: memberPub,
    tribeId,
    archetype: computeArchetype(merged),
    dimensions: merged,
    quizCompletedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    peerDimensions: peerDims,
    peerRatingCount: existingProfile?.peerRatingCount ?? 0,
  }

  await db.put('psych-profiles', profile, key)
  gun.get('tribes').get(tribeId).get('psych-profiles').get(memberPub)
    .put(serializeProfile(profile))

  return profile
}

// ─── Peer ratings ─────────────────────────────────────────────────────────────

export async function hasRatedThisWeek(
  tribeId: string,
  ratedPub: string,
  raterPub: string
): Promise<boolean> {
  const db = await getDB()
  const wh = weekHash(raterPub, tribeId)
  const key = `${tribeId}:${ratedPub}:${wh}`
  const existing = await db.get('peer-ratings', key)
  return existing !== undefined
}

export async function submitPeerRating(
  tribeId: string,
  ratedPub: string,
  raterPub: string,
  ratings: { stressTolerance: number; leadershipStyle: number; conflictApproach: number }
): Promise<void> {
  const db = await getDB()
  const wh = weekHash(raterPub, tribeId)
  const ratingKey = `${tribeId}:${ratedPub}:${wh}`

  const peerRating: PeerRating = {
    id: `${ratedPub}:${wh}`,
    tribeId,
    ratedPub,
    stressTolerance: ratings.stressTolerance,
    leadershipStyle: ratings.leadershipStyle,
    conflictApproach: ratings.conflictApproach,
    ratedAt: Date.now(),
  }

  // Store locally (rater identity not sent to Gun — only used for dedup)
  await db.put('peer-ratings', peerRating, ratingKey)

  // Aggregate: fetch all local peer ratings for this member across all raters
  // Then recompute average and update profile
  await _updatePeerAggregates(tribeId, ratedPub)

  // Push the aggregate (not raw ratings) to Gun — no rater identity exposed
  const profileKey = `${tribeId}:${ratedPub}`
  const existing = await db.get('psych-profiles', profileKey)
  if (existing) {
    const profile = deserializeProfile(existing as Record<string, unknown>)
    if (profile) {
      gun.get('tribes').get(tribeId).get('psych-profiles').get(ratedPub)
        .put(serializeProfile(profile))
    }
  }
}

async function _updatePeerAggregates(tribeId: string, ratedPub: string): Promise<void> {
  const db = await getDB()

  // Collect all local peer ratings for this person in this tribe
  const allKeys = await db.getAllKeys('peer-ratings')
  const prefix = `${tribeId}:${ratedPub}:`
  const relevantKeys = allKeys.filter(k => String(k).startsWith(prefix))

  const ratings: PeerRating[] = []
  for (const k of relevantKeys) {
    const r = await db.get('peer-ratings', k)
    if (r) ratings.push(r as PeerRating)
  }

  if (ratings.length === 0) return

  const avgStress = Math.round(ratings.reduce((s, r) => s + r.stressTolerance, 0) / ratings.length)
  const avgLeader = Math.round(ratings.reduce((s, r) => s + r.leadershipStyle, 0) / ratings.length)
  const avgConflict = Math.round(ratings.reduce((s, r) => s + r.conflictApproach, 0) / ratings.length)

  const profileKey = `${tribeId}:${ratedPub}`
  const existing = await db.get('psych-profiles', profileKey)
  const existingProfile = existing ? deserializeProfile(existing as Record<string, unknown>) : null

  const peerDims: Partial<PsychDimensions> = {
    stressTolerance: avgStress,
    leadershipStyle: avgLeader,
    conflictApproach: avgConflict,
    ...(existingProfile?.peerDimensions.decisionSpeed !== undefined ? { decisionSpeed: existingProfile.peerDimensions.decisionSpeed } : {}),
    ...(existingProfile?.peerDimensions.riskAppetite !== undefined ? { riskAppetite: existingProfile.peerDimensions.riskAppetite } : {}),
    ...(existingProfile?.peerDimensions.socialEnergy !== undefined ? { socialEnergy: existingProfile.peerDimensions.socialEnergy } : {}),
  }

  const quizDims = existingProfile?.dimensions ?? {
    decisionSpeed: 50, stressTolerance: 50, leadershipStyle: 50,
    conflictApproach: 50, riskAppetite: 50, socialEnergy: 50,
  }
  const hasQuiz = existingProfile?.quizCompletedAt !== null && existingProfile?.quizCompletedAt !== undefined
  const merged = mergeProfileDimensions(quizDims, peerDims, hasQuiz)

  const updatedProfile: PsychProfile = {
    memberId: ratedPub,
    tribeId,
    archetype: computeArchetype(merged),
    dimensions: merged,
    quizCompletedAt: existingProfile?.quizCompletedAt ?? null,
    lastUpdatedAt: Date.now(),
    peerDimensions: peerDims,
    peerRatingCount: ratings.length,
  }

  await db.put('psych-profiles', updatedProfile, profileKey)
}

// ─── Passive inference ────────────────────────────────────────────────────────

/**
 * Called after a user casts a vote.
 * Scale: <2h = decisive (+10 decisionSpeed), >24h = deliberate (+10 opposite end)
 */
export async function recordVoteSignal(
  tribeId: string,
  memberPub: string,
  hoursToVote: number
): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${memberPub}`
  const existing = await db.get('psych-profiles', key)
  if (!existing) return

  const profile = deserializeProfile(existing as Record<string, unknown>)
  if (!profile) return

  let delta = 0
  if (hoursToVote < 2) delta = +5
  else if (hoursToVote > 24) delta = -5

  if (delta === 0) return

  const newSpeed = Math.max(0, Math.min(100, profile.dimensions.decisionSpeed + delta))
  const updatedDims = { ...profile.dimensions, decisionSpeed: newSpeed }
  const merged = mergeProfileDimensions(updatedDims, profile.peerDimensions, profile.quizCompletedAt !== null)
  const updatedProfile: PsychProfile = {
    ...profile,
    dimensions: merged,
    archetype: computeArchetype(merged),
    lastUpdatedAt: Date.now(),
  }

  await db.put('psych-profiles', updatedProfile, key)
  gun.get('tribes').get(tribeId).get('psych-profiles').get(memberPub)
    .put(serializeProfile(updatedProfile))
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeTribePsychProfiles(
  tribeId: string,
  callback: (profiles: PsychProfile[]) => void
): () => void {
  const profilesRef = gun.get('tribes').get(tribeId).get('psych-profiles')

  // Seed from IDB
  const profileMap = new Map<string, PsychProfile>()

  getDB().then(async db => {
    const allKeys = await db.getAllKeys('psych-profiles')
    const relevantKeys = allKeys.filter(k => String(k).startsWith(`${tribeId}:`))
    for (const k of relevantKeys) {
      const raw = await db.get('psych-profiles', k)
      if (raw) {
        const p = deserializeProfile(raw as Record<string, unknown>)
        if (p) profileMap.set(p.memberId, p)
      }
    }
    callback(Array.from(profileMap.values()))
  })

  const handlers: ReturnType<typeof setInterval>[] = []

  // Gun live subscription
  profilesRef.map().on((raw: unknown, memberPub: string) => {
    if (!raw || typeof raw !== 'object') return
    const p = deserializeProfile(raw as Record<string, unknown>)
    if (!p) return
    profileMap.set(memberPub, p)
    getDB().then(db => {
      db.put('psych-profiles', p, `${tribeId}:${memberPub}`)
    })
    callback(Array.from(profileMap.values()))
  })

  // 2s poll fallback
  const poll = setInterval(() => {
    profilesRef.map().once((raw: unknown, memberPub: string) => {
      if (!raw || typeof raw !== 'object') return
      const p = deserializeProfile(raw as Record<string, unknown>)
      if (!p) return
      const existing = profileMap.get(memberPub)
      if (!existing || p.lastUpdatedAt > existing.lastUpdatedAt) {
        profileMap.set(memberPub, p)
        getDB().then(db => {
          db.put('psych-profiles', p, `${tribeId}:${memberPub}`)
        })
        callback(Array.from(profileMap.values()))
      }
    })
  }, 2000)
  handlers.push(poll)

  return () => {
    profilesRef.map().off()
    handlers.forEach(h => clearInterval(h))
  }
}

export function subscribePsychProfile(
  tribeId: string,
  memberPub: string,
  callback: (profile: PsychProfile | null) => void
): () => void {
  const profileRef = gun.get('tribes').get(tribeId).get('psych-profiles').get(memberPub)

  // Seed from IDB
  getDB().then(async db => {
    const raw = await db.get('psych-profiles', `${tribeId}:${memberPub}`)
    if (raw) {
      const p = deserializeProfile(raw as Record<string, unknown>)
      callback(p)
    } else {
      callback(null)
    }
  })

  let latest: PsychProfile | null = null

  profileRef.on((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return
    const p = deserializeProfile(raw as Record<string, unknown>)
    if (!p) return
    latest = p
    getDB().then(db => {
      db.put('psych-profiles', p, `${tribeId}:${memberPub}`)
    })
    callback(p)
  })

  const poll = setInterval(() => {
    profileRef.once((raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const p = deserializeProfile(raw as Record<string, unknown>)
      if (!p) return
      if (!latest || p.lastUpdatedAt > latest.lastUpdatedAt) {
        latest = p
        getDB().then(db => {
          db.put('psych-profiles', p, `${tribeId}:${memberPub}`)
        })
        callback(p)
      }
    })
  }, 2000)

  return () => {
    profileRef.off()
    clearInterval(poll)
  }
}
