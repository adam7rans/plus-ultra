import { openDB, type IDBPDatabase } from 'idb'

export interface AppDB {
  identity: {
    key: string
    value: {
      pub: string
      priv: string
      epub: string
      epriv: string
      createdAt: number
      backedUp: boolean
    }
  }
  'queued-messages': {
    key: string
    value: {
      message: unknown
      queuedAt: number
      attempts: number
    }
  }
  'tribe-cache': {
    key: string
    value: unknown
  }
  'my-tribes': {
    key: string
    value: {
      tribeId: string
      joinedAt: number
      tribePub: string
      tribePriv?: string
      name: string
      location: string
    }
  }
  'invite-tokens': {
    key: string
    value: {
      token: string
      tribeId: string
      expiresAt: number
      used: boolean
    }
  }
  messages: {
    key: string
    value: unknown
  }
  'channel-reads': {
    key: string
    value: {
      channelId: string
      lastReadAt: number
    }
  }
}

let _db: IDBPDatabase<AppDB> | null = null

export async function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (_db) return _db
  _db = await openDB<AppDB>('plus-ultra', 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('identity')) {
          db.createObjectStore('identity')
        }
        if (!db.objectStoreNames.contains('queued-messages')) {
          db.createObjectStore('queued-messages')
        }
        if (!db.objectStoreNames.contains('tribe-cache')) {
          db.createObjectStore('tribe-cache')
        }
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('my-tribes')) {
          db.createObjectStore('my-tribes')
        }
        if (!db.objectStoreNames.contains('invite-tokens')) {
          db.createObjectStore('invite-tokens')
        }
      }
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages')
        }
        if (!db.objectStoreNames.contains('channel-reads')) {
          db.createObjectStore('channel-reads')
        }
      }
    },
  })
  return _db
}
