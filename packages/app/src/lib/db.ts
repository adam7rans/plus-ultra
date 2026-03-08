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
}

let _db: IDBPDatabase<AppDB> | null = null

export async function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (_db) return _db
  _db = await openDB<AppDB>('plus-ultra', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('identity')) {
        db.createObjectStore('identity')
      }
      if (!db.objectStoreNames.contains('queued-messages')) {
        db.createObjectStore('queued-messages')
      }
      if (!db.objectStoreNames.contains('tribe-cache')) {
        db.createObjectStore('tribe-cache')
      }
    },
  })
  return _db
}
