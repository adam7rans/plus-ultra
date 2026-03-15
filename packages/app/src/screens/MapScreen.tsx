import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { MapContainer, Polygon, Polyline, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import { tileLayerOffline, savetiles } from 'leaflet.offline'
import type { TileLayerOffline, ControlSaveTiles } from 'leaflet.offline'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useMapData } from '../hooks/useMapData'
import { useContacts } from '../hooks/useContacts'
import { useBugOut } from '../hooks/useBugOut'
import { saveTerritory, addPin, deletePin, addPatrolRoute, deletePatrolRoute } from '../lib/map'
import { fetchTribeMeta } from '../lib/tribes'
import { getAuthority, hasAuthority, PINNABLE_ASSET_TYPES } from '@plus-ultra/core'
import type { Tribe, PinAssetType, LatLng, ContactCategory } from '@plus-ultra/core'

// ─── Leaflet marker icon fix (known Vite issue) ───────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

// ─── Types ────────────────────────────────────────────────────────────────────
type MapMode = 'view' | 'edit-territory' | 'add-pin' | 'edit-pin' | 'add-route' | 'edit-route'
type ActiveTab = 'pins' | 'routes' | 'contacts'

const CONTACT_CATEGORY_ICONS: Record<ContactCategory, string> = {
  medical:    '🏥',
  legal:      '⚖️',
  comms:      '📻',
  supply:     '🛒',
  mutual_aid: '🤝',
  authority:  '🚔',
  other:      '👤',
}

function contactIcon(category: ContactCategory): L.DivIcon {
  return L.divIcon({
    html: `<div style="font-size:18px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8))">${CONTACT_CATEGORY_ICONS[category]}</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

const PIN_ASSET_LABELS: Record<PinAssetType, string> = {
  guard_post: 'Guard Post',
  water_storage: 'Water Storage',
  water_source_access: 'Water Source',
  food_storage: 'Food Storage',
  medical_facility: 'Medical Facility',
  armory: 'Armory',
  comms_post: 'Comms Post',
  fuel_depot: 'Fuel Depot',
  community_hall: 'Community Hall',
  workshop: 'Workshop',
  radio_base_station: 'Radio Base Station',
  kitchen_mess: 'Kitchen/Mess',
  sanitation_facility: 'Sanitation Facility',
}

// ─── Inner components (must render inside MapContainer) ──────────────────────

interface OfflineTileLayerProps {
  onLayerReady: (layer: TileLayerOffline, control: ControlSaveTiles) => void
}

function OfflineTileLayerComp({ onLayerReady }: OfflineTileLayerProps) {
  const map = useMap()
  // Stable ref so effect only runs once
  const onLayerReadyRef = useRef(onLayerReady)
  onLayerReadyRef.current = onLayerReady

  useEffect(() => {
    const layer = tileLayerOffline(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        crossOrigin: true,
      },
    )
    layer.addTo(map)

    const control = savetiles(layer, {
      saveText: '↓',
      rmText: '×',
      maxZoom: 17,
      saveWhatYouSee: true,
      bounds: null,
      confirm: null,
      confirmRemoval: null,
      parallel: 5,
      alwaysDownload: false,
    })
    // Add to map so control._map is set (needed for _saveTiles), but hide UI
    control.addTo(map)
    const el = control.getContainer()
    if (el) el.style.display = 'none'

    onLayerReadyRef.current(layer, control)

    return () => {
      map.removeLayer(layer)
      map.removeControl(control)
    }
  }, [map])

  return null
}

interface DrawControllerProps {
  mode: MapMode
  onTerritorySaved: (points: LatLng[]) => void
  onRouteFinished: (points: LatLng[]) => void
  onModeChange: (mode: MapMode) => void
}

function DrawController({ mode, onTerritorySaved, onRouteFinished, onModeChange }: DrawControllerProps) {
  const map = useMap()
  const handlerRef = useRef<L.Draw.Feature | null>(null)
  const cbsRef = useRef({ onTerritorySaved, onRouteFinished, onModeChange })
  cbsRef.current = { onTerritorySaved, onRouteFinished, onModeChange }

  useEffect(() => {
    // Disable any active handler from a previous mode
    if (handlerRef.current) {
      handlerRef.current.disable()
      handlerRef.current = null
    }
    map.off(L.Draw.Event.CREATED)

    if (mode === 'edit-territory') {
      const handler = new L.Draw.Polygon(map as L.DrawMap, {
        shapeOptions: { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.15, weight: 2 },
      })
      handler.enable()
      handlerRef.current = handler

      map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
        const event = e as unknown as L.DrawEvents.Created
        const latlngs = (event.layer as L.Polygon).getLatLngs()[0] as L.LatLng[]
        map.removeLayer(event.layer)
        cbsRef.current.onTerritorySaved(latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng })))
        cbsRef.current.onModeChange('view')
      })
    } else if (mode === 'add-route') {
      const handler = new L.Draw.Polyline(map as L.DrawMap, {
        shapeOptions: { color: '#f59e0b', weight: 4 },
        metric: true,
      })
      handler.enable()
      handlerRef.current = handler

      map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
        const event = e as unknown as L.DrawEvents.Created
        const latlngs = (event.layer as L.Polyline).getLatLngs() as L.LatLng[]
        map.removeLayer(event.layer)
        cbsRef.current.onRouteFinished(latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng })))
      })
    }

    return () => {
      if (handlerRef.current) {
        handlerRef.current.disable()
        handlerRef.current = null
      }
      map.off(L.Draw.Event.CREATED)
    }
  }, [mode, map])

  return null
}

interface ClickHandlerProps {
  mode: MapMode
  onMapClick: (pos: LatLng) => void
}

function ClickHandler({ mode, onMapClick }: ClickHandlerProps) {
  const cbRef = useRef(onMapClick)
  cbRef.current = onMapClick
  useMapEvents({
    click(e) {
      if (mode === 'add-pin') {
        cbRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    },
  })
  return null
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/map' })
  const { identity } = useIdentity()
  const { members } = useSurvivabilityScore(tribeId)
  const { territory, pins, routes, loading } = useMapData(tribeId)
  const { contacts } = useContacts(tribeId)
  const [tribe, setTribe] = useState<Tribe | null>(null)
  const { activePlan } = useBugOut(tribeId)
  const bugOutRouteIds = new Set(activePlan?.routeId ? [activePlan.routeId] : [])

  const [mode, setMode] = useState<MapMode>('view')
  const [activeTab, setActiveTab] = useState<ActiveTab>('pins')
  const [showEditMenu, setShowEditMenu] = useState(false)

  // Pin add form
  const [tempPinPos, setTempPinPos] = useState<LatLng | null>(null)
  const [pinAssetType, setPinAssetType] = useState<PinAssetType>('guard_post')
  const [pinLabel, setPinLabel] = useState('')
  const [pinNotes, setPinNotes] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  // Route finish form
  const [pendingWaypoints, setPendingWaypoints] = useState<LatLng[] | null>(null)
  const [routeName, setRouteName] = useState('')
  const [routeNotes, setRouteNotes] = useState('')
  const [routeAssignedTo, setRouteAssignedTo] = useState('')
  const [savingRoute, setSavingRoute] = useState(false)

  // Selected list items (fly-to highlight)
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)

  // Offline tile download
  const tileLayerRef = useRef<TileLayerOffline | null>(null)
  const saveTilesControlRef = useRef<ControlSaveTiles | null>(null)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ loaded: 0, total: 0 })
  const [storedCount, setStoredCount] = useState(0)

  useEffect(() => {
    fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) })
  }, [tribeId])

  // Permissions
  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember && tribe ? getAuthority(myMember, tribe) : 'member'
  const canEdit = hasAuthority(myAuth, 'lead')

  // Map center
  const mapCenter: [number, number] = tribe?.lat && tribe?.lng
    ? [tribe.lat, tribe.lng]
    : [39.5, -98.35]
  const mapZoom = tribe?.lat ? 14 : 4

  // Territory polygon points
  const territoryPositions: [number, number][] = territory?.polygonJson
    ? (JSON.parse(territory.polygonJson) as LatLng[]).map(ll => [ll.lat, ll.lng])
    : []

  function handleLayerReady(layer: TileLayerOffline, control: ControlSaveTiles) {
    tileLayerRef.current = layer
    saveTilesControlRef.current = control

    layer.on('storagesize', (e: unknown) => {
      setStoredCount((e as Record<string, number>).storagesize ?? 0)
    })
    layer.on('savestart', (e: unknown) => {
      const s = e as Record<string, number>
      setDownloadProgress({ loaded: 0, total: s.lengthToBeSaved ?? 0 })
      setDownloading(true)
      setDownloadComplete(false)
    })
    layer.on('loadtileend', (e: unknown) => {
      const s = e as Record<string, number>
      setDownloadProgress({ loaded: s.lengthLoaded ?? 0, total: s.lengthToBeSaved ?? 0 })
    })
    layer.on('saveend', () => {
      setDownloading(false)
      setDownloadComplete(true)
    })
  }

  function handleStartDownload() {
    const ctrl = saveTilesControlRef.current
    if (!ctrl) return
    ;(ctrl as unknown as Record<string, () => void>)._saveTiles()
  }

  function handleTerritorySaved(points: LatLng[]) {
    if (!identity) return
    void saveTerritory(tribeId, points, identity.pub)
  }

  function handleRouteFinished(points: LatLng[]) {
    setPendingWaypoints(points)
    setRouteName('')
    setRouteNotes('')
    setRouteAssignedTo('')
    setMode('edit-route')
  }

  function handleMapClick(pos: LatLng) {
    setTempPinPos(pos)
    setPinAssetType('guard_post')
    setPinLabel(PIN_ASSET_LABELS['guard_post'])
    setPinNotes('')
    setMode('edit-pin')
  }

  async function handleSavePin() {
    if (!tempPinPos || !identity) return
    setSavingPin(true)
    try {
      await addPin(tribeId, {
        assetType: pinAssetType,
        label: pinLabel || PIN_ASSET_LABELS[pinAssetType],
        notes: pinNotes,
        lat: tempPinPos.lat,
        lng: tempPinPos.lng,
      }, identity.pub)
      setTempPinPos(null)
      setMode('view')
    } finally {
      setSavingPin(false)
    }
  }

  async function handleSaveRoute() {
    if (!pendingWaypoints || !identity || !routeName.trim()) return
    setSavingRoute(true)
    try {
      await addPatrolRoute(tribeId, {
        name: routeName.trim(),
        waypointsJson: JSON.stringify(pendingWaypoints),
        notes: routeNotes,
        assignedTo: routeAssignedTo,
        scheduleEventId: '',
      }, identity.pub)
      setPendingWaypoints(null)
      setMode('view')
    } finally {
      setSavingRoute(false)
    }
  }

  function cancelMode() {
    setMode('view')
    setTempPinPos(null)
    setPendingWaypoints(null)
    setShowEditMenu(false)
  }

  const modeInstructions: Partial<Record<MapMode, string>> = {
    'edit-territory': 'Click to place boundary points. Click first point to close the polygon.',
    'add-pin': 'Tap the map to place an asset pin.',
    'edit-pin': 'Fill in pin details below, then save.',
    'add-route': 'Click waypoints on the map. Double-click to finish the route.',
    'edit-route': 'Name and assign the patrol route below.',
  }

  return (
    <div className="flex flex-col h-screen bg-forest-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-forest-950 border-b border-forest-900 flex-shrink-0 z-[500]">
        <Link
          to="/tribe/$tribeId"
          params={{ tribeId }}
          className="text-forest-400 text-sm hover:text-forest-300"
        >
          ← Back
        </Link>
        <span className="text-gray-100 font-semibold text-sm">
          {tribe?.name ? `${tribe.name} — Map` : 'Map'}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="text-xs text-forest-400 hover:text-forest-300 px-2 py-1 border border-forest-800 rounded"
            onClick={() => setShowDownloadModal(true)}
          >
            ↓ Offline
          </button>
          {canEdit && (
            <div className="relative">
              <button
                className="text-xs bg-forest-700 text-gray-100 px-3 py-1.5 rounded hover:bg-forest-600 transition-colors"
                onClick={() => setShowEditMenu(prev => !prev)}
              >
                Edit ▾
              </button>
              {showEditMenu && (
                <div className="absolute right-0 top-full mt-1 bg-forest-900 border border-forest-700 rounded shadow-lg z-[1000] min-w-[160px]">
                  <button
                    className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-forest-800"
                    onClick={() => { setMode('edit-territory'); setShowEditMenu(false) }}
                  >
                    Edit Territory
                  </button>
                  <button
                    className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-forest-800"
                    onClick={() => { setMode('add-pin'); setShowEditMenu(false) }}
                  >
                    Add Pin
                  </button>
                  <button
                    className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-forest-800"
                    onClick={() => { setMode('add-route'); setShowEditMenu(false) }}
                  >
                    Add Route
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative min-h-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-forest-400 text-sm animate-pulse">
            Loading map...
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="w-full h-full"
            style={{ background: '#1a2e20' }}
            zoomControl={true}
          >
            <OfflineTileLayerComp onLayerReady={handleLayerReady} />

            {/* Territory polygon */}
            {territoryPositions.length > 0 && (
              <Polygon
                positions={territoryPositions}
                pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.12, weight: 2 }}
              />
            )}

            {/* Tribe home pin */}
            {tribe?.lat && tribe?.lng && (
              <Marker position={[tribe.lat, tribe.lng]} />
            )}

            {/* Temporary pin during placement */}
            {tempPinPos && (
              <Marker
                position={[tempPinPos.lat, tempPinPos.lng]}
                draggable
                eventHandlers={{
                  dragend(e) {
                    const ll = (e.target as L.Marker).getLatLng()
                    setTempPinPos({ lat: ll.lat, lng: ll.lng })
                  },
                }}
              />
            )}

            {/* Asset pins */}
            {pins.map(pin => (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                opacity={selectedPinId && selectedPinId !== pin.id ? 0.5 : 1}
                eventHandlers={{ click: () => setSelectedPinId(prev => prev === pin.id ? null : pin.id) }}
              />
            ))}

            {/* Contact markers */}
            {contacts
              .filter(c => c.lat != null && c.lng != null)
              .map(c => (
                <Marker
                  key={c.id}
                  position={[c.lat!, c.lng!]}
                  icon={contactIcon(c.category)}
                  eventHandlers={{ click: () => setSelectedContactId(prev => prev === c.id ? null : c.id) }}
                />
              ))
            }

            {/* Patrol routes */}
            {routes.map(route => {
              try {
                const wps = JSON.parse(route.waypointsJson) as LatLng[]
                return (
                  <Polyline
                    key={route.id}
                    positions={wps.map(w => [w.lat, w.lng] as [number, number])}
                    pathOptions={{
                      color: bugOutRouteIds.has(route.id) ? '#dc2626' : (selectedRouteId === route.id ? '#f59e0b' : '#78716c'),
                      weight: bugOutRouteIds.has(route.id) ? 3 : (selectedRouteId === route.id ? 4 : 2.5),
                      dashArray: bugOutRouteIds.has(route.id) ? '8 4' : undefined,
                    }}
                    eventHandlers={{ click: () => setSelectedRouteId(prev => prev === route.id ? null : route.id) }}
                  />
                )
              } catch {
                return null
              }
            })}

            <DrawController
              mode={mode}
              onTerritorySaved={handleTerritorySaved}
              onRouteFinished={handleRouteFinished}
              onModeChange={setMode}
            />
            <ClickHandler mode={mode} onMapClick={handleMapClick} />
          </MapContainer>
        )}
        {activePlan && bugOutRouteIds.size > 0 && (
          <div className="absolute top-16 left-2 z-[1000] bg-black/70 text-red-400 text-xs px-2 py-1 rounded">
            Bug-Out Route Active
          </div>
        )}
      </div>

      {/* Mode indicator bar */}
      {mode !== 'view' && mode !== 'edit-pin' && mode !== 'edit-route' && (
        <div className="flex items-center justify-between px-4 py-2 bg-forest-900 border-t border-forest-800 flex-shrink-0">
          <span className="text-xs text-forest-300">{modeInstructions[mode]}</span>
          <button className="text-xs text-danger-400 hover:text-danger-300 ml-4" onClick={cancelMode}>
            Cancel
          </button>
        </div>
      )}

      {/* Pin form bottom sheet */}
      {mode === 'edit-pin' && (
        <div className="bg-forest-950 border-t border-forest-800 px-4 py-4 flex-shrink-0 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">
              New Pin{tempPinPos ? ` — ${tempPinPos.lat.toFixed(4)}, ${tempPinPos.lng.toFixed(4)}` : ''}
            </p>
            <button className="text-xs text-danger-400 hover:text-danger-300" onClick={cancelMode}>
              Cancel
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PINNABLE_ASSET_TYPES.map(type => (
              <button
                key={type}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  pinAssetType === type
                    ? 'border-forest-500 bg-forest-800 text-forest-300'
                    : 'border-forest-800 text-gray-400 hover:border-forest-600'
                }`}
                onClick={() => {
                  setPinAssetType(type)
                  setPinLabel(PIN_ASSET_LABELS[type])
                }}
              >
                {PIN_ASSET_LABELS[type]}
              </button>
            ))}
          </div>
          <input
            className="input text-sm mb-2"
            placeholder="Label (optional)"
            value={pinLabel}
            onChange={e => setPinLabel(e.target.value)}
          />
          <input
            className="input text-sm mb-3"
            placeholder="Notes"
            value={pinNotes}
            onChange={e => setPinNotes(e.target.value)}
          />
          <button
            className="btn-primary w-full text-sm"
            onClick={handleSavePin}
            disabled={savingPin}
          >
            {savingPin ? 'Saving...' : 'Save Pin'}
          </button>
        </div>
      )}

      {/* Route finish form */}
      {mode === 'edit-route' && pendingWaypoints && (
        <div className="bg-forest-950 border-t border-forest-800 px-4 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">{pendingWaypoints.length} waypoints</p>
            <button className="text-xs text-danger-400 hover:text-danger-300" onClick={cancelMode}>
              Cancel
            </button>
          </div>
          <input
            className="input text-sm mb-2"
            placeholder="Route name *"
            value={routeName}
            onChange={e => setRouteName(e.target.value)}
          />
          <input
            className="input text-sm mb-2"
            placeholder="Notes"
            value={routeNotes}
            onChange={e => setRouteNotes(e.target.value)}
          />
          <select
            className="input text-sm mb-3"
            value={routeAssignedTo}
            onChange={e => setRouteAssignedTo(e.target.value)}
          >
            <option value="">Unassigned</option>
            {members.map(m => (
              <option key={m.pubkey} value={m.pubkey}>{m.displayName}</option>
            ))}
          </select>
          <button
            className="btn-primary w-full text-sm"
            onClick={handleSaveRoute}
            disabled={savingRoute || !routeName.trim()}
          >
            {savingRoute ? 'Saving...' : 'Save Route'}
          </button>
        </div>
      )}

      {/* Bottom tabs — view mode only */}
      {mode === 'view' && (
        <div className="bg-forest-950 border-t border-forest-800 flex-shrink-0">
          <div className="flex border-b border-forest-900">
            <button
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === 'pins' ? 'text-forest-400 border-b-2 border-forest-400' : 'text-gray-500 hover:text-gray-400'
              }`}
              onClick={() => setActiveTab('pins')}
            >
              Pins ({pins.length})
            </button>
            <button
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === 'routes' ? 'text-forest-400 border-b-2 border-forest-400' : 'text-gray-500 hover:text-gray-400'
              }`}
              onClick={() => setActiveTab('routes')}
            >
              Routes ({routes.length})
            </button>
            <button
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === 'contacts' ? 'text-forest-400 border-b-2 border-forest-400' : 'text-gray-500 hover:text-gray-400'
              }`}
              onClick={() => setActiveTab('contacts')}
            >
              Contacts ({contacts.filter(c => c.lat != null).length})
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto">
            {activeTab === 'pins' && (
              pins.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No pins yet{canEdit ? ' — tap Edit to add one' : ''}
                </p>
              ) : (
                pins.map(pin => (
                  <div
                    key={pin.id}
                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-forest-900 last:border-0 cursor-pointer ${
                      selectedPinId === pin.id ? 'bg-forest-900/50' : 'hover:bg-forest-900/30'
                    }`}
                    onClick={() => setSelectedPinId(prev => prev === pin.id ? null : pin.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 font-medium truncate">{pin.label}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {PIN_ASSET_LABELS[pin.assetType]}{pin.notes ? ` · ${pin.notes}` : ''}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        className="text-base text-danger-400 hover:text-danger-300 flex-shrink-0 px-1"
                        onClick={e => { e.stopPropagation(); void deletePin(tribeId, pin.id) }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))
              )
            )}

            {activeTab === 'routes' && (
              routes.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No routes yet{canEdit ? ' — tap Edit to add one' : ''}
                </p>
              ) : (
                routes.map(route => {
                  const assignedMember = route.assignedTo
                    ? members.find(m => m.pubkey === route.assignedTo)
                    : null
                  return (
                    <div
                      key={route.id}
                      className={`flex items-center gap-3 px-4 py-2.5 border-b border-forest-900 last:border-0 cursor-pointer ${
                        selectedRouteId === route.id ? 'bg-forest-900/50' : 'hover:bg-forest-900/30'
                      }`}
                      onClick={() => setSelectedRouteId(prev => prev === route.id ? null : route.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 font-medium truncate">{route.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {assignedMember ? assignedMember.displayName : 'Unassigned'}
                          {route.notes ? ` · ${route.notes}` : ''}
                        </p>
                      </div>
                      {canEdit && (
                        <button
                          className="text-base text-danger-400 hover:text-danger-300 flex-shrink-0 px-1"
                          onClick={e => { e.stopPropagation(); void deletePatrolRoute(tribeId, route.id) }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })
              )
            )}

            {activeTab === 'contacts' && (
              contacts.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No contacts with map pins — add lat/lng in Contacts
                </p>
              ) : (
                contacts.filter(c => c.lat != null && c.lng != null).length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">
                    No contacts have coordinates — edit contacts to add lat/lng
                  </p>
                ) : (
                  contacts
                    .filter(c => c.lat != null && c.lng != null)
                    .map(c => (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-2.5 border-b border-forest-900 last:border-0 cursor-pointer ${
                          selectedContactId === c.id ? 'bg-forest-900/50' : 'hover:bg-forest-900/30'
                        }`}
                        onClick={() => setSelectedContactId(prev => prev === c.id ? null : c.id)}
                      >
                        <span className="text-base flex-shrink-0">{CONTACT_CATEGORY_ICONS[c.category]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 font-medium truncate">{c.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {c.role ?? c.category}
                          </p>
                        </div>
                      </div>
                    ))
                )
              )
            )}
          </div>
        </div>
      )}

      {/* Offline download modal */}
      {showDownloadModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end justify-center z-[2000]"
          onClick={e => { if (e.target === e.currentTarget) setShowDownloadModal(false) }}
        >
          <div className="bg-forest-950 border border-forest-700 rounded-t-2xl w-full max-w-md px-6 pt-5 pb-8">
            <h3 className="text-gray-100 font-semibold mb-1">Download for Offline Use</h3>
            <p className="text-xs text-gray-400 mb-4">
              Saves current map view tiles at zoom levels 12–17.
              {storedCount > 0 ? ` ${storedCount} tiles cached.` : ''}
            </p>

            {downloading && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Downloading tiles...</span>
                  <span>{downloadProgress.loaded} / {downloadProgress.total}</span>
                </div>
                <div className="h-2 bg-forest-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-forest-500 transition-all duration-200 rounded-full"
                    style={{
                      width: downloadProgress.total > 0
                        ? `${Math.round((downloadProgress.loaded / downloadProgress.total) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            )}

            {downloadComplete && (
              <p className="text-forest-400 text-sm mb-4">Map available offline</p>
            )}

            <div className="flex gap-2">
              {!downloading && !downloadComplete && (
                <button
                  className="btn-primary flex-1"
                  onClick={handleStartDownload}
                  disabled={!tileLayerRef.current}
                >
                  Download Region
                </button>
              )}
              <button
                className="btn-secondary flex-1"
                onClick={() => { setShowDownloadModal(false); setDownloadComplete(false) }}
              >
                {downloadComplete ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
