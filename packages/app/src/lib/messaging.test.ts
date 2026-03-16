import { describe, it, expect, vi } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./gun.js', () => {
  function chain(path: string[] = []): Record<string, unknown> {
    return {
      get(key: string) { return chain([...path, key]) },
      put(payload: unknown, ack?: (a: { err?: string }) => void) {
        ack?.({}) // ACK success immediately
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

vi.mock('gun/sea', () => ({
  default: {
    sign: vi.fn().mockResolvedValue('mock-sig'),
    secret: vi.fn().mockResolvedValue('mock-secret'),
    encrypt: vi.fn().mockResolvedValue('encrypted-content'),
    decrypt: vi.fn().mockResolvedValue('decrypted-content'),
  },
}))

vi.mock('./push.js', () => ({
  triggerPush: vi.fn().mockResolvedValue(undefined),
}))

import {
  tribewideChannelId,
  dmChannelId,
  loadCachedMessages,
  markChannelRead,
  getUnreadCount,
  queueMessage,
  flushQueue,
  sendTribeMessage,
} from './messaging.js'
import { getDB } from './db.js'
import type { Message } from '@plus-ultra/core'

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    tribeId: 'tribe-1',
    channelId: 'tribe-wide',
    senderId: 'sender-pub',
    type: 'text',
    content: 'Hello',
    sentAt: Date.now(),
    sig: 'sig',
    ...overrides,
  }
}

// ── Channel ID helpers ────────────────────────────────────────────────────────

describe('tribewideChannelId', () => {
  it('always returns "tribe-wide"', () => {
    expect(tribewideChannelId()).toBe('tribe-wide')
  })
})

describe('dmChannelId', () => {
  it('sorts pubkeys alphabetically and joins with __', () => {
    expect(dmChannelId('bob', 'alice')).toBe('alice__bob')
    expect(dmChannelId('alice', 'bob')).toBe('alice__bob')
  })

  it('is symmetric — same result regardless of argument order', () => {
    const ab = dmChannelId('pub-a', 'pub-b')
    const ba = dmChannelId('pub-b', 'pub-a')
    expect(ab).toBe(ba)
  })

  it('produces a deterministic unique ID for each pair', () => {
    const id1 = dmChannelId('alice', 'bob')
    const id2 = dmChannelId('alice', 'carol')
    expect(id1).not.toBe(id2)
  })
})

// ── IDB cache — cacheMessage and loadCachedMessages ───────────────────────────

describe('loadCachedMessages', () => {
  it('returns empty array when no messages', async () => {
    const msgs = await loadCachedMessages('tribe-wide')
    expect(msgs).toHaveLength(0)
  })

  it('stores and retrieves messages via IDB roundtrip', async () => {
    const db = await getDB()
    const msg = makeMessage()
    await db.put('messages', msg, msg.id)

    const cached = await loadCachedMessages('tribe-wide')
    expect(cached).toHaveLength(1)
    expect(cached[0].id).toBe('msg-1')
  })

  it('filters by channelId — only returns messages for this channel', async () => {
    const db = await getDB()
    const tribeMsg = makeMessage({ id: 'tribe-msg', channelId: 'tribe-wide' })
    const dmMsg = makeMessage({ id: 'dm-msg', channelId: 'alice__bob' })
    await db.put('messages', tribeMsg, tribeMsg.id)
    await db.put('messages', dmMsg, dmMsg.id)

    const tribesOnly = await loadCachedMessages('tribe-wide')
    const dmOnly = await loadCachedMessages('alice__bob')

    expect(tribesOnly).toHaveLength(1)
    expect(tribesOnly[0].id).toBe('tribe-msg')
    expect(dmOnly).toHaveLength(1)
    expect(dmOnly[0].id).toBe('dm-msg')
  })

  it('returns messages sorted by sentAt (ascending)', async () => {
    const db = await getDB()
    const now = Date.now()
    const m1 = makeMessage({ id: 'm1', sentAt: now - 200 })
    const m2 = makeMessage({ id: 'm2', sentAt: now - 100 })
    const m3 = makeMessage({ id: 'm3', sentAt: now })
    // Insert out of order
    await db.put('messages', m3, m3.id)
    await db.put('messages', m1, m1.id)
    await db.put('messages', m2, m2.id)

    const cached = await loadCachedMessages('tribe-wide')
    expect(cached[0].id).toBe('m1')
    expect(cached[1].id).toBe('m2')
    expect(cached[2].id).toBe('m3')
  })
})

// ── markChannelRead and getUnreadCount ────────────────────────────────────────

describe('markChannelRead', () => {
  it('stores lastReadAt for channel', async () => {
    const before = Date.now()
    await markChannelRead('tribe-wide')

    const db = await getDB()
    const read = await db.get('channel-reads', 'tribe-wide') as { lastReadAt: number }
    expect(read).toBeDefined()
    expect(read.lastReadAt).toBeGreaterThanOrEqual(before)
  })

  it('overwrites previous lastReadAt', async () => {
    await markChannelRead('tribe-wide')
    const db = await getDB()
    const first = (await db.get('channel-reads', 'tribe-wide') as { lastReadAt: number }).lastReadAt

    await new Promise(r => setTimeout(r, 5)) // ensure time passes
    await markChannelRead('tribe-wide')
    const second = (await db.get('channel-reads', 'tribe-wide') as { lastReadAt: number }).lastReadAt
    expect(second).toBeGreaterThanOrEqual(first)
  })
})

describe('getUnreadCount', () => {
  it('returns all messages as unread when no read record exists', async () => {
    const msgs = [makeMessage({ id: 'm1' }), makeMessage({ id: 'm2' })]
    const count = await getUnreadCount('tribe-wide', msgs)
    expect(count).toBe(2)
  })

  it('returns 0 when all messages were sent before lastReadAt', async () => {
    const pastTime = Date.now() - 10000
    const msgs = [
      makeMessage({ id: 'm1', sentAt: pastTime - 200 }),
      makeMessage({ id: 'm2', sentAt: pastTime - 100 }),
    ]
    await markChannelRead('tribe-wide')
    await new Promise(r => setTimeout(r, 5)) // ensure lastReadAt > sentAt

    const count = await getUnreadCount('tribe-wide', msgs)
    expect(count).toBe(0)
  })

  it('returns only messages sent after lastReadAt', async () => {
    await markChannelRead('tribe-wide')
    const readTime = Date.now()

    const msgs = [
      makeMessage({ id: 'old', sentAt: readTime - 1000 }),
      makeMessage({ id: 'new', sentAt: readTime + 1000 }),
    ]

    const count = await getUnreadCount('tribe-wide', msgs)
    expect(count).toBe(1)
  })
})

// ── queueMessage ──────────────────────────────────────────────────────────────

describe('queueMessage', () => {
  it('stores message in queued-messages IDB store', async () => {
    const msg = makeMessage({ id: 'q-msg-1' })
    await queueMessage(msg)

    const db = await getDB()
    const stored = await db.get('queued-messages', 'q-msg-1')
    expect(stored).toBeDefined()
    const q = stored as { message: Message; queuedAt: number; attempts: number }
    expect(q.attempts).toBe(0)
    expect(q.message.id).toBe('q-msg-1')
  })

  it('sets attempts=0 on first queue', async () => {
    const msg = makeMessage({ id: 'q-msg-2' })
    await queueMessage(msg)

    const db = await getDB()
    const stored = await db.get('queued-messages', 'q-msg-2') as { attempts: number }
    expect(stored.attempts).toBe(0)
  })
})

// ── flushQueue ────────────────────────────────────────────────────────────────

describe('flushQueue', () => {
  it('sends queued messages and removes them from IDB on ACK success', async () => {
    const msg = makeMessage({ id: 'flush-1' })
    await queueMessage(msg)

    const result = await flushQueue()

    expect(result.sent).toBe(1)
    expect(result.dropped).toBe(0)
    expect(result.remaining).toBe(0)

    const db = await getDB()
    const leftover = await db.get('queued-messages', 'flush-1')
    expect(leftover).toBeUndefined()
  })

  it('also caches the message in IDB after flush', async () => {
    const msg = makeMessage({ id: 'flush-cached' })
    await queueMessage(msg)
    await flushQueue()

    const cached = await loadCachedMessages('tribe-wide')
    expect(cached.find(m => m.id === 'flush-cached')).toBeDefined()
  })

  it('returns zero counts for empty queue', async () => {
    const result = await flushQueue()
    expect(result.sent).toBe(0)
    expect(result.dropped).toBe(0)
    expect(result.remaining).toBe(0)
  })

  it('flushes multiple messages', async () => {
    await queueMessage(makeMessage({ id: 'multi-1' }))
    await queueMessage(makeMessage({ id: 'multi-2' }))
    await queueMessage(makeMessage({ id: 'multi-3' }))

    const result = await flushQueue()
    expect(result.sent).toBe(3)
    expect(result.remaining).toBe(0)
  })
})

// ── sendTribeMessage ──────────────────────────────────────────────────────────

describe('sendTribeMessage', () => {
  const senderPair = {
    pub: 'sender-pub',
    priv: 'sender-priv',
    epub: 'sender-epub',
    epriv: 'sender-epriv',
  }

  it('caches sent message in IDB messages store', async () => {
    await sendTribeMessage('tribe-1', 'sender-pub', senderPair, 'text', 'Hello tribe')

    const cached = await loadCachedMessages('tribe-wide')
    expect(cached.length).toBeGreaterThan(0)
    expect(cached[cached.length - 1].content).toBe('Hello tribe')
  })

  it('sets channelId to tribe-wide', async () => {
    await sendTribeMessage('tribe-2', 'sender-pub', senderPair, 'text', 'Channel test')

    const cached = await loadCachedMessages('tribe-wide')
    const msg = cached.find(m => m.content === 'Channel test')
    expect(msg?.channelId).toBe('tribe-wide')
  })

  it('sets senderId from parameter', async () => {
    await sendTribeMessage('tribe-3', 'my-pub-123', senderPair, 'text', 'ID test')

    const cached = await loadCachedMessages('tribe-wide')
    const msg = cached.find(m => m.content === 'ID test')
    expect(msg?.senderId).toBe('my-pub-123')
  })
})
