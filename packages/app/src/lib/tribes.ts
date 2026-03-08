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
  founderDisplayName?: string
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

  // Write public tribe data to Gun (no priv key)
  await new Promise<void>((resolve) => {
    gun.get('tribes').get(tribeId).put({
      id: tribeId,
      pub: tribePair.pub,
      name: tribe.name,
      location: tribe.location,
      region: tribe.region,
      createdAt: tribe.createdAt,
      constitutionTemplate: tribe.constitutionTemplate,
      founderId: founderPub,
    }, () => resolve())
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

  return tribe
}

// ─── Invite tokens ───────────────────────────────────────────────────────────

export async function createInviteToken(tribeId: string): Promise<string> {
  const token = nanoid(16)
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

  await new Promise<void>((resolve) => {
    gun.get('tribes').get(tribeId).get('invites').get(token).put({
      token,
      tribeId,
      createdAt: Date.now(),
      expiresAt,
      used: false,
    }, () => resolve())
  })

  return token
}

export function buildInviteUrl(tribeId: string, token: string): string {
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://app.plusultra.network'
  return `${base}/join?tribe=${tribeId}&token=${token}`
}

export async function validateAndConsumeToken(
  tribeId: string,
  token: string
): Promise<{ valid: boolean; reason?: string }> {
  return new Promise((resolve) => {
    gun.get('tribes').get(tribeId).get('invites').get(token).once((data: unknown) => {
      if (!data || typeof data !== 'object') {
        return resolve({ valid: false, reason: 'Token not found' })
      }
      const d = data as { used?: boolean; expiresAt?: number }
      if (d.used) {
        return resolve({ valid: false, reason: 'Invite link already used' })
      }
      if (d.expiresAt && Date.now() > d.expiresAt) {
        return resolve({ valid: false, reason: 'Invite link expired' })
      }
      // Mark as used
      gun.get('tribes').get(tribeId).get('invites').get(token).put({ used: true }, () => {
        resolve({ valid: true })
      })
    })
  })
}

// ─── Join tribe ───────────────────────────────────────────────────────────────

export async function joinTribe(
  tribeId: string,
  token: string,
  memberPub: string,
  displayName?: string
): Promise<Tribe> {
  const validation = await validateAndConsumeToken(tribeId, token)
  if (!validation.valid) {
    throw new Error(validation.reason ?? 'Invalid invite')
  }

  // Fetch tribe metadata
  const tribe = await fetchTribeMeta(tribeId)
  if (!tribe) {
    throw new Error('Tribe not found')
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

  return tribe
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

export async function fetchTribeMeta(tribeId: string): Promise<Tribe | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5000)
    gun.get('tribes').get(tribeId).once((data: unknown) => {
      clearTimeout(timeout)
      if (!data || typeof data !== 'object') return resolve(null)
      const d = data as Record<string, unknown>
      if (!d.id || !d.name) return resolve(null)
      resolve({
        id: d.id as string,
        pub: (d.pub as string) ?? '',
        priv: '', // never fetched from Gun
        name: d.name as string,
        location: (d.location as string) ?? '',
        region: (d.region as string) ?? '',
        createdAt: (d.createdAt as number) ?? 0,
        constitutionTemplate: (d.constitutionTemplate as Tribe['constitutionTemplate']) ?? 'council',
        founderId: (d.founderId as string) ?? '',
      })
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
  return new Promise((resolve) => {
    gun.get('tribes').get(tribeId).get('members').get(member.pubkey).put(
      member as unknown as Record<string, unknown>,
      () => resolve()
    )
  })
}

export function subscribeToMembers(
  tribeId: string,
  callback: (members: TribeMember[]) => void
): () => void {
  const members = new Map<string, TribeMember>()

  const ref = gun.get('tribes').get(tribeId).get('members')

  ref.map().on((data: unknown, pubkey: string) => {
    if (!data || typeof data !== 'object') return
    if (pubkey === '_') return // Gun metadata key
    const d = data as Record<string, unknown>
    if (!d.pubkey) return
    members.set(pubkey, {
      pubkey: d.pubkey as string,
      tribeId: d.tribeId as string,
      joinedAt: (d.joinedAt as number) ?? 0,
      lastSeen: (d.lastSeen as number) ?? 0,
      status: (d.status as TribeMember['status']) ?? 'active',
      attachmentScore: (d.attachmentScore as number) ?? 1.0,
      displayName: (d.displayName as string) ?? '',
      declaredReturnAt: d.declaredReturnAt as number | undefined,
      role: d.role as TribeMember['role'] | undefined,
    })
    callback(Array.from(members.values()))
  })

  return () => {
    ref.map().off()
  }
}

export async function updateLastSeen(tribeId: string, pubkey: string): Promise<void> {
  gun.get('tribes').get(tribeId).get('members').get(pubkey).put({ lastSeen: Date.now() } as unknown as Record<string, unknown>)
}
