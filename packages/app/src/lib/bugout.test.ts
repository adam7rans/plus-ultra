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
  sendAlert: vi.fn().mockResolvedValue(undefined),
}))

import { saveBugOutPlan, deleteBugOutPlan, activateBugOutPlan } from './bugout.js'
import { getDB } from './db.js'
import type { BugOutPlan } from '@plus-ultra/core'

const basePlan = {
  name: 'Alpha Route',
  status: 'draft' as const,
  triggerCondition: 'Grid down',
  vehiclesJson: '[]',
  loadPrioritiesJson: '[]',
  rallyPointIdsJson: '[]',
  createdAt: Date.now(),
  createdBy: 'member-1',
  updatedAt: Date.now(),
}

// ── saveBugOutPlan ────────────────────────────────────────────────────────────

describe('saveBugOutPlan', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes plan to IDB bugout-plans store', async () => {
    const id = await saveBugOutPlan('tribe-1', basePlan)

    const db = await getDB()
    const stored = await db.get('bugout-plans', `tribe-1:${id}`)
    expect(stored).toBeDefined()
    const p = stored as BugOutPlan
    expect(p.name).toBe('Alpha Route')
    expect(p.tribeId).toBe('tribe-1')
    expect(p.status).toBe('draft')
  })

  it('IDB key is tribeId:id', async () => {
    const id = await saveBugOutPlan('tribe-abc', basePlan)

    const db = await getDB()
    const stored = await db.get('bugout-plans', `tribe-abc:${id}`)
    expect(stored).toBeDefined()
  })

  it('returns the plan id', async () => {
    const id = await saveBugOutPlan('tribe-1', basePlan)
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })

  it('updates existing record when id is provided', async () => {
    const id = await saveBugOutPlan('tribe-1', basePlan)
    await saveBugOutPlan('tribe-1', { ...basePlan, id, name: 'Beta Route' })

    const db = await getDB()
    const stored = await db.get('bugout-plans', `tribe-1:${id}`) as BugOutPlan
    expect(stored.name).toBe('Beta Route')
  })

  it('preserves the provided id on update', async () => {
    const id = await saveBugOutPlan('tribe-1', basePlan)
    const returnedId = await saveBugOutPlan('tribe-1', { ...basePlan, id, name: 'Updated' })
    expect(returnedId).toBe(id)
  })
})

// ── deleteBugOutPlan ──────────────────────────────────────────────────────────

describe('deleteBugOutPlan', () => {
  beforeEach(() => { _offlineSince = null })

  it('removes plan from IDB', async () => {
    const id = await saveBugOutPlan('tribe-1', basePlan)

    const db = await getDB()
    const before = await db.get('bugout-plans', `tribe-1:${id}`)
    expect(before).toBeDefined()

    await deleteBugOutPlan('tribe-1', id)

    const after = await db.get('bugout-plans', `tribe-1:${id}`)
    expect(after).toBeUndefined()
  })

  it('is a no-op when plan does not exist', async () => {
    await expect(deleteBugOutPlan('tribe-1', 'nonexistent-plan')).resolves.toBeUndefined()
  })
})

// ── activateBugOutPlan ────────────────────────────────────────────────────────

describe('activateBugOutPlan', () => {
  beforeEach(() => { _offlineSince = null })

  it('sets status=active, activatedAt and activatedBy', async () => {
    const id = await saveBugOutPlan('tribe-1', basePlan)
    const before = Date.now()

    await activateBugOutPlan('tribe-1', id, 'activator-pub')

    const db = await getDB()
    const stored = await db.get('bugout-plans', `tribe-1:${id}`) as BugOutPlan
    expect(stored.status).toBe('active')
    expect(stored.activatedBy).toBe('activator-pub')
    expect(stored.activatedAt).toBeGreaterThanOrEqual(before)
  })

  it('does not throw when plan not found', async () => {
    await expect(
      activateBugOutPlan('tribe-1', 'nonexistent-plan', 'pub-1')
    ).resolves.toBeUndefined()
  })

  it('updates updatedAt on activation', async () => {
    const id = await saveBugOutPlan('tribe-1', { ...basePlan, updatedAt: 0 })

    await activateBugOutPlan('tribe-1', id, 'activator-pub')

    const db = await getDB()
    const stored = await db.get('bugout-plans', `tribe-1:${id}`) as BugOutPlan
    expect(stored.updatedAt).toBeGreaterThan(0)
  })
})
