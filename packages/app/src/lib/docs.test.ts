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

import { createDoc, updateDoc, approveDoc, archiveDoc } from './docs.js'
import { getDB } from './db.js'
import type { TribeDoc } from '@plus-ultra/core'

// ── createDoc ─────────────────────────────────────────────────────────────────

describe('createDoc', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes doc to IDB tribe-docs store', async () => {
    const id = await createDoc('tribe-1', {
      title: 'Emergency Procedures',
      category: 'procedure',
      content: 'Step 1: ...',
    }, 'author-pub')

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-1:${id}`)
    expect(stored).toBeDefined()
    const doc = stored as TribeDoc
    expect(doc.id).toBe(id)
    expect(doc.tribeId).toBe('tribe-1')
    expect(doc.title).toBe('Emergency Procedures')
    expect(doc.authorPub).toBe('author-pub')
  })

  it('IDB key is tribeId:id', async () => {
    const id = await createDoc('tribe-key', {
      title: 'Test Doc',
      category: 'procedure',
      content: 'content',
    }, 'author-pub')

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-key:${id}`)
    expect(stored).toBeDefined()
  })

  it('initial status is draft', async () => {
    const id = await createDoc('tribe-draft', {
      title: 'Draft Doc',
      category: 'procedure',
      content: 'draft content',
    }, 'author-pub')

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-draft:${id}`) as TribeDoc
    expect(stored.status).toBe('draft')
  })

  it('initial version is 1', async () => {
    const id = await createDoc('tribe-v1', {
      title: 'Versioned Doc',
      category: 'procedure',
      content: 'v1 content',
    }, 'author-pub')

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-v1:${id}`) as TribeDoc
    expect(stored.version).toBe(1)
  })

  it('tags defaults to empty array', async () => {
    const id = await createDoc('tribe-tags', {
      title: 'No Tags Doc',
      category: 'procedure',
      content: 'content',
    }, 'author-pub')

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-tags:${id}`) as TribeDoc
    expect(Array.isArray(stored.tags)).toBe(true)
    expect(stored.tags).toHaveLength(0)
  })

  it('linkedRoles defaults to empty array', async () => {
    const id = await createDoc('tribe-roles', {
      title: 'No Roles Doc',
      category: 'procedure',
      content: 'content',
    }, 'author-pub')

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-roles:${id}`) as TribeDoc
    expect(Array.isArray(stored.linkedRoles)).toBe(true)
    expect(stored.linkedRoles).toHaveLength(0)
  })

  it('sets createdAt and updatedAt timestamps', async () => {
    const before = Date.now()
    const id = await createDoc('tribe-ts', {
      title: 'Timestamped Doc',
      category: 'procedure',
      content: 'content',
    }, 'author-pub')

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-ts:${id}`) as TribeDoc
    expect(stored.createdAt).toBeGreaterThanOrEqual(before)
    expect(stored.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('returns a non-empty string id', async () => {
    const id = await createDoc('tribe-id-check', {
      title: 'ID Check',
      category: 'procedure',
      content: 'content',
    }, 'author-pub')

    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
})

// ── updateDoc ─────────────────────────────────────────────────────────────────

describe('updateDoc', () => {
  beforeEach(() => { _offlineSince = null })

  it('increments version on update', async () => {
    const id = await createDoc('tribe-upd-ver', {
      title: 'Versioned',
      category: 'procedure',
      content: 'v1',
    }, 'author-pub')

    await updateDoc('tribe-upd-ver', id, { content: 'v2' })

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-upd-ver:${id}`) as TribeDoc
    expect(stored.version).toBe(2)
  })

  it('version increments again on second update', async () => {
    const id = await createDoc('tribe-upd-v3', {
      title: 'Multi-Version',
      category: 'procedure',
      content: 'v1',
    }, 'author-pub')

    await updateDoc('tribe-upd-v3', id, { content: 'v2' })
    await updateDoc('tribe-upd-v3', id, { content: 'v3' })

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-upd-v3:${id}`) as TribeDoc
    expect(stored.version).toBe(3)
  })

  it('active doc is demoted to draft on content edit', async () => {
    const id = await createDoc('tribe-demote', {
      title: 'Active Doc',
      category: 'procedure',
      content: 'approved content',
    }, 'author-pub')

    // Approve it first
    await approveDoc('tribe-demote', id, 'approver-pub')
    const db = await getDB()
    const approved = await db.get('tribe-docs', `tribe-demote:${id}`) as TribeDoc
    expect(approved.status).toBe('active')

    // Now edit — should demote back to draft
    await updateDoc('tribe-demote', id, { content: 'edited content' })

    const updated = await db.get('tribe-docs', `tribe-demote:${id}`) as TribeDoc
    expect(updated.status).toBe('draft')
  })

  it('updates updatedAt timestamp', async () => {
    const id = await createDoc('tribe-upd-ts', {
      title: 'Timestamp Test',
      category: 'procedure',
      content: 'original',
    }, 'author-pub')

    const before = Date.now()
    await updateDoc('tribe-upd-ts', id, { title: 'Updated Title' })

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-upd-ts:${id}`) as TribeDoc
    expect(stored.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('applies title patch', async () => {
    const id = await createDoc('tribe-upd-title', {
      title: 'Old Title',
      category: 'procedure',
      content: 'content',
    }, 'author-pub')

    await updateDoc('tribe-upd-title', id, { title: 'New Title' })

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-upd-title:${id}`) as TribeDoc
    expect(stored.title).toBe('New Title')
  })

  it('is a no-op if doc not found', async () => {
    await expect(
      updateDoc('tribe-missing', 'nonexistent-id', { title: 'Ghost' })
    ).resolves.toBeUndefined()
  })
})

// ── approveDoc ────────────────────────────────────────────────────────────────

describe('approveDoc', () => {
  beforeEach(() => { _offlineSince = null })

  it('sets status to active', async () => {
    const id = await createDoc('tribe-approve', {
      title: 'Pending Doc',
      category: 'procedure',
      content: 'content',
    }, 'author-pub')

    await approveDoc('tribe-approve', id, 'approver-pub')

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-approve:${id}`) as TribeDoc
    expect(stored.status).toBe('active')
  })

  it('sets approvedBy to approverPub', async () => {
    const id = await createDoc('tribe-approved-by', {
      title: 'Doc',
      category: 'procedure',
      content: 'content',
    }, 'author-pub')

    await approveDoc('tribe-approved-by', id, 'approver-xyz')

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-approved-by:${id}`) as TribeDoc
    expect(stored.approvedBy).toBe('approver-xyz')
  })

  it('sets approvedAt timestamp', async () => {
    const before = Date.now()
    const id = await createDoc('tribe-approved-at', {
      title: 'Doc',
      category: 'procedure',
      content: 'content',
    }, 'author-pub')

    await approveDoc('tribe-approved-at', id, 'approver-pub')

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-approved-at:${id}`) as TribeDoc
    expect(stored.approvedAt).toBeGreaterThanOrEqual(before)
  })

  it('is a no-op if doc not found', async () => {
    await expect(
      approveDoc('tribe-missing', 'nonexistent-id', 'approver-pub')
    ).resolves.toBeUndefined()
  })
})

// ── archiveDoc ────────────────────────────────────────────────────────────────

describe('archiveDoc', () => {
  beforeEach(() => { _offlineSince = null })

  it('sets status to archived', async () => {
    const id = await createDoc('tribe-archive', {
      title: 'To Archive',
      category: 'procedure',
      content: 'content',
    }, 'author-pub')

    await archiveDoc('tribe-archive', id)

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-archive:${id}`) as TribeDoc
    expect(stored.status).toBe('archived')
  })

  it('can archive an active doc', async () => {
    const id = await createDoc('tribe-archive-active', {
      title: 'Active To Archive',
      category: 'procedure',
      content: 'content',
    }, 'author-pub')

    await approveDoc('tribe-archive-active', id, 'approver-pub')
    await archiveDoc('tribe-archive-active', id)

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-archive-active:${id}`) as TribeDoc
    expect(stored.status).toBe('archived')
  })

  it('preserves other fields when archiving', async () => {
    const id = await createDoc('tribe-archive-preserve', {
      title: 'Preserve Fields',
      category: 'procedure',
      content: 'important content',
    }, 'original-author')

    await archiveDoc('tribe-archive-preserve', id)

    const db = await getDB()
    const stored = await db.get('tribe-docs', `tribe-archive-preserve:${id}`) as TribeDoc
    expect(stored.title).toBe('Preserve Fields')
    expect(stored.authorPub).toBe('original-author')
    expect(stored.content).toBe('important content')
  })
})
