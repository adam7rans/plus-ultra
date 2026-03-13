import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useInventory } from '../hooks/useInventory'
import {
  getAffinityDomains, getAffinityAssets,
  ROLE_BY_KEY, ROLES_BY_DOMAIN, slotsNeeded,
  ASSET_BY_KEY, assetsNeeded,
} from '@plus-ultra/core'
import type { SkillRole, SkillDomain } from '@plus-ultra/core'

export default function MyStationScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/station' })
  const { identity } = useIdentity()
  const { members, skills } = useSurvivabilityScore(tribeId)
  const memberCount = members.length
  const inventory = useInventory(tribeId)
  const inventoryMap = new Map(inventory.map(i => [i.asset, i]))

  // Get my declared roles
  const myRoles: SkillRole[] = identity
    ? skills.filter(s => s.memberId === identity.pub).map(s => s.role)
    : []

  const myDomains = myRoles.length > 0
    ? [...new Set(myRoles.map(r => ROLE_BY_KEY[r]?.domain).filter(Boolean))] as SkillDomain[]
    : []

  const affinityDomains = myRoles.length > 0 ? getAffinityDomains(myRoles) : []
  const affinityAssets = myRoles.length > 0 ? getAffinityAssets(myRoles) : []

  // My team: members who share my domains or affinity domains
  const teamMembers = members.filter(m => {
    if (m.pubkey === identity?.pub) return false
    const theirRoles = skills.filter(s => s.memberId === m.pubkey).map(s => s.role)
    return theirRoles.some(r => {
      const spec = ROLE_BY_KEY[r]
      return spec && affinityDomains.includes(spec.domain)
    })
  })

  // Gaps in my domains
  const myGaps: { role: SkillRole; needed: number; have: number }[] = []
  for (const domain of myDomains) {
    const roles = ROLES_BY_DOMAIN[domain]
    for (const roleSpec of roles) {
      const needed = slotsNeeded(memberCount, roleSpec)
      if (needed === 0) continue
      const have = skills.filter(s => s.role === roleSpec.role).length
      if (have < needed) {
        myGaps.push({ role: roleSpec.role, needed, have })
      }
    }
  }

  if (myRoles.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Link
          to="/tribe/$tribeId"
          params={{ tribeId }}
          className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
        >
          ← Back to Dashboard
        </Link>

        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🪖</div>
          <h2 className="text-lg font-bold text-gray-100 mb-2">No Station Assigned</h2>
          <p className="text-gray-500 text-sm mb-4">
            Declare your skills first to see your personalized station view.
          </p>
          <Link to="/tribe/$tribeId/skills" params={{ tribeId }}>
            <button className="btn-primary">Declare Skills →</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Back to Dashboard
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-1">My Station</h2>
      <p className="text-gray-500 text-sm mb-6">
        Your roles, team, and resources at a glance.
      </p>

      {/* My Roles */}
      <div className="mb-6">
        <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">My Roles</h3>
        <div className="flex flex-wrap gap-2">
          {myRoles.map(role => {
            const spec = ROLE_BY_KEY[role]
            if (!spec) return null
            return (
              <div key={role} className="card flex items-center gap-2 px-3 py-2">
                <span className="text-base">{spec.icon}</span>
                <span className="text-sm font-semibold text-gray-200">{spec.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* My Team */}
      <div className="mb-6">
        <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">
          My Team ({teamMembers.length})
        </h3>
        {teamMembers.length === 0 ? (
          <div className="card text-center py-4">
            <p className="text-gray-500 text-sm">No team members in your domain yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {teamMembers.map(member => {
              const theirRoles = skills
                .filter(s => s.memberId === member.pubkey)
                .map(s => ROLE_BY_KEY[s.role])
                .filter(Boolean)

              return (
                <div key={member.pubkey} className="card flex items-center gap-3 py-2.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    member.status === 'active' ? 'bg-forest-400' :
                    member.status === 'away_declared' ? 'bg-warning-500' :
                    'bg-gray-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-100 truncate">
                      {member.displayName}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {theirRoles.slice(0, 3).map(spec => (
                        <span key={spec.role} className="text-xs text-gray-500">
                          {spec.icon} {spec.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    to="/tribe/$tribeId/dm/$memberPub"
                    params={{ tribeId, memberPub: member.pubkey }}
                    className="text-gray-600 hover:text-forest-400 flex-shrink-0"
                  >
                    <span className="text-base">💬</span>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* My Domain Gaps */}
      {myGaps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">
            ⚠ Vacancies in My Domain
          </h3>
          <div className="card border-warning-700/50 space-y-1.5">
            {myGaps.map(({ role, needed, have }) => {
              const spec = ROLE_BY_KEY[role]
              return (
                <div key={role} className="flex items-center gap-2">
                  <span className="text-sm">{spec.icon}</span>
                  <span className="text-xs text-gray-300 flex-1">{spec.label}</span>
                  <span className="text-xs font-mono text-warning-400">
                    {have}/{needed}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* My Inventory */}
      <div className="mb-6">
        <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">
          My Inventory
        </h3>
        <div className="card space-y-1.5">
          {affinityAssets.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-2">No assets mapped to your roles</p>
          ) : (
            affinityAssets.map(assetKey => {
              const spec = ASSET_BY_KEY[assetKey]
              if (!spec) return null
              const needed = assetsNeeded(memberCount, spec)
              if (needed === 0) return null
              const unitLabel = spec.unit === 'days_supply' ? 'days' : spec.unit
              return (
                <div key={assetKey} className="flex items-center gap-2">
                  <span className="text-sm">{spec.icon}</span>
                  <span className="text-xs text-gray-300 flex-1">{spec.label}</span>
                  {(() => {
                    const have = inventoryMap.get(assetKey)?.quantity ?? 0
                    return (
                      <span className={`text-xs font-mono ${
                        have >= needed ? 'text-forest-400' :
                        have > 0 ? 'text-warning-400' :
                        spec.critical ? 'text-danger-400' : 'text-gray-500'
                      }`}>
                        {have}/{needed} {unitLabel}
                      </span>
                    )
                  })()}
                  {spec.critical && <span className="text-warning-400 text-xs">★</span>}
                </div>
              )
            })
          )}
        </div>
        <Link
          to="/tribe/$tribeId/inventory"
          params={{ tribeId }}
          className="text-xs text-forest-400 hover:text-forest-300 mt-2 inline-block"
        >
          Full inventory →
        </Link>
      </div>

      {/* Quick links */}
      <div className="space-y-2">
        <Link
          to="/tribe/$tribeId/skills"
          params={{ tribeId }}
          className="card flex items-center gap-3 hover:border-forest-600 transition-colors"
        >
          <span className="text-xl">🎯</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-200">Edit My Skills</div>
            <div className="text-xs text-gray-500">Update roles and proficiency</div>
          </div>
          <span className="text-forest-400">→</span>
        </Link>
        <Link
          to="/tribe/$tribeId/people"
          params={{ tribeId }}
          className="card flex items-center gap-3 hover:border-forest-600 transition-colors"
        >
          <span className="text-xl">👨‍👩‍👧</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-200">My People</div>
            <div className="text-xs text-gray-500">Family and friends</div>
          </div>
          <span className="text-forest-400">→</span>
        </Link>
      </div>
    </div>
  )
}
