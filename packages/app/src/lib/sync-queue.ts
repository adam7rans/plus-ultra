import { gun } from './gun'
import { getDB } from './db'

export interface PendingSync {
  id: string
  gunPath?: string[]  // explicit Gun traversal path — overrides gunStore/tribeId/recordKey
  gunStore: string    // used for id format and legacy path construction
  tribeId: string
  recordKey: string
  payload: Record<string, unknown>
  queuedAt: number
}

export async function addPendingSync(entry: PendingSync): Promise<void> {
  const db = await getDB()
  await db.put('pending-syncs', entry, entry.id)
}

export async function getPendingSyncIds(tribeId: string): Promise<string[]> {
  const db = await getDB()
  const allKeys = await db.getAllKeys('pending-syncs') as string[]
  // key format: `${gunStore}:${tribeId}:${recordKey}` — tribeId is nanoid, never collides with gunStore names
  return allKeys.filter(k => {
    const parts = k.split(':')
    return parts.length >= 3 && parts[1] === tribeId
  })
}

const ACK_TIMEOUT_MS = 8000

export async function flushPendingSyncs(): Promise<void> {
  const db = await getDB()
  const all = await db.getAll('pending-syncs') as PendingSync[]
  for (const entry of all) {
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => resolve(), ACK_TIMEOUT_MS)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let node: any = gun
      const path = entry.gunPath ?? ['tribes', entry.tribeId, entry.gunStore, entry.recordKey]
      for (const segment of path) { node = node.get(segment) }
      node.put(entry.payload as unknown as Record<string, unknown>, async (ack: unknown) => {
          clearTimeout(timer)
          if (!(ack as { err?: string }).err) {
            await db.delete('pending-syncs', entry.id)
          }
          resolve()
        })
    })
  }
}
