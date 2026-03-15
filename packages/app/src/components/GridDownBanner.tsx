import { Link } from '@tanstack/react-router'
import type { GridState } from '@plus-ultra/core'

interface Props {
  gridState: GridState
  tribeId: string
  onClear: () => void
  canClear: boolean
}

function expiryLabel(expiresAt: number): string {
  if (expiresAt === 0) return 'Until cleared'
  const ms = expiresAt - Date.now()
  if (ms <= 0) return 'Expired'
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  if (days > 0) return `Expires in ${days}d ${hours}h`
  const mins = Math.floor((ms % (60 * 60 * 1000)) / 60000)
  return `Expires in ${hours}h ${mins}m`
}

export default function GridDownBanner({ gridState, tribeId, onClear, canClear }: Props) {
  const isDrill = gridState.isSimulation

  return (
    <div className={`card mb-4 ${
      isDrill
        ? 'border-warning-500 bg-warning-900/20'
        : 'border-danger-500 bg-danger-900/20'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`font-bold text-sm ${isDrill ? 'text-warning-300' : 'text-danger-300'}`}>
          ⚡ GRID-DOWN {isDrill ? 'DRILL' : 'ACTIVE'}
        </span>
        <span className={`text-xs ml-auto ${isDrill ? 'text-warning-400' : 'text-danger-400'}`}>
          {expiryLabel(gridState.expiresAt)}
        </span>
        {canClear && (
          <button
            onClick={onClear}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ml-1 ${
              isDrill
                ? 'border-warning-600 text-warning-400 hover:bg-warning-800/30'
                : 'border-danger-600 text-danger-400 hover:bg-danger-800/30'
            }`}
          >
            Clear ×
          </button>
        )}
      </div>
      {gridState.message && (
        <p className="text-xs text-gray-300 mb-2">{gridState.message}</p>
      )}
      <Link
        to="/tribe/$tribeId/readiness"
        params={{ tribeId }}
        className={`text-xs underline ${isDrill ? 'text-warning-400 hover:text-warning-300' : 'text-danger-400 hover:text-danger-300'}`}
      >
        View Readiness Report →
      </Link>
    </div>
  )
}
