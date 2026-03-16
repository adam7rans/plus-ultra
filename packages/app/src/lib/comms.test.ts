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

import { savePacePlan, exportPacePlanAsText } from './comms.js'
import { getDB } from './db.js'
import type { TribePacePlan } from '@plus-ultra/core'

// ── savePacePlan ──────────────────────────────────────────────────────────────

describe('savePacePlan', () => {
  beforeEach(() => { _offlineSince = null })

  it('writes pace plan to IDB pace-plan store', async () => {
    const methods = [{ level: 'primary' as const, method: 'ham_radio' as const, details: '146.520 MHz', triggerCondition: 'Always' }]
    const checkIns: unknown[] = []
    const rallyPoints: unknown[] = []
    const codeWords = { 'ALPHA': 'evacuate now' }

    await savePacePlan('tribe-1', methods, checkIns, rallyPoints, codeWords, 'updater-pub')

    const db = await getDB()
    const stored = await db.get('pace-plan', 'tribe-1')
    expect(stored).toBeDefined()
    const plan = stored as TribePacePlan
    expect(plan.tribeId).toBe('tribe-1')
    expect(plan.lastUpdatedBy).toBe('updater-pub')
    expect(plan.lastUpdatedAt).toBeGreaterThan(0)
  })

  it('IDB key is tribeId (single record per tribe)', async () => {
    await savePacePlan('tribe-abc', [], [], [], {}, 'updater-pub')

    const db = await getDB()
    const stored = await db.get('pace-plan', 'tribe-abc')
    expect(stored).toBeDefined()
  })

  it('stores arrays as JSON strings', async () => {
    const methods = [{ level: 'primary' as const, method: 'ham_radio' as const, details: '146.520 MHz', triggerCondition: 'Always' }]
    const checkIns = [{ time: '0800', frequency: 'daily' }]
    const rallyPoints = [{ name: 'Point A', coordinates: '12.34, 56.78' }]
    const codeWords = { 'BRAVO': 'shelter in place' }

    await savePacePlan('tribe-json', methods, checkIns, rallyPoints, codeWords, 'updater-pub')

    const db = await getDB()
    const stored = await db.get('pace-plan', 'tribe-json') as TribePacePlan
    expect(typeof stored.methodsJson).toBe('string')
    expect(typeof stored.checkInSchedulesJson).toBe('string')
    expect(typeof stored.rallyPointsJson).toBe('string')
    expect(JSON.parse(stored.methodsJson)).toHaveLength(1)
    expect(JSON.parse(stored.checkInSchedulesJson)).toHaveLength(1)
    expect(JSON.parse(stored.rallyPointsJson)).toHaveLength(1)
  })

  it('stores code words as JSON string', async () => {
    const codeWords = { 'ALPHA': 'evacuate now', 'BRAVO': 'shelter in place' }
    await savePacePlan('tribe-cw', [], [], [], codeWords, 'updater-pub')

    const db = await getDB()
    const stored = await db.get('pace-plan', 'tribe-cw') as TribePacePlan
    expect(stored.codeWordsJson).toBeDefined()
    const parsed = JSON.parse(stored.codeWordsJson!)
    expect(parsed['ALPHA']).toBe('evacuate now')
    expect(parsed['BRAVO']).toBe('shelter in place')
  })

  it('overwrites previous plan for same tribe', async () => {
    await savePacePlan('tribe-overwrite', [{ level: 'primary' as const, method: 'ham_radio' as const, details: 'old', triggerCondition: 'old' }], [], [], {}, 'pub-1')
    await savePacePlan('tribe-overwrite', [{ level: 'alternate' as const, method: 'frs_gmrs' as const, details: 'new', triggerCondition: 'new' }], [], [], {}, 'pub-2')

    const db = await getDB()
    const stored = await db.get('pace-plan', 'tribe-overwrite') as TribePacePlan
    expect(stored.lastUpdatedBy).toBe('pub-2')
    const methods = JSON.parse(stored.methodsJson)
    expect(methods[0].level).toBe('alternate')
  })

  it('queues pending-sync with correct gunPath when offline', async () => {
    _offlineSince = Date.now() - 3000

    await savePacePlan('tribe-offline', [], [], [], {}, 'updater-pub')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { tribeId: string; gunPath?: string[] }
      return e.tribeId === 'tribe-offline'
    })
    expect(syncEntry).toBeDefined()
    const entry = syncEntry as { gunPath?: string[] }
    expect(entry.gunPath).toEqual(['tribes', 'tribe-offline', 'pace-plan'])

    _offlineSince = null
  })

  it('does not queue pending-sync when online', async () => {
    await savePacePlan('tribe-online-pace', [], [], [], {}, 'updater-pub')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { tribeId: string }
      return e.tribeId === 'tribe-online-pace'
    })
    expect(syncEntry).toBeUndefined()
  })
})

// ── exportPacePlanAsText ──────────────────────────────────────────────────────

describe('exportPacePlanAsText', () => {
  const plan: TribePacePlan = {
    tribeId: 'tribe-1',
    methodsJson: JSON.stringify([{ level: 'primary', method: 'ham_radio', details: '146.520 MHz', triggerCondition: 'Always' }]),
    checkInSchedulesJson: '[]',
    rallyPointsJson: '[]',
    codeWordsJson: JSON.stringify({ 'ALPHA': 'evacuate now' }),
    lastUpdatedAt: Date.now(),
    lastUpdatedBy: 'member-pub-12345678',
  }

  it('output contains PACE header', () => {
    const text = exportPacePlanAsText(plan)
    expect(text).toContain('=== PACE COMMUNICATIONS PLAN ===')
  })

  it('output contains method level labels', () => {
    const text = exportPacePlanAsText(plan)
    expect(text.toLowerCase()).toContain('primary')
  })

  it('output contains method details', () => {
    const text = exportPacePlanAsText(plan)
    expect(text).toContain('146.520 MHz')
  })

  it('output contains code words', () => {
    const text = exportPacePlanAsText(plan)
    expect(text).toContain('ALPHA')
    expect(text).toContain('evacuate now')
  })

  it('returns a non-empty string', () => {
    const text = exportPacePlanAsText(plan)
    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(0)
  })

  it('works with empty methods and no code words', () => {
    const emptyPlan: TribePacePlan = {
      tribeId: 'tribe-empty',
      methodsJson: '[]',
      checkInSchedulesJson: '[]',
      rallyPointsJson: '[]',
      lastUpdatedAt: Date.now(),
      lastUpdatedBy: 'pub-1',
    }
    const text = exportPacePlanAsText(emptyPlan)
    expect(text).toContain('=== PACE COMMUNICATIONS PLAN ===')
  })
})
