import type { SkillRole, MemberSkill, TribeMember } from '@plus-ultra/core'
import { DOMAINS_BY_TIER, DOMAIN_META, ROLES_BY_DOMAIN, slotsNeeded } from '@plus-ultra/core'
import BucketCard from './BucketCard'

const TIER_LABELS = ['Tier 1 — Critical', 'Tier 2 — Essential', 'Tier 3 — Multipliers']

interface Props {
  bucketScores: Record<SkillRole, number>
  members: TribeMember[]
  skills: MemberSkill[]
}

export default function BucketGrid({ bucketScores, members, skills }: Props) {
  const memberCount = members.length

  return (
    <div className="space-y-6">
      {DOMAINS_BY_TIER.map((domains, tierIdx) => (
        <div key={tierIdx}>
          <h4 className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            {TIER_LABELS[tierIdx]}
          </h4>
          <div className="space-y-4">
            {domains.map(domain => {
              const meta = DOMAIN_META[domain]
              const roles = ROLES_BY_DOMAIN[domain]
              // Only show roles that are active at this population
              const activeRoles = roles.filter(r => slotsNeeded(memberCount, r) > 0)
              if (activeRoles.length === 0) return null

              return (
                <div key={domain}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">{meta.icon}</span>
                    <span className="text-xs font-semibold text-gray-400">{meta.label}</span>
                    <span className="text-xs text-gray-600">({activeRoles.length} roles)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {activeRoles.map(roleSpec => {
                      const needed = slotsNeeded(memberCount, roleSpec)
                      const filled = skills.filter(s => s.role === roleSpec.role).length
                      return (
                        <BucketCard
                          key={roleSpec.role}
                          meta={roleSpec}
                          score={bucketScores[roleSpec.role] ?? 0}
                          memberCount={filled}
                          minimum={needed}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
