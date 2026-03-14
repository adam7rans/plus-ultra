import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  currentAttachmentScore,
  getAuthority, canManageRoles, assignableRoles,
  AUTHORITY_META, ROLE_BY_KEY, canDiplomatize, roleFitScore,
} from '@plus-ultra/core'
import type { TribeMember, Tribe, AuthorityRole, MemberSkill, PsychDimensions } from '@plus-ultra/core'
import { setAuthorityRole, setDiplomatStatus } from '../lib/tribes'

interface Props {
  member: TribeMember
  isYou: boolean
  tribeId: string
  tribe?: Tribe | null
  actorMember?: TribeMember
  skills?: MemberSkill[]
  dmUnreadCount?: number
  psychDimensions?: PsychDimensions
}

const STATUS_COLORS: Record<TribeMember['status'], string> = {
  active: 'bg-forest-400',
  away_declared: 'bg-warning-500',
  away_undeclared: 'bg-warning-700 animate-pulse',
  departed: 'bg-gray-600',
}

export default function MemberCard({ member, isYou, tribeId, tribe, actorMember, skills = [], dmUnreadCount, psychDimensions }: Props) {
  const score = currentAttachmentScore(member)
  const scorePercent = Math.round(score * 100)
  const auth = tribe ? getAuthority(member, tribe) : (member.authorityRole ?? 'member')
  const authMeta = AUTHORITY_META[auth]

  const canManage = actorMember && tribe ? canManageRoles(actorMember, tribe) : false
  const availableRoles = actorMember && tribe && !isYou
    ? assignableRoles(actorMember, member, tribe)
    : []
  const showRoleMenu = canManage && availableRoles.length > 0

  // Diplomat management: actor must be able to diplomatize and not managing themselves
  const actorCanDiplomat = actorMember && tribe ? canDiplomatize(actorMember, tribe) : false
  const canToggleDiplomat = actorCanDiplomat && canManage && !isYou

  const [showRoles, setShowRoles] = useState(false)
  const [togglingDiplomat, setTogglingDiplomat] = useState(false)

  async function handleToggleDiplomat() {
    setTogglingDiplomat(true)
    try {
      await setDiplomatStatus(tribeId, member.pubkey, !member.isDiplomat)
    } finally {
      setTogglingDiplomat(false)
    }
  }

  // Skill preview: show top 3 role icons
  const memberSkills = skills.filter(s => s.memberId === member.pubkey)
  const topRoleSpecs = memberSkills.slice(0, 3).map(s => ROLE_BY_KEY[s.role]).filter(Boolean)

  async function handleSetRole(role: AuthorityRole) {
    await setAuthorityRole(tribeId, member.pubkey, role)
    setShowRoles(false)
  }

  return (
    <div className="card">
      <Link
        to="/tribe/$tribeId/member/$memberPub"
        params={{ tribeId, memberPub: member.pubkey }}
        className="flex items-center gap-3"
      >
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
            {auth !== 'member' && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                auth === 'founder' ? 'bg-yellow-900/50 text-yellow-300' :
                auth === 'elder_council' ? 'bg-purple-900/50 text-purple-300' :
                auth === 'lead' ? 'bg-blue-900/50 text-blue-300' :
                auth === 'restricted' ? 'bg-gray-800 text-gray-400' : ''
              }`}>
                {authMeta.icon} {authMeta.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {topRoleSpecs.length > 0 ? (
              <>
                {topRoleSpecs.map(spec => (
                  <span key={spec.role} className="text-xs text-gray-500">{spec.icon}</span>
                ))}
                {memberSkills.length > 3 && (
                  <span className="text-xs text-gray-600">+{memberSkills.length - 3}</span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-500">{member.role ?? 'No role declared'}</span>
            )}
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
      </Link>

      {/* Actions — outside the Link to prevent navigation on click */}
      <div className="flex items-center gap-1 justify-end -mt-8 mr-0 relative z-10">
        {showRoleMenu && (
          <button
            className="text-gray-600 hover:text-forest-400 transition-colors"
            onClick={() => setShowRoles(prev => !prev)}
            title="Manage role"
          >
            <span className="text-base">⚙️</span>
          </button>
        )}
        {!isYou && (
          <Link
            to="/tribe/$tribeId/dm/$memberPub"
            params={{ tribeId, memberPub: member.pubkey }}
            className="relative text-gray-600 hover:text-forest-400 transition-colors pl-1"
            title={`Message ${member.displayName}`}
            onClick={e => e.stopPropagation()}
          >
            <span className="text-base">💬</span>
            {dmUnreadCount && dmUnreadCount > 0 ? (
              <span className="absolute -top-1 -right-0.5 w-3.5 h-3.5 rounded-full bg-forest-500 text-white text-[8px] font-bold flex items-center justify-center">
                {dmUnreadCount > 9 ? '9+' : dmUnreadCount}
              </span>
            ) : null}
          </Link>
        )}
      </div>

      {/* Role management dropdown */}
      {showRoles && (
        <div className="mt-3 pt-3 border-t border-forest-800 space-y-3">
          <div>
            <div className="text-xs text-gray-400 mb-2">Set authority role:</div>
            <div className="flex flex-wrap gap-1.5">
              {availableRoles.map(role => {
                const meta = AUTHORITY_META[role]
                const isActive = auth === role
                const fitPct = psychDimensions ? Math.round(roleFitScore(psychDimensions, role) * 100) : null
                return (
                  <button
                    key={role}
                    className={`px-2.5 py-1.5 rounded text-xs border flex items-center gap-1 ${
                      isActive
                        ? 'border-forest-500 bg-forest-900/50 text-forest-300'
                        : 'border-forest-800 text-gray-400 hover:border-forest-600'
                    }`}
                    onClick={() => handleSetRole(role)}
                    disabled={isActive}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                    {fitPct !== null && (
                      <span className="text-[10px] text-gray-500 ml-0.5">{fitPct}% fit</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {canToggleDiplomat && (
            <div>
              <div className="text-xs text-gray-400 mb-2">Federation:</div>
              <button
                className={`px-2.5 py-1.5 rounded text-xs border flex items-center gap-1 ${
                  member.isDiplomat
                    ? 'border-forest-500 bg-forest-900/50 text-forest-300'
                    : 'border-forest-800 text-gray-400 hover:border-forest-600'
                }`}
                onClick={handleToggleDiplomat}
                disabled={togglingDiplomat}
              >
                <span>{member.isDiplomat ? 'Diplomat ✓' : 'Designate as Diplomat'}</span>
              </button>
              {member.isDiplomat && (
                <p className="text-xs text-gray-600 mt-1">
                  Tribe founder must share the encryption key separately for full access.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
