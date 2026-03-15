import { Link } from '@tanstack/react-router'
import type { BugOutPlan } from '@plus-ultra/core'

interface Props {
  tribeId: string
  activePlan: BugOutPlan | null
}

export default function BugOutCTA({ tribeId, activePlan }: Props) {
  return (
    <div className="card border-danger-500/80 bg-danger-900/40 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🚨</span>
        <div>
          <p className="text-sm font-bold text-danger-200 uppercase tracking-wide">Bug Out Now</p>
          <p className="text-xs text-danger-300/80">All infrastructure down — execute bug-out plan</p>
        </div>
      </div>

      {activePlan ? (
        <div className="bg-danger-950/60 rounded-lg p-3 mb-3">
          <p className="text-xs font-semibold text-danger-300 mb-0.5">{activePlan.name}</p>
          {activePlan.triggerCondition && (
            <p className="text-xs text-gray-400">{activePlan.triggerCondition}</p>
          )}
          {activePlan.notes && (
            <p className="text-xs text-gray-400 mt-1">{activePlan.notes}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-danger-400/70 mb-3">No active bug-out plan set.</p>
      )}

      <Link
        to="/tribe/$tribeId/bugout"
        params={{ tribeId }}
        className="block"
      >
        <button className="w-full py-2 px-4 rounded-lg bg-danger-600 hover:bg-danger-500 text-white text-sm font-bold transition-colors">
          {activePlan ? 'View Bug-Out Plan →' : 'Set Up Bug-Out Plan →'}
        </button>
      </Link>
    </div>
  )
}
