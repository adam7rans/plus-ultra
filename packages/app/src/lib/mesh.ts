/**
 * mesh.ts — Phase 15 P2P mesh coordination layer.
 *
 * Three concentric sync rings:
 *   Phase A — mDNS relay (same WiFi/hotspot, desktop + mobile)
 *   Phase B — WiFi Direct (Android, no router, via wifi-direct.ts)
 *   Phase C — BLE background discovery (Android, triggers Phase B, via ble-discovery.ts)
 *
 * In browser/PWA context (window.__TAURI__ undefined) every export is a no-op.
 */

import { gun } from './gun-init'
import {
  startWifiDirectMode,
  stopWifiDirectMode,
  isWifiDirectActive,
} from './wifi-direct'
import {
  startBleDiscovery,
  stopBleDiscovery,
  isBleDiscoveryActive,
} from './ble-discovery'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MeshPeerFoundPayload {
  url: string
}

export interface MeshPeerLostPayload {
  fullname: string
}

// ---------------------------------------------------------------------------
// Internal state — Phase A (mDNS relay)
// ---------------------------------------------------------------------------

const _peers = new Set<string>()
let _relayActive = false
let _unlistenFound: (() => void) | null = null
let _unlistenLost: (() => void) | null = null

// ---------------------------------------------------------------------------
// Tauri guard
// ---------------------------------------------------------------------------

function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

async function tauriListen<T>(event: string, handler: (payload: T) => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event')
  return listen<T>(event, (e) => handler(e.payload))
}

// ---------------------------------------------------------------------------
// Phase A — mDNS embedded relay
// ---------------------------------------------------------------------------

function addGunPeer(url: string): void {
  if (_peers.has(url)) return
  _peers.add(url)
  gun.opt({ peers: [url] } as any)
  console.info('[mesh] mDNS peer added:', url)
  window.dispatchEvent(new CustomEvent('mesh-peers-changed', { detail: getMeshPeers() }))
}

function removeGunPeer(url: string): void {
  _peers.delete(url)
  console.info('[mesh] mDNS peer removed:', url)
  window.dispatchEvent(new CustomEvent('mesh-peers-changed', { detail: getMeshPeers() }))
}

/**
 * Start the embedded Gun relay + mDNS advertising + peer browsing.
 * Also starts WiFi Direct (Phase B) and BLE (Phase C) on Android.
 * Safe to call multiple times — idempotent per-phase.
 */
export async function startMeshMode(
  port = 8766,
  tribeId = 'default'
): Promise<void> {
  if (!isTauriAvailable()) return

  // ── Phase A: mDNS relay ──────────────────────────────────────────────────
  if (!_relayActive) {
    try {
      const localIp = await tauriInvoke<string>('start_mesh_relay', { port, tribeId })
      _relayActive = true
      console.info('[mesh] Phase A relay started at', `ws://${localIp}:${port}/gun`)

      _unlistenFound = await tauriListen<MeshPeerFoundPayload>(
        'mesh-peer-found',
        ({ url }) => addGunPeer(url)
      )

      _unlistenLost = await tauriListen<MeshPeerLostPayload>(
        'mesh-peer-lost',
        ({ fullname }) => {
          for (const url of _peers) {
            if (fullname && url.includes(fullname.split('.')[0])) {
              removeGunPeer(url)
            }
          }
        }
      )
    } catch (err) {
      console.warn('[mesh] Phase A mDNS relay failed:', err)
    }
  }

  // ── Phase B: WiFi Direct (Android only) ──────────────────────────────────
  // startWifiDirectMode is a no-op on non-Android/non-Tauri
  startWifiDirectMode().catch((err) =>
    console.warn('[mesh] Phase B WiFi Direct failed:', err)
  )

  // ── Phase C: BLE discovery (Android only) ────────────────────────────────
  startBleDiscovery(tribeId).catch((err) =>
    console.warn('[mesh] Phase C BLE discovery failed:', err)
  )
}

/**
 * Stop all mesh layers (relay, WiFi Direct, BLE).
 */
export async function stopMeshMode(): Promise<void> {
  if (!isTauriAvailable()) return

  // Phase A
  if (_relayActive) {
    try {
      await tauriInvoke('stop_mesh_relay')
    } catch (err) {
      console.warn('[mesh] stop_mesh_relay error:', err)
    }
    _unlistenFound?.()
    _unlistenLost?.()
    _unlistenFound = null
    _unlistenLost = null
    _peers.clear()
    _relayActive = false
    window.dispatchEvent(new CustomEvent('mesh-peers-changed', { detail: [] }))
  }

  // Phase B
  await stopWifiDirectMode()

  // Phase C
  await stopBleDiscovery()
}

// ---------------------------------------------------------------------------
// Status queries
// ---------------------------------------------------------------------------

/** True when the mDNS relay is running and ≥1 peer has been discovered. */
export function isMeshUp(): boolean {
  return (_relayActive && _peers.size > 0) || isWifiDirectActive()
}

/** True when the mDNS relay is running (Phase A active). */
export function isMeshActive(): boolean {
  return _relayActive
}

/** True when WiFi Direct has a live connection (Phase B active). */
export function isWifiDirectUp(): boolean {
  return isWifiDirectActive()
}

/** True when BLE discovery is running (Phase C active). */
export function isBleUp(): boolean {
  return isBleDiscoveryActive()
}

/** mDNS-discovered Gun peer URLs. */
export function getMeshPeers(): string[] {
  return Array.from(_peers)
}
