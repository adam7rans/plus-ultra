import type { EventType, RecurrenceRule, ScheduledEvent } from '../types/events.js'

// ── Event type metadata ────────────────────────────────────────────

export interface EventTypeMeta {
  type: EventType
  label: string
  icon: string
  defaultDurationMin: number
  typicalRecurrence: RecurrenceRule
}

export const EVENT_TYPE_META: Record<EventType, EventTypeMeta> = {
  meal:        { type: 'meal',        label: 'Meal',         icon: '🍽️', defaultDurationMin: 60,  typicalRecurrence: { frequency: 'daily' } },
  watch:       { type: 'watch',       label: 'Watch',        icon: '👁️',  defaultDurationMin: 240, typicalRecurrence: { frequency: 'daily' } },
  duty:        { type: 'duty',        label: 'Duty',         icon: '📋', defaultDurationMin: 120, typicalRecurrence: { frequency: 'daily' } },
  medical:     { type: 'medical',     label: 'Medical',      icon: '🏥', defaultDurationMin: 30,  typicalRecurrence: { frequency: 'once' } },
  training:    { type: 'training',    label: 'Training',     icon: '🏋️', defaultDurationMin: 90,  typicalRecurrence: { frequency: 'weekly' } },
  social:      { type: 'social',      label: 'Social',       icon: '🎉', defaultDurationMin: 120, typicalRecurrence: { frequency: 'weekly' } },
  maintenance: { type: 'maintenance', label: 'Maintenance',  icon: '🔧', defaultDurationMin: 60,  typicalRecurrence: { frequency: 'weekly' } },
  comms:       { type: 'comms',       label: 'Comms',        icon: '📻', defaultDurationMin: 30,  typicalRecurrence: { frequency: 'daily' } },
  alert:       { type: 'alert',       label: 'Alert',        icon: '🚨', defaultDurationMin: 15,  typicalRecurrence: { frequency: 'once' } },
  personal:    { type: 'personal',    label: 'Personal',     icon: '👤', defaultDurationMin: 60,  typicalRecurrence: { frequency: 'once' } },
}

export const ALL_EVENT_TYPES: EventType[] = [
  'meal', 'watch', 'duty', 'medical', 'training',
  'social', 'maintenance', 'comms', 'alert', 'personal',
]

// ── Occurrence expansion ───────────────────────────────────────────

/** Expand a recurring event into concrete occurrences within a time window. */
export function expandOccurrences(
  event: ScheduledEvent,
  windowStart: number,
  windowEnd: number,
): { startAt: number; endAt: number }[] {
  if (event.cancelled) return []

  const durationMs = event.durationMin * 60_000
  const { recurrence } = event

  if (recurrence.frequency === 'once') {
    const endAt = event.startAt + durationMs
    if (event.startAt >= windowEnd || endAt <= windowStart) return []
    return [{ startAt: event.startAt, endAt }]
  }

  const results: { startAt: number; endAt: number }[] = []
  const stepMs = getStepMs(recurrence)
  if (stepMs <= 0) return []

  // Start iterating from the event's first occurrence
  let cursor = event.startAt

  // Jump close to window start to avoid iterating through years of history
  if (cursor < windowStart - stepMs) {
    const skip = Math.floor((windowStart - cursor) / stepMs) - 1
    cursor += skip * stepMs
  }

  const ruleEnd = recurrence.endAt ?? 0

  while (cursor < windowEnd) {
    if (ruleEnd > 0 && cursor > ruleEnd) break

    const endAt = cursor + durationMs

    // For weekly with daysOfWeek, check if the day matches
    if (recurrence.frequency === 'weekly' && recurrence.daysOfWeek?.length) {
      const day = new Date(cursor).getDay()
      if (recurrence.daysOfWeek.includes(day) && endAt > windowStart) {
        results.push({ startAt: cursor, endAt })
      }
    } else if (endAt > windowStart) {
      results.push({ startAt: cursor, endAt })
    }

    cursor += stepMs
  }

  return results
}

function getStepMs(rule: RecurrenceRule): number {
  const DAY = 86_400_000
  const WEEK = 7 * DAY

  switch (rule.frequency) {
    case 'daily':   return DAY
    case 'weekly':  return WEEK
    case 'monthly': return 30 * DAY  // approximate
    case 'yearly':  return 365 * DAY // approximate
    case 'custom': {
      const interval = rule.interval ?? 1
      switch (rule.customUnit) {
        case 'days':   return interval * DAY
        case 'weeks':  return interval * WEEK
        case 'months': return interval * 30 * DAY
        default:       return interval * DAY
      }
    }
    default: return 0
  }
}

// ── Helpers ────────────────────────────────────────────────────────

/** Get the "now + upcoming" events for a widget. */
export function getNowAndUpcoming(
  events: ScheduledEvent[],
  now: number,
  limit: number = 3,
): { current: { event: ScheduledEvent; startAt: number; endAt: number } | null; upcoming: { event: ScheduledEvent; startAt: number; endAt: number }[] } {
  // Look 24h ahead for upcoming
  const windowEnd = now + 24 * 60 * 60 * 1000

  const allOccurrences: { event: ScheduledEvent; startAt: number; endAt: number }[] = []

  for (const event of events) {
    const occ = expandOccurrences(event, now - event.durationMin * 60_000, windowEnd)
    for (const o of occ) {
      allOccurrences.push({ event, startAt: o.startAt, endAt: o.endAt })
    }
  }

  // Sort by start time
  allOccurrences.sort((a, b) => a.startAt - b.startAt)

  // Find current (active right now)
  const current = allOccurrences.find(o => o.startAt <= now && o.endAt > now) ?? null

  // Upcoming = starts after now, excluding the current
  const upcoming = allOccurrences
    .filter(o => o.startAt > now)
    .slice(0, limit)

  return { current, upcoming }
}

/** Format a relative time label: "in 5m", "in 2h", "in 1d" */
export function relativeTimeLabel(targetMs: number, nowMs: number): string {
  const diff = targetMs - nowMs
  if (diff <= 0) return 'now'
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `in ${hrs}h`
  const days = Math.round(hrs / 24)
  return `in ${days}d`
}

/** Format a time as HH:MM (24h) */
export function formatTime(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Get start/end of a day in local time */
export function dayBounds(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const end = start + 86_400_000
  return { start, end }
}

/** Get start/end of a week (Monday start) in local time */
export function weekBounds(date: Date): { start: number; end: number } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday start
  d.setDate(d.getDate() + diff)
  const start = d.getTime()
  const end = start + 7 * 86_400_000
  return { start, end }
}

/** Get start/end of a month in local time */
export function monthBounds(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).getTime()
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime()
  return { start, end }
}
