import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { createTribe } from '../lib/tribes'
import { getCurrentCoords, isGeolocationAvailable, reverseGeocode, formatLocality } from '../lib/platform/geo'
import LocationAutocomplete from '../components/LocationAutocomplete'
import AppIcon from '../components/AppIcon'
import { AppButton, AppCard, AppField, AppInput } from '../components/ui'
import type { Tribe } from '@plus-ultra/core'

const CONSTITUTION_OPTIONS: { value: Tribe['constitutionTemplate']; label: string; description: string }[] = [
  {
    value: 'council',
    label: 'Council Model',
    description: 'Domain leads vote on decisions. Coordinator has tie-break. Efficient for action.',
  },
  {
    value: 'direct_democracy',
    label: 'Direct Democracy',
    description: 'Every member votes on all decisions. Maximum inclusion, slower decisions.',
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    description: 'Council handles operations. Full tribe votes on major changes.',
  },
]

export default function CreateTribeScreen() {
  const { identity } = useIdentity()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [region, setRegion] = useState('')
  const [constitution, setConstitution] = useState<Tribe['constitutionTemplate']>('council')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Coordinates (optional)
  const [showCoords, setShowCoords] = useState(false)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLabel, setGeoLabel] = useState<string | null>(null)
  const [geoResolving, setGeoResolving] = useState(false)

  function handleUseCurrentLocation() {
    if (!isGeolocationAvailable()) {
      setGeoError('Geolocation not supported by this browser')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    setGeoLabel(null)
    getCurrentCoords().then(
      pos => {
        const latStr = pos.latitude.toFixed(6)
        const lngStr = pos.longitude.toFixed(6)
        setLat(latStr)
        setLng(lngStr)
        setGeoLoading(false)
        // Grid-up: resolve city/region/country and offer them as the
        // location fields. Grid-down: lookup fails silently, coords stand.
        setGeoResolving(true)
        void reverseGeocode(pos.latitude, pos.longitude).then(info => {
          setGeoResolving(false)
          if (!info) return
          setGeoLabel(formatLocality(info))
          setLocation(prev => (prev.trim() ? prev : (info.city ?? '')))
          setRegion(prev => (prev.trim() ? prev : (info.region ?? info.country ?? '')))
        })
      },
      () => {
        setGeoError('Could not get location — enter coordinates manually')
        setGeoLoading(false)
      },
    )
  }

  async function handleCreate() {
    if (!identity) return
    if (!name.trim() || !location.trim() || !region.trim()) {
      setError('Please fill in all fields')
      return
    }

    const parsedLat = lat ? parseFloat(lat) : undefined
    const parsedLng = lng ? parseFloat(lng) : undefined
    if ((parsedLat !== undefined && isNaN(parsedLat)) || (parsedLng !== undefined && isNaN(parsedLng))) {
      setError('Invalid coordinates')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const tribe = await createTribe(
        {
          name: name.trim(),
          location: location.trim(),
          region: region.trim(),
          constitutionTemplate: constitution,
          lat: parsedLat,
          lng: parsedLng,
        },
        identity.pub,
        identity.displayName,
        identity.epub
      )
      // Notify TribeContext to refresh
      window.dispatchEvent(new Event('tribe-joined'))
      await navigate({ to: '/tribe/$tribeId/onboarding', params: { tribeId: tribe.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tribe')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/" className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← Back
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-2">Create a Tribe</h2>
      <p className="text-gray-500 text-sm mb-8">
        You'll be the founding member. Invite others after setup.
      </p>

      <div className="space-y-5">
        {/* Tribe name */}
        <AppField label="Tribe name" required>
          <AppInput
            type="text"
            placeholder="e.g. Austin North Tribe"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
          />
        </AppField>

        {/* Location — type-ahead search or GPS fix */}
        <AppField label="Location" required hint="General area only — exact location stays private.">
          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            onPick={(place) => {
              setLocation(place.location)
              setRegion((prev) => (prev.trim() ? prev : place.region))
            }}
            onCoords={(lat, lng) => {
              setLat(lat.toFixed(6))
              setLng(lng.toFixed(6))
            }}
            onLocality={setGeoLabel}
          />
        </AppField>

        {/* Region */}
        <AppField label="Region" required>
          <AppInput
            type="text"
            placeholder="e.g. Texas, California, Scotland"
            value={region}
            onChange={e => setRegion(e.target.value)}
            maxLength={40}
          />
        </AppField>

        {/* Coordinates (optional) */}
        <div>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-forest-400 hover:text-forest-300 mb-2"
            onClick={() => setShowCoords(prev => !prev)}
          >
            <span>{showCoords ? '▼' : '▶'}</span>
            Set Coordinates (optional)
          </button>
          {showCoords && (
            <AppCard className="!bg-forest-950/50 space-y-3">
              <AppButton
                type="button"
                variant="secondary"
                fullWidth
                className="text-sm"
                onClick={handleUseCurrentLocation}
                disabled={geoLoading}
              >
                {geoLoading ? 'Getting location...' : 'Use My Current Location'}
              </AppButton>
              {geoError && <p className="text-xs text-danger-400">{geoError}</p>}
              <div className="grid grid-cols-2 gap-2">
                <AppField label="Latitude">
                  <AppInput
                    type="number"
                    step="0.0001"
                    className="text-sm"
                    placeholder="48.8584"
                    value={lat}
                    onChange={e => setLat(e.target.value)}
                  />
                </AppField>
                <AppField label="Longitude">
                  <AppInput
                    type="number"
                    step="0.0001"
                    className="text-sm"
                    placeholder="2.2945"
                    value={lng}
                    onChange={e => setLng(e.target.value)}
                  />
                </AppField>
              </div>
              {lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)) && (
                <p className="text-xs text-gray-500">
                  {Math.abs(parseFloat(lat)).toFixed(4)}° {parseFloat(lat) >= 0 ? 'N' : 'S'},&nbsp;
                  {Math.abs(parseFloat(lng)).toFixed(4)}° {parseFloat(lng) >= 0 ? 'E' : 'W'}
                </p>
              )}
              {geoResolving && (
                <p className="text-xs text-gray-500 animate-pulse">Looking up area…</p>
              )}
              {geoLabel && (
                <p className="text-xs text-forest-300"><AppIcon name="pin" size={16} className="inline" /> {geoLabel}</p>
              )}
            </AppCard>
          )}
        </div>

        {/* Constitution */}
        <AppField label="Governance model">
          <div className="space-y-2">
            {CONSTITUTION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setConstitution(opt.value)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  constitution === opt.value
                    ? 'border-forest-500 bg-forest-900'
                    : 'border-forest-800 bg-forest-950 hover:border-forest-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${constitution === opt.value ? 'border-forest-400 bg-forest-400' : 'border-gray-600'}`} />
                  <span className="font-semibold text-gray-100 text-sm">{opt.label}</span>
                </div>
                <p className="text-xs text-gray-500 ml-5">{opt.description}</p>
              </button>
            ))}
          </div>
        </AppField>

        {error && (
          <AppCard className="border-danger-700 bg-danger-900/20">
            <p className="text-danger-400 text-sm">{error}</p>
          </AppCard>
        )}

        <AppButton
          fullWidth
          onClick={handleCreate}
          disabled={loading || !name.trim() || !location.trim() || !region.trim()}
        >
          {loading ? 'Creating...' : 'Found This Tribe'}
        </AppButton>
      </div>
    </div>
  )
}
