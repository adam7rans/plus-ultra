/**
 * Phase 4 — Crypto / SEA tests
 *
 * These tests use the REAL gun/sea library (no vi.mock) to verify that
 * the cryptographic primitives work correctly in the Node test environment.
 * Node v19+ provides globalThis.crypto natively; no polyfill needed.
 */
import { describe, it, expect } from 'vitest'
import SEA from 'gun/sea'

// Type-safe accessor for SEA's runtime methods (not in TS typedefs)
type SEAFull = {
  pair: () => Promise<{ pub: string; priv: string; epub: string; epriv: string }>
  sign: (data: string, pair: { pub: string; priv: string }) => Promise<string>
  verify: (signed: string, pub: string) => Promise<string | undefined>
  encrypt: (data: string, key: string) => Promise<string>
  decrypt: (data: string, key: string) => Promise<string | undefined>
  secret: (epub: string, pair: { epub: string; epriv: string }) => Promise<string | undefined>
}

const sea = SEA as unknown as SEAFull

// ── Key generation ────────────────────────────────────────────────────────────

describe('SEA.pair()', () => {
  it('returns all 4 required keys', async () => {
    const pair = await sea.pair()
    expect(typeof pair.pub).toBe('string')
    expect(typeof pair.priv).toBe('string')
    expect(typeof pair.epub).toBe('string')
    expect(typeof pair.epriv).toBe('string')
    expect(pair.pub.length).toBeGreaterThan(10)
    expect(pair.priv.length).toBeGreaterThan(10)
    expect(pair.epub.length).toBeGreaterThan(10)
    expect(pair.epriv.length).toBeGreaterThan(10)
  })

  it('each call generates a unique keypair', async () => {
    const [p1, p2] = await Promise.all([sea.pair(), sea.pair()])
    expect(p1.pub).not.toBe(p2.pub)
    expect(p1.priv).not.toBe(p2.priv)
    expect(p1.epub).not.toBe(p2.epub)
    expect(p1.epriv).not.toBe(p2.epriv)
  })
})

// ── Sign + verify ─────────────────────────────────────────────────────────────

describe('SEA.sign / SEA.verify', () => {
  it('signed data verifies with the same public key', async () => {
    const pair = await sea.pair()
    const signed = await sea.sign('hello world', pair)
    const verified = await sea.verify(signed, pair.pub)
    expect(verified).toBe('hello world')
  })

  it('returns falsy when verified with a different public key', async () => {
    const pair1 = await sea.pair()
    const pair2 = await sea.pair()
    const signed = await sea.sign('my message', pair1)
    const verified = await sea.verify(signed, pair2.pub)
    expect(verified).toBeFalsy()
  })

  it('can sign and verify JSON data', async () => {
    const pair = await sea.pair()
    const data = JSON.stringify({ id: 'msg-1', content: 'test', sentAt: 12345 })
    const signed = await sea.sign(data, pair)
    const verified = await sea.verify(signed, pair.pub)
    // SEA auto-parses JSON on verify — compare as object
    expect(verified).toMatchObject({ id: 'msg-1', content: 'test' })
  })
})

// ── Encrypt + decrypt ─────────────────────────────────────────────────────────

describe('SEA.encrypt / SEA.decrypt', () => {
  it('roundtrip with the same passphrase', async () => {
    const encrypted = await sea.encrypt('secret data', 'my-passphrase')
    expect(encrypted).toBeTruthy()
    expect(encrypted).not.toBe('secret data')

    const decrypted = await sea.decrypt(encrypted, 'my-passphrase')
    expect(decrypted).toBe('secret data')
  })

  it('wrong passphrase returns undefined', async () => {
    const encrypted = await sea.encrypt('secret', 'correct-pass')
    const decrypted = await sea.decrypt(encrypted, 'wrong-pass')
    expect(decrypted).toBeUndefined()
  })

  it('can encrypt and decrypt JSON strings', async () => {
    const payload = JSON.stringify({ content: 'private message', sentAt: Date.now() })
    const encrypted = await sea.encrypt(payload, 'tribe-shared-key')
    const decrypted = await sea.decrypt(encrypted, 'tribe-shared-key')
    // SEA auto-parses JSON on decrypt — compare as object
    expect(decrypted).toMatchObject({ content: 'private message' })
  })
})

// ── ECDH shared secret (DM encryption) ───────────────────────────────────────

describe('SEA.secret (ECDH)', () => {
  it('both parties derive the same shared secret', async () => {
    const alice = await sea.pair()
    const bob = await sea.pair()

    const aliceSecret = await sea.secret(bob.epub, alice)
    const bobSecret = await sea.secret(alice.epub, bob)

    expect(aliceSecret).toBeTruthy()
    expect(aliceSecret).toBe(bobSecret)
  })

  it('DM message encrypted by Alice can be decrypted by Bob', async () => {
    const alice = await sea.pair()
    const bob = await sea.pair()

    const aliceShared = await sea.secret(bob.epub, alice)
    const encrypted = await sea.encrypt('private dm', aliceShared!)

    const bobShared = await sea.secret(alice.epub, bob)
    const decrypted = await sea.decrypt(encrypted, bobShared!)
    expect(decrypted).toBe('private dm')
  })

  it('wrong key pair cannot decrypt DM', async () => {
    const alice = await sea.pair()
    const bob = await sea.pair()
    const eve = await sea.pair()

    const sharedSecret = await sea.secret(bob.epub, alice)
    const encrypted = await sea.encrypt('alice to bob only', sharedSecret!)

    // Eve tries with alice's epub and her own pair
    const eveSecret = await sea.secret(alice.epub, eve)
    const decrypted = await sea.decrypt(encrypted, eveSecret!)
    expect(decrypted).not.toBe('alice to bob only')
  })

  it('different epub gives different secret', async () => {
    const alice = await sea.pair()
    const bob = await sea.pair()
    const carol = await sea.pair()

    const secret1 = await sea.secret(bob.epub, alice)
    const secret2 = await sea.secret(carol.epub, alice)
    expect(secret1).not.toBe(secret2)
  })
})
