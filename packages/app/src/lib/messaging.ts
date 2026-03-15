import { nanoid } from 'nanoid'
import SEA from 'gun/sea'
import { gun } from './gun'
import { getDB } from './db'
import { triggerPush } from './push'
import type { Message, QueuedMessage } from '@plus-ultra/core'

// ─── Channel helpers ─────────────────────────────────────────────────────────

export function tribewideChannelId(): string {
  return 'tribe-wide'
}

export function dmChannelId(pubkeyA: string, pubkeyB: string): string {
  return [pubkeyA, pubkeyB].sort().join('__')
}

function tribeChannelRef(tribeId: string) {
  return gun.get('tribes').get(tribeId).get('messages').get('tribe-wide')
}

function dmChannelRef(channelId: string) {
  return gun.get('dms').get(channelId)
}

// ─── Send message ─────────────────────────────────────────────────────────────

export async function sendTribeMessage(
  tribeId: string,
  senderId: string,
  senderPair: { pub: string; priv: string; epub: string; epriv: string },
  type: Message['type'],
  content: string,
  mimeType?: string,
  replyTo?: string
): Promise<void> {
  const id = nanoid()
  const sentAt = Date.now()

  // Sign the content
  const sig = await (SEA as unknown as {
    sign: (data: string, pair: unknown) => Promise<string>
  }).sign(content.slice(0, 512), senderPair) ?? ''

  const message: Message = {
    id,
    tribeId,
    channelId: tribewideChannelId(),
    senderId,
    type,
    content,
    mimeType,
    sentAt,
    sig,
    ...(replyTo ? { replyTo } : {}),
  }

  await writeMessage(tribeId, 'tribe-wide', message)
  await cacheMessage(message)
}

/** Encrypt and sign a DM message without writing to Gun or IDB. Safe to queue offline. */
export async function prepareDM(
  tribeId: string,
  senderId: string,
  senderPair: { pub: string; priv: string; epub: string; epriv: string },
  recipientPub: string,
  recipientEpub: string,
  type: Message['type'],
  content: string,
  mimeType?: string,
  replyTo?: string
): Promise<Message> {
  const id = nanoid()
  const sentAt = Date.now()
  const channelId = dmChannelId(senderId, recipientPub)

  const sharedSecret = await (SEA as unknown as {
    secret: (epub: string, pair: unknown) => Promise<string>
  }).secret(recipientEpub, senderPair)

  const encryptedContent = await (SEA as unknown as {
    encrypt: (data: string, secret: string) => Promise<string>
  }).encrypt(content, sharedSecret)

  const sig = await (SEA as unknown as {
    sign: (data: string, pair: unknown) => Promise<string>
  }).sign(content.slice(0, 512), senderPair) ?? ''

  return {
    id,
    tribeId,
    channelId,
    senderId,
    type,
    content: encryptedContent,
    mimeType,
    sentAt,
    sig,
    ...(replyTo ? { replyTo } : {}),
  }
}

export async function sendDM(
  tribeId: string,
  senderId: string,
  senderPair: { pub: string; priv: string; epub: string; epriv: string },
  recipientPub: string,
  recipientEpub: string,
  type: Message['type'],
  content: string,
  mimeType?: string,
  replyTo?: string
): Promise<Message> {
  const message = await prepareDM(tribeId, senderId, senderPair, recipientPub, recipientEpub, type, content, mimeType, replyTo)

  await writeDM(message.channelId, message)
  await cacheMessage(message)

  // Fire push notification for the recipient (grid-up only, fire and forget)
  void triggerPush(
    tribeId, recipientPub, '💬 New Message',
    `${content.slice(0, 100)}`,
    { url: `/tribe/${tribeId}/dm/${senderId}`, tag: `dm-${message.channelId}` }
  )

  return message
}

export async function decryptDMContent(
  encryptedContent: string,
  senderEpub: string,
  recipientPair: { pub: string; priv: string; epub: string; epriv: string }
): Promise<string> {
  const sharedSecret = await (SEA as unknown as {
    secret: (epub: string, pair: unknown) => Promise<string>
  }).secret(senderEpub, recipientPair)

  const decrypted = await (SEA as unknown as {
    decrypt: (data: string, secret: string) => Promise<string>
  }).decrypt(encryptedContent, sharedSecret)

  return decrypted ?? '[decryption failed]'
}

// ─── Gun SEA-safe helpers ─────────────────────────────────────────────────────
// Gun/SEA installs a put() middleware that silently drops writes containing
// field values starting with "SEA{" (it tries to verify them as signed Gun nodes
// and fails). We escape them to "~SEA{" before writing and restore on read.

function gunEscape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue  // Gun rejects undefined values entirely
    if (typeof v === 'string' && v.startsWith('SEA{')) {
      out[k] = '~' + v  // escape: "SEA{..." → "~SEA{..."
    } else {
      out[k] = v
    }
  }
  return out
}

function gunUnescape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.startsWith('~SEA{')) {
      out[k] = v.slice(1)  // restore: "~SEA{..." → "SEA{..."
    } else {
      out[k] = v
    }
  }
  return out
}

// ─── Gun write helpers ────────────────────────────────────────────────────────

async function writeMessage(tribeId: string, _channelId: string, message: Message): Promise<void> {
  tribeChannelRef(tribeId)
    .get(message.id)
    .put(gunEscape(message as unknown as Record<string, unknown>))
}

async function writeDM(channelId: string, message: Message): Promise<void> {
  dmChannelRef(channelId)
    .get(message.id)
    .put(gunEscape(message as unknown as Record<string, unknown>))
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeTribeChannel(
  tribeId: string,
  callback: (messages: Message[]) => void
): () => void {
  const msgMap = new Map<string, Message>()

  // Seed from IDB immediately (survives restarts, no Gun relay needed)
  loadCachedMessages(tribewideChannelId()).then(cached => {
    for (const m of cached) {
      if (m.tribeId === tribeId) msgMap.set(m.id, m)
    }
    if (msgMap.size > 0) callback(sortedMessages(msgMap))
  })

  const ref = tribeChannelRef(tribeId)

  function handleMsg(data: unknown, key: string) {
    if (!data || typeof data !== 'object' || key === '_') return
    const m = parseMessage(data)
    if (m) {
      msgMap.set(m.id, m)
      void cacheMessage(m)
      callback(sortedMessages(msgMap))
    }
  }

  ref.map().once(handleMsg)
  ref.map().on(handleMsg)
  const poll = window.setInterval(() => ref.map().once(handleMsg), 2000)

  return () => {
    ref.map().off()
    clearInterval(poll)
  }
}

export function subscribeDMChannel(
  channelId: string,
  callback: (messages: Message[]) => void
): () => void {
  const msgMap = new Map<string, Message>()

  // Seed from IDB immediately
  loadCachedMessages(channelId).then(cached => {
    for (const m of cached) msgMap.set(m.id, m)
    if (msgMap.size > 0) callback(sortedMessages(msgMap))
  })

  const ref = dmChannelRef(channelId)

  function handleMsg(data: unknown, key: string) {
    if (!data || typeof data !== 'object' || key === '_') return
    const m = parseMessage(data)
    if (m) {
      msgMap.set(m.id, m)
      void cacheMessage(m)
      callback(sortedMessages(msgMap))
    }
  }

  ref.map().once(handleMsg)
  ref.map().on(handleMsg)

  // Gun's map().on() doesn't reliably fire for peer-pushed messages in all environments.
  // Poll with once() every 2s as a fallback — handleMsg deduplicates by message ID.
  const poll = window.setInterval(() => ref.map().once(handleMsg), 2000)

  return () => {
    ref.map().off()
    clearInterval(poll)
  }
}

function parseMessage(data: unknown): Message | null {
  if (!data || typeof data !== 'object') return null
  const raw = gunUnescape(data as Record<string, unknown>)
  if (!raw.id || !raw.senderId || !raw.sentAt) return null

  let reactions: Record<string, string[]> | undefined
  if (raw.reactions) {
    try {
      reactions = typeof raw.reactions === 'string'
        ? JSON.parse(raw.reactions)
        : raw.reactions as Record<string, string[]>
    } catch { /* malformed — ignore */ }
  }

  return {
    id: raw.id as string,
    tribeId: (raw.tribeId as string) ?? '',
    channelId: (raw.channelId as string) ?? '',
    senderId: raw.senderId as string,
    type: (raw.type as Message['type']) ?? 'text',
    content: (raw.content as string) ?? '',
    mimeType: raw.mimeType as string | undefined,
    sentAt: raw.sentAt as number,
    deliveredAt: raw.deliveredAt as number | undefined,
    sig: (raw.sig as string) ?? '',
    replyTo: raw.replyTo as string | undefined,
    reactions,
  }
}

function sortedMessages(map: Map<string, Message>): Message[] {
  return Array.from(map.values()).sort((a, b) => a.sentAt - b.sentAt)
}

// ─── IDB cache ────────────────────────────────────────────────────────────────

async function cacheMessage(message: Message): Promise<void> {
  const db = await getDB()
  await db.put('messages', message as unknown, message.id)
}

export async function loadCachedMessages(channelId: string): Promise<Message[]> {
  const db = await getDB()
  const all = await db.getAll('messages')
  return (all as unknown as Message[])
    .filter(m => m.channelId === channelId)
    .sort((a, b) => a.sentAt - b.sentAt)
}

// ─── Offline queue ────────────────────────────────────────────────────────────

export async function queueMessage(message: Message): Promise<void> {
  const queued: QueuedMessage = {
    message,
    queuedAt: Date.now(),
    attempts: 0,
  }
  const db = await getDB()
  await db.put('queued-messages', queued as unknown, message.id)
}

const MAX_QUEUE_ATTEMPTS = 5

export async function flushQueue(): Promise<{ sent: number; dropped: number; remaining: number }> {
  const db = await getDB()
  const queued = await db.getAll('queued-messages') as unknown as QueuedMessage[]
  let sent = 0
  let dropped = 0

  for (const item of queued) {
    const { message } = item
    try {
      if (message.channelId === 'tribe-wide') {
        await writeMessage(message.tribeId, message.channelId, message)
      } else {
        await writeDM(message.channelId, message)
      }
      await cacheMessage(message)
      await db.delete('queued-messages', message.id)
      sent++
    } catch {
      const newAttempts = item.attempts + 1
      if (newAttempts >= MAX_QUEUE_ATTEMPTS) {
        // Give up after max attempts
        await db.delete('queued-messages', message.id)
        dropped++
      } else {
        await db.put('queued-messages', { ...item, attempts: newAttempts } as unknown, message.id)
      }
    }
  }

  const remaining = (await db.count('queued-messages'))
  return { sent, dropped, remaining }
}

export async function getQueueStats(): Promise<{ pending: number; maxAttempts: number }> {
  const db = await getDB()
  const pending = await db.count('queued-messages')
  return { pending, maxAttempts: MAX_QUEUE_ATTEMPTS }
}

// ─── Reactions ────────────────────────────────────────────────────────────────

async function applyReaction(messageId: string, emoji: string, pubkey: string): Promise<Record<string, string[]>> {
  const db = await getDB()
  const existing = await db.get('messages', messageId) as Message | undefined
  const reactions = { ...(existing?.reactions ?? {}) }
  const pubkeys = reactions[emoji] ?? []
  if (!pubkeys.includes(pubkey)) {
    reactions[emoji] = [...pubkeys, pubkey]
  }
  if (existing) {
    await db.put('messages', { ...existing, reactions } as unknown, messageId)
  }
  return reactions
}

export async function addTribeReaction(
  tribeId: string,
  messageId: string,
  emoji: string,
  pubkey: string
): Promise<void> {
  const reactions = await applyReaction(messageId, emoji, pubkey)
  tribeChannelRef(tribeId)
    .get(messageId)
    .put({ reactions: JSON.stringify(reactions) } as unknown as Record<string, unknown>)
}

export async function addDMReaction(
  channelId: string,
  messageId: string,
  emoji: string,
  pubkey: string
): Promise<void> {
  const reactions = await applyReaction(messageId, emoji, pubkey)
  dmChannelRef(channelId)
    .get(messageId)
    .put({ reactions: JSON.stringify(reactions) } as unknown as Record<string, unknown>)
}

// ─── Unread tracking ─────────────────────────────────────────────────────────

export async function markChannelRead(channelId: string): Promise<void> {
  const db = await getDB()
  await db.put('channel-reads', { channelId, lastReadAt: Date.now() }, channelId)
}

export async function getUnreadCount(channelId: string, messages: Message[]): Promise<number> {
  const db = await getDB()
  const read = await db.get('channel-reads', channelId) as { lastReadAt: number } | undefined
  if (!read) return messages.length
  return messages.filter(m => m.sentAt > read.lastReadAt).length
}
