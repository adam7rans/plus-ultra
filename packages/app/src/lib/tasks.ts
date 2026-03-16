import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { notify } from './notifications'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import type { TribeGoal, GoalMilestone, TribeTask, GoalHorizon, TaskStatus, TaskPriority } from '@plus-ultra/core'

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

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function createGoal(
  tribeId: string,
  fields: {
    title: string
    description?: string
    horizon: GoalHorizon
    linkedProposalId?: string
    creatorPub: string
  }
): Promise<string> {
  const id = nanoid()
  const now = Date.now()
  const goal: TribeGoal = {
    id,
    tribeId,
    title: fields.title,
    description: fields.description,
    horizon: fields.horizon,
    status: 'active',
    linkedProposalId: fields.linkedProposalId,
    createdAt: now,
    createdBy: fields.creatorPub,
    updatedAt: now,
  }

  const db = await getDB()
  await db.put('tribe-goals', goal, `${tribeId}:${id}`)

  const goalPayload = gunEscape(goal as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('goals').get(id)
    .put(goalPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `goals:${tribeId}:${id}:${Date.now()}`,
      gunStore: 'goals', tribeId, recordKey: id,
      payload: goalPayload,
      queuedAt: Date.now(),
    })
  }

  await notify(tribeId, {
    tribeId,
    type: 'goal_created',
    title: 'New goal',
    body: fields.title,
    targetPub: '*',
    actorPub: fields.creatorPub,
    linkTo: `/tribe/${tribeId}/goals`,
  })

  return id
}

export async function updateGoal(
  tribeId: string,
  goalId: string,
  patch: Partial<TribeGoal>
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('tribe-goals', `${tribeId}:${goalId}`)
  if (!existing) return

  const updated = { ...(existing as TribeGoal), ...patch, updatedAt: Date.now() }
  await db.put('tribe-goals', updated, `${tribeId}:${goalId}`)

  const updatedGoalPayload = gunEscape(updated as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('goals').get(goalId)
    .put(updatedGoalPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `goals:${tribeId}:${goalId}:${Date.now()}`,
      gunStore: 'goals', tribeId, recordKey: goalId,
      payload: updatedGoalPayload,
      queuedAt: Date.now(),
    })
  }
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function createMilestone(
  tribeId: string,
  goalId: string,
  fields: { title: string; dueDate?: number }
): Promise<string> {
  const id = nanoid()
  const milestone: GoalMilestone = {
    id,
    goalId,
    tribeId,
    title: fields.title,
    dueDate: fields.dueDate,
    createdAt: Date.now(),
  }

  const db = await getDB()
  await db.put('goal-milestones', milestone, `${tribeId}:${id}`)

  const milestonePayload = gunEscape(milestone as unknown as Record<string, unknown>)
  gun.get('tribes').get(tribeId).get('milestones').get(id)
    .put(milestonePayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `milestones:${tribeId}:${id}:${Date.now()}`,
      gunStore: 'milestones', tribeId, recordKey: id,
      payload: milestonePayload,
      queuedAt: Date.now(),
    })
  }

  return id
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function createTask(
  tribeId: string,
  fields: {
    goalId?: string
    milestoneId?: string
    title: string
    description?: string
    priority: TaskPriority
    assignedTo: string[]
    dueDate?: number
    creatorPub: string
  }
): Promise<string> {
  const id = nanoid()
  const now = Date.now()
  const task: TribeTask = {
    id,
    tribeId,
    goalId: fields.goalId,
    milestoneId: fields.milestoneId,
    title: fields.title,
    description: fields.description,
    status: 'todo',
    priority: fields.priority,
    assignedTo: fields.assignedTo,
    dueDate: fields.dueDate,
    createdAt: now,
    createdBy: fields.creatorPub,
    updatedAt: now,
  }

  const flatTask = {
    ...task,
    assignedToJson: JSON.stringify(task.assignedTo),
  } as unknown as Record<string, unknown>
  delete (flatTask as Record<string, unknown>).assignedTo

  const db = await getDB()
  await db.put('tribe-tasks', task, `${tribeId}:${id}`)

  const taskPayload = gunEscape(flatTask)
  gun.get('tribes').get(tribeId).get('tasks').get(id)
    .put(taskPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `tasks:${tribeId}:${id}:${Date.now()}`,
      gunStore: 'tasks', tribeId, recordKey: id,
      payload: taskPayload,
      queuedAt: Date.now(),
    })
  }

  // Notify each assignee
  for (const pub of fields.assignedTo) {
    await notify(tribeId, {
      tribeId,
      type: 'task_assigned',
      title: 'Task assigned',
      body: fields.title,
      targetPub: pub,
      actorPub: fields.creatorPub,
      linkTo: `/tribe/${tribeId}/goals`,
    })
  }

  return id
}

export async function updateTask(
  tribeId: string,
  taskId: string,
  patch: Partial<TribeTask>
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('tribe-tasks', `${tribeId}:${taskId}`)
  if (!existing) return

  const updated = { ...(existing as TribeTask), ...patch, updatedAt: Date.now() }
  await db.put('tribe-tasks', updated, `${tribeId}:${taskId}`)

  const flatTask = {
    ...updated,
    assignedToJson: JSON.stringify(updated.assignedTo),
  } as unknown as Record<string, unknown>
  delete (flatTask as Record<string, unknown>).assignedTo

  const updatedTaskPayload = gunEscape(flatTask)
  gun.get('tribes').get(tribeId).get('tasks').get(taskId)
    .put(updatedTaskPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `tasks:${tribeId}:${taskId}:${Date.now()}`,
      gunStore: 'tasks', tribeId, recordKey: taskId,
      payload: updatedTaskPayload,
      queuedAt: Date.now(),
    })
  }
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

function parseGoal(d: Record<string, unknown>, tribeId: string): TribeGoal | null {
  if (!d.id || !d.title) return null
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    title: d.title as string,
    description: (d.description as string) || undefined,
    horizon: (d.horizon as TribeGoal['horizon']) ?? 'short_term',
    status: (d.status as TribeGoal['status']) ?? 'active',
    linkedProposalId: (d.linkedProposalId as string) || undefined,
    createdAt: (d.createdAt as number) ?? 0,
    createdBy: (d.createdBy as string) ?? '',
    updatedAt: (d.updatedAt as number) ?? 0,
  }
}

function parseMilestone(d: Record<string, unknown>, tribeId: string): GoalMilestone | null {
  if (!d.id || !d.title) return null
  return {
    id: d.id as string,
    goalId: (d.goalId as string) ?? '',
    tribeId: (d.tribeId as string) ?? tribeId,
    title: d.title as string,
    dueDate: (d.dueDate as number) || undefined,
    completedAt: (d.completedAt as number) || undefined,
    createdAt: (d.createdAt as number) ?? 0,
  }
}

function parseTask(d: Record<string, unknown>, tribeId: string): TribeTask | null {
  if (!d.id || !d.title) return null
  let assignedTo: string[] = []
  try {
    assignedTo = JSON.parse((d.assignedToJson as string) ?? '[]')
  } catch { /* empty */ }
  return {
    id: d.id as string,
    tribeId: (d.tribeId as string) ?? tribeId,
    goalId: (d.goalId as string) || undefined,
    milestoneId: (d.milestoneId as string) || undefined,
    title: d.title as string,
    description: (d.description as string) || undefined,
    status: (d.status as TaskStatus) ?? 'todo',
    priority: (d.priority as TaskPriority) ?? 'normal',
    assignedTo,
    dueDate: (d.dueDate as number) || undefined,
    completedAt: (d.completedAt as number) || undefined,
    createdAt: (d.createdAt as number) ?? 0,
    createdBy: (d.createdBy as string) ?? '',
    updatedAt: (d.updatedAt as number) ?? 0,
  }
}

export function subscribeToGoals(
  tribeId: string,
  callback: (goals: TribeGoal[]) => void
): () => void {
  const map = new Map<string, TribeGoal>()

  getDB().then(async db => {
    const all = await db.getAllKeys('tribe-goals')
    const prefix = `${tribeId}:`
    for (const k of all) {
      if (!String(k).startsWith(prefix)) continue
      const v = await db.get('tribe-goals', k)
      if (v) {
        const g = v as TribeGoal
        if (g.id) map.set(g.id, g)
      }
    }
    if (map.size > 0) callback(Array.from(map.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('goals')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      map.delete(key)
      callback(Array.from(map.values()))
      return
    }
    const raw = gunUnescape(data as Record<string, unknown>)
    const g = parseGoal(raw, tribeId)
    if (g) {
      map.set(key, g)
      getDB().then(db => db.put('tribe-goals', g, `${tribeId}:${key}`))
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

export function subscribeToMilestones(
  tribeId: string,
  callback: (milestones: GoalMilestone[]) => void
): () => void {
  const map = new Map<string, GoalMilestone>()

  getDB().then(async db => {
    const all = await db.getAllKeys('goal-milestones')
    const prefix = `${tribeId}:`
    for (const k of all) {
      if (!String(k).startsWith(prefix)) continue
      const v = await db.get('goal-milestones', k)
      if (v) {
        const m = v as GoalMilestone
        if (m.id) map.set(m.id, m)
      }
    }
    if (map.size > 0) callback(Array.from(map.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('milestones')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      map.delete(key)
    } else {
      const raw = gunUnescape(data as Record<string, unknown>)
      const m = parseMilestone(raw, tribeId)
      if (m) {
        map.set(key, m)
        getDB().then(db => db.put('goal-milestones', m, `${tribeId}:${key}`))
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

export function subscribeToTasks(
  tribeId: string,
  callback: (tasks: TribeTask[]) => void
): () => void {
  const map = new Map<string, TribeTask>()

  getDB().then(async db => {
    const all = await db.getAllKeys('tribe-tasks')
    const prefix = `${tribeId}:`
    for (const k of all) {
      if (!String(k).startsWith(prefix)) continue
      const v = await db.get('tribe-tasks', k)
      if (v) {
        const t = v as TribeTask
        if (t.id) map.set(t.id, t)
      }
    }
    if (map.size > 0) callback(Array.from(map.values()))
  })

  const ref = gun.get('tribes').get(tribeId).get('tasks')

  function handle(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      map.delete(key)
      callback(Array.from(map.values()))
      return
    }
    const raw = gunUnescape(data as Record<string, unknown>)
    const t = parseTask(raw, tribeId)
    if (t) {
      map.set(key, t)
      getDB().then(db => db.put('tribe-tasks', t, `${tribeId}:${key}`))
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
