import type { OfflineStage } from '@plus-ultra/core'

interface Props {
  stage: OfflineStage
  offlineSince: number | null
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / (60 * 60 * 1000))
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
  if (h >= 1) return `${h}h ${m}m`
  return `${m}m`
}

export default function OfflineStageBanner({ stage, offlineSince }: Props) {
  if (stage === 0 || offlineSince === null) return null

  const elapsed = Date.now() - offlineSince
  const duration = formatDuration(elapsed)

  if (stage === 1) {
    return (
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
        <span className="text-xs text-gray-400">Offline ({duration})</span>
      </div>
    )
  }

  if (stage === 2) {
    return (
      <div className="card border-warning-600/40 bg-warning-900/20 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-warning-300">
            You've been offline {duration}
          </span>
        </div>
        <p className="text-xs text-warning-400/80 mt-1">
          Data will sync automatically when your relay connection is restored.
        </p>
      </div>
    )
  }

  if (stage === 3) {
    return (
      <div className="card border-orange-600/40 bg-orange-900/20 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
          <span className="text-sm font-semibold text-orange-300">
            Offline {duration} — relay unreachable
          </span>
        </div>
        <p className="text-xs text-orange-400/80 mt-1">
          Report infrastructure status below so your tribe can see what's failing around you.
        </p>
      </div>
    )
  }

  if (stage === 4) {
    return (
      <div className="card border-danger-600/40 bg-danger-900/20 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-danger-400 animate-pulse flex-shrink-0" />
          <span className="text-sm font-semibold text-danger-300">
            OFFLINE {duration} — extended outage
          </span>
        </div>
        <p className="text-xs text-danger-400/80 mt-1">
          Tribe leaders have been notified of your absence. Check your PACE comms plan.
        </p>
      </div>
    )
  }

  // Stage 5
  return (
    <div className="card border-danger-500/60 bg-danger-900/30 mb-3">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-danger-400 animate-pulse flex-shrink-0" />
        <span className="text-sm font-bold text-danger-200 uppercase tracking-wide">
          GRID DOWN — {duration} offline
        </span>
      </div>
      <p className="text-xs text-danger-300/80 mt-1">
        24-hour relay outage. Operating in full offline mode.
      </p>
    </div>
  )
}
