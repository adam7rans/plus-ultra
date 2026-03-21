import type { OfflineStage } from '@plus-ultra/core'
import { OFFLINE_STAGE_THRESHOLDS_MS } from '@plus-ultra/core'
import { startMeshMode, stopMeshMode } from './mesh'

const LS_KEY = 'plusultra:offlineSince'

export function getOfflineSince(): number | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const n = Number(raw)
    return isNaN(n) ? null : n
  } catch {
    return null
  }
}

export function setOfflineSince(ts: number): void {
  try {
    localStorage.setItem(LS_KEY, String(ts))
  } catch {
    // Ignore — storage full or sandboxed
  }
  // Auto-start mesh when we go grid-down (Tauri only; no-op in browser)
  startMeshMode().catch(() => {})
}

export function clearOfflineSince(): void {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    // Ignore
  }
  // Grid is back — stop mesh relay to conserve resources
  stopMeshMode().catch(() => {})
}

export function computeOfflineStage(offlineSince: number | null): OfflineStage {
  if (offlineSince === null) return 0
  const elapsed = Date.now() - offlineSince
  if (elapsed >= OFFLINE_STAGE_THRESHOLDS_MS[5]) return 5
  if (elapsed >= OFFLINE_STAGE_THRESHOLDS_MS[4]) return 4
  if (elapsed >= OFFLINE_STAGE_THRESHOLDS_MS[3]) return 3
  if (elapsed >= OFFLINE_STAGE_THRESHOLDS_MS[2]) return 2
  if (elapsed >= OFFLINE_STAGE_THRESHOLDS_MS[1]) return 1
  return 0
}
