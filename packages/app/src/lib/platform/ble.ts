/**
 * platform/ble.ts — Phase 4 native BLE tribe discovery (central/scan side).
 *
 * Scans for the tribe service UUID (derived deterministically from the tribe
 * ID) and feeds hits into the SAME `ble-peers-changed` CustomEvent flow that
 * `../ble-discovery` uses — `useMeshSync` and status cards work unchanged.
 *
 * Scope limits (honest, v1):
 * - Scan (central) only. Advertising (peripheral mode) needs a separate
 *   plugin — until then, discovery is one-sided (Android scanners see iOS
 *   advertisers only if the other side runs the Tauri desktop relay or a
 *   future peripheral build). Documented in getMeshCapabilities().
 * - Scan hits do NOT auto-trigger WiFi-Direct: that needs a custom native
 *   plugin (no maintained Capacitor equivalent). The peer list UI + manual
 *   hotspot copy is the v1 path on iOS.
 *
 * Web/Tauri: unused (existing `../ble-discovery` Tauri path stays canonical).
 */

import { isNative } from './types'
import type { BlePeer } from './mesh'

const _peers = new Map<string, BlePeer>()

function emit(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('ble-peers-changed', { detail: Array.from(_peers.values()) }),
  )
}

/**
 * Deterministic 128-bit service UUID for a tribe (sync, no crypto needed).
 * cyrb53 pair → 64+64 bits → UUID 8-4-4-4-12 layout.
 */
export function tribeServiceUuid(tribeId: string): string {
  const h = (seed: number): number => {
    let h1 = 0xdeadbeef ^ seed
    let h2 = 0x41c6ce57 ^ seed
    for (let i = 0; i < tribeId.length; i++) {
      const ch = tribeId.charCodeAt(i)
      h1 = Math.imul(h1 ^ ch, 2654435761)
      h2 = Math.imul(h2 ^ ch, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    return 4294967296 * (2097151 & h2) + (h1 >>> 0)
  }
  const a = h(0x9e3779b9).toString(16).padStart(14, '0').slice(0, 12)
  const b = h(0x85ebca6b).toString(16).padStart(14, '0').slice(0, 12)
  const c = h(0xc2b2ae35).toString(16).padStart(14, '0').slice(0, 12)
  const d = h(0x27d4eb2f).toString(16).padStart(14, '0').slice(0, 12)
  const hex = (a + b + c + d).slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

let _scanning = false

/** Start native BLE scan for tribe advertisements. No-op off native. */
export async function startNativeBleScan(tribeId: string): Promise<void> {
  if (!isNative() || _scanning) return
  const { BleClient } = await import('@capacitor-community/bluetooth-le')
  await BleClient.initialize({ androidNeverForLocation: true })
  const service = tribeServiceUuid(tribeId)
  await BleClient.requestLEScan({ services: [service], allowDuplicates: false }, (result) => {
    const address = result.device.deviceId
    const peer: BlePeer = {
      address,
      rssi: result.rssi ?? -100,
      name: result.localName ?? result.device.name ?? 'tribe-member',
    }
    if (!_peers.has(address)) {
      console.info('[ble-native] tribe peer detected:', address, `RSSI ${peer.rssi}`)
    }
    _peers.set(address, peer)
    emit()
  })
  _scanning = true
  console.info('[ble-native] scan started for service:', service)
}

/** Stop the native BLE scan. No-op off native or when idle. */
export async function stopNativeBleScan(): Promise<void> {
  if (!isNative() || !_scanning) return
  try {
    const { BleClient } = await import('@capacitor-community/bluetooth-le')
    await BleClient.stopLEScan()
  } catch {
    // already stopped
  }
  _peers.clear()
  _scanning = false
  emit()
}

export function isNativeBleScanning(): boolean {
  return _scanning
}

export function getNativeBlePeers(): BlePeer[] {
  return Array.from(_peers.values())
}
