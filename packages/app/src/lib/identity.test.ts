import { describe, it, expect, vi } from 'vitest'

// ── Mock gun/sea before importing identity ────────────────────────────────────
// NOTE: vi.mock is hoisted — variables defined in the test file are NOT accessible
// inside the factory. All values must be inlined.

vi.mock('gun/sea', () => ({
  default: {
    pair: vi.fn().mockResolvedValue({
      pub: 'test-pub-key-abcdef1234567890',
      priv: 'test-priv-key-abcdef1234567890',
      epub: 'test-epub-key-abcdef1234567890',
      epriv: 'test-epriv-key-abcdef1234567890',
    }),
    sign: vi.fn().mockResolvedValue('mock-signature'),
    verify: vi.fn().mockResolvedValue(true),
  },
}))

const MOCK_PUB = 'test-pub-key-abcdef1234567890'

import { loadIdentity, generateIdentity, restoreIdentity, saveDisplayName, markBackedUp, shortId } from './identity.js'
import { getDB } from './db.js'

// ── loadIdentity ──────────────────────────────────────────────────────────────

describe('loadIdentity', () => {
  it('returns null when no identity exists', async () => {
    const result = await loadIdentity()
    expect(result).toBeNull()
  })

  it('returns the stored identity after generateIdentity', async () => {
    await generateIdentity()
    const result = await loadIdentity()
    expect(result).not.toBeNull()
    expect(result?.pub).toBe(MOCK_PUB)
  })
})

// ── generateIdentity ──────────────────────────────────────────────────────────

describe('generateIdentity', () => {
  it('returns an identity with all 4 key fields', async () => {
    const identity = await generateIdentity()
    expect(identity.pub).toBeTruthy()
    expect(identity.priv).toBeTruthy()
    expect(identity.epub).toBeTruthy()
    expect(identity.epriv).toBeTruthy()
  })

  it('persists identity to IDB', async () => {
    const identity = await generateIdentity()
    const db = await getDB()
    const stored = await db.get('identity', 'keypair')
    expect(stored).toBeDefined()
    expect((stored as typeof identity).pub).toBe(identity.pub)
  })

  it('sets backedUp=false on new identity', async () => {
    const identity = await generateIdentity()
    expect(identity.backedUp).toBe(false)
  })

  it('sets a createdAt timestamp', async () => {
    const before = Date.now()
    const identity = await generateIdentity()
    expect(identity.createdAt).toBeGreaterThanOrEqual(before)
    expect(identity.createdAt).toBeLessThanOrEqual(Date.now())
  })

  it('throws if IDB write fails', async () => {
    // Simulate IDB failure by breaking the store before calling generateIdentity
    const db = await getDB()
    // @ts-expect-error — intentionally corrupt the store to test error path
    const origPut = db.put.bind(db)
    db.put = vi.fn().mockRejectedValue(new Error('IDB quota exceeded'))

    await expect(generateIdentity()).rejects.toThrow('Failed to save identity')
    db.put = origPut
  })
})

// ── restoreIdentity ───────────────────────────────────────────────────────────

describe('restoreIdentity', () => {
  it('restores a valid keypair from JSON backup', async () => {
    const backup = JSON.stringify({
      pub: 'restored-pub',
      priv: 'restored-priv',
      epub: 'restored-epub',
      epriv: 'restored-epriv',
      createdAt: Date.now() - 1000,
      backedUp: true,
    })

    const identity = await restoreIdentity(backup)
    expect(identity.pub).toBe('restored-pub')
    expect(identity.backedUp).toBe(true)
  })

  it('persists restored identity to IDB', async () => {
    const backup = JSON.stringify({
      pub: 'r-pub', priv: 'r-priv', epub: 'r-epub', epriv: 'r-epriv',
      createdAt: 0, backedUp: true,
    })

    await restoreIdentity(backup)
    const result = await loadIdentity()
    expect(result?.pub).toBe('r-pub')
  })

  it('throws on invalid JSON', async () => {
    await expect(restoreIdentity('not-json')).rejects.toThrow('not valid JSON')
  })

  it('throws when pub key is missing', async () => {
    const backup = JSON.stringify({ priv: 'p', epub: 'e', epriv: 'ep' })
    await expect(restoreIdentity(backup)).rejects.toThrow('missing required keys')
  })

  it('throws when priv key is missing', async () => {
    const backup = JSON.stringify({ pub: 'p', epub: 'e', epriv: 'ep' })
    await expect(restoreIdentity(backup)).rejects.toThrow('missing required keys')
  })

  it('throws when epub key is missing', async () => {
    const backup = JSON.stringify({ pub: 'p', priv: 'pr', epriv: 'ep' })
    await expect(restoreIdentity(backup)).rejects.toThrow('missing required keys')
  })

  it('throws when epriv key is missing', async () => {
    const backup = JSON.stringify({ pub: 'p', priv: 'pr', epub: 'e' })
    await expect(restoreIdentity(backup)).rejects.toThrow('missing required keys')
  })
})

// ── saveDisplayName ───────────────────────────────────────────────────────────

describe('saveDisplayName', () => {
  it('updates displayName on existing identity', async () => {
    await generateIdentity()
    await saveDisplayName('Alice')

    const result = await loadIdentity()
    expect((result as unknown as { displayName?: string }).displayName).toBe('Alice')
  })

  it('trims whitespace from displayName', async () => {
    await generateIdentity()
    await saveDisplayName('  Bob  ')

    const result = await loadIdentity()
    expect((result as unknown as { displayName?: string }).displayName).toBe('Bob')
  })

  it('stores undefined for empty displayName after trimming', async () => {
    await generateIdentity()
    await saveDisplayName('   ')

    const result = await loadIdentity()
    expect((result as unknown as { displayName?: string }).displayName).toBeUndefined()
  })

  it('does nothing when no identity exists', async () => {
    // Should not throw — just returns early
    await expect(saveDisplayName('Ghost')).resolves.toBeUndefined()
  })
})

// ── markBackedUp ──────────────────────────────────────────────────────────────

describe('markBackedUp', () => {
  it('sets backedUp=true', async () => {
    await generateIdentity()
    await markBackedUp()

    const result = await loadIdentity()
    expect(result?.backedUp).toBe(true)
  })

  it('does nothing when no identity exists', async () => {
    await expect(markBackedUp()).resolves.toBeUndefined()
  })
})

// ── shortId ───────────────────────────────────────────────────────────────────

describe('shortId', () => {
  it('returns first 8 characters of pubkey in uppercase', () => {
    expect(shortId('abcdefghijklmnop')).toBe('ABCDEFGH')
  })

  it('handles short pubkeys without crashing', () => {
    expect(shortId('abc')).toBe('ABC')
  })
})
