import { nanoid } from 'nanoid'
import SEA from 'gun/sea'
import { gun } from './gun'
import { getDB } from './db'
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
  mimeType?: string
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
  }

  await writeMessage(tribeId, 'tribe-wide', message)
  await cacheMessage(message)
}

export async function sendDM(
  tribeId: string,
  senderId: string,
  senderPair: { pub: string; priv: string; epub: string; epriv: string },
  recipientPub: string,
  recipientEpub: string,
  type: Message['type'],
  content: string,
  mimeType?: string
): Promise<void> {
  const id = nanoid()
  const sentAt = Date.now()
  const channelId = dmChannelId(senderId, recipientPub)

  // Encrypt content for DM
  const sharedSecret = await (SEA as unknown as {
    secret: (epub: string, pair: unknown) => Promise<string>
  }).secret(recipientEpub, senderPair)

  const encryptedContent = await (SEA as unknown as {
    encrypt: (data: string, secret: string) => Promise<string>
  }).encrypt(content, sharedSecret)

  const sig = await (SEA as unknown as {
    sign: (data: string, pair: unknown) => Promise<string>
  }).sign(content.slice(0, 512), senderPair) ?? ''

  const message: Message = {
    id,
    tribeId,
    channelId,
    senderId,
    type,
    content: encryptedContent,
    mimeType,
    sentAt,
    sig,
  }

  await writeDM(channelId, message)
  await cacheMessage(message)
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

// ─── Gun write helpers ────────────────────────────────────────────────────────

async function writeMessage(tribeId: string, _channelId: string, message: Message): Promise<void> {
  tribeChannelRef(tribeId)
    .get(message.id)
    .put(message as unknown as Record<string, unknown>)
}

async function writeDM(channelId: string, message: Message): Promise<void> {
  dmChannelRef(channelId)
    .get(message.id)
    .put(message as unknown as Record<string, unknown>)
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeTribeChannel(
  tribeId: string,
  callback: (messages: Message[]) => void
): () => void {
  const msgMap = new Map<string, Message>()

  const ref = tribeChannelRef(tribeId)
  ref.map().on((data: unknown, key: string) => {
    if (!data || typeof data !== 'object' || key === '_') return
    const m = parseMessage(data)
    if (m) {
      msgMap.set(m.id, m)
      callback(sortedMessages(msgMap))
    }
  })

  return () => ref.map().off()
}

export function subscribeDMChannel(
  channelId: string,
  callback: (messages: Message[]) => void
): () => void {
  const msgMap = new Map<string, Message>()

  const ref = dmChannelRef(channelId)
  ref.map().on((data: unknown, key: string) => {
    if (!data || typeof data !== 'object' || key === '_') return
    const m = parseMessage(data)
    if (m) {
      msgMap.set(m.id, m)
      callback(sortedMessages(msgMap))
    }
  })

  return () => ref.map().off()
}

function parseMessage(data: unknown): Message | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (!d.id || !d.senderId || !d.sentAt) return null
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? '',
    channelId: (d.channelId as string) ?? '',
    senderId: d.senderId as string,
    type: (d.type as Message['type']) ?? 'text',
    content: (d.content as string) ?? '',
    mimeType: d.mimeType as string | undefined,
    sentAt: d.sentAt as number,
    deliveredAt: d.deliveredAt as number | undefined,
    sig: (d.sig as string) ?? '',
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

export async function flushQueue(): Promise<void> {
  const db = await getDB()
  const queued = await db.getAll('queued-messages') as unknown as QueuedMessage[]
  for (const item of queued) {
    try {
      const { message } = item
      if (message.channelId === 'tribe-wide') {
        await writeMessage(message.tribeId, message.channelId, message)
      } else {
        await writeDM(message.channelId, message)
      }
      await cacheMessage(message)
      await db.delete('queued-messages', message.id)
    } catch {
      // Will retry next flush
    }
  }
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
