import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useInventory } from '../hooks/useInventory'
import {
  getAffinityDomains, getAffinityAssets,
  ROLE_BY_KEY, ROLE_REGISTRY, ROLES_BY_DOMAIN, slotsNeeded,
  ASSET_BY_KEY, assetsNeeded,
  bucketScore,
} from '@plus-ultra/core'
import type { SkillRole, SkillDomain } from '@plus-ultra/core'
import AppIcon from '../components/AppIcon'
import { ASSET_APP_ICONS } from '../components/registry-icons'
import { AppButton, AppCard, AppEmptyState } from '../components/ui'

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

  // Cross-training recommendations: gap roles where my domains provide affinity
  const crossTrainRecs: { role: SkillRole; slotsNeeded: number; affinityMatch: boolean }[] = []
  if (myRoles.length > 0) {
    const gapRoles = ROLE_REGISTRY
      .filter(spec => {
        if (myRoles.includes(spec.role)) return false
        const needed = slotsNeeded(memberCount, spec)
        if (needed === 0) return false
        const score = bucketScore(spec.role, members, skills)
        return score < 0.6
      })
      .sort((a, b) => a.tier - b.tier || bucketScore(a.role, members, skills) - bucketScore(b.role, members, skills))

    for (const spec of gapRoles) {
      const roleAffinityDomains = getAffinityDomains([spec.role])
      const hasAffinity = myDomains.some(d => roleAffinityDomains.includes(d))
      if (hasAffinity) {
        crossTrainRecs.push({
          role: spec.role,
          slotsNeeded: slotsNeeded(memberCount, spec),
          affinityMatch: true,
        })
        if (crossTrainRecs.length >= 3) break
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
          <AppIcon name="back" size={16} /> Back to Dashboard
        </Link>

        <AppCard className="text-center">
          <AppEmptyState
            icon="hardHat"
            title="No Station Assigned"
            body="Declare your skills first to see your personalized station view."
            action={
              <Link to="/tribe/$tribeId/skills" params={{ tribeId }}>
                <AppButton>Declare Skills <AppIcon name="forward" size={16} /></AppButton>
              </Link>
            }
          />
        </AppCard>
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
        <AppIcon name="back" size={16} /> Back to Dashboard
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
              <AppCard key={role} className="flex items-center gap-2 !px-3 !py-2">
                <span className="text-base">{spec.icon}</span>
                <span className="text-sm font-semibold text-gray-200">{spec.label}</span>
              </AppCard>
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
          <AppCard className="text-center py-4">
            <p className="text-gray-500 text-sm">No team members in your domain yet</p>
          </AppCard>
        ) : (
          <div className="space-y-1.5">
            {teamMembers.map(member => {
              const theirRoles = skills
                .filter(s => s.memberId === member.pubkey)
                .map(s => ROLE_BY_KEY[s.role])
                .filter(Boolean)

              return (
                <AppCard key={member.pubkey} className="flex items-center gap-3 !py-2.5">
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
                    <span className="text-base"><AppIcon name="chat" size={16} /></span>
                  </Link>
                </AppCard>
              )
            })}
          </div>
        )}
      </div>

      {/* My Domain Gaps */}
      {myGaps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2 flex items-center gap-1">
            <AppIcon name="warning" size={16} /> Vacancies in My Domain
          </h3>
          <AppCard className="border-warning-700/50 space-y-1.5">
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
          </AppCard>
        </div>
      )}

      {/* Cross-Training Opportunities */}
      {crossTrainRecs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">
            Cross-Training Opportunities
          </h3>
          <AppCard className="space-y-2">
            {crossTrainRecs.map(({ role, slotsNeeded: slots }) => {
              const spec = ROLE_BY_KEY[role]
              return (
                <div key={role} className="flex items-center gap-2">
                  <span className="text-sm">{spec.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-300 font-medium">{spec.label}</div>
                    <div className="text-xs text-gray-500">{slots} slot{slots !== 1 ? 's' : ''} needed · your {spec.domain} skills transfer</div>
                  </div>
                  <Link
                    to="/tribe/$tribeId/training"
                    params={{ tribeId }}
                    className="text-xs text-forest-400 hover:text-forest-300 flex-shrink-0 flex items-center gap-1"
                  >
                    Learn <AppIcon name="forward" size={16} />
                  </Link>
                </div>
              )
            })}
          </AppCard>
        </div>
      )}

      {/* My Inventory */}
      <div className="mb-6">
        <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">
          My Inventory
        </h3>
        <AppCard className="space-y-1.5">
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
                  <span className="text-sm"><AppIcon name={ASSET_APP_ICONS[spec.asset]} size={16} /></span>
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
                  {spec.critical && <AppIcon name="star" size={16} className="text-warning-400" />}
                </div>
              )
            })
          )}
        </AppCard>
        <Link
          to="/tribe/$tribeId/inventory"
          params={{ tribeId }}
          className="text-xs text-forest-400 hover:text-forest-300 mt-2 inline-flex items-center gap-1"
        >
          Full inventory <AppIcon name="forward" size={16} />
        </Link>
      </div>

      {/* Quick links */}
      <div className="space-y-2">
        <Link
          to="/tribe/$tribeId/skills"
          params={{ tribeId }}
          className="card flex items-center gap-3 hover:border-forest-600 transition-colors"
        >
          <AppIcon name="target" size={20} />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-200">Edit My Skills</div>
            <div className="text-xs text-gray-500">Update roles and proficiency</div>
          </div>
          <AppIcon name="forward" size={16} className="text-forest-400" />
        </Link>
        <Link
          to="/tribe/$tribeId/people"
          params={{ tribeId }}
          className="card flex items-center gap-3 hover:border-forest-600 transition-colors"
        >
          <AppIcon name="people" size={20} />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-200">My People</div>
            <div className="text-xs text-gray-500">Family and friends</div>
          </div>
          <AppIcon name="forward" size={16} className="text-forest-400" />
        </Link>
      </div>
    </div>
  )
}
