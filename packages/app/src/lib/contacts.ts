import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { addPendingSync } from './sync-queue'
import { getOfflineSince } from './offline-tracker'
import { convexWrite } from './sync-adapter'
import type { ExternalContact, ContactCategory } from '@plus-ultra/core'

// ─── Gun SEA-safe helpers (inlined per project convention) ────────────────────

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

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function addContact(
  tribeId: string,
  fields: Omit<ExternalContact, 'id' | 'tribeId' | 'addedAt'>,
  _addedBy: string
): Promise<ExternalContact> {
  const contact: ExternalContact = {
    id: nanoid(),
    tribeId,
    addedAt: Date.now(),
    ...fields,
  }

  const db = await getDB()
  await db.put('external-contacts', contact, `${tribeId}:${contact.id}`)
  void convexWrite('contacts.upsert', { contactId: contact.id, tribeId, name: contact.name, category: contact.category, role: contact.role, phone: contact.phone, radioFreq: contact.radioFreq, lat: contact.lat, lng: contact.lng, location: contact.location, notes: contact.notes, addedBy: contact.addedBy ?? '', addedAt: contact.addedAt, lastVerified: contact.lastVerified })

  const contactPayload = gunEscape(contact as unknown as Record<string, unknown>)
  gun
    .get('tribes').get(tribeId)
    .get('external-contacts').get(contact.id)
    .put(contactPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `external-contacts:${tribeId}:${contact.id}:${Date.now()}`,
      gunStore: 'external-contacts', tribeId, recordKey: contact.id,
      payload: contactPayload,
      convexMutation: 'contacts.upsert',
      convexArgs: { contactId: contact.id, tribeId, name: contact.name, category: contact.category, role: contact.role, phone: contact.phone, radioFreq: contact.radioFreq, lat: contact.lat, lng: contact.lng, location: contact.location, notes: contact.notes, addedBy: contact.addedBy ?? '', addedAt: contact.addedAt, lastVerified: contact.lastVerified },
      queuedAt: Date.now(),
    })
  }

  return contact
}

export async function updateContact(
  tribeId: string,
  contactId: string,
  patch: Partial<ExternalContact>
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('external-contacts', `${tribeId}:${contactId}`)
  if (!existing) return

  const updated = { ...(existing as ExternalContact), ...patch }
  await db.put('external-contacts', updated, `${tribeId}:${contactId}`)
  void convexWrite('contacts.upsert', { contactId, tribeId, name: updated.name, category: updated.category, role: updated.role, phone: updated.phone, radioFreq: updated.radioFreq, lat: updated.lat, lng: updated.lng, location: updated.location, notes: updated.notes, addedBy: updated.addedBy ?? '', addedAt: updated.addedAt, lastVerified: updated.lastVerified })

  const updatePayload = gunEscape(updated as unknown as Record<string, unknown>)
  gun
    .get('tribes').get(tribeId)
    .get('external-contacts').get(contactId)
    .put(updatePayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `external-contacts:${tribeId}:${contactId}:${Date.now()}`,
      gunStore: 'external-contacts', tribeId, recordKey: contactId,
      payload: updatePayload,
      convexMutation: 'contacts.upsert',
      convexArgs: { contactId, tribeId, name: updated.name, category: updated.category, role: updated.role, phone: updated.phone, radioFreq: updated.radioFreq, lat: updated.lat, lng: updated.lng, location: updated.location, notes: updated.notes, addedBy: updated.addedBy ?? '', addedAt: updated.addedAt, lastVerified: updated.lastVerified },
      queuedAt: Date.now(),
    })
  }
}

export async function deleteContact(tribeId: string, contactId: string): Promise<void> {
  const db = await getDB()
  await db.delete('external-contacts', `${tribeId}:${contactId}`)

  gun
    .get('tribes').get(tribeId)
    .get('external-contacts').get(contactId)
    .put(null)
}

export async function markVerified(tribeId: string, contactId: string): Promise<void> {
  await updateContact(tribeId, contactId, { lastVerified: Date.now() })
}

// ─── Subscription ─────────────────────────────────────────────────────────────

function parseContact(d: Record<string, unknown>, tribeId: string): ExternalContact | null {
  if (!d.id || !d.name || !d.category) return null
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    name: d.name as string,
    category: d.category as ContactCategory,
    role: (d.role as string) || undefined,
    phone: (d.phone as string) || undefined,
    radioFreq: (d.radioFreq as string) || undefined,
    lat: (d.lat as number) || undefined,
    lng: (d.lng as number) || undefined,
    location: (d.location as string) || undefined,
    notes: (d.notes as string) || undefined,
    addedBy: (d.addedBy as string) ?? '',
    addedAt: (d.addedAt as number) ?? 0,
    lastVerified: (d.lastVerified as number) || undefined,
  }
}

export function subscribeToContacts(
  tribeId: string,
  callback: (contacts: ExternalContact[]) => void
): () => void {
  const contactsMap = new Map<string, ExternalContact>()

  // Seed from IDB
  getDB().then(db => db.getAllKeys('external-contacts')).then(async allKeys => {
    const db = await getDB()
    const prefix = `${tribeId}:`
    for (const k of allKeys) {
      if (!String(k).startsWith(prefix)) continue
      const c = await db.get('external-contacts', k)
      if (c) {
        const contact = c as ExternalContact
        if (contact.id) contactsMap.set(contact.id, contact)
      }
    }
    if (contactsMap.size > 0) callback(Array.from(contactsMap.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('external-contacts')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      contactsMap.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const c = parseContact(raw, tribeId)
      if (c) {
        contactsMap.set(key, c)
        getDB().then(db => db.put('external-contacts', c, `${tribeId}:${key}`))
      }
    }
    callback(Array.from(contactsMap.values()))
  }

  ref.map().once(handle)
  ref.map().on(handle)

  const poll = setInterval(() => ref.map().once(handle), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}
