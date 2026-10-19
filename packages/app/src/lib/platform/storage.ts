/**
 * platform/storage.ts — Phase 1 storage abstraction.
 *
 * Phase 1: thin re-export over the existing IndexedDB layer (`../db`).
 * Web behavior is 100% unchanged — same DB name, same stores, same API.
 *
 * The `SecureItem` API is the forward path for Phase 3: private identity
 * keys (`priv`/`epriv`) move to Keychain (iOS) / EncryptedSharedPreferences
 * (Android) via Capacitor. On web it falls back to localStorage namespaced
 * under `pu-secure:` so call sites can adopt the API now without forking.
 *
 * No static `@capacitor/*` imports — native branches use lazy `import()`
 * so the web bundle only fetches Capacitor chunks when running natively.
 */

export { getDB, closeDB } from '../db'

import { isNative } from './types'

const SECURE_PREFIX = 'pu-secure:'

/** Race a promise against a timeout — rejected hangs must never stall boot. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function getPreferences(): Promise<{
  get(o: { key: string }): Promise<{ value: string | null }>
  set(o: { key: string; value: string }): Promise<void>
  remove(o: { key: string }): Promise<void>
} | null> {
  if (!isNative()) return null
  try {
    // Lazy so the web bundle never loads Capacitor until running natively.
    // 8s cap: a hung bridge must fall back to localStorage, never stall boot.
    const mod = await withTimeout(
      import('@capacitor/preferences'),
      8000,
      'Preferences import',
    )
    return mod.Preferences
  } catch (err) {
    console.warn('[storage] secure preferences unavailable, using fallback:', err)
    return null
  }
}

/**
 * Store a small secret (e.g. identity private keys in Phase 3).
 * Web: localStorage fallback. Native: Capacitor Preferences (Phase 3 will
 * swap to a secure-storage plugin with identical API).
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  const prefs = await getPreferences()
  if (prefs) {
    try {
      await withTimeout(
        prefs.set({ key: SECURE_PREFIX + key, value }),
        8000,
        'Preferences.set',
      )
      return
    } catch (err) {
      console.warn('[storage] secure set failed, using fallback:', err)
    }
  }
  try {
    localStorage.setItem(SECURE_PREFIX + key, value)
  } catch {
    // private mode / quota — callers treat missing secure item as absent
  }
}

/** Read a secret stored via setSecureItem. Returns null when absent. */
export async function getSecureItem(key: string): Promise<string | null> {
  const prefs = await getPreferences()
  if (prefs) {
    try {
      const { value } = await withTimeout(
        prefs.get({ key: SECURE_PREFIX + key }),
        8000,
        'Preferences.get',
      )
      return value
    } catch (err) {
      console.warn('[storage] secure get failed, using fallback:', err)
    }
  }
  try {
    return localStorage.getItem(SECURE_PREFIX + key)
  } catch {
    return null
  }
}

/** Delete a secret stored via setSecureItem. */
export async function removeSecureItem(key: string): Promise<void> {
  const prefs = await getPreferences()
  if (prefs) {
    try {
      await withTimeout(prefs.remove({ key: SECURE_PREFIX + key }), 8000, 'Preferences.remove')
      return
    } catch (err) {
      console.warn('[storage] secure remove failed, using fallback:', err)
    }
  }
  try {
    localStorage.removeItem(SECURE_PREFIX + key)
  } catch {
    // ignore
  }
}
