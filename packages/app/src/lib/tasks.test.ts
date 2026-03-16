import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./gun.js', () => {
  function chain(path: string[] = []): Record<string, unknown> {
    return {
      get(key: string) { return chain([...path, key]) },
      put(payload: unknown, ack?: (a: { err?: string }) => void) {
        ack?.({})
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

let _offlineSince: number | null = null
vi.mock('./offline-tracker.js', () => ({
  getOfflineSince: () => _offlineSince,
  setOfflineSince: (ts: number) => { _offlineSince = ts },
  clearOfflineSince: () => { _offlineSince = null },
  computeOfflineStage: () => 0,
}))

vi.mock('./notifications.js', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}))

import { createGoal, updateGoal, createMilestone, createTask, updateTask } from './tasks.js'
import { getDB } from './db.js'
import type { TribeGoal, TribeTask, GoalMilestone } from '@plus-ultra/core'

// ── createGoal ────────────────────────────────────────────────────────────────

describe('createGoal', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes goal to IDB tribe-goals store', async () => {
    const id = await createGoal('tribe-1', {
      title: 'Build water cache',
      horizon: 'short_term',
      creatorPub: 'creator-pub',
    })

    const db = await getDB()
    const stored = await db.get('tribe-goals', `tribe-1:${id}`)
    expect(stored).toBeDefined()
    const g = stored as TribeGoal
    expect(g.title).toBe('Build water cache')
    expect(g.tribeId).toBe('tribe-1')
    expect(g.createdBy).toBe('creator-pub')
  })

  it('status defaults to active', async () => {
    const id = await createGoal('tribe-1', {
      title: 'Stock first aid kits',
      horizon: 'short_term',
      creatorPub: 'creator-pub',
    })

    const db = await getDB()
    const stored = await db.get('tribe-goals', `tribe-1:${id}`) as TribeGoal
    expect(stored.status).toBe('active')
  })

  it('IDB key is tribeId:goalId', async () => {
    const id = await createGoal('tribe-abc', {
      title: 'Goal X',
      horizon: 'short_term',
      creatorPub: 'pub-1',
    })

    const db = await getDB()
    const stored = await db.get('tribe-goals', `tribe-abc:${id}`)
    expect(stored).toBeDefined()
  })

  it('returns a non-empty string id', async () => {
    const id = await createGoal('tribe-1', {
      title: 'Test Goal',
      horizon: 'short_term',
      creatorPub: 'pub-1',
    })
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })
})

// ── updateGoal ────────────────────────────────────────────────────────────────

describe('updateGoal', () => {
  beforeEach(() => { _offlineSince = null })

  it('updates title in IDB', async () => {
    const id = await createGoal('tribe-1', {
      title: 'Original Title',
      horizon: 'short_term',
      creatorPub: 'pub-1',
    })

    await updateGoal('tribe-1', id, { title: 'Updated Title' })

    const db = await getDB()
    const stored = await db.get('tribe-goals', `tribe-1:${id}`) as TribeGoal
    expect(stored.title).toBe('Updated Title')
  })

  it('updates updatedAt timestamp', async () => {
    const id = await createGoal('tribe-1', {
      title: 'Goal',
      horizon: 'short_term',
      creatorPub: 'pub-1',
    })

    const before = Date.now()
    await updateGoal('tribe-1', id, { title: 'New Title' })

    const db = await getDB()
    const stored = await db.get('tribe-goals', `tribe-1:${id}`) as TribeGoal
    expect(stored.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('is a no-op when goal does not exist', async () => {
    await expect(
      updateGoal('tribe-1', 'nonexistent-goal', { title: 'X' })
    ).resolves.toBeUndefined()
  })
})

// ── createMilestone ───────────────────────────────────────────────────────────

describe('createMilestone', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes milestone to IDB goal-milestones store', async () => {
    const id = await createMilestone('tribe-1', 'goal-abc', { title: 'Phase 1 complete' })

    const db = await getDB()
    const stored = await db.get('goal-milestones', `tribe-1:${id}`)
    expect(stored).toBeDefined()
    const m = stored as GoalMilestone
    expect(m.title).toBe('Phase 1 complete')
    expect(m.tribeId).toBe('tribe-1')
  })

  it('IDB key is tribeId:milestoneId', async () => {
    const id = await createMilestone('tribe-xyz', 'goal-1', { title: 'Milestone A' })

    const db = await getDB()
    const stored = await db.get('goal-milestones', `tribe-xyz:${id}`)
    expect(stored).toBeDefined()
  })

  it('stores goalId on milestone', async () => {
    const id = await createMilestone('tribe-1', 'goal-parent', { title: 'Sub-goal' })

    const db = await getDB()
    const stored = await db.get('goal-milestones', `tribe-1:${id}`) as GoalMilestone
    expect(stored.goalId).toBe('goal-parent')
  })

  it('returns a non-empty string id', async () => {
    const id = await createMilestone('tribe-1', 'goal-1', { title: 'M1' })
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })
})

// ── createTask ────────────────────────────────────────────────────────────────

describe('createTask', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes task to IDB tribe-tasks store', async () => {
    const id = await createTask('tribe-1', {
      title: 'Rotate food stores',
      priority: 'normal',
      assignedTo: ['mem-1'],
      creatorPub: 'creator-pub',
    })

    const db = await getDB()
    const stored = await db.get('tribe-tasks', `tribe-1:${id}`)
    expect(stored).toBeDefined()
    const t = stored as TribeTask
    expect(t.title).toBe('Rotate food stores')
    expect(t.tribeId).toBe('tribe-1')
    expect(t.createdBy).toBe('creator-pub')
  })

  it('status defaults to todo', async () => {
    const id = await createTask('tribe-1', {
      title: 'Check comms',
      priority: 'normal',
      assignedTo: [],
      creatorPub: 'pub-1',
    })

    const db = await getDB()
    const stored = await db.get('tribe-tasks', `tribe-1:${id}`) as TribeTask
    expect(stored.status).toBe('todo')
  })

  it('assignedTo stored as array (not JSON string)', async () => {
    const id = await createTask('tribe-1', {
      title: 'Patrol perimeter',
      priority: 'normal',
      assignedTo: ['mem-a', 'mem-b'],
      creatorPub: 'pub-1',
    })

    const db = await getDB()
    const stored = await db.get('tribe-tasks', `tribe-1:${id}`) as TribeTask
    expect(Array.isArray(stored.assignedTo)).toBe(true)
    expect(stored.assignedTo).toEqual(['mem-a', 'mem-b'])
  })

  it('IDB key is tribeId:taskId', async () => {
    const id = await createTask('tribe-abc', {
      title: 'Task Z',
      priority: 'normal',
      assignedTo: [],
      creatorPub: 'pub-1',
    })

    const db = await getDB()
    const stored = await db.get('tribe-tasks', `tribe-abc:${id}`)
    expect(stored).toBeDefined()
  })

  it('returns a non-empty string id', async () => {
    const id = await createTask('tribe-1', {
      title: 'T1',
      priority: 'normal',
      assignedTo: [],
      creatorPub: 'pub-1',
    })
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })
})

// ── updateTask ────────────────────────────────────────────────────────────────

describe('updateTask', () => {
  beforeEach(() => { _offlineSince = null })

  it('updates status from todo to done', async () => {
    const id = await createTask('tribe-1', {
      title: 'Inventory audit',
      priority: 'normal',
      assignedTo: ['mem-1'],
      creatorPub: 'pub-1',
    })

    await updateTask('tribe-1', id, { status: 'done' })

    const db = await getDB()
    const stored = await db.get('tribe-tasks', `tribe-1:${id}`) as TribeTask
    expect(stored.status).toBe('done')
  })

  it('updates updatedAt timestamp', async () => {
    const id = await createTask('tribe-1', {
      title: 'Check generator',
      priority: 'normal',
      assignedTo: [],
      creatorPub: 'pub-1',
    })

    const before = Date.now()
    await updateTask('tribe-1', id, { status: 'in_progress' })

    const db = await getDB()
    const stored = await db.get('tribe-tasks', `tribe-1:${id}`) as TribeTask
    expect(stored.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('is a no-op when task does not exist', async () => {
    await expect(
      updateTask('tribe-1', 'nonexistent-task', { status: 'done' })
    ).resolves.toBeUndefined()
  })

  it('preserves unpatched fields', async () => {
    const id = await createTask('tribe-1', {
      title: 'Water cache check',
      priority: 'normal',
      assignedTo: ['mem-1'],
      creatorPub: 'pub-1',
    })

    await updateTask('tribe-1', id, { status: 'in_progress' })

    const db = await getDB()
    const stored = await db.get('tribe-tasks', `tribe-1:${id}`) as TribeTask
    expect(stored.title).toBe('Water cache check')
    expect(stored.priority).toBe('normal')
  })
})
