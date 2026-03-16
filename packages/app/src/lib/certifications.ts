import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import type { MemberCertification, SkillRole } from '@plus-ultra/core'
import { approveLevelUp } from './training'

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

// ─── CRUD ────────────────────────────────────────────────────────────────────

export interface AddCertParams {
  certName: string
  issuingBody: string
  licenseNumber: string
  issuedAt: number
  expiresAt: number
  linkedRole: SkillRole | null
}

export async function addCertification(
  tribeId: string,
  memberId: string,
  params: AddCertParams,
  addedBy: string
): Promise<MemberCertification> {
  const cert: MemberCertification = {
    id: nanoid(),
    tribeId,
    memberId,
    certName: params.certName,
    issuingBody: params.issuingBody,
    licenseNumber: params.licenseNumber,
    issuedAt: params.issuedAt,
    expiresAt: params.expiresAt,
    linkedRole: params.linkedRole,
    verifiedBy: '',
    verifiedAt: 0,
    addedBy,
    addedAt: Date.now(),
  }

  const db = await getDB()
  await db.put('certifications', cert, `${tribeId}:${memberId}:${cert.id}`)

  const gunPayload = gunEscape({
    ...cert,
    linkedRole: cert.linkedRole ?? '',
  } as unknown as Record<string, unknown>)

  gun.get('tribes').get(tribeId).get('certifications').get(cert.id).put(gunPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `certifications:${tribeId}:${cert.id}:${Date.now()}`,
      gunStore: 'certifications', tribeId, recordKey: cert.id,
      payload: gunPayload,
      queuedAt: Date.now(),
    })
  }

  return cert
}

export async function updateCertification(
  tribeId: string,
  certId: string,
  memberId: string,
  patch: Partial<Omit<MemberCertification, 'id' | 'tribeId' | 'memberId' | 'addedBy' | 'addedAt'>>
): Promise<void> {
  const db = await getDB()
  const existing = (await db.get('certifications', `${tribeId}:${memberId}:${certId}`)) as MemberCertification | undefined
  if (!existing) return

  const updated: MemberCertification = { ...existing, ...patch }
  await db.put('certifications', updated, `${tribeId}:${memberId}:${certId}`)

  const gunPayload = gunEscape({
    ...updated,
    linkedRole: updated.linkedRole ?? '',
  } as unknown as Record<string, unknown>)

  gun.get('tribes').get(tribeId).get('certifications').get(certId).put(gunPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `certifications:${tribeId}:${certId}:${Date.now()}`,
      gunStore: 'certifications', tribeId, recordKey: certId,
      payload: gunPayload,
      queuedAt: Date.now(),
    })
  }
}

export async function verifyCertification(
  tribeId: string,
  certId: string,
  memberId: string,
  verifierPub: string
): Promise<void> {
  const db = await getDB()
  const existing = (await db.get('certifications', `${tribeId}:${memberId}:${certId}`)) as MemberCertification | undefined
  if (!existing) return

  const updated: MemberCertification = {
    ...existing,
    verifiedBy: verifierPub,
    verifiedAt: Date.now(),
  }

  await db.put('certifications', updated, `${tribeId}:${memberId}:${certId}`)

  const gunPayload = gunEscape({
    ...updated,
    linkedRole: updated.linkedRole ?? '',
  } as unknown as Record<string, unknown>)

  gun.get('tribes').get(tribeId).get('certifications').get(certId).put(gunPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `certifications:${tribeId}:${certId}:${Date.now()}`,
      gunStore: 'certifications', tribeId, recordKey: certId,
      payload: gunPayload,
      queuedAt: Date.now(),
    })
  }

  // Auto-elevate to verified_expert if cert links to a role
  if (existing.linkedRole !== null) {
    await approveLevelUp(tribeId, memberId, existing.linkedRole, 'verified_expert', verifierPub)
  }
}

export async function deleteCertification(
  tribeId: string,
  certId: string,
  memberId: string
): Promise<void> {
  const db = await getDB()
  await db.delete('certifications', `${tribeId}:${memberId}:${certId}`)
  gun.get('tribes').get(tribeId).get('certifications').get(certId).put(null as unknown as Record<string, unknown>)
}

// ─── Subscription ─────────────────────────────────────────────────────────────

function parseCert(d: Record<string, unknown>, tribeId: string): MemberCertification | null {
  if (!d.id || !d.certName || !d.memberId) return null
  const rawRole = d.linkedRole as string | undefined
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    memberId: d.memberId as string,
    certName: d.certName as string,
    issuingBody: (d.issuingBody as string) ?? '',
    licenseNumber: (d.licenseNumber as string) ?? '',
    issuedAt: (d.issuedAt as number) ?? 0,
    expiresAt: (d.expiresAt as number) ?? 0,
    linkedRole: rawRole === '' || rawRole === undefined ? null : rawRole as SkillRole,
    verifiedBy: (d.verifiedBy as string) ?? '',
    verifiedAt: (d.verifiedAt as number) ?? 0,
    addedBy: (d.addedBy as string) ?? '',
    addedAt: (d.addedAt as number) ?? 0,
  }
}

export function subscribeToAllCerts(
  tribeId: string,
  callback: (certs: MemberCertification[]) => void
): () => void {
  const map = new Map<string, MemberCertification>()

  // Seed from IDB
  getDB().then(db => db.getAll('certifications')).then(all => {
    for (const raw of all) {
      const c = raw as MemberCertification
      if (c.tribeId === tribeId && c.id) map.set(c.id, c)
    }
    if (map.size > 0) callback(Array.from(map.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('certifications')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      map.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const c = parseCert(raw, tribeId)
      if (c) {
        const existing = map.get(key)
        const merged = existing ? { ...existing, ...c } : c
        map.set(key, merged)
        getDB().then(db => db.put('certifications', merged, `${tribeId}:${merged.memberId}:${key}`))
      }
    }
    callback(Array.from(map.values()))
  }

  ref.map().once(handle)
  ref.map().on(handle)
  const poll = setInterval(() => ref.map().once(handle), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}
