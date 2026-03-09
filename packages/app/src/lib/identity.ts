import SEA from 'gun/sea'
import { getDB } from './db'
import type { Identity } from '@plus-ultra/core'

const IDENTITY_KEY = 'keypair'

export async function loadIdentity(): Promise<Identity | null> {
  const db = await getDB()
  const stored = await db.get('identity', IDENTITY_KEY)
  if (!stored) return null
  return stored as Identity
}

export async function generateIdentity(): Promise<Identity> {
  // Generate keypair — all four keys at once
  const pair = await SEA.pair() as { pub: string; priv: string; epub: string; epriv: string }

  const identity: Identity = {
    ...pair,
    createdAt: Date.now(),
    backedUp: false,
  }

  const db = await getDB()
  await db.put('identity', identity, IDENTITY_KEY)

  return identity
}

export async function restoreIdentity(raw: string): Promise<Identity> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Invalid backup: not valid JSON')
  }

  if (!isValidKeypair(parsed)) {
    throw new Error('Invalid backup: missing required keys')
  }

  const identity: Identity = {
    ...parsed,
    backedUp: true,
  }

  const db = await getDB()
  await db.put('identity', identity, IDENTITY_KEY)

  return identity
}

export async function saveDisplayName(displayName: string): Promise<void> {
  const db = await getDB()
  const identity = await db.get('identity', IDENTITY_KEY) as Identity | undefined
  if (!identity) return
  await db.put('identity', { ...identity, displayName: displayName.trim() || undefined }, IDENTITY_KEY)
}

export async function markBackedUp(): Promise<void> {
  const db = await getDB()
  const identity = await db.get('identity', IDENTITY_KEY) as Identity | undefined
  if (!identity) return
  await db.put('identity', { ...identity, backedUp: true }, IDENTITY_KEY)
}

function isValidKeypair(v: unknown): v is { pub: string; priv: string; epub: string; epriv: string; createdAt: number; backedUp: boolean } {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Record<string, unknown>).pub === 'string' &&
    typeof (v as Record<string, unknown>).priv === 'string' &&
    typeof (v as Record<string, unknown>).epub === 'string' &&
    typeof (v as Record<string, unknown>).epriv === 'string'
  )
}

export function shortId(pub: string): string {
  // First 8 chars of public key as human-readable identifier
  return pub.slice(0, 8).toUpperCase()
}
