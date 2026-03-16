import { nanoid } from 'nanoid'
import SEA from 'gun/sea'
import { gun } from './gun'
import { getDB } from './db'
import { addPendingSync } from './sync-queue'
import { getOfflineSince } from './offline-tracker'
import { convexWrite } from './sync-adapter'
import { shortId } from './identity'
import type { Tribe, TribeMember, HealthStatus } from '@plus-ultra/core'

// ─── Tribe creation ──────────────────────────────────────────────────────────

export async function createTribe(
  params: {
    name: string
    location: string
    region: string
    constitutionTemplate: Tribe['constitutionTemplate']
    lat?: number
    lng?: number
  },
  founderPub: string,
  founderDisplayName?: string,
  founderEpub?: string
): Promise<Tribe> {
  const tribeId = nanoid()
  // Tribe gets its own cryptographic keypair
  const tribePair = await (SEA as unknown as { pair: () => Promise<{ pub: string; priv: string; epub: string; epriv: string }> }).pair()

  const tribe: Tribe = {
    id: tribeId,
    pub: tribePair.pub,
    priv: tribePair.priv,
    name: params.name,
    location: params.location,
    region: params.region.toLowerCase().replace(/\s+/g, '-'),
    createdAt: Date.now(),
    constitutionTemplate: params.constitutionTemplate,
    founderId: founderPub,
    ...(params.lat !== undefined ? { lat: params.lat } : {}),
    ...(params.lng !== undefined ? { lng: params.lng } : {}),
  }

  // Write public tribe data to Gun (no priv key) — fire and forget.
  // Gun is for P2P sync; IDB is source of truth. Don't block on ack —
  // with no relay connected, the ack callback never fires.
  const gunTribeData: Record<string, unknown> = {
    id: tribeId,
    pub: tribePair.pub,
    epub: tribePair.epub,
    name: tribe.name,
    location: tribe.location,
    region: tribe.region,
    createdAt: tribe.createdAt,
    constitutionTemplate: tribe.constitutionTemplate,
    founderId: founderPub,
  }
  if (tribe.lat !== undefined) gunTribeData.lat = tribe.lat
  if (tribe.lng !== undefined) gunTribeData.lng = tribe.lng

  // Sync to Convex (grid-up) — no priv keys go to cloud
  void convexWrite('tribes.upsert', gunTribeData)

  // Sync to Gun (always — for P2P grid-down fallback)
  gun.get('tribes').get(tribeId).put(gunTribeData)

  // Write founder as first member
  const founderMember: TribeMember = {
    pubkey: founderPub,
    tribeId,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    status: 'active',
    attachmentScore: 1.0,
    memberType: 'adult',
    authorityRole: 'founder',
    displayName: founderDisplayName ?? shortId(founderPub),
    epub: founderEpub,
  }
  await writeMember(tribeId, founderMember)

  // Store tribe locally (including priv key — founder keeps it)
  const db = await getDB()
  await db.put('my-tribes', {
    tribeId,
    joinedAt: Date.now(),
    tribePub: tribePair.pub,
    tribePriv: tribePair.priv,
    tribeEpub: tribePair.epub,
    tribeEpriv: tribePair.epriv,
    name: tribe.name,
    location: tribe.location,
  }, tribeId)
  // Cache full tribe metadata for offline dashboard load
  await db.put('tribe-cache', tribe, tribeId)

  return tribe
}

// ─── Invite tokens ───────────────────────────────────────────────────────────

export async function createInviteToken(tribeId: string): Promise<string> {
  const token = nanoid(16)
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

  const inviteData = {
    token,
    tribeId,
    createdAt: Date.now(),
    expiresAt,
    used: false,
  }
  void convexWrite('invites.create', inviteData)
  gun.get('tribes').get(tribeId).get('invites').get(token).put(inviteData)

  return token
}

export function buildInviteUrl(tribeId: string, token: string, tribe?: { name: string; location: string; pub?: string }): string {
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://app.plusultra.network'
  const params = new URLSearchParams({ tribe: tribeId, token })
  if (tribe) {
    params.set('name', tribe.name)
    params.set('loc', tribe.location)
    if (tribe.pub) params.set('pub', tribe.pub)
  }
  return `${base}/join?${params.toString()}`
}

export async function validateAndConsumeToken(
  tribeId: string,
  token: string
): Promise<{ valid: boolean; reason?: string }> {
  return new Promise((resolve) => {
    // Short timeout — if Gun has no data (no relay, offline), allow join anyway.
    // In offline mode the URL itself is the trust; single-use enforcement requires a relay.
    const timeout = setTimeout(() => {
      console.warn('[tribes] invite token not found in Gun (offline mode) — allowing join')
      resolve({ valid: true })
    }, 2000)

    gun.get('tribes').get(tribeId).get('invites').get(token).once((data: unknown) => {
      clearTimeout(timeout)
      if (!data || typeof data !== 'object') {
        // Not in Gun — offline mode, allow join
        return resolve({ valid: true })
      }
      const d = data as { used?: boolean; expiresAt?: number }
      if (d.used) {
        return resolve({ valid: false, reason: 'Invite link already used' })
      }
      if (d.expiresAt && Date.now() > d.expiresAt) {
        return resolve({ valid: false, reason: 'Invite link expired' })
      }
      // Mark as used (fire and forget)
      gun.get('tribes').get(tribeId).get('invites').get(token).put({ used: true })
      resolve({ valid: true })
    })
  })
}

// ─── Join tribe ───────────────────────────────────────────────────────────────

export async function joinTribe(
  tribeId: string,
  token: string,
  memberPub: string,
  displayName?: string,
  memberEpub?: string,
  fallbackMeta?: { name: string; location: string; pub: string }
): Promise<Tribe> {
  const validation = await validateAndConsumeToken(tribeId, token)
  if (!validation.valid) {
    throw new Error(validation.reason ?? 'Invalid invite')
  }

  // Fetch tribe metadata — use fallback (from invite URL) if Gun/IDB can't provide it
  const fetched = await fetchTribeMeta(tribeId)
  const tribe = fetched ?? (fallbackMeta ? {
    id: tribeId,
    pub: fallbackMeta.pub,
    priv: '',
    name: fallbackMeta.name,
    location: fallbackMeta.location,
    region: '',
    createdAt: 0,
    constitutionTemplate: 'council' as const,
    founderId: '',
  } : null)

  if (!tribe) {
    throw new Error('Tribe not found — invite link may be missing tribe info')
  }

  // Write local membership first so a crash between steps leaves the user
  // in a recoverable state (missing peer-visible member record is easier to
  // fix than a member who exists in Gun but can't see their own tribe).
  const db = await getDB()
  await db.put('my-tribes', {
    tribeId,
    joinedAt: Date.now(),
    tribePub: tribe.pub,
    name: tribe.name,
    location: tribe.location,
  }, tribeId)
  // Cache full tribe metadata for offline dashboard load
  await db.put('tribe-cache', tribe, tribeId)

  // Write member record (IDB + Gun) after local membership is recorded
  const member: TribeMember = {
    pubkey: memberPub,
    tribeId,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    status: 'active',
    attachmentScore: 1.0,
    memberType: 'adult',
    displayName: displayName ?? shortId(memberPub),
    epub: memberEpub,
  }
  await writeMember(tribeId, member)

  return tribe
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

export async function fetchTribeMeta(tribeId: string): Promise<Tribe | null> {
  // Check local cache first — Gun in-memory graph doesn't survive restarts
  const db = await getDB()
  const cached = await db.get('tribe-cache', tribeId)
  if (cached) return cached as Tribe

  // Fall back to Gun with a short timeout (for tribes joined from remote peers)
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 3000)
    gun.get('tribes').get(tribeId).once((data: unknown) => {
      clearTimeout(timeout)
      if (!data || typeof data !== 'object') return resolve(null)
      const d = data as Record<string, unknown>
      if (!d.id || !d.name) return resolve(null)
      const tribe: Tribe = {
        id: d.id as string,
        pub: (d.pub as string) ?? '',
        priv: '',
        epub: d.epub as string | undefined,
        name: d.name as string,
        location: (d.location as string) ?? '',
        region: (d.region as string) ?? '',
        createdAt: (d.createdAt as number) ?? 0,
        constitutionTemplate: (d.constitutionTemplate as Tribe['constitutionTemplate']) ?? 'council',
        founderId: (d.founderId as string) ?? '',
      }
      // Cache it for next time
      void db.put('tribe-cache', tribe, tribeId)
      resolve(tribe)
    })
  })
}

export async function getMyTribes(): Promise<Array<{ tribeId: string; name: string; location: string; joinedAt: number }>> {
  const db = await getDB()
  const all = await db.getAll('my-tribes')
  return all.map(t => ({
    tribeId: t.tribeId,
    name: t.name,
    location: t.location,
    joinedAt: t.joinedAt,
  }))
}

// ─── Member management ───────────────────────────────────────────────────────

async function writeMember(tribeId: string, member: TribeMember): Promise<void> {
  // Write to IDB first (source of truth, survives process restarts)
  const db = await getDB()
  await db.put('members', member, `${tribeId}:${member.pubkey}`)

  // Sync to Convex (grid-up) — exclude photo (too large for cloud)
  const { photo: _photo, ...cloudFields } = member
  void _photo
  void convexWrite('members.upsert', cloudFields)

  // Gun write for live P2P sync (fire and forget)
  const memberPayload = member as unknown as Record<string, unknown>
  gun.get('tribes').get(tribeId).get('members').get(member.pubkey).put(memberPayload)

  if (getOfflineSince() !== null) {
    const { photo: _p, ...convexMemberFields } = member
    void _p
    void addPendingSync({
      id: `members:${tribeId}:${member.pubkey}:${Date.now()}`,
      gunStore: 'members', tribeId, recordKey: member.pubkey,
      payload: memberPayload,
      convexMutation: 'members.upsert',
      convexArgs: convexMemberFields as Record<string, unknown>,
      queuedAt: Date.now(),
    })
  }
}

export function subscribeToMembers(
  tribeId: string,
  callback: (members: TribeMember[]) => void
): () => void {
  const members = new Map<string, TribeMember>()

  // Seed from IDB immediately (survives process restarts, no Gun relay needed)
  getDB().then(db => db.getAll('members')).then(all => {
    const prefix = `${tribeId}:`
    for (const m of all) {
      const member = m as TribeMember
      if (member.tribeId === tribeId || String(member.pubkey).startsWith(prefix)) {
        if (member.pubkey) members.set(member.pubkey, member)
      }
    }
    if (members.size > 0) callback(Array.from(members.values()))
  }).catch(err => console.warn('[tribes] IDB seed failed:', err))

  // Subscribe to Gun for live updates from peers
  const ref = gun.get('tribes').get(tribeId).get('members')

  function handleGunMember(data: unknown, pubkey: string) {
    if (!data || typeof data !== 'object') return
    if (pubkey === '_') return
    const d = data as Record<string, unknown>
    if (!d.pubkey) return
    const member: TribeMember = {
      pubkey: d.pubkey as string,
      tribeId: d.tribeId as string,
      joinedAt: (d.joinedAt as number) ?? 0,
      lastSeen: (d.lastSeen as number) ?? 0,
      status: (d.status as TribeMember['status']) ?? 'active',
      attachmentScore: (d.attachmentScore as number) ?? 1.0,
      memberType: (d.memberType as TribeMember['memberType']) ?? 'adult',
      authorityRole: d.authorityRole as TribeMember['authorityRole'] | undefined,
      displayName: (d.displayName as string) ?? '',
      declaredReturnAt: d.declaredReturnAt as number | undefined,
      role: d.role as TribeMember['role'] | undefined,
      epub: d.epub as string | undefined,
      isDiplomat: d.isDiplomat === true ? true : undefined,
      // Profile fields synced from peers
      bio: d.bio as string | undefined,
      availability: d.availability as TribeMember['availability'] | undefined,
      physicalLimitations: d.physicalLimitations as string | undefined,
      // Health fields synced from peers — arrays stored as JSON strings in Gun
      bloodType: d.bloodType as TribeMember['bloodType'] | undefined,
      allergies: typeof d.allergies === 'string' ? JSON.parse(d.allergies) as string[] : d.allergies as string[] | undefined,
      medications: typeof d.medications === 'string' ? JSON.parse(d.medications) as string[] : d.medications as string[] | undefined,
      medicalConditions: typeof d.medicalConditions === 'string' ? JSON.parse(d.medicalConditions) as string[] : d.medicalConditions as string[] | undefined,
      currentHealthStatus: d.currentHealthStatus as HealthStatus | undefined,
      healthStatusUpdatedAt: d.healthStatusUpdatedAt as number | undefined,
      healthStatusUpdatedBy: d.healthStatusUpdatedBy as string | undefined,
      // photo is NOT synced via Gun — preserve local copy from IDB if it exists
    }
    // Preserve local photo (not synced via Gun) by merging from IDB if present
    const localRecord = members.get(pubkey)
    if (localRecord?.photo && !member.photo) {
      member.photo = localRecord.photo
    }
    if (members.has(pubkey) &&
        members.get(pubkey)!.lastSeen >= (member.lastSeen ?? 0) &&
        members.get(pubkey)!.pubkey) return  // skip stale partial updates
    members.set(pubkey, member)
    // Persist Gun-received members to IDB too
    getDB().then(db => db.put('members', member, `${tribeId}:${pubkey}`))
    callback(Array.from(members.values()))
  }

  // once() explicitly requests current state from relay (needed when this context
  // connects after members were already written — relay won't push unsolicited)
  ref.map().once(handleGunMember)
  // on() for live real-time updates going forward
  ref.map().on(handleGunMember)

  return () => {
    ref.map().off()
  }
}

export async function updateLastSeen(tribeId: string, pubkey: string): Promise<void> {
  gun.get('tribes').get(tribeId).get('members').get(pubkey).put({ lastSeen: Date.now() } as unknown as Record<string, unknown>)
}

// ─── Profile update ───────────────────────────────────────────────────────────

export async function updateMemberProfile(
  tribeId: string,
  pubkey: string,
  profile: {
    bio?: string
    photo?: string          // base64 — IDB only, not synced via Gun (too large)
    availability?: 'full_time' | 'part_time' | 'on_call'
    physicalLimitations?: string
    memberType?: TribeMember['memberType']
  }
): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${pubkey}`
  const existing = (await db.get('members', key)) as TribeMember | undefined
  if (!existing) return

  const updated: TribeMember = {
    ...existing,
    ...(profile.bio !== undefined ? { bio: profile.bio } : {}),
    ...(profile.photo !== undefined ? { photo: profile.photo } : {}),
    ...(profile.availability !== undefined ? { availability: profile.availability } : {}),
    ...(profile.physicalLimitations !== undefined ? { physicalLimitations: profile.physicalLimitations } : {}),
    ...(profile.memberType !== undefined ? { memberType: profile.memberType } : {}),
  }

  // Write full record to IDB (includes photo)
  await db.put('members', updated, key)

  // Sync to Convex (grid-up) — photo excluded, only profile fields
  void convexWrite('members.updateProfile', { tribeId, pubkey, bio: profile.bio, availability: profile.availability, physicalLimitations: profile.physicalLimitations, memberType: profile.memberType })

  // Sync to Gun — exclude photo (too large for P2P mesh)
  const { photo: _photo, ...gunFields } = updated
  void _photo // suppress unused variable warning
  const profilePayload = gunFields as unknown as Record<string, unknown>
  gun.get('tribes').get(tribeId).get('members').get(pubkey).put(profilePayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `members:${tribeId}:${pubkey}:${Date.now()}`,
      gunStore: 'members', tribeId, recordKey: pubkey,
      payload: profilePayload,
      convexMutation: 'members.updateProfile',
      convexArgs: { tribeId, pubkey, bio: profile.bio, availability: profile.availability, physicalLimitations: profile.physicalLimitations, memberType: profile.memberType },
      queuedAt: Date.now(),
    })
  }
}

export async function setDiplomatStatus(
  tribeId: string,
  targetPubkey: string,
  isDiplomat: boolean,
): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${targetPubkey}`
  const existing = await db.get('members', key)
  if (existing) {
    const updated = { ...(existing as TribeMember), isDiplomat: isDiplomat || undefined }
    await db.put('members', updated, key)
  }
  void convexWrite('members.setDiplomatStatus', { tribeId, pubkey: targetPubkey, isDiplomat })
  const diplomatPayload = { isDiplomat: isDiplomat || null } as unknown as Record<string, unknown>
  gun.get('tribes').get(tribeId).get('members').get(targetPubkey).put(diplomatPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `members:${tribeId}:${targetPubkey}:${Date.now()}`,
      gunStore: 'members', tribeId, recordKey: targetPubkey,
      payload: diplomatPayload,
      convexMutation: 'members.setDiplomatStatus',
      convexArgs: { tribeId, pubkey: targetPubkey, isDiplomat },
      queuedAt: Date.now(),
    })
  }
}

export async function setAuthorityRole(
  tribeId: string,
  targetPubkey: string,
  authorityRole: TribeMember['authorityRole'],
): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${targetPubkey}`
  const existing = await db.get('members', key)
  if (existing) {
    const updated = { ...(existing as TribeMember), authorityRole }
    await db.put('members', updated, key)
  }
  if (authorityRole) void convexWrite('members.setAuthorityRole', { tribeId, pubkey: targetPubkey, authorityRole })
  const rolePayload = { authorityRole } as unknown as Record<string, unknown>
  gun.get('tribes').get(tribeId).get('members').get(targetPubkey).put(rolePayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `members:${tribeId}:${targetPubkey}:${Date.now()}`,
      gunStore: 'members', tribeId, recordKey: targetPubkey,
      payload: rolePayload,
      ...(authorityRole ? { convexMutation: 'members.setAuthorityRole', convexArgs: { tribeId, pubkey: targetPubkey, authorityRole } } : {}),
      queuedAt: Date.now(),
    })
  }
}

// ─── Tribe metadata update ────────────────────────────────────────────────────

export async function updateTribeMeta(
  tribeId: string,
  updates: { name?: string; location?: string; region?: string; lat?: number; lng?: number }
): Promise<void> {
  const db = await getDB()
  const normalizedRegion = updates.region?.toLowerCase().replace(/\s+/g, '-')

  // Update tribe-cache (full Tribe object)
  const cached = await db.get('tribe-cache', tribeId) as Tribe | undefined
  if (cached) {
    const updated: Tribe = {
      ...cached,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.location !== undefined ? { location: updates.location } : {}),
      ...(normalizedRegion !== undefined ? { region: normalizedRegion } : {}),
      ...(updates.lat !== undefined ? { lat: updates.lat } : {}),
      ...(updates.lng !== undefined ? { lng: updates.lng } : {}),
    }
    await db.put('tribe-cache', updated, tribeId)
  }

  // Update my-tribes entry (name + location displayed on home screen)
  const myTribe = await db.get('my-tribes', tribeId)
  if (myTribe) {
    await db.put('my-tribes', {
      ...myTribe,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.location !== undefined ? { location: updates.location } : {}),
    }, tribeId)
  }

  // Sync to Gun
  const gunPayload: Record<string, unknown> = {}
  if (updates.name !== undefined) gunPayload.name = updates.name
  if (updates.location !== undefined) gunPayload.location = updates.location
  if (normalizedRegion !== undefined) gunPayload.region = normalizedRegion
  if (updates.lat !== undefined) gunPayload.lat = updates.lat
  if (updates.lng !== undefined) gunPayload.lng = updates.lng
  void convexWrite('tribes.updateMeta', { id: tribeId, ...gunPayload })
  gun.get('tribes').get(tribeId).put(gunPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `tribe-meta:${tribeId}:${Date.now()}`,
      gunPath: ['tribes', tribeId],
      gunStore: 'tribe-meta', tribeId, recordKey: tribeId,
      payload: gunPayload,
      convexMutation: 'tribes.updateMeta',
      convexArgs: { id: tribeId, ...gunPayload },
      queuedAt: Date.now(),
    })
  }
}

// ─── Leave tribe ──────────────────────────────────────────────────────────────

export async function leaveTribe(tribeId: string, memberPub: string): Promise<void> {
  const db = await getDB()

  // Mark member as departed in IDB + Gun so peers see the status change
  const key = `${tribeId}:${memberPub}`
  const existing = await db.get('members', key) as TribeMember | undefined
  if (existing) {
    const updated: TribeMember = { ...existing, status: 'departed' }
    await db.put('members', updated, key)
    void convexWrite('members.markDeparted', { tribeId, pubkey: memberPub })
    gun.get('tribes').get(tribeId).get('members').get(memberPub).put(
      updated as unknown as Record<string, unknown>
    )
  }

  // Remove tribe from local membership stores
  await db.delete('my-tribes', tribeId)
  await db.delete('tribe-cache', tribeId)
}

// ─── Remove member (admin action) ────────────────────────────────────────────

export async function removeMember(tribeId: string, targetPubkey: string): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${targetPubkey}`
  const existing = await db.get('members', key) as TribeMember | undefined
  if (existing) {
    const updated: TribeMember = { ...existing, status: 'departed' }
    await db.put('members', updated, key)
    void convexWrite('members.markDeparted', { tribeId, pubkey: targetPubkey })
    // Write full updated record so Gun merge doesn't drop the lastSeen check
    gun.get('tribes').get(tribeId).get('members').get(targetPubkey).put(
      updated as unknown as Record<string, unknown>
    )
  }
}

// ─── Health update ───────────────────────────────────────────────────────────

export async function updateMemberHealth(
  tribeId: string,
  targetPub: string,
  health: {
    bloodType?: TribeMember['bloodType']
    allergies?: string[]
    medications?: string[]
    medicalConditions?: string[]
    currentHealthStatus?: HealthStatus
    updatedByPub: string
  }
): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${targetPub}`
  const existing = (await db.get('members', key)) as TribeMember | undefined
  if (!existing) return

  const updated: TribeMember = {
    ...existing,
    ...(health.bloodType !== undefined ? { bloodType: health.bloodType } : {}),
    ...(health.allergies !== undefined ? { allergies: health.allergies } : {}),
    ...(health.medications !== undefined ? { medications: health.medications } : {}),
    ...(health.medicalConditions !== undefined ? { medicalConditions: health.medicalConditions } : {}),
    ...(health.currentHealthStatus !== undefined ? { currentHealthStatus: health.currentHealthStatus } : {}),
    healthStatusUpdatedAt: Date.now(),
    healthStatusUpdatedBy: health.updatedByPub,
  }

  await db.put('members', updated, key)
  void convexWrite('members.updateHealth', { tribeId, pubkey: targetPub, bloodType: health.bloodType, allergies: health.allergies, medications: health.medications, medicalConditions: health.medicalConditions, currentHealthStatus: health.currentHealthStatus, healthStatusUpdatedAt: updated.healthStatusUpdatedAt, healthStatusUpdatedBy: updated.healthStatusUpdatedBy })

  // Gun: arrays must be serialized to JSON strings (same as waypointsJson pattern)
  const { photo: _photo, ...baseFields } = updated
  void _photo
  const gunFields: Record<string, unknown> = { ...baseFields }
  if (updated.allergies !== undefined) gunFields.allergies = JSON.stringify(updated.allergies)
  if (updated.medications !== undefined) gunFields.medications = JSON.stringify(updated.medications)
  if (updated.medicalConditions !== undefined) gunFields.medicalConditions = JSON.stringify(updated.medicalConditions)

  const healthPayload = gunFields as unknown as Record<string, unknown>
  gun.get('tribes').get(tribeId).get('members').get(targetPub).put(healthPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `members:${tribeId}:${targetPub}:${Date.now()}`,
      gunStore: 'members', tribeId, recordKey: targetPub,
      payload: healthPayload,
      convexMutation: 'members.updateHealth',
      convexArgs: { tribeId, pubkey: targetPub, bloodType: health.bloodType, allergies: health.allergies, medications: health.medications, medicalConditions: health.medicalConditions, currentHealthStatus: health.currentHealthStatus, healthStatusUpdatedAt: updated.healthStatusUpdatedAt, healthStatusUpdatedBy: updated.healthStatusUpdatedBy },
      queuedAt: Date.now(),
    })
  }
}

// ─── Delete tribe (founder only) ─────────────────────────────────────────────

export async function deleteTribe(tribeId: string): Promise<void> {
  // Mark deleted in Gun so other peers see it
  gun.get('tribes').get(tribeId).put({ deleted: true, deletedAt: Date.now() } as unknown as Record<string, unknown>)
  void convexWrite('tribes.markDeleted', { id: tribeId })

  const db = await getDB()
  await db.delete('my-tribes', tribeId)
  await db.delete('tribe-cache', tribeId)
}
