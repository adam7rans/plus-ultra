import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach } from 'vitest'
import { closeDB } from './lib/db.js'

// Polyfill window — gun-init.ts sets window.GUN but we mock gun, so this
// is only needed for db.ts's blocked() callback (never fires in tests)
if (typeof globalThis.window === 'undefined') {
  ;(globalThis as unknown as Record<string, unknown>).window = globalThis
}

// Polyfill localStorage — used by offline-tracker.ts
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {}
  ;(globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length },
  }
}

// Reset IDB to a fresh in-memory instance before each test
beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).indexedDB = new IDBFactory()
  closeDB()
  // Clear localStorage between tests
  globalThis.localStorage?.clear?.()
})
