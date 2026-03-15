import { gun } from './gun'
import { getDB } from './db'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import type { TribeAsset, AssetType } from '@plus-ultra/core'

export async function updateAsset(
  tribeId: string,
  asset: AssetType,
  quantity: number,
  notes: string,
  updatedBy: string
): Promise<void> {
  const entry: TribeAsset = {
    tribeId,
    asset,
    quantity,
    notes,
    updatedAt: Date.now(),
    updatedBy,
  }

  // IDB first (source of truth, offline-safe)
  const db = await getDB()
  await db.put('inventory', entry, `${tribeId}:${asset}`)

  // Gun fire-and-forget for P2P sync
  gun
    .get('tribes')
    .get(tribeId)
    .get('inventory')
    .get(asset)
    .put(entry as unknown as Record<string, unknown>)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `inventory:${tribeId}:${asset}`,
      gunStore: 'inventory', tribeId, recordKey: asset,
      payload: entry as unknown as Record<string, unknown>,
      queuedAt: Date.now(),
    })
  }
}

export function subscribeToInventory(
  tribeId: string,
  callback: (inventory: TribeAsset[]) => void
): () => void {
  const invMap = new Map<AssetType, TribeAsset>()

  // Seed from IDB immediately (works offline, survives restarts)
  getDB().then(db => db.getAll('inventory')).then(all => {
    for (const item of all) {
      const entry = item as TribeAsset
      if (entry.tribeId === tribeId && entry.asset) {
        invMap.set(entry.asset, entry)
      }
    }
    if (invMap.size > 0) callback(Array.from(invMap.values()))
  })

  // Subscribe to Gun for live peer updates
  const ref = gun.get('tribes').get(tribeId).get('inventory')

  function handleItem(data: unknown, assetKey: string) {
    if (assetKey === '_') return
    if (!data || typeof data !== 'object') {
      invMap.delete(assetKey as AssetType)
    } else {
      const d = data as Record<string, unknown>
      if (d.asset && d.tribeId === tribeId) {
        const incoming = d as unknown as TribeAsset
        const local = invMap.get(assetKey as AssetType)
        if (!local || (incoming.updatedAt ?? 0) >= (local.updatedAt ?? 0)) {
          invMap.set(assetKey as AssetType, incoming)
          getDB().then(db => db.put('inventory', incoming, `${tribeId}:${assetKey}`))
        }
      }
    }
    callback(Array.from(invMap.values()))
  }

  ref.map().once(handleItem)
  ref.map().on(handleItem)
  const poll = setInterval(() => ref.map().once(handleItem), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}
