import { getConvexClient } from './convex-client'
import { getOfflineSince } from './offline-tracker'
import { isMeshUp as _isMeshUp } from './mesh'

/**
 * Sync adapter — decides whether to use Convex (grid-up) or Gun (grid-down).
 *
 * Three-tier priority:
 *   1. Grid-up  — Convex cloud (online, Convex configured)
 *   2. Mesh     — embedded relay + mDNS peer-to-peer (≥1 nearby device found)
 *   3. Local    — IDB only, no remote sync
 *
 * IDB is ALWAYS written first (crash recovery guarantee).
 */

export type SyncTier = 'grid-up' | 'mesh' | 'local-only'

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

/** Returns true if the mesh relay has ≥1 discovered peer. */
export function isMeshUp(): boolean {
  return _isMeshUp()
}

/** Current sync tier for UI display and routing decisions. */
export function getSyncTier(): SyncTier {
  if (isGridUp()) return 'grid-up'
  if (isMeshUp()) return 'mesh'
  return 'local-only'
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
