import { nanoid } from 'nanoid'
import SEA from 'gun/sea'
import { gun } from './gun'
import { getDB } from './db'
import { notify } from './notifications'
import { updateAsset } from './inventory'
import { logConsumption } from './consumption'
import { convexWrite } from './sync-adapter'
import type {
  FederationRelationship,
  FederationRelationshipStatus,
  FederatedMessage,
  FederatedTradeProposal,
  FederatedAlert,
  TradeItem,
  TradeStatus,
} from '@plus-ultra/core'
import type { AssetType } from '@plus-ultra/core'

// ─── SEA helpers ──────────────────────────────────────────────────────────────

const sea = SEA as unknown as {
  secret: (epub: string, pair: unknown) => Promise<string>
  encrypt: (data: unknown, secret: string) => Promise<string>
  decrypt: (data: string, secret: string) => Promise<unknown>
}

// ─── Channel ID ───────────────────────────────────────────────────────────────

export function federationChannelId(tribeIdA: string, tribeIdB: string): string {
  return [tribeIdA, tribeIdB].sort().join(':')
}

// ─── Gun SEA-safe helpers ─────────────────────────────────────────────────────

function gunEscape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (typeof v === 'string' && v.startsWith('SEA{')) out[k] = '~' + v
    else out[k] = v
  }
  return out
}

function gunUnescape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.startsWith('~SEA{')) out[k] = v.slice(1)
    else out[k] = v
  }
  return out
}

// ─── Encryption helpers ───────────────────────────────────────────────────────

async function tribeSecret(
  otherEpub: string,
  myEpub: string,
  myEpriv: string,
): Promise<string> {
  return sea.secret(otherEpub, { epub: myEpub, epriv: myEpriv })
}

async function encryptForChannel(
  plaintext: string,
  myTribeEpub: string,
  myTribeEpriv: string,
  otherTribeEpub: string,
): Promise<string> {
  const secret = await tribeSecret(otherTribeEpub, myTribeEpub, myTribeEpriv)
  return sea.encrypt(plaintext, secret)
}

async function decryptFromChannel(
  ciphertext: string,
  myTribeEpub: string,
  myTribeEpriv: string,
  otherTribeEpub: string,
): Promise<string | null> {
  try {
    const secret = await tribeSecret(otherTribeEpub, myTribeEpub, myTribeEpriv)
    const result = await sea.decrypt(ciphertext, secret)
    if (result === undefined) return null
    return typeof result === 'string' ? result : JSON.stringify(result)
  } catch {
    return null
  }
}

// ─── Tribe key distribution ───────────────────────────────────────────────────

// Founder encrypts tribeEpriv for a diplomat using ECDH between actor's personal pair and diplomat's epub
export async function distributeTribeKey(
  tribeId: string,
  diplomatPub: string,
  diplomatEpub: string,
  tribeEpriv: string,
  myPersonalPair: { epub: string; epriv: string },
): Promise<void> {
  const secret = await sea.secret(diplomatEpub, myPersonalPair)
  const encrypted = await sea.encrypt(tribeEpriv, secret)
  gun
    .get('tribes').get(tribeId)
    .get('tribe-keys').get(diplomatPub)
    .put(gunEscape({ data: encrypted, encryptedBy: myPersonalPair.epub }) as unknown as Record<string, unknown>)
}

// Diplomat loads their copy of tribeEpriv from Gun
export async function loadTribeEpriv(
  tribeId: string,
  myPub: string,
  myPair: { epub: string; epriv: string },
): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 3000)
    gun.get('tribes').get(tribeId).get('tribe-keys').get(myPub).once((data: unknown) => {
      clearTimeout(timeout)
      if (!data || typeof data !== 'object') return resolve(null)
      const d = gunUnescape(data as Record<string, unknown>)
      if (!d.data || !d.encryptedBy) return resolve(null)
      sea.secret(d.encryptedBy as string, myPair).then(secret =>
        sea.decrypt(d.data as string, secret).then(result => {
          resolve(typeof result === 'string' ? result : null)
        })
      ).catch(() => resolve(null))
    })
  })
}

// Read tribeEpriv for a tribe from local my-tribes IDB record
export async function getLocalTribeEpriv(tribeId: string): Promise<string | null> {
  const db = await getDB()
  const record = await db.get('my-tribes', tribeId)
  return record?.tribeEpriv ?? null
}

export async function getLocalTribeEpub(tribeId: string): Promise<string | null> {
  const db = await getDB()
  const record = await db.get('my-tribes', tribeId)
  return record?.tribeEpub ?? null
}

// ─── Contact management ───────────────────────────────────────────────────────

export async function addFederationContact(
  myTribeId: string,
  myTribeName: string,
  contactCard: {
    tribeId: string
    name: string
    location: string
    pub: string
    epub: string
  },
  initiatedBy: string,
): Promise<FederationRelationship> {
  const channelId = federationChannelId(myTribeId, contactCard.tribeId)
  const now = Date.now()

  const rel: FederationRelationship = {
    channelId,
    myTribeId,
    otherTribeId: contactCard.tribeId,
    otherTribeName: contactCard.name,
    otherTribeLocation: contactCard.location,
    otherTribePub: contactCard.pub,
    otherTribeEpub: contactCard.epub,
    status: 'contact',
    initiatedBy,
    initiatedAt: now,
    updatedAt: now,
  }

  const db = await getDB()
  await db.put('federation-relationships', rel, `${myTribeId}:${channelId}`)
  void convexWrite('federation.upsertRelationship', { channelId, myTribeId, otherTribeId: contactCard.tribeId, otherTribeName: contactCard.name, otherTribeLocation: contactCard.location, otherTribePub: contactCard.pub, otherTribeEpub: contactCard.epub, status: 'contact', initiatedBy, initiatedAt: now, updatedAt: now })

  // Publish our status to the shared federation channel
  gun
    .get('federation').get(channelId)
    .get('status').get(myTribeId)
    .put(gunEscape({ status: 'contact', name: myTribeName, updatedAt: now }) as unknown as Record<string, unknown>)

  // Notify the other tribe we exist (plaintext contact announcement)
  gun
    .get('federation').get(channelId)
    .get('contacts').get(myTribeId)
    .put(gunEscape({ tribeId: myTribeId, name: myTribeName, addedAt: now }) as unknown as Record<string, unknown>)

  return rel
}

export async function updateRelationshipStatus(
  myTribeId: string,
  myTribeName: string,
  channelId: string,
  status: FederationRelationshipStatus,
): Promise<void> {
  const db = await getDB()
  const key = `${myTribeId}:${channelId}`
  const existing = (await db.get('federation-relationships', key)) as FederationRelationship | undefined
  if (!existing) return

  const updated: FederationRelationship = { ...existing, status, updatedAt: Date.now() }
  await db.put('federation-relationships', updated, key)
  void convexWrite('federation.upsertRelationship', { channelId, myTribeId, otherTribeId: existing.otherTribeId, otherTribeName: existing.otherTribeName, otherTribeLocation: existing.otherTribeLocation, otherTribePub: existing.otherTribePub, otherTribeEpub: existing.otherTribeEpub, status, initiatedBy: existing.initiatedBy, initiatedAt: existing.initiatedAt, updatedAt: updated.updatedAt })

  gun
    .get('federation').get(channelId)
    .get('status').get(myTribeId)
    .put(gunEscape({ status, name: myTribeName, updatedAt: updated.updatedAt }) as unknown as Record<string, unknown>)
}

// ─── Generate contact card URL ────────────────────────────────────────────────

export function buildContactCardUrl(tribe: {
  id: string
  name: string
  location: string
  pub: string
  epub: string
}): string {
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://app.plusultra.network'
  const params = new URLSearchParams({
    tribe: tribe.id,
    name: tribe.name,
    loc: tribe.location,
    pub: tribe.pub,
    epub: tribe.epub,
  })
  return `${base}/connect?${params.toString()}`
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function sendFederatedMessage(
  channelId: string,
  fromTribeId: string,
  fromTribeName: string,
  senderPub: string,
  senderName: string,
  type: 'text' | 'intel',
  plaintext: string,
  myTribeEpub: string,
  myTribeEpriv: string,
  otherTribeEpub: string,
): Promise<FederatedMessage> {
  const id = nanoid()
  const sentAt = Date.now()

  const ciphertext = await encryptForChannel(plaintext, myTribeEpub, myTribeEpriv, otherTribeEpub)

  const msg: FederatedMessage = {
    id,
    channelId,
    fromTribeId,
    fromTribeName,
    senderPub,
    senderName,
    type,
    content: plaintext,   // decrypted — stored in IDB
    sentAt,
  }

  const db = await getDB()
  await db.put('federation-messages', msg, `${channelId}:${id}`)
  void convexWrite('federation.sendMessage', { messageId: id, channelId, fromTribeId, fromTribeName, senderPub, senderName, type, content: ciphertext, sentAt })

  // Write encrypted version to Gun
  const gunPayload = {
    id,
    channelId,
    fromTribeId,
    fromTribeName,
    senderPub,
    senderName,
    type,
    content: ciphertext,  // encrypted — stored in Gun
    sentAt,
  }
  gun
    .get('federation').get(channelId)
    .get('messages').get(id)
    .put(gunEscape(gunPayload as unknown as Record<string, unknown>))

  return msg
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function sendFederatedAlert(
  channelId: string,
  fromTribeId: string,
  fromTribeName: string,
  alertType: string,
  message: string,
  myTribeEpub: string,
  myTribeEpriv: string,
  otherTribeEpub: string,
): Promise<void> {
  const id = nanoid()
  const sentAt = Date.now()

  const alert: FederatedAlert = { id, channelId, fromTribeId, fromTribeName, alertType, message, sentAt }

  const db = await getDB()
  // Alerts stored in IDB under federation-messages with a special key prefix
  await db.put('federation-messages', { ...alert, type: 'alert' }, `${channelId}:alert:${id}`)

  const ciphertext = await encryptForChannel(
    JSON.stringify({ alertType, message }),
    myTribeEpub,
    myTribeEpriv,
    otherTribeEpub,
  )

  gun
    .get('federation').get(channelId)
    .get('alerts').get(id)
    .put(gunEscape({ id, fromTribeId, fromTribeName, content: ciphertext, sentAt }) as unknown as Record<string, unknown>)
}

// ─── Trade proposals ──────────────────────────────────────────────────────────

export async function proposeTrade(
  channelId: string,
  fromTribeId: string,
  toTribeId: string,
  fromTribeName: string,
  toTribeName: string,
  offer: TradeItem[],
  request: TradeItem[],
  message: string,
  proposedBy: string,
): Promise<FederatedTradeProposal> {
  const id = nanoid()
  const now = Date.now()

  const proposal: FederatedTradeProposal = {
    id,
    channelId,
    fromTribeId,
    toTribeId,
    fromTribeName,
    toTribeName,
    offer,
    request,
    message,
    proposedBy,
    proposedAt: now,
    status: 'pending',
    lastRespondedByTribeId: fromTribeId,
  }

  const db = await getDB()
  await db.put('federation-trades', proposal, `${channelId}:${id}`)
  void convexWrite('federation.proposeTrade', { tradeId: id, channelId, fromTribeId, toTribeId, fromTribeName, toTribeName, offer, request, message, proposedBy, proposedAt: now, status: 'pending' })

  gun
    .get('federation').get(channelId)
    .get('trades').get(id)
    .put(gunEscape({
      ...proposal,
      offer: JSON.stringify(offer),
      request: JSON.stringify(request),
    } as unknown as Record<string, unknown>))

  // Notify other tribe
  await notify(toTribeId, {
    tribeId: toTribeId,
    type: 'trade_proposal',
    title: `Trade proposal from ${fromTribeName}`,
    body: message || `${fromTribeName} wants to trade resources`,
    targetPub: '*',
    actorPub: proposedBy,
    linkTo: `/tribe/${toTribeId}/federation/${channelId}`,
  }).catch(() => { /* fire and forget — other tribe's notification */ })

  return proposal
}

export async function respondToTrade(
  channelId: string,
  proposalId: string,
  myTribeId: string,
  response: 'accepted' | 'rejected' | 'countered',
  respondedBy: string,
  counterOffer?: { offer: TradeItem[]; request: TradeItem[] },
): Promise<void> {
  const db = await getDB()
  const key = `${channelId}:${proposalId}`
  const existing = (await db.get('federation-trades', key)) as FederatedTradeProposal | undefined
  if (!existing) return

  const now = Date.now()
  let newStatus: TradeStatus = response
  if (response === 'accepted') newStatus = 'accepted'
  else if (response === 'rejected') newStatus = 'rejected'
  else newStatus = 'countered'

  const updated: FederatedTradeProposal = {
    ...existing,
    status: newStatus,
    respondedAt: now,
    respondedBy,
    lastRespondedByTribeId: myTribeId,
    ...(counterOffer ? { counterOffer } : {}),
  }

  // If accepted by the receiving tribe, move to pending_fulfillment
  if (response === 'accepted' && myTribeId === existing.toTribeId) {
    updated.status = 'pending_fulfillment'
  }

  await db.put('federation-trades', updated, key)
  void convexWrite('federation.updateTradeStatus', { tradeId: proposalId, channelId, status: updated.status, respondedAt: now, respondedBy, counterOffer, lastRespondedByTribeId: myTribeId })

  const gunPatch: Record<string, unknown> = {
    status: updated.status,
    respondedAt: now,
    respondedBy,
    lastRespondedByTribeId: myTribeId,
  }
  if (counterOffer) {
    gunPatch.counterOffer = JSON.stringify(counterOffer)
  }

  gun
    .get('federation').get(channelId)
    .get('trades').get(proposalId)
    .put(gunEscape(gunPatch))
}

export async function confirmTradeFulfillment(
  channelId: string,
  proposalId: string,
  myTribeId: string,
  memberCount: number,
  myPub: string,
): Promise<void> {
  const db = await getDB()
  const key = `${channelId}:${proposalId}`
  const existing = (await db.get('federation-trades', key)) as FederatedTradeProposal | undefined
  if (!existing || existing.status !== 'pending_fulfillment') return

  const isFrom = myTribeId === existing.fromTribeId
  const updated: FederatedTradeProposal = {
    ...existing,
    fromFulfilled: isFrom ? true : existing.fromFulfilled,
    toFulfilled: !isFrom ? true : existing.toFulfilled,
  }

  const bothDone = updated.fromFulfilled && updated.toFulfilled
  if (bothDone) updated.status = 'fulfilled'

  await db.put('federation-trades', updated, key)
  void convexWrite('federation.updateTradeStatus', { tradeId: proposalId, channelId, status: updated.status, fromFulfilled: updated.fromFulfilled, toFulfilled: updated.toFulfilled })
  gun
    .get('federation').get(channelId)
    .get('trades').get(proposalId)
    .put(gunEscape({
      fromFulfilled: updated.fromFulfilled ?? null,
      toFulfilled: updated.toFulfilled ?? null,
      status: updated.status,
    } as Record<string, unknown>))

  // Apply inventory changes for this tribe's side
  const giveItems = isFrom ? existing.offer : existing.request
  const receiveItems = isFrom ? existing.request : existing.offer

  for (const item of giveItems) {
    await logConsumption(myTribeId, item.asset as AssetType, item.amount, 1, myPub, `Trade fulfillment (${channelId})`, memberCount)
      .catch(() => { /* ignore if inventory missing */ })
  }
  for (const item of receiveItems) {
    // Get current quantity and add
    const invKey = `${myTribeId}:${item.asset}`
    const inv = (await db.get('inventory', invKey)) as { quantity: number; notes: string } | undefined
    const newQty = (inv?.quantity ?? 0) + item.amount
    await updateAsset(myTribeId, item.asset as AssetType, newQty, inv?.notes ?? '', myPub)
  }
}

// ─── Subscriptions ─────────────────────────────────────────────────────────────

export function subscribeToFederationRelationships(
  myTribeId: string,
  callback: (relationships: FederationRelationship[]) => void,
): () => void {
  const relsMap = new Map<string, FederationRelationship>()

  getDB().then(db => db.getAll('federation-relationships')).then(all => {
    for (const raw of all) {
      const r = raw as FederationRelationship
      if (r.myTribeId === myTribeId && r.channelId) relsMap.set(r.channelId, r)
    }
    if (relsMap.size > 0) callback(Array.from(relsMap.values()))
  })

  // Subscribe to status updates from other tribes on all known channels
  // (we poll Gun for each channel we know about)
  function pollChannels() {
    for (const [channelId, rel] of relsMap) {
      gun
        .get('federation').get(channelId)
        .get('status').get(rel.otherTribeId)
        .once((data: unknown) => {
          if (!data || typeof data !== 'object') return
          const d = gunUnescape(data as Record<string, unknown>)
          const otherStatus = d.status as FederationRelationshipStatus | undefined
          if (!otherStatus) return
          // Only update their status in our view — we don't change our own status here
          // The "otherStatus" is informational; our status is what we set
          const existing = relsMap.get(channelId)
          if (existing && d.name && existing.otherTribeName !== d.name) {
            const updated = { ...existing, otherTribeName: d.name as string }
            relsMap.set(channelId, updated)
            getDB().then(db => db.put('federation-relationships', updated, `${myTribeId}:${channelId}`))
            callback(Array.from(relsMap.values()))
          }
        })
    }
  }

  const poll = setInterval(pollChannels, 5000)

  return () => { clearInterval(poll) }
}

export function subscribeToFederatedMessages(
  channelId: string,
  myTribeEpub: string,
  myTribeEpriv: string,
  otherTribeEpub: string,
  callback: (messages: FederatedMessage[]) => void,
): () => void {
  const msgsMap = new Map<string, FederatedMessage>()

  // Seed from IDB (already decrypted)
  getDB().then(db => db.getAll('federation-messages')).then(all => {
    for (const raw of all) {
      const m = raw as FederatedMessage
      if (m.channelId === channelId && m.id && (m.type === 'text' || m.type === 'intel')) msgsMap.set(m.id, m)
    }
    if (msgsMap.size > 0) callback(sorted(msgsMap))
  })

  const ref = gun.get('federation').get(channelId).get('messages')

  async function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      msgsMap.delete(key)
      callback(sorted(msgsMap))
      return
    }
    const d = gunUnescape(data as Record<string, unknown>)
    if (!d.id || !d.fromTribeId) return

    const decrypted = await decryptFromChannel(
      d.content as string,
      myTribeEpub,
      myTribeEpriv,
      otherTribeEpub,
    )
    if (decrypted === null) return

    const msg: FederatedMessage = {
      id: d.id as string,
      channelId: (d.channelId as string) ?? channelId,
      fromTribeId: d.fromTribeId as string,
      fromTribeName: (d.fromTribeName as string) ?? '',
      senderPub: (d.senderPub as string) ?? '',
      senderName: (d.senderName as string) ?? '',
      type: (d.type as 'text' | 'intel') ?? 'text',
      content: decrypted,
      sentAt: (d.sentAt as number) ?? 0,
    }
    msgsMap.set(key, msg)
    getDB().then(db => db.put('federation-messages', msg, `${channelId}:${key}`))
    callback(sorted(msgsMap))
  }

  ref.map().once(handle)
  ref.map().on(handle)
  const poll = setInterval(() => ref.map().once(handle), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}

export function subscribeToFederatedTrades(
  channelId: string,
  callback: (proposals: FederatedTradeProposal[]) => void,
): () => void {
  const tradesMap = new Map<string, FederatedTradeProposal>()

  getDB().then(db => db.getAll('federation-trades')).then(all => {
    for (const raw of all) {
      const t = raw as FederatedTradeProposal
      if (t.channelId === channelId && t.id) tradesMap.set(t.id, t)
    }
    if (tradesMap.size > 0) callback(Array.from(tradesMap.values()))
  })

  const ref = gun.get('federation').get(channelId).get('trades')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      tradesMap.delete(key)
      callback(Array.from(tradesMap.values()))
      return
    }
    const d = gunUnescape(data as Record<string, unknown>)
    if (!d.id || !d.fromTribeId) return

    const parseItems = (v: unknown): TradeItem[] => {
      if (typeof v === 'string') {
        try { return JSON.parse(v) as TradeItem[] } catch { return [] }
      }
      return Array.isArray(v) ? (v as TradeItem[]) : []
    }

    const existing = tradesMap.get(key)
    const proposal: FederatedTradeProposal = {
      id: d.id as string,
      channelId: (d.channelId as string) ?? channelId,
      fromTribeId: d.fromTribeId as string,
      toTribeId: (d.toTribeId as string) ?? '',
      fromTribeName: (d.fromTribeName as string) ?? '',
      toTribeName: (d.toTribeName as string) ?? '',
      offer: parseItems(d.offer),
      request: parseItems(d.request),
      message: (d.message as string) ?? '',
      proposedBy: (d.proposedBy as string) ?? '',
      proposedAt: (d.proposedAt as number) ?? 0,
      status: (d.status as TradeStatus) ?? 'pending',
      respondedAt: d.respondedAt as number | undefined,
      respondedBy: d.respondedBy as string | undefined,
      lastRespondedByTribeId: d.lastRespondedByTribeId as string | undefined,
      fromFulfilled: d.fromFulfilled === true ? true : (existing?.fromFulfilled ?? undefined),
      toFulfilled: d.toFulfilled === true ? true : (existing?.toFulfilled ?? undefined),
    }
    if (d.counterOffer) {
      const co = typeof d.counterOffer === 'string' ? JSON.parse(d.counterOffer as string) : d.counterOffer
      proposal.counterOffer = co as { offer: TradeItem[]; request: TradeItem[] }
    }

    tradesMap.set(key, proposal)
    getDB().then(db => db.put('federation-trades', proposal, `${channelId}:${key}`))
    callback(Array.from(tradesMap.values()))
  }

  ref.map().once(handle)
  ref.map().on(handle)
  const poll = setInterval(() => ref.map().once(handle), 2000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}

export function subscribeToFederatedAlerts(
  relationships: FederationRelationship[],
  myTribeEpub: string,
  myTribeEpriv: string,
  callback: (alerts: FederatedAlert[]) => void,
): () => void {
  const alertsMap = new Map<string, FederatedAlert>()
  const cleanups: (() => void)[] = []

  const allied = relationships.filter(r => r.status === 'allied')

  for (const rel of allied) {
    const ref = gun.get('federation').get(rel.channelId).get('alerts')

    async function handle(data: unknown, key: string) {
      if (key === '_') return
      if (!data || typeof data !== 'object') return
      const d = gunUnescape(data as Record<string, unknown>)
      if (!d.id || !d.fromTribeId) return
      if (alertsMap.has(key)) return  // dedup

      const decrypted = await decryptFromChannel(
        d.content as string,
        myTribeEpub,
        myTribeEpriv,
        rel.otherTribeEpub,
      )
      if (!decrypted) return

      let parsed: { alertType?: string; message?: string }
      try { parsed = JSON.parse(decrypted) } catch { parsed = {} }

      const alert: FederatedAlert = {
        id: d.id as string,
        channelId: rel.channelId,
        fromTribeId: d.fromTribeId as string,
        fromTribeName: (d.fromTribeName as string) ?? rel.otherTribeName,
        alertType: parsed.alertType ?? 'emergency',
        message: parsed.message ?? '',
        sentAt: (d.sentAt as number) ?? 0,
      }
      alertsMap.set(key, alert)
      callback(Array.from(alertsMap.values()))
    }

    ref.map().on(handle)
    cleanups.push(() => ref.map().off())
  }

  return () => { cleanups.forEach(fn => fn()) }
}

function sorted(map: Map<string, FederatedMessage>): FederatedMessage[] {
  return Array.from(map.values()).sort((a, b) => a.sentAt - b.sentAt)
}
