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

import { addCertification, updateCertification, verifyCertification, deleteCertification } from './certifications.js'
import { getDB } from './db.js'
import type { MemberCertification } from '@plus-ultra/core'

const baseParams = {
  certName: 'First Aid',
  issuingBody: 'Red Cross',
  licenseNumber: 'FA-001',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 1e10,
  linkedRole: null as null,
}

// ── addCertification ──────────────────────────────────────────────────────────

describe('addCertification', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes certification to IDB certifications store', async () => {
    const cert = await addCertification('tribe-1', 'member-1', baseParams, 'adder-pub')

    const db = await getDB()
    const stored = await db.get('certifications', `tribe-1:member-1:${cert.id}`)
    expect(stored).toBeDefined()
    const c = stored as MemberCertification
    expect(c.certName).toBe('First Aid')
    expect(c.issuingBody).toBe('Red Cross')
    expect(c.tribeId).toBe('tribe-1')
    expect(c.memberId).toBe('member-1')
    expect(c.addedBy).toBe('adder-pub')
  })

  it('IDB key is tribeId:memberId:certId', async () => {
    const cert = await addCertification('tribe-abc', 'mem-xyz', baseParams, 'adder-pub')

    const db = await getDB()
    const stored = await db.get('certifications', `tribe-abc:mem-xyz:${cert.id}`)
    expect(stored).toBeDefined()
  })

  it('initializes verifiedBy as empty string', async () => {
    const cert = await addCertification('tribe-1', 'member-1', baseParams, 'adder-pub')

    const db = await getDB()
    const stored = await db.get('certifications', `tribe-1:member-1:${cert.id}`) as MemberCertification
    expect(stored.verifiedBy).toBe('')
    expect(stored.verifiedAt).toBe(0)
  })

  it('stores linkedRole as null when not provided', async () => {
    const cert = await addCertification('tribe-1', 'member-1', { ...baseParams, linkedRole: null }, 'adder-pub')

    const db = await getDB()
    const stored = await db.get('certifications', `tribe-1:member-1:${cert.id}`) as MemberCertification
    expect(stored.linkedRole).toBeNull()
  })

  it('returns cert with id and addedAt', async () => {
    const before = Date.now()
    const cert = await addCertification('tribe-1', 'member-1', baseParams, 'adder-pub')

    expect(cert.id).toBeTruthy()
    expect(cert.addedAt).toBeGreaterThanOrEqual(before)
  })
})

// ── deleteCertification ───────────────────────────────────────────────────────

describe('deleteCertification', () => {
  beforeEach(() => { _offlineSince = null })

  it('removes certification from IDB', async () => {
    const cert = await addCertification('tribe-1', 'member-1', baseParams, 'adder-pub')

    const db = await getDB()
    const before = await db.get('certifications', `tribe-1:member-1:${cert.id}`)
    expect(before).toBeDefined()

    await deleteCertification('tribe-1', cert.id, 'member-1')

    const after = await db.get('certifications', `tribe-1:member-1:${cert.id}`)
    expect(after).toBeUndefined()
  })

  it('is a no-op when cert does not exist', async () => {
    await expect(
      deleteCertification('tribe-1', 'nonexistent-cert', 'member-1')
    ).resolves.toBeUndefined()
  })
})

// ── updateCertification ───────────────────────────────────────────────────────

describe('updateCertification', () => {
  beforeEach(() => { _offlineSince = null })

  it('merges patch into existing cert', async () => {
    const cert = await addCertification('tribe-1', 'member-1', baseParams, 'adder-pub')
    await updateCertification('tribe-1', cert.id, 'member-1', { certName: 'Advanced First Aid' })

    const db = await getDB()
    const stored = await db.get('certifications', `tribe-1:member-1:${cert.id}`) as MemberCertification
    expect(stored.certName).toBe('Advanced First Aid')
    expect(stored.issuingBody).toBe('Red Cross') // unchanged
  })

  it('is a no-op when cert does not exist', async () => {
    await expect(
      updateCertification('tribe-1', 'nonexistent', 'member-1', { certName: 'X' })
    ).resolves.toBeUndefined()
  })
})

// ── verifyCertification ───────────────────────────────────────────────────────

describe('verifyCertification', () => {
  beforeEach(() => { _offlineSince = null })

  it('sets verifiedBy and verifiedAt', async () => {
    const cert = await addCertification('tribe-1', 'member-1', {
      certName: 'EMT-Basic',
      issuingBody: 'NREMT',
      licenseNumber: 'EMT-12345',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1e10,
      linkedRole: null,
    }, 'adder-pub')

    const before = Date.now()
    await verifyCertification('tribe-1', cert.id, 'member-1', 'verifier-pub')

    const db = await getDB()
    const stored = await db.get('certifications', `tribe-1:member-1:${cert.id}`) as MemberCertification
    expect(stored.verifiedBy).toBe('verifier-pub')
    expect(stored.verifiedAt).toBeGreaterThanOrEqual(before)
  })

  it('is a no-op when cert does not exist', async () => {
    await expect(
      verifyCertification('tribe-1', 'nonexistent', 'member-1', 'verifier-pub')
    ).resolves.toBeUndefined()
  })
})
