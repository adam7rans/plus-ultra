/**
 * platform/geo.ts — Phase 1 geolocation abstraction.
 *
 * Wraps `navigator.geolocation` (used by CreateTribeScreen +
 * TribeSettingsScreen). Web behavior unchanged. When running in the
 * Capacitor shell, prefers `@capacitor/geolocation` (lazy `import()` —
 * no eager web-bundle cost) and falls back to web geolocation.
 */

import { isNative } from './types'

export interface GeoCoords {
  latitude: number
  longitude: number
  accuracy?: number
}

/** True when any location source is available in this runtime. */
export function isGeolocationAvailable(): boolean {
  if (isNative()) return true // Capacitor Geolocation handles permissions natively
  return (
    typeof navigator !== 'undefined' && typeof navigator.geolocation !== 'undefined'
  )
}

async function getNativeCoords(): Promise<GeoCoords | null> {
  try {
    // Lazy so the web bundle never loads Capacitor until running natively.
    const mod = await import('@capacitor/geolocation')
    const pos = await mod.Geolocation.getCurrentPosition({ enableHighAccuracy: true })
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    }
  } catch {
    return null
  }
}

function getWebCoords(): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationAvailable()) {
      reject(new Error('Geolocation not supported by this browser'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => reject(new Error('Could not get location — enter coordinates manually')),
    )
  })
}

/**
 * Current position, 6-decimal precision left to callers.
 * Native shell first, web geolocation fallback. Rejects with a
 * user-facing message (same strings screens already display).
 */
export async function getCurrentCoords(): Promise<GeoCoords> {
  if (isNative()) {
    const native = await getNativeCoords()
    if (native) return native
  }
  return getWebCoords()
}

export interface LocalityInfo {
  /** City / town / village. */
  city?: string
  /** State / province / principal subdivision. */
  region?: string
  /** Country name. */
  country?: string
}

/**
 * Resolve a human-readable locality for coordinates — grid-up only.
 *
 * Uses BigDataCloud's free client-side endpoint (no API key, CORS-open).
 * Returns null offline or on any failure; callers fall back to coords-only
 * display (grid-down has no gazetteer and must not block on network).
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<LocalityInfo | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        { signal: ctrl.signal },
      )
      if (!res.ok) return null
      const data = (await res.json()) as Record<string, unknown>
      const city =
        typeof data.city === 'string' && data.city
          ? data.city
          : typeof data.locality === 'string' && data.locality
            ? data.locality
            : undefined
      const region =
        typeof data.principalSubdivision === 'string' && data.principalSubdivision
          ? data.principalSubdivision
          : undefined
      const country =
        typeof data.countryName === 'string' && data.countryName ? data.countryName : undefined
      if (!city && !region && !country) return null
      return { city, region, country }
    } finally {
      clearTimeout(timer)
    }
  } catch {
    // offline, aborted, or endpoint unreachable — coords-only fallback
    return null
  }
}

/** "City, Region, Country" skipping absent parts. Empty string when unknown. */
export function formatLocality(info: LocalityInfo): string {
  return [info.city, info.region, info.country].filter(Boolean).join(', ')
}
