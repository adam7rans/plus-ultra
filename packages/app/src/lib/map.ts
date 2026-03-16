import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import { convexWrite } from './sync-adapter'
import type { LatLng, TribeMapPin, PatrolRoute, TribeTerritory, PinAssetType } from '@plus-ultra/core'

// ─── Gun SEA-safe helpers (inlined per project convention) ───────────────────

function gunEscape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (typeof v === 'string' && v.startsWith('SEA{')) {
      out[k] = '~' + v
    } else {
      out[k] = v
    }
  }
  return out
}

function gunUnescape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.startsWith('~SEA{')) {
      out[k] = v.slice(1)
    } else {
      out[k] = v
    }
  }
  return out
}

// ─── Territory ───────────────────────────────────────────────────────────────

export async function saveTerritory(
  tribeId: string,
  polygon: LatLng[],
  updaterPub: string,
): Promise<void> {
  const territory: TribeTerritory = {
    tribeId,
    polygonJson: JSON.stringify(polygon),
    updatedAt: Date.now(),
    updatedBy: updaterPub,
  }
  const db = await getDB()
  await db.put('map-territory', territory, tribeId)
  void convexWrite('map.upsertTerritory', { tribeId, polygon, updatedAt: territory.updatedAt, updatedBy: updaterPub })
  const territoryPayload = gunEscape(territory as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('map-territory').put(territoryPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `map-territory:${tribeId}:${Date.now()}`,
      gunPath: ['tribes', tribeId, 'map-territory'],
      gunStore: 'map-territory', tribeId, recordKey: tribeId,
      payload: territoryPayload,
      convexMutation: 'map.upsertTerritory',
      convexArgs: { tribeId, polygon, updatedAt: territory.updatedAt, updatedBy: updaterPub },
      queuedAt: Date.now(),
    })
  }
}

// ─── Pins ─────────────────────────────────────────────────────────────────────

export async function addPin(
  tribeId: string,
  params: { assetType: PinAssetType; label: string; notes: string; lat: number; lng: number },
  authorPub: string,
): Promise<TribeMapPin> {
  const pin: TribeMapPin = {
    id: nanoid(),
    tribeId,
    assetType: params.assetType,
    label: params.label,
    notes: params.notes,
    lat: params.lat,
    lng: params.lng,
    createdBy: authorPub,
    createdAt: Date.now(),
  }
  const db = await getDB()
  await db.put('map-pins', pin, `${tribeId}:${pin.id}`)
  void convexWrite('map.upsertPin', { pinId: pin.id, tribeId, assetType: params.assetType, label: params.label, notes: params.notes, lat: params.lat, lng: params.lng, createdBy: authorPub, createdAt: pin.createdAt })
  const pinPayload = gunEscape(pin as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('map-pins').get(pin.id).put(pinPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `map-pins:${tribeId}:${pin.id}:${Date.now()}`,
      gunStore: 'map-pins', tribeId, recordKey: pin.id,
      payload: pinPayload,
      convexMutation: 'map.upsertPin',
      convexArgs: { pinId: pin.id, tribeId, assetType: params.assetType, label: params.label, notes: params.notes, lat: params.lat, lng: params.lng, createdBy: authorPub, createdAt: pin.createdAt },
      queuedAt: Date.now(),
    })
  }
  return pin
}

export async function updatePin(
  tribeId: string,
  pinId: string,
  updates: Partial<Pick<TribeMapPin, 'label' | 'notes' | 'lat' | 'lng'>>,
): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${pinId}`
  const existing = await db.get('map-pins', key) as TribeMapPin | undefined
  if (!existing) return
  const updated: TribeMapPin = { ...existing, ...updates }
  await db.put('map-pins', updated, key)
  void convexWrite('map.upsertPin', { pinId, tribeId, assetType: updated.assetType, label: updated.label, notes: updated.notes, lat: updated.lat, lng: updated.lng, createdBy: updated.createdBy, createdAt: updated.createdAt })
  const pinUpdatePayload = gunEscape(updates as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('map-pins').get(pinId).put(pinUpdatePayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `map-pins:${tribeId}:${pinId}:${Date.now()}`,
      gunStore: 'map-pins', tribeId, recordKey: pinId,
      payload: pinUpdatePayload,
      convexMutation: 'map.upsertPin',
      convexArgs: { pinId, tribeId, assetType: updated.assetType, label: updated.label, notes: updated.notes, lat: updated.lat, lng: updated.lng, createdBy: updated.createdBy, createdAt: updated.createdAt },
      queuedAt: Date.now(),
    })
  }
}

export async function deletePin(tribeId: string, pinId: string): Promise<void> {
  const db = await getDB()
  await db.delete('map-pins', `${tribeId}:${pinId}`)
  gun.get('tribes').get(tribeId).get('map-pins').get(pinId).put(null)
}

// ─── Patrol Routes ────────────────────────────────────────────────────────────

export async function addPatrolRoute(
  tribeId: string,
  params: {
    name: string
    waypointsJson: string
    notes: string
    assignedTo: string
    scheduleEventId: string
  },
  authorPub: string,
): Promise<PatrolRoute> {
  const route: PatrolRoute = {
    id: nanoid(),
    tribeId,
    name: params.name,
    waypointsJson: params.waypointsJson,
    notes: params.notes,
    assignedTo: params.assignedTo,
    scheduleEventId: params.scheduleEventId,
    createdBy: authorPub,
    createdAt: Date.now(),
  }
  const db = await getDB()
  await db.put('patrol-routes', route, `${tribeId}:${route.id}`)
  void convexWrite('map.upsertRoute', { routeId: route.id, tribeId, name: params.name, waypoints: params.waypointsJson, notes: params.notes, assignedTo: params.assignedTo, scheduleEventId: params.scheduleEventId, createdBy: authorPub, createdAt: route.createdAt })
  const routePayload = gunEscape(route as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('patrol-routes').get(route.id).put(routePayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `patrol-routes:${tribeId}:${route.id}:${Date.now()}`,
      gunStore: 'patrol-routes', tribeId, recordKey: route.id,
      payload: routePayload,
      convexMutation: 'map.upsertRoute',
      convexArgs: { routeId: route.id, tribeId, name: params.name, waypoints: params.waypointsJson, notes: params.notes, assignedTo: params.assignedTo, scheduleEventId: params.scheduleEventId, createdBy: authorPub, createdAt: route.createdAt },
      queuedAt: Date.now(),
    })
  }
  return route
}

export async function updatePatrolRoute(
  tribeId: string,
  routeId: string,
  updates: Partial<Pick<PatrolRoute, 'name' | 'notes' | 'assignedTo' | 'scheduleEventId' | 'waypointsJson'>>,
): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${routeId}`
  const existing = await db.get('patrol-routes', key) as PatrolRoute | undefined
  if (!existing) return
  const updated: PatrolRoute = { ...existing, ...updates }
  await db.put('patrol-routes', updated, key)
  void convexWrite('map.upsertRoute', { routeId, tribeId, name: updated.name, waypoints: updated.waypointsJson, notes: updated.notes, assignedTo: updated.assignedTo, scheduleEventId: updated.scheduleEventId, createdBy: updated.createdBy, createdAt: updated.createdAt })
  const routeUpdatePayload = gunEscape(updates as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('patrol-routes').get(routeId).put(routeUpdatePayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `patrol-routes:${tribeId}:${routeId}:${Date.now()}`,
      gunStore: 'patrol-routes', tribeId, recordKey: routeId,
      payload: routeUpdatePayload,
      convexMutation: 'map.upsertRoute',
      convexArgs: { routeId, tribeId, name: updated.name, waypoints: updated.waypointsJson, notes: updated.notes, assignedTo: updated.assignedTo, scheduleEventId: updated.scheduleEventId, createdBy: updated.createdBy, createdAt: updated.createdAt },
      queuedAt: Date.now(),
    })
  }
}

export async function deletePatrolRoute(tribeId: string, routeId: string): Promise<void> {
  const db = await getDB()
  await db.delete('patrol-routes', `${tribeId}:${routeId}`)
  gun.get('tribes').get(tribeId).get('patrol-routes').get(routeId).put(null)
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

function parsePin(d: Record<string, unknown>, tribeId: string): TribeMapPin | null {
  if (!d.id || !d.assetType) return null
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    assetType: d.assetType as PinAssetType,
    label: (d.label as string) ?? '',
    notes: (d.notes as string) ?? '',
    lat: (d.lat as number) ?? 0,
    lng: (d.lng as number) ?? 0,
    createdBy: (d.createdBy as string) ?? '',
    createdAt: (d.createdAt as number) ?? 0,
  }
}

function parseRoute(d: Record<string, unknown>, tribeId: string): PatrolRoute | null {
  if (!d.id || !d.name) return null
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    name: d.name as string,
    waypointsJson: (d.waypointsJson as string) ?? '[]',
    notes: (d.notes as string) ?? '',
    assignedTo: (d.assignedTo as string) ?? '',
    scheduleEventId: (d.scheduleEventId as string) ?? '',
    createdBy: (d.createdBy as string) ?? '',
    createdAt: (d.createdAt as number) ?? 0,
  }
}

function parseTerritory(d: Record<string, unknown>, tribeId: string): TribeTerritory | null {
  if (!d.polygonJson) return null
  return {
    tribeId: (d.tribeId as string) ?? tribeId,
    polygonJson: d.polygonJson as string,
    updatedAt: (d.updatedAt as number) ?? 0,
    updatedBy: (d.updatedBy as string) ?? '',
  }
}

export function subscribeToMapData(
  tribeId: string,
  cb: (data: { territory: TribeTerritory | null; pins: TribeMapPin[]; routes: PatrolRoute[] }) => void,
): () => void {
  let territory: TribeTerritory | null = null
  const pinsMap = new Map<string, TribeMapPin>()
  const routesMap = new Map<string, PatrolRoute>()

  function emit() {
    cb({ territory, pins: Array.from(pinsMap.values()), routes: Array.from(routesMap.values()) })
  }

  // Seed from IDB immediately
  getDB().then(async db => {
    const [rawTerritory, rawPins, rawRoutes] = await Promise.all([
      db.get('map-territory', tribeId),
      db.getAll('map-pins'),
      db.getAll('patrol-routes'),
    ])
    if (rawTerritory) territory = rawTerritory as TribeTerritory
    for (const raw of rawPins) {
      const p = raw as TribeMapPin
      if (p.tribeId === tribeId && p.id) pinsMap.set(p.id, p)
    }
    for (const raw of rawRoutes) {
      const r = raw as PatrolRoute
      if (r.tribeId === tribeId && r.id) routesMap.set(r.id, r)
    }
    emit()
  })

  // Territory — single node subscription
  const territoryRef = gun.get('tribes').get(tribeId).get('map-territory')
  function handleTerritory(data: unknown) {
    if (!data || typeof data !== 'object') return
    const raw = gunUnescape(data as Record<string, unknown>)
    const t = parseTerritory(raw, tribeId)
    if (t) {
      territory = t
      getDB().then(db => db.put('map-territory', t, tribeId))
      emit()
    }
  }
  territoryRef.once(handleTerritory)
  territoryRef.on(handleTerritory)

  // Pins
  const pinsRef = gun.get('tribes').get(tribeId).get('map-pins')
  function handlePin(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      pinsMap.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const pin = parsePin(raw, tribeId)
      if (pin) {
        pinsMap.set(key, pin)
        getDB().then(db => db.put('map-pins', pin, `${tribeId}:${key}`))
      }
    }
    emit()
  }
  pinsRef.map().once(handlePin)
  pinsRef.map().on(handlePin)

  // Patrol routes
  const routesRef = gun.get('tribes').get(tribeId).get('patrol-routes')
  function handleRoute(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      routesMap.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const route = parseRoute(raw, tribeId)
      if (route) {
        routesMap.set(key, route)
        getDB().then(db => db.put('patrol-routes', route, `${tribeId}:${key}`))
      }
    }
    emit()
  }
  routesRef.map().once(handleRoute)
  routesRef.map().on(handleRoute)

  // 2s poll fallback (same pattern as messaging.ts)
  const poll = setInterval(() => {
    pinsRef.map().once(handlePin)
    routesRef.map().once(handleRoute)
    territoryRef.once(handleTerritory)
  }, 2000)

  return () => {
    clearInterval(poll)
    pinsRef.map().off()
    routesRef.map().off()
    territoryRef.off()
  }
}
