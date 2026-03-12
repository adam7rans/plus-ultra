import { describe, it, expect } from 'vitest'
import {
  EVENT_TYPE_META, ALL_EVENT_TYPES,
  expandOccurrences, getNowAndUpcoming,
  relativeTimeLabel, formatTime,
  dayBounds, weekBounds, monthBounds,
} from './event-registry.js'
import type { ScheduledEvent } from '../types/events.js'

function makeEvent(overrides: Partial<ScheduledEvent> = {}): ScheduledEvent {
  return {
    id: 'test-1',
    tribeId: 'tribe-1',
    type: 'duty',
    title: 'Test Event',
    description: '',
    startAt: 0,
    durationMin: 60,
    recurrence: { frequency: 'once' },
    createdBy: 'pub1',
    createdAt: 0,
    assignedTo: [],
    location: '',
    cancelled: false,
    ...overrides,
  }
}

describe('EVENT_TYPE_META', () => {
  it('has metadata for all 10 event types', () => {
    expect(ALL_EVENT_TYPES).toHaveLength(10)
    for (const type of ALL_EVENT_TYPES) {
      const meta = EVENT_TYPE_META[type]
      expect(meta.type).toBe(type)
      expect(meta.label).toBeTruthy()
      expect(meta.icon).toBeTruthy()
      expect(meta.defaultDurationMin).toBeGreaterThan(0)
    }
  })
})

describe('expandOccurrences', () => {
  it('returns empty for cancelled events', () => {
    const event = makeEvent({ cancelled: true, startAt: 1000 })
    expect(expandOccurrences(event, 0, 100_000)).toEqual([])
  })

  it('returns single occurrence for once event in window', () => {
    const event = makeEvent({ startAt: 5000, durationMin: 1 })
    const result = expandOccurrences(event, 0, 100_000)
    expect(result).toHaveLength(1)
    expect(result[0].startAt).toBe(5000)
    expect(result[0].endAt).toBe(5000 + 60_000)
  })

  it('returns empty when once event is outside window', () => {
    const event = makeEvent({ startAt: 200_000, durationMin: 1 })
    expect(expandOccurrences(event, 0, 100_000)).toEqual([])
  })

  it('expands daily recurring event across window', () => {
    const DAY = 86_400_000
    const start = Date.UTC(2025, 0, 1, 8, 0) // Jan 1 2025 08:00 UTC
    const event = makeEvent({
      startAt: start,
      durationMin: 60,
      recurrence: { frequency: 'daily' },
    })
    // Window: Jan 1-3 (3 days)
    const windowStart = Date.UTC(2025, 0, 1)
    const windowEnd = Date.UTC(2025, 0, 4)
    const result = expandOccurrences(event, windowStart, windowEnd)
    expect(result.length).toBe(3)
    expect(result[0].startAt).toBe(start)
    expect(result[1].startAt).toBe(start + DAY)
    expect(result[2].startAt).toBe(start + 2 * DAY)
  })

  it('respects endAt on recurrence', () => {
    const DAY = 86_400_000
    const start = Date.UTC(2025, 0, 1, 8, 0)
    const event = makeEvent({
      startAt: start,
      durationMin: 60,
      recurrence: { frequency: 'daily', endAt: start + DAY + 1 },
    })
    const windowStart = Date.UTC(2025, 0, 1)
    const windowEnd = Date.UTC(2025, 0, 10)
    const result = expandOccurrences(event, windowStart, windowEnd)
    expect(result.length).toBe(2) // day 1 and day 2 only
  })

  it('handles custom interval (every 3 days)', () => {
    const DAY = 86_400_000
    const start = Date.UTC(2025, 0, 1, 8, 0)
    const event = makeEvent({
      startAt: start,
      durationMin: 60,
      recurrence: { frequency: 'custom', interval: 3, customUnit: 'days' },
    })
    const windowStart = Date.UTC(2025, 0, 1)
    const windowEnd = Date.UTC(2025, 0, 10)
    const result = expandOccurrences(event, windowStart, windowEnd)
    // Days 1, 4, 7 = 3 occurrences
    expect(result.length).toBe(3)
    expect(result[1].startAt).toBe(start + 3 * DAY)
  })
})

describe('getNowAndUpcoming', () => {
  it('identifies current event and upcoming', () => {
    const now = 10_000
    const events = [
      makeEvent({ id: 'a', startAt: 9000, durationMin: 5 }),   // active (ends at 9000+300000)
      makeEvent({ id: 'b', startAt: 20_000, durationMin: 30 }), // upcoming
      makeEvent({ id: 'c', startAt: 50_000, durationMin: 30 }), // upcoming
    ]
    // Fix: 5 min = 300_000 ms, so 'a' ends at 309_000 which is > 10_000
    const result = getNowAndUpcoming(events, now)
    expect(result.current).not.toBeNull()
    expect(result.current!.event.id).toBe('a')
    expect(result.upcoming).toHaveLength(2)
    expect(result.upcoming[0].event.id).toBe('b')
  })

  it('returns null current when nothing is active', () => {
    const now = 10_000
    const events = [
      makeEvent({ id: 'a', startAt: 20_000, durationMin: 30 }),
    ]
    const result = getNowAndUpcoming(events, now)
    expect(result.current).toBeNull()
    expect(result.upcoming).toHaveLength(1)
  })
})

describe('relativeTimeLabel', () => {
  it('returns "now" for past times', () => {
    expect(relativeTimeLabel(100, 200)).toBe('now')
  })

  it('returns minutes for short durations', () => {
    expect(relativeTimeLabel(10 * 60_000, 0)).toBe('in 10m')
  })

  it('returns hours for longer durations', () => {
    expect(relativeTimeLabel(3 * 60 * 60_000, 0)).toBe('in 3h')
  })

  it('returns days for very long durations', () => {
    expect(relativeTimeLabel(2 * 24 * 60 * 60_000, 0)).toBe('in 2d')
  })
})

describe('dayBounds / weekBounds / monthBounds', () => {
  it('dayBounds covers exactly 24h', () => {
    const d = new Date(2025, 5, 15, 10, 30)
    const { start, end } = dayBounds(d)
    expect(end - start).toBe(86_400_000)
    expect(new Date(start).getDate()).toBe(15)
  })

  it('weekBounds covers exactly 7 days', () => {
    const d = new Date(2025, 5, 18) // Wednesday
    const { start, end } = weekBounds(d)
    expect(end - start).toBe(7 * 86_400_000)
    expect(new Date(start).getDay()).toBe(1) // Monday
  })

  it('monthBounds covers the right month', () => {
    const d = new Date(2025, 1, 10) // February
    const { start, end } = monthBounds(d)
    expect(new Date(start).getMonth()).toBe(1)
    expect(new Date(end).getMonth()).toBe(2) // March 1
  })
})
