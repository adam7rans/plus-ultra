/**
 * platform/share.ts — Phase 1 share/clipboard/haptics abstraction.
 *
 * Centralizes `navigator.share` / `navigator.clipboard` / `navigator.vibrate`
 * (used by TribeDashboard, CommsScreen, FederationScreen,
 * KnowledgeBaseScreen, MemberProfileScreen). Web behavior unchanged.
 *
 * Native branches (Phase 3) use lazy `import()` so the web bundle only
 * fetches Capacitor chunks when running natively: `@capacitor/share`,
 * `@capacitor/clipboard`, `@capacitor/haptics`.
 */

import { isNative } from './types'

/** True when a native or web share sheet can be shown. */
export function canShare(): boolean {
  if (isNative()) return true
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/**
 * Share an invite URL (share sheet w/ clipboard fallback).
 * Returns 'shared' | 'copied' so callers can show the right confirmation.
 */
export async function shareUrl(url: string, title: string): Promise<'shared' | 'copied'> {
  if (isNative()) {
    try {
      // Lazy so the web bundle never loads Capacitor until running natively.
      const mod = await import('@capacitor/share')
      await mod.Share.share({ url, title })
      return 'shared'
    } catch {
      // user cancelled or plugin missing — fall through to copy
    }
  } else if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ url, title })
      return 'shared'
    } catch {
      // user cancelled or API failed — fall through to copy
    }
  }
  await copyText(url)
  return 'copied'
}

/** Copy text to the clipboard. Resolves false when unavailable. */
export async function copyText(text: string): Promise<boolean> {
  if (isNative()) {
    try {
      // Lazy so the web bundle never loads Capacitor until running natively.
      const mod = await import('@capacitor/clipboard')
      await mod.Clipboard.write({ string: text })
      return true
    } catch {
      // fall through to web clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Haptic/alert vibration. No-op where unsupported. */
export function vibrate(pattern: number | number[] = [200, 100, 200]): void {
  if (isNative()) {
    // Lazy so the web bundle never loads Capacitor until running natively.
    void import('@capacitor/haptics')
      .then((mod) => mod.Haptics.vibrate().catch(() => undefined))
      .catch(() => undefined)
    return
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern as number[])
  } catch {
    // ignore
  }
}
