/**
 * platform/mesh.ts — Phase 1 mesh/P2P abstraction.
 *
 * Phase 1: re-export of the existing three-ring implementation:
 *   Phase A — mDNS relay (`../mesh`, Tauri `mesh.rs`)
 *   Phase B — WiFi Direct (`../wifi-direct`, Android Tauri plugin)
 *   Phase C — BLE discovery (`../ble-discovery`, Android Tauri plugin)
 *
 * Web behavior unchanged (all no-ops without Tauri). `useMeshSync` and
 * future screens import from here instead of the three lib files directly,
 * so Phase 4 (Capacitor BLE/NSD + iOS Multipeer fallback) lands behind
 * this interface without touching call sites.
 */

export {
  startMeshMode,
  stopMeshMode,
  getMeshPeers,
  isMeshActive,
  isMeshUp,
  isWifiDirectUp,
  isBleUp,
} from '../mesh'
export type { MeshPeerFoundPayload, MeshPeerLostPayload } from '../mesh'

export {
  startWifiDirectMode,
  stopWifiDirectMode,
  connectToWifiDirectPeer,
  isWifiDirectActive,
  getWifiDirectPeerUrl,
} from '../wifi-direct'
export type { WifiDirectPeer, WifiDirectConnectionInfo } from '../wifi-direct'

export {
  startBleDiscovery,
  stopBleDiscovery,
  isBleDiscoveryActive,
  getBlePeers,
} from '../ble-discovery'
export type { BlePeer } from '../ble-discovery'

export interface MeshCapabilities {
  /** mDNS relay + peer browsing (desktop + Android; iOS foreground-only). */
  phaseA: boolean
  /** WiFi Direct group formation (Android only — no iOS API exists). */
  phaseB: boolean
  /** BLE tribe advertisement + scan (both OSes via native plugin in Phase 4). */
  phaseC: boolean
  note: string
}

/**
 * Static capability matrix for the current runtime.
 * Informational in Phase 1 — Phase 4 consults this to degrade gracefully
 * (e.g. iOS hotspot copy instead of WiFi-Direct connect button).
 */
export function getMeshCapabilities(): MeshCapabilities {
  const tauri =
    typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).__TAURI__
  const capacitor =
    typeof window !== 'undefined' &&
    (window as unknown as Record<string, any>)?.Capacitor?.isNativePlatform?.() === true
  const os: string =
    (window as unknown as Record<string, any>)?.Capacitor?.getPlatform?.() ?? 'web'

  if (tauri && !capacitor) {
    return {
      phaseA: true,
      phaseB: true, // Android Tauri plugin; desktop no-op at runtime
      phaseC: true, // Android Tauri plugin; desktop no-op at runtime
      note: 'Tauri runtime: Phase A relay + Android WiFi-Direct/BLE plugins.',
    }
  }
  if (capacitor) {
    return {
      phaseA: true,
      phaseB: os === 'android',
      phaseC: true,
      note:
        os === 'ios'
          ? 'Capacitor iOS: BLE scan (central) + mDNS foreground-only; no WiFi-Direct API or BLE advertise yet — use hotspot.'
          : 'Capacitor Android: BLE scan + mDNS via native plugins (Phase 4); WiFi-Direct + BLE advertise need a custom plugin.',
    }
  }
  return {
    phaseA: false,
    phaseB: false,
    phaseC: false,
    note: 'Web/PWA: mesh is a no-op — Gun relay + Convex only.',
  }
}
