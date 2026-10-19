/**
 * platform/identity.ts — Phase 3 identity abstraction.
 *
 * Web: direct passthrough to `../identity` (IndexedDB keypair store).
 * Behavior unchanged.
 *
 * Native (Capacitor): private keys (`priv`/`epriv`) live in secure storage
 * (iOS Keychain / Android EncryptedSharedPreferences via Preferences), NOT
 * in IndexedDB. The IDB record keeps a redacted copy (empty-string priv/epriv)
 * so a WebView/storage dump never leaks signing keys. All readers go through
 * these wrappers, which merge secure keys back — the IdentityContext always
 * holds full keys, so backup/export and Gun SEA flows are unaffected.
 *
 * Out of scope for v1: tribe keypairs (`my-tribes` tribePriv/tribeEpriv in
 * lib/tribes.ts) stay in IndexedDB — noted for a Phase 3 follow-up.
 */

import type { Identity } from '@plus-ultra/core'
import { isNative } from './types'
import { getDB, withTimeout } from './storage'
import { getSecureItem, setSecureItem, removeSecureItem } from './storage'
import {
  generateIdentity as baseGenerate,
  loadIdentity as baseLoad,
  restoreIdentity as baseRestore,
  saveDisplayName as baseSaveDisplayName,
  markBackedUp as baseMarkBackedUp,
} from '../identity'

export { shortId } from '../identity'

const IDENTITY_KEY = 'keypair'
const SEC_PRIV = 'identity.priv'
const SEC_EPRIV = 'identity.epriv'

/** Overwrite the IDB identity record with redacted private keys (native only). */
async function redactIdbKeys(record: Identity): Promise<void> {
  const db = await getDB()
  await db.put('identity', { ...record, priv: '', epriv: '' }, IDENTITY_KEY)
}

/** Move real private keys from an IDB record into secure storage, then redact. */
async function migrateToSecure(record: Identity): Promise<Identity> {
  try {
    if (record.priv) await setSecureItem(SEC_PRIV, record.priv)
    if (record.epriv) await setSecureItem(SEC_EPRIV, record.epriv)
    await redactIdbKeys(record)
  } catch (err) {
    // Fail-open: keys stay in IDB (degraded hardening, working app).
    console.warn('[identity] secure migration failed, keeping IDB copy:', err)
  }
  return record
}

export async function loadIdentity(): Promise<Identity | null> {
  // 15s cap: if IndexedDB itself hangs, say so instead of pulsing forever.
  const stored = await withTimeout(baseLoad(), 15000, 'IndexedDB open')
  console.info('[identity] base load:', stored ? 'found' : 'empty', 'native:', isNative())
  if (!stored || !isNative()) return stored

  // Fail-open: secure storage is hardening, never a boot dependency.
  // If it throws or hangs, the IDB copy keeps the app working.
  try {
    const [priv, epriv] = await withTimeout(
      Promise.all([getSecureItem(SEC_PRIV), getSecureItem(SEC_EPRIV)]),
      10000,
      'secure key read',
    )
    if (priv && epriv) {
      // Steady state: IDB is redacted, secure storage is canonical.
      return { ...stored, priv, epriv }
    }
    if (stored.priv || stored.epriv) {
      // Pre-migration record (or fresh web-imported IDB): move keys to secure.
      return migrateToSecure(stored)
    }
    return stored
  } catch (err) {
    console.warn('[identity] secure path failed, falling back to IDB copy:', err)
    return stored
  }
}

export async function generateIdentity(): Promise<Identity> {
  console.info('[identity] generating keypair, native:', isNative())
  // 25s cap: key generation is local crypto — if it hangs, say so.
  const identity = await withTimeout(baseGenerate(), 25000, 'keypair generation')
  console.info('[identity] keypair generated')
  if (isNative()) await migrateToSecure(identity)
  return identity
}

export async function restoreIdentity(raw: string): Promise<Identity> {
  const identity = await baseRestore(raw)
  if (isNative()) await migrateToSecure(identity)
  return identity
}

export async function saveDisplayName(displayName: string): Promise<void> {
  await baseSaveDisplayName(displayName)
}

export async function markBackedUp(): Promise<void> {
  await baseMarkBackedUp()
}

/** Remove secure keys (used only by the dev-only Diagnostics wipe path). */
export async function clearSecureIdentity(): Promise<void> {
  if (!isNative()) return
  await Promise.all([removeSecureItem(SEC_PRIV), removeSecureItem(SEC_EPRIV)])
}
