import { currentAttachmentScore } from '@plus-ultra/core'
import type { TribeMember } from '@plus-ultra/core'

interface Props {
  member: TribeMember
  isYou: boolean
}

const STATUS_COLORS: Record<TribeMember['status'], string> = {
  active: 'bg-forest-400',
  away_declared: 'bg-warning-500',
  away_undeclared: 'bg-warning-700 animate-pulse',
  departed: 'bg-gray-600',
}

export default function MemberCard({ member, isYou }: Props) {
  const score = currentAttachmentScore(member)
  const scorePercent = Math.round(score * 100)

  return (
    <div className="card flex items-center gap-3">
      {/* Status dot */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[member.status]}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-100 text-sm truncate">
            {member.displayName}
          </span>
          {isYou && (
            <span className="text-xs bg-forest-800 text-forest-300 px-1.5 py-0.5 rounded">you</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{member.role ?? 'No role declared'}</span>
        </div>
      </div>

      {/* Attachment score */}
      <div className="text-right flex-shrink-0">
        <div className={`text-sm font-mono font-semibold ${
          scorePercent >= 80 ? 'text-forest-400'
          : scorePercent >= 50 ? 'text-warning-400'
          : 'text-danger-400'
        }`}>
          {scorePercent}%
        </div>
        <div className="text-xs text-gray-600">bond</div>
      </div>
    </div>
  )
}
