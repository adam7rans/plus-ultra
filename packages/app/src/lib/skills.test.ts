import { describe, it, expect, vi } from 'vitest'

// ── Gun mock — must call ack callback for declareSkill (it awaits put ACK) ───

vi.mock('./gun.js', () => {
  function chain(path: string[] = []): Record<string, unknown> {
    return {
      get(key: string) { return chain([...path, key]) },
      put(payload: unknown, ack?: () => void) {
        ack?.()  // call ack immediately so declareSkill's Promise resolves
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

import { skillKey, declareSkill, vouchForSkill } from './skills.js'
import { getDB } from './db.js'
import type { MemberSkill } from '@plus-ultra/core'

// ── skillKey ──────────────────────────────────────────────────────────────────

describe('skillKey', () => {
  it('formats as memberId__role', () => {
    expect(skillKey('member-abc', 'nurse')).toBe('member-abc__nurse')
  })

  it('uses double underscore separator', () => {
    const key = skillKey('pub123', 'farmer')
    expect(key).toBe('pub123__farmer')
    expect(key).not.toContain(':')
  })

  it('works for all skill domains', () => {
    expect(skillKey('m1', 'physician')).toBe('m1__physician')
    expect(skillKey('m1', 'tactical_shooter')).toBe('m1__tactical_shooter')
    expect(skillKey('m1', 'quartermaster')).toBe('m1__quartermaster')
  })
})

// ── declareSkill ──────────────────────────────────────────────────────────────

describe('declareSkill', () => {
  it('stores skill in IDB with composite key: tribeId:memberId__role', async () => {
    _offlineSince = null

    await declareSkill('tribe-1', 'member-1', 'nurse', 'basic')

    const db = await getDB()
    // Key format: ${tribeId}:${skillKey(memberId, role)}
    const stored = await db.get('skills', 'tribe-1:member-1__nurse')
    expect(stored).toBeDefined()
    const skill = stored as MemberSkill
    expect(skill.role).toBe('nurse')
    expect(skill.memberId).toBe('member-1')
    expect(skill.tribeId).toBe('tribe-1')
    expect(skill.proficiency).toBe('basic')
  })

  it('initializes vouchedBy as empty array', async () => {
    _offlineSince = null
    await declareSkill('tribe-1', 'member-1', 'paramedic', 'intermediate')

    const db = await getDB()
    const stored = await db.get('skills', 'tribe-1:member-1__paramedic') as MemberSkill
    expect(stored.vouchedBy).toEqual([])
  })

  it('stores optional specializations', async () => {
    _offlineSince = null
    await declareSkill('tribe-1', 'member-1', 'farmer', 'basic', {
      specializations: ['crop_rotation', 'irrigation'],
    })

    const db = await getDB()
    const stored = await db.get('skills', 'tribe-1:member-1__farmer') as MemberSkill
    expect(stored.specializations).toEqual(['crop_rotation', 'irrigation'])
  })

  it('stores optional yearsExperience', async () => {
    _offlineSince = null
    await declareSkill('tribe-1', 'member-2', 'carpenter', 'expert', {
      yearsExperience: '3–7 years',
    })

    const db = await getDB()
    const stored = await db.get('skills', 'tribe-1:member-2__carpenter') as MemberSkill
    expect(stored.yearsExperience).toBe('3–7 years')
  })

  it('queues pending-sync when offline', async () => {
    _offlineSince = Date.now() - 2000
    await declareSkill('tribe-1', 'member-1', 'cook', 'basic')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { gunStore: string; tribeId: string }
      return e.gunStore === 'skills' && e.tribeId === 'tribe-1'
    })
    expect(syncEntry).toBeDefined()

    _offlineSince = null
  })

  it('does not queue pending-sync when online', async () => {
    _offlineSince = null
    await declareSkill('tribe-1', 'member-3', 'electrician', 'intermediate')
    await new Promise(r => setTimeout(r, 10))

    const db = await getDB()
    const allSyncs = await db.getAll('pending-syncs')
    const syncEntry = allSyncs.find(s => {
      const e = s as { recordKey: string }
      return e.recordKey === 'member-3__electrician'
    })
    expect(syncEntry).toBeUndefined()
  })

  it('can declare different roles for the same member', async () => {
    _offlineSince = null
    await declareSkill('tribe-1', 'multi-member', 'nurse', 'basic')
    await declareSkill('tribe-1', 'multi-member', 'paramedic', 'intermediate')

    const db = await getDB()
    const nurse = await db.get('skills', 'tribe-1:multi-member__nurse')
    const paramedic = await db.get('skills', 'tribe-1:multi-member__paramedic')
    expect(nurse).toBeDefined()
    expect(paramedic).toBeDefined()
  })
})

// ── vouchForSkill ─────────────────────────────────────────────────────────────

describe('vouchForSkill', () => {
  it('appends voucherPub to vouchedBy array', async () => {
    _offlineSince = null
    await declareSkill('tribe-1', 'member-1', 'nurse', 'basic')
    await vouchForSkill('tribe-1', 'member-1', 'nurse', 'voucher-1')

    const db = await getDB()
    const stored = await db.get('skills', 'tribe-1:member-1__nurse') as MemberSkill
    expect(stored.vouchedBy).toContain('voucher-1')
    expect(stored.vouchedBy).toHaveLength(1)
  })

  it('accumulates multiple vouches', async () => {
    _offlineSince = null
    await declareSkill('tribe-1', 'member-1', 'farmer', 'intermediate')
    await vouchForSkill('tribe-1', 'member-1', 'farmer', 'voucher-a')
    await vouchForSkill('tribe-1', 'member-1', 'farmer', 'voucher-b')

    const db = await getDB()
    const stored = await db.get('skills', 'tribe-1:member-1__farmer') as MemberSkill
    expect(stored.vouchedBy).toHaveLength(2)
    expect(stored.vouchedBy).toContain('voucher-a')
    expect(stored.vouchedBy).toContain('voucher-b')
  })

  it('does not double-vouch from the same voucher', async () => {
    _offlineSince = null
    await declareSkill('tribe-1', 'member-1', 'carpenter', 'basic')
    await vouchForSkill('tribe-1', 'member-1', 'carpenter', 'voucher-x')
    await vouchForSkill('tribe-1', 'member-1', 'carpenter', 'voucher-x') // duplicate

    const db = await getDB()
    const stored = await db.get('skills', 'tribe-1:member-1__carpenter') as MemberSkill
    expect(stored.vouchedBy).toHaveLength(1) // still only 1
  })

  it('is a no-op when skill does not exist', async () => {
    _offlineSince = null
    // Should not throw — just returns early
    await expect(
      vouchForSkill('tribe-1', 'nonexistent-member', 'physician', 'voucher-1')
    ).resolves.toBeUndefined()
  })
})
