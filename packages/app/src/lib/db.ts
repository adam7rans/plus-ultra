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
  members: {
    key: string   // `${tribeId}:${pubkey}`
    value: unknown
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
  skills: {
    key: string   // `${tribeId}:${memberId}__${role}`
    value: unknown
  }
  'my-people': {
    key: string   // `${tribeId}:${myPubkey}`
    value: unknown
  }
  events: {
    key: string   // `${tribeId}:${eventId}`
    value: unknown
  }
}

let _db: IDBPDatabase<AppDB> | null = null

export function closeDB(): void {
  _db?.close()
  _db = null
}

export async function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (_db) return _db
  _db = await openDB<AppDB>('plus-ultra', 7, {
    blocked() {
      // Another tab has the DB open at an older version — force it to close
      // so our upgrade can proceed (stale tab will reload automatically)
      console.warn('[db] upgrade blocked by another tab — closing old connection')
      _db?.close()
      _db = null
      window.location.reload()
    },
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
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains('members')) {
          db.createObjectStore('members')
        }
      }
      if (oldVersion < 5) {
        if (!db.objectStoreNames.contains('skills')) {
          db.createObjectStore('skills')
        }
      }
      if (oldVersion < 6) {
        if (!db.objectStoreNames.contains('my-people')) {
          db.createObjectStore('my-people')
        }
      }
      if (oldVersion < 7) {
        if (!db.objectStoreNames.contains('events')) {
          db.createObjectStore('events')
        }
      }
    },
  })
  return _db
}
