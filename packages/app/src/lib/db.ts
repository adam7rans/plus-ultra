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
      tribeEpub?: string    // tribe's encryption pubkey — stored for federation
      tribeEpriv?: string   // tribe's encryption privkey — held by founder + diplomats
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
  inventory: {
    key: string   // `${tribeId}:${assetType}`
    value: unknown
  }
  notifications: {
    key: string   // `${tribeId}:${notificationId}`
    value: unknown
  }
  alerts: {
    key: string   // `${tribeId}:${alertId}`
    value: unknown
  }
  proposals: {
    key: string   // `${tribeId}:${proposalId}`
    value: unknown
  }
  'proposal-votes': {
    key: string   // `${proposalId}:${memberPub}`
    value: unknown
  }
  'proposal-comments': {
    key: string   // `${proposalId}:${commentId}`
    value: unknown
  }
  'map-pins': {
    key: string   // `${tribeId}:${pinId}`
    value: unknown
  }
  'patrol-routes': {
    key: string   // `${tribeId}:${routeId}`
    value: unknown
  }
  'map-territory': {
    key: string   // tribeId
    value: unknown
  }
  'training-sessions': {
    key: string   // `${tribeId}:${sessionId}`
    value: unknown
  }
  'certifications': {
    key: string   // `${tribeId}:${memberId}:${certId}`
    value: unknown
  }
  'consumption-log': {
    key: string   // `${tribeId}:${entryId}`
    value: unknown
  }
  'federation-relationships': {
    key: string   // `${myTribeId}:${channelId}`
    value: unknown
  }
  'federation-messages': {
    key: string   // `${channelId}:${messageId}`
    value: unknown
  }
  'federation-trades': {
    key: string   // `${channelId}:${proposalId}`
    value: unknown
  }
  'psych-profiles': {
    key: string   // `${tribeId}:${memberPub}`
    value: unknown
  }
  'peer-ratings': {
    key: string   // `${tribeId}:${ratedPub}:${weekHash}`
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
  _db = await openDB<AppDB>('plus-ultra', 15, {
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
      if (oldVersion < 8) {
        if (!db.objectStoreNames.contains('inventory')) {
          db.createObjectStore('inventory')
        }
      }
      if (oldVersion < 9) {
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications')
        }
        if (!db.objectStoreNames.contains('alerts')) {
          db.createObjectStore('alerts')
        }
      }
      if (oldVersion < 10) {
        db.createObjectStore('proposals')
        db.createObjectStore('proposal-votes')
        db.createObjectStore('proposal-comments')
      }
      if (oldVersion < 11) {
        db.createObjectStore('map-pins')
        db.createObjectStore('patrol-routes')
        db.createObjectStore('map-territory')
      }
      if (oldVersion < 12) {
        db.createObjectStore('training-sessions')
        db.createObjectStore('certifications')
      }
      if (oldVersion < 13) {
        db.createObjectStore('consumption-log')
      }
      if (oldVersion < 14) {
        db.createObjectStore('federation-relationships')
        db.createObjectStore('federation-messages')
        db.createObjectStore('federation-trades')
      }
      if (oldVersion < 15) {
        db.createObjectStore('psych-profiles')
        db.createObjectStore('peer-ratings')
      }
    },
  })
  return _db
}
