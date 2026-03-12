import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getNowAndUpcoming, relativeTimeLabel, formatTime, EVENT_TYPE_META } from '@plus-ultra/core'
import type { ScheduledEvent } from '@plus-ultra/core'

interface Props {
  tribeId: string
  events: ScheduledEvent[]
}

export default function NowAndUpNext({ tribeId, events }: Props) {
  const [now, setNow] = useState(Date.now())

  // Tick every 30s to keep relative labels fresh
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const { current, upcoming } = getNowAndUpcoming(events, now)

  if (!current && upcoming.length === 0) {
    return (
      <Link
        to="/tribe/$tribeId/schedule"
        params={{ tribeId }}
        className="card flex items-center gap-3 hover:border-forest-600 transition-colors"
      >
        <span className="text-xl">📅</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-300">No events scheduled</div>
          <div className="text-xs text-gray-500">Tap to create your first event</div>
        </div>
        <span className="text-forest-400 text-lg">→</span>
      </Link>
    )
  }

  return (
    <Link
      to="/tribe/$tribeId/schedule"
      params={{ tribeId }}
      className="card hover:border-forest-600 transition-colors block"
    >
      {/* Current event */}
      {current && (() => {
        const meta = EVENT_TYPE_META[current.event.type]
        const remaining = current.endAt - now
        const remainMin = Math.max(1, Math.round(remaining / 60_000))
        return (
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-100 truncate">
                {current.event.title}
              </div>
              <div className="text-xs text-forest-400">
                Now · {remainMin}m remaining
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-forest-400 animate-pulse flex-shrink-0" />
          </div>
        )
      })()}

      {/* Divider when both current and upcoming exist */}
      {current && upcoming.length > 0 && (
        <div className="border-t border-forest-800 my-2" />
      )}

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <div className="space-y-1.5">
          {!current && (
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Up Next</div>
          )}
          {upcoming.map((occ, i) => {
            const meta = EVENT_TYPE_META[occ.event.type]
            return (
              <div key={`${occ.event.id}-${i}`} className="flex items-center gap-2.5">
                <span className="text-sm">{meta.icon}</span>
                <span className="text-xs text-gray-300 flex-1 truncate">{occ.event.title}</span>
                <span className="text-xs text-gray-500">{formatTime(occ.startAt)}</span>
                <span className="text-xs text-forest-400 w-12 text-right">
                  {relativeTimeLabel(occ.startAt, now)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Link>
  )
}
