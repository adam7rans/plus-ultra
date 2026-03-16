import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import { convexWrite } from './sync-adapter'
import type { TribeDoc, DocCategory, DocStatus } from '@plus-ultra/core'

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

// ─── Parse helper ─────────────────────────────────────────────────────────────

function parseDoc(d: Record<string, unknown>, tribeId: string): TribeDoc | null {
  if (!d.id || !d.title) return null
  let linkedRoles: string[] = []
  let tags: string[] = []
  try { linkedRoles = JSON.parse((d.linkedRolesJson as string) ?? '[]') } catch { /* ignore */ }
  try { tags = JSON.parse((d.tagsJson as string) ?? '[]') } catch { /* ignore */ }
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    title: d.title as string,
    category: (d.category as DocCategory) ?? 'other',
    status: (d.status as DocStatus) ?? 'draft',
    content: (d.content as string) ?? '',
    version: (d.version as number) ?? 1,
    authorPub: (d.authorPub as string) ?? '',
    approvedBy: (d.approvedBy as string) || undefined,
    createdAt: (d.createdAt as number) ?? 0,
    updatedAt: (d.updatedAt as number) ?? 0,
    approvedAt: (d.approvedAt as number) || undefined,
    linkedRoles,
    tags,
  }
}

function toGunRecord(doc: TribeDoc): Record<string, unknown> {
  const { linkedRoles, tags, ...rest } = doc
  return {
    ...rest,
    linkedRolesJson: JSON.stringify(linkedRoles ?? []),
    tagsJson: JSON.stringify(tags ?? []),
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createDoc(
  tribeId: string,
  fields: {
    title: string
    category: DocCategory
    content: string
    tags?: string[]
    linkedRoles?: string[]
  },
  authorPub: string
): Promise<string> {
  const id = nanoid()
  const now = Date.now()
  const doc: TribeDoc = {
    id,
    tribeId,
    title: fields.title,
    category: fields.category,
    status: 'draft',
    content: fields.content,
    version: 1,
    authorPub,
    createdAt: now,
    updatedAt: now,
    tags: fields.tags ?? [],
    linkedRoles: fields.linkedRoles ?? [],
  }

  const db = await getDB()
  await db.put('tribe-docs', doc, `${tribeId}:${id}`)
  void convexWrite('docs.upsert', { docId: id, tribeId, title: fields.title, category: fields.category, status: 'draft', content: fields.content, version: 1, authorPub, createdAt: now, updatedAt: now, linkedRoles: fields.linkedRoles, tags: fields.tags })
  const docPayload = gunEscape(toGunRecord(doc))
  gun.get('tribes').get(tribeId).get('docs').get(id)
    .put(docPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `docs:${tribeId}:${id}:${Date.now()}`,
      gunStore: 'docs', tribeId, recordKey: id,
      payload: docPayload,
      convexMutation: 'docs.upsert',
      convexArgs: { docId: id, tribeId, title: fields.title, category: fields.category, status: 'draft', content: fields.content, version: 1, authorPub, createdAt: now, updatedAt: now, linkedRoles: fields.linkedRoles, tags: fields.tags },
      queuedAt: Date.now(),
    })
  }

  return id
}

export async function updateDoc(
  tribeId: string,
  docId: string,
  patch: Partial<Pick<TribeDoc, 'title' | 'category' | 'content' | 'tags' | 'linkedRoles'>>
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('tribe-docs', `${tribeId}:${docId}`)
  if (!existing) return

  const doc = existing as TribeDoc
  const updated: TribeDoc = {
    ...doc,
    ...patch,
    version: doc.version + 1,
    // If doc was active, bump back to draft on content edit
    status: doc.status === 'active' ? 'draft' : doc.status,
    updatedAt: Date.now(),
  }

  await db.put('tribe-docs', updated, `${tribeId}:${docId}`)
  void convexWrite('docs.upsert', { docId, tribeId, title: updated.title, category: updated.category, status: updated.status, content: updated.content, version: updated.version, authorPub: updated.authorPub, approvedBy: updated.approvedBy, createdAt: updated.createdAt, updatedAt: updated.updatedAt, approvedAt: updated.approvedAt, linkedRoles: updated.linkedRoles, tags: updated.tags })
  const updateDocPayload = gunEscape(toGunRecord(updated))
  gun.get('tribes').get(tribeId).get('docs').get(docId)
    .put(updateDocPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `docs:${tribeId}:${docId}:${Date.now()}`,
      gunStore: 'docs', tribeId, recordKey: docId,
      payload: updateDocPayload,
      convexMutation: 'docs.upsert',
      convexArgs: { docId, tribeId, title: updated.title, category: updated.category, status: updated.status, content: updated.content, version: updated.version, authorPub: updated.authorPub, approvedBy: updated.approvedBy, createdAt: updated.createdAt, updatedAt: updated.updatedAt, approvedAt: updated.approvedAt, linkedRoles: updated.linkedRoles, tags: updated.tags },
      queuedAt: Date.now(),
    })
  }
}

export async function approveDoc(
  tribeId: string,
  docId: string,
  approverPub: string
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('tribe-docs', `${tribeId}:${docId}`)
  if (!existing) return

  const doc = existing as TribeDoc
  const updated: TribeDoc = {
    ...doc,
    status: 'active',
    approvedBy: approverPub,
    approvedAt: Date.now(),
    updatedAt: Date.now(),
  }

  await db.put('tribe-docs', updated, `${tribeId}:${docId}`)
  void convexWrite('docs.upsert', { docId, tribeId, title: updated.title, category: updated.category, status: updated.status, content: updated.content, version: updated.version, authorPub: updated.authorPub, approvedBy: updated.approvedBy, createdAt: updated.createdAt, updatedAt: updated.updatedAt, approvedAt: updated.approvedAt, linkedRoles: updated.linkedRoles, tags: updated.tags })
  const approveDocPayload = gunEscape(toGunRecord(updated))
  gun.get('tribes').get(tribeId).get('docs').get(docId)
    .put(approveDocPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `docs:${tribeId}:${docId}:${Date.now()}`,
      gunStore: 'docs', tribeId, recordKey: docId,
      payload: approveDocPayload,
      convexMutation: 'docs.upsert',
      convexArgs: { docId, tribeId, title: updated.title, category: updated.category, status: updated.status, content: updated.content, version: updated.version, authorPub: updated.authorPub, approvedBy: updated.approvedBy, createdAt: updated.createdAt, updatedAt: updated.updatedAt, approvedAt: updated.approvedAt, linkedRoles: updated.linkedRoles, tags: updated.tags },
      queuedAt: Date.now(),
    })
  }
}

export async function archiveDoc(tribeId: string, docId: string): Promise<void> {
  const db = await getDB()
  const existing = await db.get('tribe-docs', `${tribeId}:${docId}`)
  if (!existing) return

  const doc = existing as TribeDoc
  const updated: TribeDoc = {
    ...doc,
    status: 'archived',
    updatedAt: Date.now(),
  }

  await db.put('tribe-docs', updated, `${tribeId}:${docId}`)
  void convexWrite('docs.upsert', { docId, tribeId, title: updated.title, category: updated.category, status: 'archived', content: updated.content, version: updated.version, authorPub: updated.authorPub, createdAt: updated.createdAt, updatedAt: updated.updatedAt, linkedRoles: updated.linkedRoles, tags: updated.tags })
  const archiveDocPayload = gunEscape(toGunRecord(updated))
  gun.get('tribes').get(tribeId).get('docs').get(docId)
    .put(archiveDocPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `docs:${tribeId}:${docId}:${Date.now()}`,
      gunStore: 'docs', tribeId, recordKey: docId,
      payload: archiveDocPayload,
      convexMutation: 'docs.upsert',
      convexArgs: { docId, tribeId, title: updated.title, category: updated.category, status: 'archived', content: updated.content, version: updated.version, authorPub: updated.authorPub, createdAt: updated.createdAt, updatedAt: updated.updatedAt, linkedRoles: updated.linkedRoles, tags: updated.tags },
      queuedAt: Date.now(),
    })
  }
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export function subscribeToDocs(
  tribeId: string,
  callback: (docs: TribeDoc[]) => void
): () => void {
  const map = new Map<string, TribeDoc>()

  getDB().then(async db => {
    const all = await db.getAllKeys('tribe-docs')
    const prefix = `${tribeId}:`
    for (const k of all) {
      if (!String(k).startsWith(prefix)) continue
      const v = await db.get('tribe-docs', k)
      if (v) {
        const d = v as TribeDoc
        if (d.id) map.set(d.id, d)
      }
    }
    if (map.size > 0) callback(Array.from(map.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('docs')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      map.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const d = parseDoc(raw, tribeId)
      if (d) {
        map.set(key, d)
        getDB().then(db => db.put('tribe-docs', d, `${tribeId}:${key}`))
      }
    }
    callback(Array.from(map.values()))
  }

  ref.map().once(handle)
  ref.map().on(handle)
  const poll = setInterval(() => ref.map().once(handle), 5000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}
