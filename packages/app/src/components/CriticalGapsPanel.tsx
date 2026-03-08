import type { SkillRole } from '@plus-ultra/core'
import { ROLE_META } from '../lib/roles'
import { Link } from '@tanstack/react-router'

interface Props {
  criticalGaps: SkillRole[]   // tier 1 at zero
  warnings: SkillRole[]       // below minimum
  tribeId: string
}

export default function CriticalGapsPanel({ criticalGaps, warnings, tribeId }: Props) {
  if (criticalGaps.length === 0 && warnings.length === 0) {
    return (
      <div className="card border-forest-600/40 bg-forest-900/20 text-center py-4">
        <p className="text-forest-300 text-sm font-semibold">✓ All critical roles covered</p>
        <p className="text-gray-500 text-xs mt-1">Focus on depth and Tier 3 multipliers</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {criticalGaps.length > 0 && (
        <div className="card border-danger-700 bg-danger-900/10">
          <p className="text-danger-400 text-xs font-semibold uppercase tracking-widest mb-2">
            ⚠ Critical gaps — score capped at 25%
          </p>
          <div className="space-y-1.5">
            {criticalGaps.map(role => {
              const meta = ROLE_META[role]
              return (
                <div key={role} className="flex items-center gap-2">
                  <span className="text-sm">{meta.icon}</span>
                  <span className="text-sm text-gray-200">{meta.label}</span>
                  <span className="text-xs text-danger-400 ml-auto">0 members</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="card border-warning-700/50">
          <p className="text-warning-400 text-xs font-semibold uppercase tracking-widest mb-2">
            Below minimum
          </p>
          <div className="space-y-1.5">
            {warnings.map(role => {
              const meta = ROLE_META[role]
              return (
                <div key={role} className="flex items-center gap-2">
                  <span className="text-sm">{meta.icon}</span>
                  <span className="text-sm text-gray-300">{meta.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Link to="/tribe/$tribeId/skills" params={{ tribeId }}>
        <button className="btn-secondary w-full text-sm mt-1">
          Declare your skills →
        </button>
      </Link>
    </div>
  )
}
