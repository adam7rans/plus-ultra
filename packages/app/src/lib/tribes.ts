import { nanoid } from 'nanoid'
import SEA from 'gun/sea'
import { gun } from './gun'
import { getDB } from './db'
import { shortId } from './identity'
import type { Tribe, TribeMember } from '@plus-ultra/core'

// ─── Tribe creation ──────────────────────────────────────────────────────────

export async function createTribe(
  params: {
    name: string
    location: string
    region: string
    constitutionTemplate: Tribe['constitutionTemplate']
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
  }

  // Write public tribe data to Gun (no priv key) — fire and forget.
  // Gun is for P2P sync; IDB is source of truth. Don't block on ack —
  // with no relay connected, the ack callback never fires.
  gun.get('tribes').get(tribeId).put({
    id: tribeId,
    pub: tribePair.pub,
    name: tribe.name,
    location: tribe.location,
    region: tribe.region,
    createdAt: tribe.createdAt,
    constitutionTemplate: tribe.constitutionTemplate,
    founderId: founderPub,
  })

  // Write founder as first member
  const founderMember: TribeMember = {
    pubkey: founderPub,
    tribeId,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    status: 'active',
    attachmentScore: 1.0,
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

  gun.get('tribes').get(tribeId).get('invites').get(token).put({
    token,
    tribeId,
    createdAt: Date.now(),
    expiresAt,
    used: false,
  })

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

  // Write member record
  const member: TribeMember = {
    pubkey: memberPub,
    tribeId,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    status: 'active',
    attachmentScore: 1.0,
    displayName: displayName ?? shortId(memberPub),
    epub: memberEpub,
  }
  await writeMember(tribeId, member)

  // Store tribe membership locally (no priv key for non-founders)
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
  // Gun write for live P2P sync (fire and forget)
  gun.get('tribes').get(tribeId).get('members').get(member.pubkey).put(
    member as unknown as Record<string, unknown>
  )
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
  })

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
      displayName: (d.displayName as string) ?? '',
      declaredReturnAt: d.declaredReturnAt as number | undefined,
      role: d.role as TribeMember['role'] | undefined,
      epub: d.epub as string | undefined,
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
