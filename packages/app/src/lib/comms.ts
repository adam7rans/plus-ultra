import { gun } from './gun'
import { getDB } from './db'
import { getOfflineSince } from './offline-tracker'
import { addPendingSync } from './sync-queue'
import { convexWrite } from './sync-adapter'
import type { TribePacePlan, PaceMethod, CheckInSchedule, RallyPoint } from '@plus-ultra/core'

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

// ─── Save / Load ──────────────────────────────────────────────────────────────

export async function savePacePlan(
  tribeId: string,
  methods: PaceMethod[],
  checkIns: CheckInSchedule[],
  rallyPoints: RallyPoint[],
  codeWords: Record<string, string>,
  updaterPub: string
): Promise<void> {
  const plan: TribePacePlan = {
    tribeId,
    methodsJson: JSON.stringify(methods),
    checkInSchedulesJson: JSON.stringify(checkIns),
    rallyPointsJson: JSON.stringify(rallyPoints),
    codeWordsJson: JSON.stringify(codeWords),
    lastUpdatedAt: Date.now(),
    lastUpdatedBy: updaterPub,
  }

  const db = await getDB()
  await db.put('pace-plan', plan, tribeId)
  void convexWrite('comms.upsertPacePlan', { tribeId, methods, checkInSchedules: checkIns, rallyPoints, codeWords, lastUpdatedAt: plan.lastUpdatedAt, lastUpdatedBy: updaterPub })

  // Single-node Gun put (not a map — plan is one record per tribe)
  const pacePlanPayload = gunEscape(plan as unknown as Record<string, unknown>) as unknown as Record<string, unknown>
  gun.get('tribes').get(tribeId).get('pace-plan').put(pacePlanPayload)

  if (getOfflineSince() !== null) {
    void addPendingSync({
      id: `pace-plan:${tribeId}:${Date.now()}`,
      gunPath: ['tribes', tribeId, 'pace-plan'],
      gunStore: 'pace-plan', tribeId, recordKey: tribeId,
      payload: pacePlanPayload as Record<string, unknown>,
      convexMutation: 'comms.upsertPacePlan',
      convexArgs: { tribeId, methods, checkInSchedules: checkIns, rallyPoints, codeWords, lastUpdatedAt: plan.lastUpdatedAt, lastUpdatedBy: updaterPub },
      queuedAt: Date.now(),
    })
  }
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export function subscribeToPacePlan(
  tribeId: string,
  callback: (plan: TribePacePlan | null) => void
): () => void {
  // Seed from IDB first
  getDB().then(db => db.get('pace-plan', tribeId)).then(cached => {
    if (cached) callback(cached as TribePacePlan)
  })

  const ref = gun.get('tribes').get(tribeId).get('pace-plan')

  function handle(data: unknown) {
    if (!data || typeof data !== 'object') {
      callback(null)
      return
    }
    const raw = gunUnescape(data as Record<string, unknown>)
    if (!raw.tribeId) return
    const plan: TribePacePlan = {
      tribeId: raw.tribeId as string,
      methodsJson: (raw.methodsJson as string) ?? '[]',
      checkInSchedulesJson: (raw.checkInSchedulesJson as string) ?? '[]',
      rallyPointsJson: (raw.rallyPointsJson as string) ?? '[]',
      codeWordsJson: (raw.codeWordsJson as string) || undefined,
      lastUpdatedAt: (raw.lastUpdatedAt as number) ?? 0,
      lastUpdatedBy: (raw.lastUpdatedBy as string) ?? '',
    }
    getDB().then(db => db.put('pace-plan', plan, tribeId))
    callback(plan)
  }

  ref.on(handle)

  // 5s poll — plan changes infrequently
  const poll = setInterval(() => ref.once(handle), 5000)

  return () => {
    clearInterval(poll)
    ref.off()
  }
}

// ─── Export as plain text ─────────────────────────────────────────────────────

const COMMS_LEVEL_LABELS: Record<string, string> = {
  primary: 'PRIMARY',
  alternate: 'ALTERNATE',
  contingency: 'CONTINGENCY',
  emergency: 'EMERGENCY',
}

const COMMS_METHOD_LABELS: Record<string, string> = {
  app: 'App',
  ham_radio: 'HAM Radio',
  frs_gmrs: 'FRS/GMRS',
  cb: 'CB Radio',
  phone: 'Phone/SMS',
  runner: 'Runner',
  signal_mirror: 'Signal Mirror',
  other: 'Other',
}

export function exportPacePlanAsText(plan: TribePacePlan): string {
  const lines: string[] = []
  const now = new Date(plan.lastUpdatedAt).toLocaleDateString()

  lines.push('=== PACE COMMUNICATIONS PLAN ===')
  lines.push(`Updated: ${now} by ${plan.lastUpdatedBy.slice(0, 8)}`)
  lines.push('')

  const methods: PaceMethod[] = JSON.parse(plan.methodsJson || '[]')
  if (methods.length > 0) {
    lines.push('--- PACE METHODS ---')
    for (const m of methods) {
      lines.push(`[${COMMS_LEVEL_LABELS[m.level] ?? m.level.toUpperCase()}]`)
      lines.push(`  Method: ${COMMS_METHOD_LABELS[m.method] ?? m.method}`)
      lines.push(`  Details: ${m.details}`)
      lines.push(`  Trigger: ${m.triggerCondition}`)
      if (m.notes) lines.push(`  Notes: ${m.notes}`)
    }
    lines.push('')
  }

  const checkIns: CheckInSchedule[] = JSON.parse(plan.checkInSchedulesJson || '[]')
  if (checkIns.length > 0) {
    lines.push('--- CHECK-IN SCHEDULES ---')
    for (const c of checkIns) {
      lines.push(`${c.label}: ${c.timeOfDay} ${c.frequency} via ${COMMS_METHOD_LABELS[c.method] ?? c.method}`)
      lines.push(`  ${c.details}`)
      if (c.notes) lines.push(`  ${c.notes}`)
    }
    lines.push('')
  }

  const rallyPoints: RallyPoint[] = JSON.parse(plan.rallyPointsJson || '[]')
  if (rallyPoints.length > 0) {
    lines.push('--- RALLY POINTS ---')
    for (const r of rallyPoints) {
      lines.push(`${r.label}: ${r.description}`)
      lines.push(`  Trigger: ${r.triggerCondition}`)
      if (r.lat && r.lng) lines.push(`  Coords: ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`)
      if (r.notes) lines.push(`  Notes: ${r.notes}`)
    }
    lines.push('')
  }

  if (plan.codeWordsJson) {
    const codeWords: Record<string, string> = JSON.parse(plan.codeWordsJson)
    const entries = Object.entries(codeWords)
    if (entries.length > 0) {
      lines.push('--- CODE WORDS ---')
      for (const [word, meaning] of entries) {
        lines.push(`  "${word}" = ${meaning}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
