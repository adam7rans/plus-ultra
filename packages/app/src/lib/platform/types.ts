/**
 * platform/types.ts — Phase 1 platform detection.
 *
 * Single source of truth for "where are we running?".
 * Web behavior is unchanged. Native (Capacitor) and desktop (Tauri)
 * branches are additive and detected at runtime — no static imports
 * of @capacitor/* or @tauri-apps/* here, so the web bundle is unaffected.
 *
 * Phase 2+ will add `packages/mobile` (Capacitor shell). These helpers
 * already handle that shell via `window.Capacitor`.
 */

export type NativeOS = 'ios' | 'android'
export type AppPlatform = 'web' | 'ios' | 'android' | 'desktop'

function getWindow(): (Window & Record<string, any>) | undefined {
  return typeof window !== 'undefined' ? (window as any) : undefined
}

/** True inside Tauri (desktop today, mobile if `tauri ios/android init` is ever run). */
export function isTauri(): boolean {
  const w = getWindow()
  return !!w?.__TAURI__
}

/** True inside a Capacitor native shell (Phase 2+). False on web/PWA/desktop. */
export function isNative(): boolean {
  const w = getWindow()
  try {
    return w?.Capacitor?.isNativePlatform?.() === true
  } catch {
    return false
  }
}

/** 'ios' | 'android' | 'web' as reported by Capacitor when present. */
export function getCapacitorOS(): 'ios' | 'android' | 'web' {
  const w = getWindow()
  try {
    const p = w?.Capacitor?.getPlatform?.()
    if (p === 'ios' || p === 'android') return p
  } catch {
    // fall through
  }
  return 'web'
}

/**
 * Resolved platform:
 * - 'ios' / 'android' when running in Capacitor native shell
 * - 'desktop' when running in Tauri (non-native)
 * - 'web' otherwise (browser / PWA)
 */
export function getPlatform(): AppPlatform {
  if (isNative()) {
    const os = getCapacitorOS()
    return os === 'web' ? 'web' : os
  }
  if (isTauri()) return 'desktop'
  return 'web'
}

/** True when running in a browser/PWA (not Tauri, not Capacitor native). */
export function isWeb(): boolean {
  return getPlatform() === 'web'
}
