import { gun } from './gun'
import { getDB } from './db'
import type { GridState } from '@plus-ultra/core'

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

export async function getGridState(tribeId: string): Promise<GridState | null> {
  const db = await getDB()
  const record = await db.get('grid-state', tribeId)
  return (record as GridState) ?? null
}

export async function setGridState(state: GridState): Promise<void> {
  const db = await getDB()
  await db.put('grid-state', state, state.tribeId)
  gun.get('tribes').get(state.tribeId).get('grid-state').put(
    gunEscape(state as unknown as Record<string, unknown>) as unknown as Record<string, unknown>
  )
}

export async function clearGridState(tribeId: string): Promise<void> {
  const db = await getDB()
  await db.delete('grid-state', tribeId)
  gun.get('tribes').get(tribeId).get('grid-state').put(null as unknown as Record<string, unknown>)
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export function subscribeToGridState(
  tribeId: string,
  callback: (state: GridState | null) => void
): () => void {
  // Seed from IDB first
  getDB().then(db => db.get('grid-state', tribeId)).then(cached => {
    if (cached) callback(cached as GridState)
  })

  const ref = gun.get('tribes').get(tribeId).get('grid-state')

  function handle(data: unknown) {
    if (!data || typeof data !== 'object') {
      callback(null)
      return
    }
    const raw = gunUnescape(data as Record<string, unknown>)
    if (!raw.tribeId || !raw.mode) return
    const state: GridState = {
      tribeId: raw.tribeId as string,
      mode: raw.mode as GridState['mode'],
      isSimulation: Boolean(raw.isSimulation),
      setBy: (raw.setBy as string) ?? '',
      setByName: (raw.setByName as string) ?? '',
      setAt: (raw.setAt as number) ?? 0,
      expiresAt: (raw.expiresAt as number) ?? 0,
      message: (raw.message as string) || undefined,
    }
    getDB().then(db => db.put('grid-state', state, tribeId))
    callback(state)
  }

  ref.on(handle)
  const poll = setInterval(() => ref.once(handle), 5000)

  return () => {
    clearInterval(poll)
    ref.off()
  }
}
