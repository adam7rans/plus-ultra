import type { RoleMeta } from '../lib/roles'

interface Props {
  meta: RoleMeta
  score: number        // 0.0 to 1.0+
  memberCount: number  // how many people declared this skill
  minimum: number      // minimum required
}

function barColor(score: number): string {
  if (score === 0) return 'bg-danger-700'
  if (score < 0.6) return 'bg-warning-500'
  if (score < 1.0) return 'bg-yellow-400'
  return 'bg-forest-400'
}

const TIER_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Critical',
  2: 'Essential',
  3: 'Multiplier',
}

const TIER_COLOR: Record<1 | 2 | 3, string> = {
  1: 'text-danger-400',
  2: 'text-warning-400',
  3: 'text-forest-400',
}

export default function BucketCard({ meta, score, memberCount, minimum }: Props) {
  const fillPercent = Math.min(100, Math.round(score * 100))
  const isCritical = score === 0 && meta.tier === 1

  return (
    <div className={`card p-3 ${isCritical ? 'border-danger-700/60 bg-danger-900/10' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base leading-none">{meta.icon}</span>
          <span className="text-xs font-semibold text-gray-200 truncate">{meta.label}</span>
        </div>
        <span className={`text-xs font-mono flex-shrink-0 ml-1 ${
          score === 0 ? 'text-danger-400' :
          score < 0.6 ? 'text-warning-400' :
          'text-forest-400'
        }`}>
          {memberCount}/{minimum === 0 ? '—' : minimum}
        </span>
      </div>

      {/* Fill bar */}
      <div className="h-1.5 bg-forest-950 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(score)}`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs ${TIER_COLOR[meta.tier]}`}>{TIER_LABEL[meta.tier]}</span>
        <span className="text-xs text-gray-600 font-mono">{fillPercent}%</span>
      </div>
    </div>
  )
}
