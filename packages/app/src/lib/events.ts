import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import type { ScheduledEvent, EventType, RecurrenceRule } from '@plus-ultra/core'

export async function createEvent(
  tribeId: string,
  createdBy: string,
  params: {
    type: EventType
    title: string
    description: string
    startAt: number
    durationMin: number
    recurrence: RecurrenceRule
    assignedTo: string[]
    location: string
  }
): Promise<ScheduledEvent> {
  const event: ScheduledEvent = {
    id: nanoid(),
    tribeId,
    type: params.type,
    title: params.title,
    description: params.description,
    startAt: params.startAt,
    durationMin: params.durationMin,
    recurrence: params.recurrence,
    createdBy,
    createdAt: Date.now(),
    assignedTo: params.assignedTo,
    location: params.location,
    cancelled: false,
  }

  // IDB first (source of truth)
  const db = await getDB()
  await db.put('events', event, `${tribeId}:${event.id}`)

  // Gun for P2P sync (fire and forget)
  // Strip undefined values and flatten for Gun
  const gunData: Record<string, unknown> = { ...event }
  gunData.assignedTo = JSON.stringify(event.assignedTo)
  gunData.recurrence = JSON.stringify(event.recurrence)
  for (const [k, v] of Object.entries(gunData)) {
    if (v === undefined) delete gunData[k]
  }

  gun
    .get('tribes')
    .get(tribeId)
    .get('events')
    .get(event.id)
    .put(gunData as unknown as Record<string, unknown>)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `events:${tribeId}:${event.id}:${Date.now()}`,
      gunStore: 'events', tribeId, recordKey: event.id,
      payload: gunData,
      queuedAt: Date.now(),
    })
  }

  return event
}

export async function updateEvent(
  tribeId: string,
  eventId: string,
  updates: Partial<Pick<ScheduledEvent, 'type' | 'title' | 'description' | 'startAt' | 'durationMin' | 'recurrence' | 'assignedTo' | 'location'>>,
): Promise<ScheduledEvent | null> {
  const db = await getDB()
  const existing = await db.get('events', `${tribeId}:${eventId}`)
  if (!existing) return null

  const updated: ScheduledEvent = { ...(existing as ScheduledEvent), ...updates }
  await db.put('events', updated, `${tribeId}:${eventId}`)

  // Gun sync (fire and forget)
  const gunData: Record<string, unknown> = { ...updates }
  if (updates.assignedTo) gunData.assignedTo = JSON.stringify(updates.assignedTo)
  if (updates.recurrence) gunData.recurrence = JSON.stringify(updates.recurrence)
  for (const [k, v] of Object.entries(gunData)) {
    if (v === undefined) delete gunData[k]
  }

  gun
    .get('tribes')
    .get(tribeId)
    .get('events')
    .get(eventId)
    .put(gunData as unknown as Record<string, unknown>)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `events:${tribeId}:${eventId}:${Date.now()}`,
      gunStore: 'events', tribeId, recordKey: eventId,
      payload: gunData,
      queuedAt: Date.now(),
    })
  }

  return updated
}

export async function deleteEvent(
  tribeId: string,
  eventId: string,
): Promise<void> {
  const db = await getDB()
  await db.delete('events', `${tribeId}:${eventId}`)

  // Gun: set to null to signal deletion
  gun
    .get('tribes')
    .get(tribeId)
    .get('events')
    .get(eventId)
    .put(null as unknown as Record<string, unknown>)
}

export async function cancelEvent(
  tribeId: string,
  eventId: string,
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('events', `${tribeId}:${eventId}`)
  if (existing) {
    const updated = { ...(existing as ScheduledEvent), cancelled: true }
    await db.put('events', updated, `${tribeId}:${eventId}`)
  }

  gun
    .get('tribes')
    .get(tribeId)
    .get('events')
    .get(eventId)
    .put({ cancelled: true } as unknown as Record<string, unknown>)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `events:${tribeId}:${eventId}:${Date.now()}`,
      gunStore: 'events', tribeId, recordKey: eventId,
      payload: { cancelled: true },
      queuedAt: Date.now(),
    })
  }
}

export function subscribeToEvents(
  tribeId: string,
  callback: (events: ScheduledEvent[]) => void
): () => void {
  const eventsMap = new Map<string, ScheduledEvent>()

  // Seed from IDB immediately
  getDB().then(db => db.getAll('events')).then(all => {
    for (const raw of all) {
      const event = raw as ScheduledEvent
      if (event.tribeId === tribeId && event.id) {
        eventsMap.set(event.id, event)
      }
    }
    if (eventsMap.size > 0) callback(Array.from(eventsMap.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('events')

  function handleEvent(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      eventsMap.delete(key)
    } else {
      const d = data as Record<string, unknown>
      if (d.id && d.type && d.title) {
        // Parse stringified arrays back
        let assignedTo: string[] = []
        let recurrence: RecurrenceRule = { frequency: 'once' }
        try {
          assignedTo = typeof d.assignedTo === 'string' ? JSON.parse(d.assignedTo) : (d.assignedTo as string[] ?? [])
        } catch { /* empty */ }
        try {
          recurrence = typeof d.recurrence === 'string' ? JSON.parse(d.recurrence) : (d.recurrence as RecurrenceRule ?? { frequency: 'once' })
        } catch { /* empty */ }

        const event: ScheduledEvent = {
          id: d.id as string,
          tribeId: (d.tribeId as string) ?? tribeId,
          type: d.type as EventType,
          title: d.title as string,
          description: (d.description as string) ?? '',
          startAt: (d.startAt as number) ?? 0,
          durationMin: (d.durationMin as number) ?? 60,
          recurrence,
          createdBy: (d.createdBy as string) ?? '',
          createdAt: (d.createdAt as number) ?? 0,
          assignedTo,
          location: (d.location as string) ?? '',
          cancelled: (d.cancelled as boolean) ?? false,
        }
        const local = eventsMap.get(key)
        if (!local || (event.createdAt ?? 0) >= (local.createdAt ?? 0)) {
          eventsMap.set(key, event)
          // Persist Gun-received events to IDB
          getDB().then(db => db.put('events', event, `${tribeId}:${key}`))
        }
      }
    }
    callback(Array.from(eventsMap.values()))
  }

  ref.map().once(handleEvent)
  ref.map().on(handleEvent)
  const poll = setInterval(() => ref.map().once(handleEvent), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}
