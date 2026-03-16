import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { updateAsset } from './inventory'
import { notify } from './notifications'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import { computeBurnRate, getDepletionStatus, DEPLETION_THRESHOLDS } from '@plus-ultra/core'
import { assetsNeeded, ASSET_BY_KEY } from '@plus-ultra/core'
import type { ConsumptionEntry, AssetType } from '@plus-ultra/core'

// ─── Gun SEA-safe helpers (inlined per project convention) ───────────────────

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

// ─── Alert deduplication — track last known status per asset ────────────────

const lastKnownStatus = new Map<string, string>()

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function logConsumption(
  tribeId: string,
  asset: AssetType,
  amount: number,
  periodDays: number,
  loggedBy: string,
  notes: string,
  memberCount: number
): Promise<ConsumptionEntry> {
  const entry: ConsumptionEntry = {
    id: nanoid(),
    tribeId,
    asset,
    amount,
    periodDays,
    loggedAt: Date.now(),
    loggedBy,
    notes,
  }

  // 1. Write entry to IDB + Gun
  const db = await getDB()
  await db.put('consumption-log', entry, `${tribeId}:${entry.id}`)

  const consumptionPayload = gunEscape(entry as unknown as Record<string, unknown>)
  gun
    .get('tribes').get(tribeId)
    .get('consumption-log').get(entry.id)
    .put(consumptionPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `consumption-log:${tribeId}:${entry.id}:${Date.now()}`,
      gunStore: 'consumption-log', tribeId, recordKey: entry.id,
      payload: consumptionPayload,
      queuedAt: Date.now(),
    })
  }

  // 2. Read current inventory for this asset and auto-decrement
  const invKey = `${tribeId}:${asset}`
  const current = (await db.get('inventory', invKey)) as { quantity: number; notes: string; updatedBy: string } | undefined
  const currentQty = current?.quantity ?? 0
  const newQty = Math.max(0, currentQty - amount)
  const invNotes = current?.notes ?? ''
  await updateAsset(tribeId, asset, newQty, invNotes, loggedBy)

  // 3. Load all entries for this asset, compute new burn rate
  const allEntries = await db.getAll('consumption-log')
  const assetEntries = allEntries
    .map(r => r as ConsumptionEntry)
    .filter(e => e.tribeId === tribeId && e.asset === asset)

  const burnRate = computeBurnRate(assetEntries)

  // 4. Check depletion threshold — fire notification if status changed
  const threshold = DEPLETION_THRESHOLDS[asset]
  if (threshold) {
    const spec = ASSET_BY_KEY[asset]
    const needed = spec ? assetsNeeded(memberCount, spec) : 0
    const status = getDepletionStatus(asset, newQty, burnRate, needed)
    const statusKey = `${tribeId}:${asset}`
    const prev = lastKnownStatus.get(statusKey)

    if (status !== prev && (status === 'warning' || status === 'critical')) {
      lastKnownStatus.set(statusKey, status)
      const spec2 = ASSET_BY_KEY[asset]
      const label = spec2?.label ?? asset
      const notifType = status === 'critical' ? 'resource_critical' : 'resource_warning'
      const title = status === 'critical'
        ? `Critical: ${label} depleting fast`
        : `Warning: ${label} running low`
      const daysRem = burnRate && burnRate > 0 ? Math.round(newQty / burnRate) : null
      const body = daysRem !== null
        ? `~${daysRem} day${daysRem !== 1 ? 's' : ''} remaining at current burn rate`
        : `Reserve is low — check inventory`

      await notify(tribeId, {
        tribeId,
        type: notifType,
        title,
        body,
        targetPub: '*',
        actorPub: loggedBy,
        linkTo: `/tribe/${tribeId}/inventory`,
      })
    } else if (status === 'ok' || status === 'none') {
      lastKnownStatus.set(statusKey, status)
    }
  }

  return entry
}

export async function deleteConsumptionEntry(
  tribeId: string,
  entryId: string
): Promise<void> {
  const db = await getDB()
  await db.delete('consumption-log', `${tribeId}:${entryId}`)
}

// ─── Subscription ─────────────────────────────────────────────────────────────

function parseEntry(d: Record<string, unknown>, tribeId: string): ConsumptionEntry | null {
  if (!d.id || !d.asset) return null
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    asset: d.asset as AssetType,
    amount: (d.amount as number) ?? 0,
    periodDays: (d.periodDays as number) ?? 1,
    loggedAt: (d.loggedAt as number) ?? 0,
    loggedBy: (d.loggedBy as string) ?? '',
    notes: (d.notes as string) ?? '',
  }
}

export function subscribeToConsumption(
  tribeId: string,
  callback: (entries: ConsumptionEntry[]) => void
): () => void {
  const entriesMap = new Map<string, ConsumptionEntry>()

  // Seed from IDB
  getDB().then(db => db.getAll('consumption-log')).then(all => {
    for (const raw of all) {
      const e = raw as ConsumptionEntry
      if (e.tribeId === tribeId && e.id) entriesMap.set(e.id, e)
    }
    if (entriesMap.size > 0) callback(Array.from(entriesMap.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('consumption-log')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      entriesMap.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const e = parseEntry(raw, tribeId)
      if (e) {
        entriesMap.set(key, e)
        getDB().then(db => db.put('consumption-log', e, `${tribeId}:${key}`))
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
