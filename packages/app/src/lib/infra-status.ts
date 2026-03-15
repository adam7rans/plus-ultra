import { gun } from './gun'
import { getDB } from './db'
import type { MemberInfraStatus, InfraItem } from '@plus-ultra/core'

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

// ─── IDB + Gun CRUD ───────────────────────────────────────────────────────────

export async function getMemberInfraStatus(
  tribeId: string,
  memberPub: string,
): Promise<MemberInfraStatus | null> {
  const db = await getDB()
  const record = await db.get('member-infra-status', `${tribeId}:${memberPub}`)
  return (record as MemberInfraStatus) ?? null
}

export async function setMemberInfraStatus(status: MemberInfraStatus): Promise<void> {
  const db = await getDB()
  await db.put('member-infra-status', status, `${status.tribeId}:${status.memberPub}`)
  gun.get('tribes').get(status.tribeId).get('member-infra-status').get(status.memberPub).put(
    gunEscape(status as unknown as Record<string, unknown>) as unknown as Record<string, unknown>
  )
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export function subscribeToTribeInfraStatus(
  tribeId: string,
  callback: (statuses: MemberInfraStatus[]) => void,
): () => void {
  const statuses = new Map<string, MemberInfraStatus>()

  function emit() {
    callback(Array.from(statuses.values()))
  }

  // Seed from IDB first
  getDB().then(async db => {
    const all = await db.getAll('member-infra-status')
    for (const record of all) {
      const s = record as MemberInfraStatus
      if (s.tribeId === tribeId) {
        statuses.set(s.memberPub, s)
      }
    }
    emit()
  })

  const ref = gun.get('tribes').get(tribeId).get('member-infra-status')

  ref.map().on((data: unknown, memberPub: string) => {
    if (!data || typeof data !== 'object') return
    const raw = gunUnescape(data as Record<string, unknown>)
    if (!raw.memberPub || !raw.tribeId) return
    let failingItems: InfraItem[] = []
    try {
      failingItems = JSON.parse(raw.failingItemsJson as string ?? '[]')
    } catch {
      failingItems = []
    }
    const status: MemberInfraStatus = {
      memberPub: raw.memberPub as string,
      tribeId: raw.tribeId as string,
      failingItemsJson: JSON.stringify(failingItems),
      updatedAt: (raw.updatedAt as number) ?? 0,
      displayName: (raw.displayName as string) ?? memberPub.slice(0, 8),
    }
    getDB().then(db => db.put('member-infra-status', status, `${tribeId}:${memberPub}`))
    statuses.set(memberPub, status)
    emit()
  })

  return () => {
    ref.off()
  }
}
