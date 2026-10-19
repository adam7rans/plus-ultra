import { useEffect, useRef, useState } from 'react'
import {
  getCurrentCoords,
  isGeolocationAvailable,
  reverseGeocode,
  formatLocality,
} from '../lib/platform/geo'
import AppIcon from './AppIcon'

export interface PlacePick {
  /** City / locality display name for the location field. */
  location: string
  /** State / country suggestion for the region field. */
  region: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  /** Fired when the user picks a suggestion or a GPS fix resolves. */
  onPick: (place: PlacePick) => void
  /** Raw coords from a GPS fix (parents mirror them into lat/lng inputs). */
  onCoords: (lat: number, lng: number) => void
  /** Human-readable locality line for parents that show one (coords cards). */
  onLocality?: (label: string | null) => void
  placeholder?: string
  disabled?: boolean
}

interface Suggestion {
  key: string
  name: string
  detail: string
  state?: string
  country?: string
}

/**
 * Free place search (Komoot Photon, no API key, CORS-open).
 * Throws offline or on HTTP failure — callers show manual-entry fallback.
 */
async function searchPlaces(query: string, signal: AbortSignal): Promise<Suggestion[]> {
  const res = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`,
    { signal },
  )
  if (!res.ok) throw new Error(`search failed: ${res.status}`)
  const data = (await res.json()) as { features?: Array<{ properties?: Record<string, unknown> }> }
  const features = Array.isArray(data.features) ? data.features : []
  return features
    .map((f, i) => {
      const p = f.properties ?? {}
      const str = (v: unknown): string | undefined =>
        typeof v === 'string' && v ? v : undefined
      const name = str(p.name) ?? str(p.city) ?? str(p.locality) ?? ''
      const state = str(p.state) ?? str(p.county)
      const country = str(p.country)
      return {
        key: `${name}-${i}`,
        name,
        detail: [state, country].filter(Boolean).join(', '),
        state,
        country,
      }
    })
    .filter((s) => s.name)
}

/**
 * Location field with two entry paths:
 *  1. Type-ahead search — dropdown narrows as you type (grid-up only).
 *  2. "Use current location" row — GPS fix + reverse-geocode (works offline
 *     for coords; locality line needs connectivity).
 *
 * Web and native share this component; GPS permission is requested only when
 * the user explicitly taps the current-location row — never on focus.
 */
export default function LocationAutocomplete({
  value,
  onChange,
  onPick,
  onCoords,
  onLocality,
  placeholder = 'City or neighborhood (no exact addresses)',
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [gpsState, setGpsState] = useState<'idle' | 'locating' | 'error'>('idle')
  const abortRef = useRef<AbortController | null>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced type-ahead (min 2 chars; abort stale requests).
  useEffect(() => {
    abortRef.current?.abort()
    const q = value.trim()
    if (q.length < 2) {
      setSuggestions([])
      setSearching(false)
      setSearchFailed(false)
      return
    }
    setSearching(true)
    setSearchFailed(false)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const timer = setTimeout(() => {
      void searchPlaces(q, ctrl.signal)
        .then((results) => {
          if (ctrl.signal.aborted) return
          setSuggestions(results)
          setSearching(false)
        })
        .catch((err) => {
          if (ctrl.signal.aborted) return
          console.warn('[location] search failed:', err)
          setSuggestions([])
          setSearching(false)
          setSearchFailed(true)
        })
    }, 350)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [value])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      if (blurTimer.current) clearTimeout(blurTimer.current)
    },
    [],
  )

  function closeDeferred() {
    // Let tap events on dropdown rows land before closing.
    if (blurTimer.current) clearTimeout(blurTimer.current)
    blurTimer.current = setTimeout(() => setOpen(false), 150)
  }

  function pick(s: Suggestion) {
    onPick({ location: s.name, region: s.state ?? s.country ?? '' })
    setOpen(false)
  }

  async function useCurrentLocation() {
    if (!isGeolocationAvailable()) {
      setGpsState('error')
      return
    }
    setGpsState('locating')
    try {
      const pos = await getCurrentCoords()
      onCoords(pos.latitude, pos.longitude)
      const info = await reverseGeocode(pos.latitude, pos.longitude)
      if (info) {
        onLocality?.(formatLocality(info))
        onPick({
          location: info.city ?? '',
          region: info.region ?? info.country ?? '',
        })
      } else {
        onLocality?.(null)
      }
      setGpsState('idle')
      setOpen(false)
    } catch {
      setGpsState('error')
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        className="input"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={closeDeferred}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-forest-700 bg-forest-900 shadow-xl overflow-hidden">
          <button
            type="button"
            className="w-full text-left px-4 py-3 text-sm text-forest-300 hover:bg-forest-800 flex items-center gap-2"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void useCurrentLocation()}
          >
            <AppIcon name="pin" size={16} />
            <span>
              {gpsState === 'locating'
                ? 'Getting location…'
                : gpsState === 'error'
                  ? 'Location unavailable — enter manually'
                  : 'Use current location'}
            </span>
          </button>
          <div className="border-t border-forest-800" />
          {searching && (
            <p className="px-4 py-3 text-xs text-gray-500 animate-pulse">Searching…</p>
          )}
          {!searching &&
            suggestions.map((s) => (
              <button
                key={s.key}
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-forest-800"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
              >
                <div className="text-sm text-gray-100">{s.name}</div>
                {s.detail && <div className="text-xs text-gray-500">{s.detail}</div>}
              </button>
            ))}
          {!searching && value.trim().length >= 2 && suggestions.length === 0 && (
            <p className="px-4 py-3 text-xs text-gray-500">
              {searchFailed
                ? 'Offline — type the place manually or use GPS.'
                : 'No matches — keep typing or use the place name as-is.'}
            </p>
          )}
          {value.trim().length < 2 && (
            <p className="px-4 py-2.5 text-xs text-gray-600">Type at least 2 characters to search.</p>
          )}
        </div>
      )}
    </div>
  )
}
