import { getConvexClient } from './convex-client'
import { getOfflineSince } from './offline-tracker'

/**
 * Sync adapter — decides whether to use Convex (grid-up) or Gun (grid-down).
 *
 * Grid-up: Convex is the cloud source of truth. Writes go to IDB + Convex.
 * Grid-down: Gun is the P2P sync layer. Writes go to IDB + Gun + pending-syncs queue.
 *
 * IDB is ALWAYS written first (crash recovery guarantee).
 */

/** Returns true if we have a Convex connection and are online */
export function isGridUp(): boolean {
  const client = getConvexClient()
  if (!client) return false
  if (getOfflineSince() !== null) return false
  if (!navigator.onLine) return false
  return true
}

/** Returns true if we should use Gun (offline or no Convex configured) */
export function isGridDown(): boolean {
  return !isGridUp()
}

/**
 * Write to Convex if grid-up. Returns true if the Convex write succeeded.
 * Callers should fall back to Gun + pending-syncs if this returns false.
 */
export async function convexWrite(
  mutationName: string,
  args: Record<string, unknown>
): Promise<boolean> {
  if (!isGridUp()) return false

  const client = getConvexClient()
  if (!client) return false

  try {
    // Dynamic import to avoid circular dependency with generated API
    const { api } = await import('../../../../convex/_generated/api')
    const parts = mutationName.split('.')
    // e.g. "tribes.upsert" → api.tribes.upsert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fn: any = api
    for (const part of parts) {
      fn = fn[part]
    }
    await client.mutation(fn, args)
    return true
  } catch (err) {
    console.warn(`[sync-adapter] Convex write failed for ${mutationName}:`, err)
    return false
  }
}
