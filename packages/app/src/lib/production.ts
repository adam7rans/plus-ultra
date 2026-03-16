import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import { convexWrite } from './sync-adapter'
import type { ProductionEntry, AssetType } from '@plus-ultra/core'

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

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function logProductionEntry(
  tribeId: string,
  assetType: AssetType,
  amount: number,
  periodDays: number,
  loggedBy: string,
  opts?: { source?: string; notes?: string }
): Promise<ProductionEntry> {
  const entry: ProductionEntry = {
    id: nanoid(),
    tribeId,
    assetType,
    amount,
    periodDays,
    loggedAt: Date.now(),
    loggedBy,
    source: opts?.source || undefined,
    notes: opts?.notes || undefined,
  }

  const db = await getDB()
  await db.put('production-log', entry, `${tribeId}:${entry.id}`)
  void convexWrite('production.log', { entryId: entry.id, tribeId, assetType, amount, periodDays, loggedAt: entry.loggedAt, loggedBy, source: opts?.source, notes: opts?.notes })

  const productionPayload = gunEscape(entry as unknown as Record<string, unknown>)
  gun
    .get('tribes').get(tribeId)
    .get('production').get(entry.id)
    .put(productionPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `production:${tribeId}:${entry.id}:${Date.now()}`,
      gunStore: 'production', tribeId, recordKey: entry.id,
      payload: productionPayload,
      convexMutation: 'production.log',
      convexArgs: { entryId: entry.id, tribeId, assetType, amount, periodDays, loggedAt: entry.loggedAt, loggedBy, source: opts?.source, notes: opts?.notes },
      queuedAt: Date.now(),
    })
  }

  return entry
}

export async function getProductionEntries(tribeId: string): Promise<ProductionEntry[]> {
  const db = await getDB()
  const allKeys = await db.getAllKeys('production-log')
  const prefix = `${tribeId}:`
  const entries: ProductionEntry[] = []
  for (const k of allKeys) {
    if (!String(k).startsWith(prefix)) continue
    const e = await db.get('production-log', k)
    if (e) entries.push(e as ProductionEntry)
  }
  return entries.sort((a, b) => b.loggedAt - a.loggedAt)
}

// ─── Subscription ─────────────────────────────────────────────────────────────

function parseEntry(d: Record<string, unknown>, tribeId: string): ProductionEntry | null {
  if (!d.id || !d.assetType) return null
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    assetType: d.assetType as AssetType,
    amount: (d.amount as number) ?? 0,
    periodDays: (d.periodDays as number) ?? 1,
    loggedAt: (d.loggedAt as number) ?? 0,
    loggedBy: (d.loggedBy as string) ?? '',
    source: (d.source as string) || undefined,
    notes: (d.notes as string) || undefined,
  }
}

export function subscribeToProduction(
  tribeId: string,
  callback: (entries: ProductionEntry[]) => void
): () => void {
  const entriesMap = new Map<string, ProductionEntry>()

  // Seed from IDB
  getDB().then(db => db.getAllKeys('production-log')).then(async allKeys => {
    const db = await getDB()
    const prefix = `${tribeId}:`
    for (const k of allKeys) {
      if (!String(k).startsWith(prefix)) continue
      const e = await db.get('production-log', k)
      if (e) {
        const entry = e as ProductionEntry
        if (entry.id) entriesMap.set(entry.id, entry)
      }
    }
    if (entriesMap.size > 0) callback(Array.from(entriesMap.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('production')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      entriesMap.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const e = parseEntry(raw, tribeId)
      if (e) {
        entriesMap.set(key, e)
        getDB().then(db => db.put('production-log', e, `${tribeId}:${key}`))
      }
    }
    callback(Array.from(entriesMap.values()))
  }

  ref.map().once(handle)
  ref.map().on(handle)

  const poll = setInterval(() => ref.map().once(handle), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}
