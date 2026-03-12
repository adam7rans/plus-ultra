// ── Event types ────────────────────────────────────────────────────
export type EventType =
  | 'meal'
  | 'watch'
  | 'duty'
  | 'medical'
  | 'training'
  | 'social'
  | 'maintenance'
  | 'comms'
  | 'alert'
  | 'personal'

// ── Recurrence ─────────────────────────────────────────────────────
export type RecurrenceFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval?: number         // e.g. every 3 (days/weeks/months) — used with 'custom'
  customUnit?: 'days' | 'weeks' | 'months'
  daysOfWeek?: number[]     // 0=Sun..6=Sat — for weekly recurrence
  endAt?: number            // timestamp — stop recurring after this date (0 = forever)
}

// ── Scheduled event ────────────────────────────────────────────────
export interface ScheduledEvent {
  id: string
  tribeId: string
  type: EventType
  title: string
  description: string
  startAt: number           // unix ms
  durationMin: number       // duration in minutes
  recurrence: RecurrenceRule
  createdBy: string         // pubkey
  createdAt: number
  assignedTo: string[]      // pubkeys (empty = whole tribe)
  location: string          // free-text location within the tribe
  cancelled: boolean
}
