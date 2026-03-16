import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./gun.js', () => {
  function chain(path: string[] = []): Record<string, unknown> {
    return {
      get(key: string) { return chain([...path, key]) },
      put(payload: unknown, ack?: (a: { err?: string }) => void) {
        ack?.({})
        return chain(path)
      },
      on() { return chain(path) },
      once() { return chain(path) },
      map() { return chain(path) },
      off() {},
    }
  }
  return { gun: chain() }
})

let _offlineSince: number | null = null
vi.mock('./offline-tracker.js', () => ({
  getOfflineSince: () => _offlineSince,
  setOfflineSince: (ts: number) => { _offlineSince = ts },
  clearOfflineSince: () => { _offlineSince = null },
  computeOfflineStage: () => 0,
}))

import { addContact, updateContact, deleteContact, markVerified } from './contacts.js'
import { getDB } from './db.js'
import type { ExternalContact } from '@plus-ultra/core'

// ── addContact ────────────────────────────────────────────────────────────────

describe('addContact', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes contact to external-contacts IDB store', async () => {
    const contact = await addContact(
      'tribe-1',
      { name: 'Dr. Smith', category: 'medical', addedBy: 'member-1' },
      'member-1'
    )

    const db = await getDB()
    const stored = await db.get('external-contacts', `tribe-1:${contact.id}`)
    expect(stored).toBeDefined()
    const e = stored as ExternalContact
    expect(e.name).toBe('Dr. Smith')
    expect(e.category).toBe('medical')
    expect(e.tribeId).toBe('tribe-1')
  })

  it('IDB key is tribeId:contactId', async () => {
    const contact = await addContact(
      'tribe-abc',
      { name: 'Jane Doe', category: 'medical', addedBy: 'member-1' },
      'member-1'
    )

    const db = await getDB()
    const stored = await db.get('external-contacts', `tribe-abc:${contact.id}`)
    expect(stored).toBeDefined()
  })

  it('auto-generates id and sets tribeId and addedAt', async () => {
    const before = Date.now()

    const contact = await addContact(
      'tribe-1',
      { name: 'Contact A', category: 'medical', addedBy: 'member-2' },
      'member-2'
    )

    expect(contact.id).toBeTruthy()
    expect(contact.tribeId).toBe('tribe-1')
    expect(contact.addedAt).toBeGreaterThanOrEqual(before)
  })

  it('stores all provided fields', async () => {
    const contact = await addContact(
      'tribe-1',
      {
        name: 'Field Test',
        category: 'medical',
        addedBy: 'member-1',
        role: 'surgeon',
        phone: '555-1234',
        notes: 'available 9-5',
      },
      'member-1'
    )

    const db = await getDB()
    const stored = await db.get('external-contacts', `tribe-1:${contact.id}`) as ExternalContact
    expect(stored.role).toBe('surgeon')
    expect(stored.phone).toBe('555-1234')
    expect(stored.notes).toBe('available 9-5')
  })

  it('queues pending-sync when offline', async () => {
    _offlineSince = Date.now() - 3000

    const contact = await addContact(
      'tribe-offline',
      { name: 'Offline Contact', category: 'medical', addedBy: 'member-1' },
      'member-1'
    )
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string; recordKey: string }
      return e.gunStore === 'external-contacts' &&
             e.tribeId === 'tribe-offline' &&
             e.recordKey === contact.id
    })
    expect(syncEntry).toBeDefined()

    _offlineSince = null
  })

  it('does not queue pending-sync when online', async () => {
    const contact = await addContact(
      'tribe-online',
      { name: 'Online Contact', category: 'medical', addedBy: 'member-1' },
      'member-1'
    )
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { recordKey: string }
      return e.recordKey === contact.id
    })
    expect(syncEntry).toBeUndefined()
  })
})

// ── updateContact ─────────────────────────────────────────────────────────────

describe('updateContact', () => {
  beforeEach(() => { _offlineSince = null })

  it('merges patch with existing contact', async () => {
    const contact = await addContact(
      'tribe-1',
      { name: 'Before Update', category: 'medical', addedBy: 'member-1' },
      'member-1'
    )

    await updateContact('tribe-1', contact.id, { name: 'After Update', notes: 'updated note' })

    const db = await getDB()
    const stored = await db.get('external-contacts', `tribe-1:${contact.id}`) as ExternalContact
    expect(stored.name).toBe('After Update')
    expect(stored.notes).toBe('updated note')
    expect(stored.category).toBe('medical') // unchanged field preserved
  })

  it('is a no-op when contact does not exist', async () => {
    await expect(
      updateContact('tribe-1', 'nonexistent-id', { name: 'Ghost' })
    ).resolves.toBeUndefined()
  })

  it('queues pending-sync when offline', async () => {
    const contact = await addContact(
      'tribe-update-offline',
      { name: 'Update Offline', category: 'medical', addedBy: 'member-1' },
      'member-1'
    )

    _offlineSince = Date.now() - 1000
    await updateContact('tribe-update-offline', contact.id, { notes: 'changed offline' })
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string; recordKey: string }
      return e.gunStore === 'external-contacts' &&
             e.tribeId === 'tribe-update-offline' &&
             e.recordKey === contact.id
    })
    expect(syncEntry).toBeDefined()

    _offlineSince = null
  })
})

// ── deleteContact ─────────────────────────────────────────────────────────────

describe('deleteContact', () => {
  beforeEach(() => { _offlineSince = null })

  it('removes contact from external-contacts IDB store', async () => {
    const contact = await addContact(
      'tribe-del',
      { name: 'To Delete', category: 'medical', addedBy: 'member-1' },
      'member-1'
    )

    const db = await getDB()
    const before = await db.get('external-contacts', `tribe-del:${contact.id}`)
    expect(before).toBeDefined()

    await deleteContact('tribe-del', contact.id)

    const after = await db.get('external-contacts', `tribe-del:${contact.id}`)
    expect(after).toBeUndefined()
  })

  it('is a no-op for non-existent contact', async () => {
    await expect(
      deleteContact('tribe-1', 'ghost-id')
    ).resolves.toBeUndefined()
  })
})

// ── markVerified ──────────────────────────────────────────────────────────────

describe('markVerified', () => {
  beforeEach(() => { _offlineSince = null })

  it('sets lastVerified on the contact', async () => {
    const contact = await addContact(
      'tribe-1',
      { name: 'Verify Me', category: 'medical', addedBy: 'member-1' },
      'member-1'
    )
    const before = Date.now()

    await markVerified('tribe-1', contact.id)

    const db = await getDB()
    const stored = await db.get('external-contacts', `tribe-1:${contact.id}`) as ExternalContact
    expect(stored.lastVerified).toBeDefined()
    expect(stored.lastVerified!).toBeGreaterThanOrEqual(before)
  })

  it('preserves all other fields when marking verified', async () => {
    const contact = await addContact(
      'tribe-1',
      { name: 'Keep Fields', category: 'medical', addedBy: 'member-1', notes: 'important' },
      'member-1'
    )

    await markVerified('tribe-1', contact.id)

    const db = await getDB()
    const stored = await db.get('external-contacts', `tribe-1:${contact.id}`) as ExternalContact
    expect(stored.name).toBe('Keep Fields')
    expect(stored.notes).toBe('important')
    expect(stored.category).toBe('medical')
  })

  it('is a no-op when contact does not exist', async () => {
    await expect(
      markVerified('tribe-1', 'nonexistent-id')
    ).resolves.toBeUndefined()
  })
})
