import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { addPendingSync } from './sync-queue'
import { getOfflineSince } from './offline-tracker'
import { notify } from './notifications'
import { triggerPush } from './push'
import type { MusterCall, MusterResponse, MusterStatus, MusterReason } from '@plus-ultra/core'

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

// ─── Initiate a muster ────────────────────────────────────────────────────────

export async function initiateMuster(
  tribeId: string,
  initiatorPub: string,
  initiatorName: string,
  reason: MusterReason,
  message?: string,
): Promise<MusterCall> {
  const muster: MusterCall = {
    id: nanoid(),
    tribeId,
    initiatedBy: initiatorPub,
    initiatedByName: initiatorName,
    initiatedAt: Date.now(),
    reason,
    message: message || undefined,
    status: 'active',
  }

  const db = await getDB()
  await db.put('muster-calls', muster, `${tribeId}:${muster.id}`)

  const musterPayload = gunEscape(muster as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('muster').get(muster.id)
    .put(musterPayload as unknown as Record<string, unknown>)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `muster-calls:${tribeId}:${muster.id}:${Date.now()}`,
      gunStore: 'muster', tribeId, recordKey: muster.id,
      payload: musterPayload,
      queuedAt: Date.now(),
    })
  }

  await notify(tribeId, {
    tribeId,
    type: 'muster_called',
    title: '📣 Muster Called',
    body: `${initiatorName} called a muster — respond now`,
    targetPub: '*',
    actorPub: initiatorPub,
    linkTo: `/tribe/${tribeId}/rollcall`,
  })

  void triggerPush(tribeId, '*', '📣 Muster Called', `${initiatorName} called a muster — respond now`, {
    url: `/tribe/${tribeId}/rollcall`,
  })

  return muster
}

// ─── Respond to a muster ─────────────────────────────────────────────────────

export async function respondToMuster(
  tribeId: string,
  musterId: string,
  memberPub: string,
  memberName: string,
  status: MusterStatus,
  opts?: {
    location?: string
    note?: string
    voiceNote?: string
    respondedByPub?: string
  },
): Promise<void> {
  const response: MusterResponse = {
    musterId,
    memberPub,
    memberName,
    status,
    respondedAt: Date.now(),
    respondedByPub: opts?.respondedByPub ?? memberPub,
    location: opts?.location || undefined,
    note: opts?.note || undefined,
    voiceNote: opts?.voiceNote || undefined,
  }

  const db = await getDB()
  await db.put('muster-responses', response, `${musterId}:${memberPub}`)

  // Sync to Gun without voiceNote (base64 audio is too large for Gun nodes)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { voiceNote: _vn, ...responseForGun } = response
  const responsePayload = gunEscape(responseForGun as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('muster-responses').get(`${musterId}:${memberPub}`)
    .put(responsePayload as unknown as Record<string, unknown>)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `muster-responses:${tribeId}:${musterId}:${memberPub}:${Date.now()}`,
      gunStore: 'muster-responses', tribeId, recordKey: `${musterId}:${memberPub}`,
      payload: responsePayload,
      queuedAt: Date.now(),
    })
  }
}

// ─── Close a muster ───────────────────────────────────────────────────────────

export async function closeMuster(tribeId: string, musterId: string): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${musterId}`
  const existing = await db.get('muster-calls', key) as MusterCall | undefined
  if (!existing) return

  const updated: MusterCall = { ...existing, closedAt: Date.now(), status: 'closed' }
  await db.put('muster-calls', updated, key)

  const closedPayload = gunEscape(updated as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('muster').get(musterId)
    .put(closedPayload as unknown as Record<string, unknown>)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `muster-calls:${tribeId}:${musterId}:${Date.now()}`,
      gunStore: 'muster', tribeId, recordKey: musterId,
      payload: closedPayload,
      queuedAt: Date.now(),
    })
  }
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export async function getActiveMuster(tribeId: string): Promise<MusterCall | null> {
  const db = await getDB()
  const all = await db.getAll('muster-calls') as MusterCall[]
  return all.find(m => m.tribeId === tribeId && m.status === 'active') ?? null
}

export async function getMusterHistory(tribeId: string): Promise<MusterCall[]> {
  const db = await getDB()
  const all = await db.getAll('muster-calls') as MusterCall[]
  return all
    .filter(m => m.tribeId === tribeId)
    .sort((a, b) => b.initiatedAt - a.initiatedAt)
}

export async function getMusterResponses(musterId: string): Promise<MusterResponse[]> {
  const db = await getDB()
  const allKeys = await db.getAllKeys('muster-responses')
  const prefix = `${musterId}:`
  const responses: MusterResponse[] = []
  for (const k of allKeys) {
    if (!String(k).startsWith(prefix)) continue
    const r = await db.get('muster-responses', k)
    if (r) responses.push(r as MusterResponse)
  }
  return responses
}

// ─── Real-time subscription ───────────────────────────────────────────────────

export function subscribeToMuster(
  tribeId: string,
  callback: (muster: MusterCall | null, responses: MusterResponse[]) => void,
): () => void {
  let currentMuster: MusterCall | null = null
  const responseMap = new Map<string, MusterResponse>()

  function emit() {
    callback(currentMuster, Array.from(responseMap.values()))
  }

  // Seed from IDB
  getDB().then(async db => {
    const all = await db.getAll('muster-calls') as MusterCall[]
    currentMuster = all.find(m => m.tribeId === tribeId && m.status === 'active') ?? null
    if (currentMuster) {
      const resps = await getMusterResponses(currentMuster.id)
      for (const r of resps) responseMap.set(r.memberPub, r)
    }
    emit()
  })

  const musterRef = gun.get('tribes').get(tribeId).get('muster')
  const responsesRef = gun.get('tribes').get(tribeId).get('muster-responses')

  // Watch muster calls
  musterRef.map().on((data: unknown, key: string) => {
    if (key === '_' || !data || typeof data !== 'object') return
    const d = gunUnescape(data as Record<string, unknown>)
    if (!d.id || !d.status) return
    const m = d as unknown as MusterCall
    if (m.status === 'active') {
      currentMuster = m
    } else if (currentMuster?.id === m.id) {
      currentMuster = null
      responseMap.clear()
    }
    getDB().then(db => db.put('muster-calls', m, `${tribeId}:${m.id}`))
    emit()
  })

  // Watch responses
  responsesRef.map().on((data: unknown, key: string) => {
    if (key === '_' || !data || typeof data !== 'object') return
    const d = gunUnescape(data as Record<string, unknown>)
    if (!d.musterId || !d.memberPub) return
    const r = d as unknown as MusterResponse
    if (!currentMuster || r.musterId !== currentMuster.id) return
    responseMap.set(r.memberPub, r)
    getDB().then(db => db.put('muster-responses', r, `${r.musterId}:${r.memberPub}`))
    emit()
  })

  // 2s poll fallback
  const poll = setInterval(() => {
    musterRef.map().once((data: unknown, key: string) => {
      if (key === '_' || !data || typeof data !== 'object') return
      const d = gunUnescape(data as Record<string, unknown>)
      if (!d.id || !d.status) return
      const m = d as unknown as MusterCall
      if (m.status === 'active') {
        const isNewer = !currentMuster || m.initiatedAt > currentMuster.initiatedAt
        if (isNewer) {
          currentMuster = m
          getDB().then(db => db.put('muster-calls', m, `${tribeId}:${m.id}`))
          emit()
        }
      }
    })

    if (currentMuster) {
      responsesRef.map().once((data: unknown, key: string) => {
        if (key === '_' || !data || typeof data !== 'object') return
        const d = gunUnescape(data as Record<string, unknown>)
        if (!d.musterId || !d.memberPub) return
        const r = d as unknown as MusterResponse
        if (r.musterId !== currentMuster?.id) return
        if (!responseMap.has(r.memberPub)) {
          responseMap.set(r.memberPub, r)
          getDB().then(db => db.put('muster-responses', r, `${r.musterId}:${r.memberPub}`))
          emit()
        }
      })
    }
  }, 2000)

  return () => {
    musterRef.map().off()
    responsesRef.map().off()
    clearInterval(poll)
  }
}
