import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { sendAlert, notify } from './notifications'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import { convexWrite } from './sync-adapter'
import type { BugOutPlan } from '@plus-ultra/core'

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

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function saveBugOutPlan(
  tribeId: string,
  plan: Omit<BugOutPlan, 'id'> & { id?: string }
): Promise<string> {
  const id = plan.id ?? nanoid()
  const full: BugOutPlan = { ...plan, id, tribeId }

  const db = await getDB()
  await db.put('bugout-plans', full, `${tribeId}:${id}`)
  void convexWrite('bugout.upsert', { planId: id, tribeId, name: full.name, status: full.status as 'draft' | 'ready' | 'active', triggerCondition: full.triggerCondition, routeId: full.routeId, vehicles: full.vehiclesJson ? JSON.parse(full.vehiclesJson) : [], loadPriorities: full.loadPrioritiesJson ? JSON.parse(full.loadPrioritiesJson) : [], rallyPointIds: full.rallyPointIdsJson ? JSON.parse(full.rallyPointIdsJson) : [], notes: full.notes, activatedAt: full.activatedAt, activatedBy: full.activatedBy, createdAt: full.createdAt ?? Date.now(), createdBy: full.createdBy ?? '', updatedAt: full.updatedAt ?? Date.now() })

  const bugoutPayload = gunEscape(full as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('bugout-plans').get(id)
    .put(bugoutPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `bugout-plans:${tribeId}:${id}:${Date.now()}`,
      gunStore: 'bugout-plans', tribeId, recordKey: id,
      payload: bugoutPayload,
      convexMutation: 'bugout.upsert',
      convexArgs: { planId: id, tribeId, name: full.name, status: full.status as 'draft' | 'ready' | 'active', triggerCondition: full.triggerCondition, routeId: full.routeId, vehicles: full.vehiclesJson ? JSON.parse(full.vehiclesJson) : [], loadPriorities: full.loadPrioritiesJson ? JSON.parse(full.loadPrioritiesJson) : [], rallyPointIds: full.rallyPointIdsJson ? JSON.parse(full.rallyPointIdsJson) : [], notes: full.notes, activatedAt: full.activatedAt, activatedBy: full.activatedBy, createdAt: full.createdAt ?? Date.now(), createdBy: full.createdBy ?? '', updatedAt: full.updatedAt ?? Date.now() },
      queuedAt: Date.now(),
    })
  }

  return id
}

export async function deleteBugOutPlan(tribeId: string, planId: string): Promise<void> {
  const db = await getDB()
  await db.delete('bugout-plans', `${tribeId}:${planId}`)

  gun.get('tribes').get(tribeId).get('bugout-plans').get(planId).put(null)
}

export async function activateBugOutPlan(
  tribeId: string,
  planId: string,
  activatorPub: string
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('bugout-plans', `${tribeId}:${planId}`)
  if (!existing) return

  const plan = existing as BugOutPlan
  const updated: BugOutPlan = {
    ...plan,
    status: 'active',
    activatedAt: Date.now(),
    activatedBy: activatorPub,
    updatedAt: Date.now(),
  }

  await db.put('bugout-plans', updated, `${tribeId}:${planId}`)
  void convexWrite('bugout.upsert', { planId, tribeId, name: updated.name, status: 'active' as const, triggerCondition: updated.triggerCondition, routeId: updated.routeId, vehicles: updated.vehiclesJson ? JSON.parse(updated.vehiclesJson) : [], loadPriorities: updated.loadPrioritiesJson ? JSON.parse(updated.loadPrioritiesJson) : [], rallyPointIds: updated.rallyPointIdsJson ? JSON.parse(updated.rallyPointIdsJson) : [], notes: updated.notes, activatedAt: updated.activatedAt, activatedBy: updated.activatedBy, createdAt: updated.createdAt, createdBy: updated.createdBy, updatedAt: updated.updatedAt ?? Date.now() })
  const activatePayload = gunEscape(updated as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('bugout-plans').get(planId)
    .put(activatePayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `bugout-plans:${tribeId}:${planId}:${Date.now()}`,
      gunStore: 'bugout-plans', tribeId, recordKey: planId,
      payload: activatePayload,
      convexMutation: 'bugout.upsert',
      convexArgs: { planId, tribeId, name: updated.name, status: 'active' as const, triggerCondition: updated.triggerCondition, routeId: updated.routeId, vehicles: updated.vehiclesJson ? JSON.parse(updated.vehiclesJson) : [], loadPriorities: updated.loadPrioritiesJson ? JSON.parse(updated.loadPrioritiesJson) : [], rallyPointIds: updated.rallyPointIdsJson ? JSON.parse(updated.rallyPointIdsJson) : [], notes: updated.notes, activatedAt: updated.activatedAt, activatedBy: updated.activatedBy, createdAt: updated.createdAt, createdBy: updated.createdBy, updatedAt: updated.updatedAt ?? Date.now() },
      queuedAt: Date.now(),
    })
  }

  await sendAlert(tribeId, 'bug_out', `Bug-Out plan activated: ${plan.name}`, activatorPub, '')
  await notify(tribeId, {
    tribeId,
    type: 'bugout_activated',
    title: 'Bug Out!',
    body: plan.name,
    targetPub: '*',
    actorPub: activatorPub,
    linkTo: `/tribe/${tribeId}/bugout`,
  })
}

// ─── Subscription ─────────────────────────────────────────────────────────────

function parsePlan(d: Record<string, unknown>, tribeId: string): BugOutPlan | null {
  if (!d.id || !d.name) return null
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    name: d.name as string,
    status: (d.status as BugOutPlan['status']) ?? 'draft',
    triggerCondition: (d.triggerCondition as string) ?? '',
    routeId: (d.routeId as string) || undefined,
    vehiclesJson: (d.vehiclesJson as string) ?? '[]',
    loadPrioritiesJson: (d.loadPrioritiesJson as string) ?? '[]',
    rallyPointIdsJson: (d.rallyPointIdsJson as string) ?? '[]',
    notes: (d.notes as string) || undefined,
    activatedAt: (d.activatedAt as number) || undefined,
    activatedBy: (d.activatedBy as string) || undefined,
    createdAt: (d.createdAt as number) ?? 0,
    createdBy: (d.createdBy as string) ?? '',
    updatedAt: (d.updatedAt as number) ?? 0,
  }
}

export function subscribeToBugOutPlans(
  tribeId: string,
  callback: (plans: BugOutPlan[]) => void
): () => void {
  const map = new Map<string, BugOutPlan>()

  getDB().then(async db => {
    const all = await db.getAllKeys('bugout-plans')
    const prefix = `${tribeId}:`
    for (const k of all) {
      if (!String(k).startsWith(prefix)) continue
      const v = await db.get('bugout-plans', k)
      if (v) {
        const p = v as BugOutPlan
        if (p.id) map.set(p.id, p)
      }
    }
    if (map.size > 0) callback(Array.from(map.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('bugout-plans')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      map.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const p = parsePlan(raw, tribeId)
      if (p) {
        map.set(key, p)
        getDB().then(db => db.put('bugout-plans', p, `${tribeId}:${key}`))
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
