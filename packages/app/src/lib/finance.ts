import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import type { TribeExpense, FundContribution, ExpenseCategory } from '@plus-ultra/core'

// ─── Gun SEA-safe helpers (inlined per project convention) ────────────────────

function gunEscape(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (typeof v === 'string' && v.startsWith('SEA{')) {
      out[k] = '~' + v
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
      out[k] = v.slice(1)
    } else {
      out[k] = v
    }
  }
  return out
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

function parseExpense(d: Record<string, unknown>, tribeId: string): TribeExpense | null {
  if (!d.id || !d.description) return null
  let splitAmong: string[] = []
  try { splitAmong = JSON.parse((d.splitAmongJson as string) ?? '[]') } catch { /* ignore */ }
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    category: (d.category as ExpenseCategory) ?? 'other',
    description: d.description as string,
    amountCents: (d.amountCents as number) ?? 0,
    currency: (d.currency as string) ?? 'USD',
    paidBy: (d.paidBy as string) ?? '',
    splitAmong,
    linkedAssetType: (d.linkedAssetType as string) || undefined,
    receiptNote: (d.receiptNote as string) || undefined,
    loggedAt: (d.loggedAt as number) ?? 0,
    loggedBy: (d.loggedBy as string) ?? '',
  }
}

function expenseToGunRecord(e: TribeExpense): Record<string, unknown> {
  const { splitAmong, ...rest } = e
  return {
    ...rest,
    splitAmongJson: JSON.stringify(splitAmong),
  }
}

function parseContribution(d: Record<string, unknown>, tribeId: string): FundContribution | null {
  if (!d.id || !d.memberPub) return null
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    memberPub: d.memberPub as string,
    amountCents: (d.amountCents as number) ?? 0,
    currency: (d.currency as string) ?? 'USD',
    note: (d.note as string) || undefined,
    contributedAt: (d.contributedAt as number) ?? 0,
  }
}

// ─── CRUD: Expenses ───────────────────────────────────────────────────────────

export async function logExpense(
  tribeId: string,
  fields: {
    category: ExpenseCategory
    description: string
    amountDollars: number
    currency?: string
    paidBy: string
    splitAmong: string[]
    linkedAssetType?: string
    receiptNote?: string
  },
  loggedBy: string
): Promise<string> {
  const id = nanoid()
  const expense: TribeExpense = {
    id,
    tribeId,
    category: fields.category,
    description: fields.description,
    amountCents: Math.round(fields.amountDollars * 100),
    currency: fields.currency ?? 'USD',
    paidBy: fields.paidBy,
    splitAmong: fields.splitAmong,
    linkedAssetType: fields.linkedAssetType,
    receiptNote: fields.receiptNote,
    loggedAt: Date.now(),
    loggedBy,
  }

  const db = await getDB()
  await db.put('tribe-expenses', expense, `${tribeId}:${id}`)
  const expensePayload = gunEscape(expenseToGunRecord(expense))
  gun.get('tribes').get(tribeId).get('expenses').get(id)
    .put(expensePayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `expenses:${tribeId}:${id}:${Date.now()}`,
      gunStore: 'expenses', tribeId, recordKey: id,
      payload: expensePayload,
      queuedAt: Date.now(),
    })
  }

  return id
}

export async function deleteExpense(tribeId: string, expenseId: string): Promise<void> {
  const db = await getDB()
  await db.delete('tribe-expenses', `${tribeId}:${expenseId}`)
  gun.get('tribes').get(tribeId).get('expenses').get(expenseId).put(null)
}

// ─── CRUD: Contributions ──────────────────────────────────────────────────────

export async function logContribution(
  tribeId: string,
  fields: {
    memberPub: string
    amountDollars: number
    currency?: string
    note?: string
  }
): Promise<string> {
  const id = nanoid()
  const contribution: FundContribution = {
    id,
    tribeId,
    memberPub: fields.memberPub,
    amountCents: Math.round(fields.amountDollars * 100),
    currency: fields.currency ?? 'USD',
    note: fields.note,
    contributedAt: Date.now(),
  }

  const db = await getDB()
  await db.put('tribe-contributions', contribution, `${tribeId}:${id}`)
  const contributionPayload = gunEscape(contribution as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('contributions').get(id)
    .put(contributionPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `contributions:${tribeId}:${id}:${Date.now()}`,
      gunStore: 'contributions', tribeId, recordKey: id,
      payload: contributionPayload,
      queuedAt: Date.now(),
    })
  }

  return id
}

export async function deleteContribution(tribeId: string, contributionId: string): Promise<void> {
  const db = await getDB()
  await db.delete('tribe-contributions', `${tribeId}:${contributionId}`)
  gun.get('tribes').get(tribeId).get('contributions').get(contributionId).put(null)
}

// ─── Balance computation ──────────────────────────────────────────────────────

export function computeMemberBalance(
  memberPub: string,
  expenses: TribeExpense[],
  contributions: FundContribution[]
): number {
  let balance = 0
  for (const e of expenses.filter(e => e.currency === 'USD')) {
    const n = Math.max(e.splitAmong.length, 1)
    if (e.paidBy === memberPub) {
      const othersCount = e.splitAmong.includes(memberPub) ? n - 1 : n
      balance += Math.round(e.amountCents * othersCount / n)
    } else if (e.splitAmong.includes(memberPub)) {
      balance -= Math.round(e.amountCents / n)
    }
  }
  for (const c of contributions.filter(c => c.currency === 'USD')) {
    if (c.memberPub === memberPub) balance += c.amountCents
  }
  return balance
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeToExpenses(
  tribeId: string,
  callback: (expenses: TribeExpense[]) => void
): () => void {
  const map = new Map<string, TribeExpense>()

  getDB().then(async db => {
    const all = await db.getAllKeys('tribe-expenses')
    const prefix = `${tribeId}:`
    for (const k of all) {
      if (!String(k).startsWith(prefix)) continue
      const v = await db.get('tribe-expenses', k)
      if (v) {
        const e = v as TribeExpense
        if (e.id) map.set(e.id, e)
      }
    }
    if (map.size > 0) callback(Array.from(map.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('expenses')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      map.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const e = parseExpense(raw, tribeId)
      if (e) {
        map.set(key, e)
        getDB().then(db => db.put('tribe-expenses', e, `${tribeId}:${key}`))
      }
    }
    callback(Array.from(map.values()))
  }

  ref.map().once(handle)
  ref.map().on(handle)
  const poll = setInterval(() => ref.map().once(handle), 5000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}

export function subscribeToContributions(
  tribeId: string,
  callback: (contributions: FundContribution[]) => void
): () => void {
  const map = new Map<string, FundContribution>()

  getDB().then(async db => {
    const all = await db.getAllKeys('tribe-contributions')
    const prefix = `${tribeId}:`
    for (const k of all) {
      if (!String(k).startsWith(prefix)) continue
      const v = await db.get('tribe-contributions', k)
      if (v) {
        const c = v as FundContribution
        if (c.id) map.set(c.id, c)
      }
    }
    if (map.size > 0) callback(Array.from(map.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('contributions')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      map.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const c = parseContribution(raw, tribeId)
      if (c) {
        map.set(key, c)
        getDB().then(db => db.put('tribe-contributions', c, `${tribeId}:${key}`))
      }
    }
    callback(Array.from(map.values()))
  }

  ref.map().once(handle)
  ref.map().on(handle)
  const poll = setInterval(() => ref.map().once(handle), 5000)

  return () => {
    clearInterval(poll)
    ref.map().off()
  }
}
