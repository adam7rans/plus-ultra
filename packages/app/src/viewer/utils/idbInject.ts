import type { IDBRecord } from '../types'

function resolvePlaceholders(val: unknown, tid: string, selfPub: string): unknown {
  if (typeof val === 'string') {
    if (val === '{NOW}') return Date.now()
    const mPlus = val.match(/^\{NOW\+(\d+)d\}$/)
    if (mPlus) return Date.now() + parseInt(mPlus[1], 10) * 86400000
    const mMinus = val.match(/^\{NOW-(\d+)d\}$/)
    if (mMinus) return Date.now() - parseInt(mMinus[1], 10) * 86400000
    return val.replace(/\{TRIBE\}/g, tid).replace(/\{SELF_PUB\}/g, selfPub)
  }
  if (Array.isArray(val)) return val.map(x => resolvePlaceholders(x, tid, selfPub))
  if (val && typeof val === 'object') {
    const res: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      res[k] = resolvePlaceholders(v, tid, selfPub)
    }
    return res
  }
  return val
}

export function injectIDBData(
  iframe: HTMLIFrameElement,
  records: IDBRecord[],
  tribeId: string,
  onDone: (msg: string, isError?: boolean) => void,
): void {
  const tid = tribeId || 'DEMO_TRIBE'
  const selfPub = localStorage.getItem('plusultra:dummyPub') || 'dummy_self_pub_key_abc123'
  const resolved = records.map(r => ({
    store: r.store,
    key: resolvePlaceholders(r.key, tid, selfPub) as string,
    data: resolvePlaceholders(r.data, tid, selfPub),
  }))

  try {
    const idb = (iframe.contentWindow as Window).indexedDB
    const req = idb.open('plus-ultra')
    req.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      const storeNames = [...new Set(resolved.map(r => r.store))]
      let tx: IDBTransaction
      try {
        tx = db.transaction(storeNames, 'readwrite')
      } catch (err) {
        db.close()
        onDone(`IDB store error: ${(err as Error).message}`, true)
        return
      }
      for (const r of resolved) tx.objectStore(r.store).put(r.data, r.key)
      tx.oncomplete = () => {
        db.close()
        iframe.contentWindow?.location.reload()
        onDone(`Seeded ${resolved.length} record(s) → reloading`)
      }
      tx.onerror = ev => onDone(`IDB tx error: ${(ev.target as IDBRequest).error}`, true)
    }
    req.onerror = ev => onDone(`IDB open error: ${(ev.target as IDBOpenDBRequest).error}`, true)
  } catch {
    onDone('IDB inject failed — viewer must be at same origin (/viewer route)', true)
  }
}

export const BASE_TRIBE_RECORDS: IDBRecord[] = [
  {
    store: 'my-tribes', key: '{TRIBE}',
    data: { tribeId: '{TRIBE}', joinedAt: '{NOW-30d}', tribePub: 'dummy_tribe_pub', tribePriv: 'dummy_tribe_priv', tribeEpub: 'dummy_tribe_epub', tribeEpriv: 'dummy_tribe_epriv', name: 'Mountain Watch', location: 'Blue Ridge, VA' },
  },
  {
    store: 'tribe-cache', key: '{TRIBE}',
    data: { id: '{TRIBE}', tribeId: '{TRIBE}', name: 'Mountain Watch', location: 'Blue Ridge, VA', region: 'appalachia', governance: 'council', founderId: '{SELF_PUB}', foundedAt: '{NOW-30d}' },
  },
  {
    store: 'members', key: '{TRIBE}:{SELF_PUB}',
    data: { pubkey: '{SELF_PUB}', tribeId: '{TRIBE}', joinedAt: '{NOW-30d}', lastSeen: '{NOW}', status: 'active', attachmentScore: 1.0, memberType: 'adult', authorityRole: 'founder', displayName: 'Alex Rivera', epub: 'dummy_epub_key' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_2',
    data: { pubkey: 'PUB_2', tribeId: '{TRIBE}', joinedAt: '{NOW-25d}', lastSeen: '{NOW-1d}', status: 'active', attachmentScore: 0.9, memberType: 'adult', authorityRole: 'member', displayName: 'Sam Chen', epub: 'dummy_epub_2' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_3',
    data: { pubkey: 'PUB_3', tribeId: '{TRIBE}', joinedAt: '{NOW-20d}', lastSeen: '{NOW}', status: 'active', attachmentScore: 0.85, memberType: 'adult', authorityRole: 'lead', displayName: 'Jordan Blake', epub: 'dummy_epub_3' },
  },
]
