import { TIER_1_ROLES, TIER_2_ROLES, TIER_3_ROLES } from '@plus-ultra/core'
import type { SkillRole, TribeMember, MemberSkill } from '@plus-ultra/core'
import { ROLE_META } from '../lib/roles'
import BucketCard from './BucketCard'

// Inline minimum calculation to avoid importing the private MINIMUMS map
function getMinimum(role: SkillRole, memberCount: number): number {
  switch (role) {
    case 'medical': return Math.ceil(memberCount / 25)
    case 'food_production': return Math.max(2, Math.ceil(memberCount / 10))
    case 'security_tactical': return Math.max(1, Math.ceil(memberCount / 20))
    case 'water_plumbing': return 1
    case 'electrical_solar': return 1
    case 'construction': return Math.max(1, Math.ceil(memberCount / 30))
    case 'cooking_preservation': return Math.max(1, Math.ceil(memberCount / 25))
    case 'comms_tech': return 1
    default: return 0
  }
}

interface Props {
  bucketScores: Record<SkillRole, number>
  members: TribeMember[]
  skills: MemberSkill[]
}

const TIERS = [
  { label: 'Tier 1 — Critical', roles: TIER_1_ROLES },
  { label: 'Tier 2 — Essential', roles: TIER_2_ROLES },
  { label: 'Tier 3 — Multipliers', roles: TIER_3_ROLES },
]

export default function BucketGrid({ bucketScores, members, skills }: Props) {
  return (
    <div className="space-y-5">
      {TIERS.map(({ label, roles }) => (
        <div key={label}>
          <h4 className="text-xs text-gray-500 uppercase tracking-widest mb-2">{label}</h4>
          <div className="grid grid-cols-2 gap-2">
            {roles.map(role => {
              const memberCount = skills.filter(s => s.role === role).length
              const minimum = getMinimum(role, members.length)
              return (
                <BucketCard
                  key={role}
                  meta={ROLE_META[role]}
                  score={bucketScores[role] ?? 0}
                  memberCount={memberCount}
                  minimum={minimum}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
