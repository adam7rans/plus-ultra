import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useTribePsychProfiles } from '../hooks/useTribePsychProfiles'
import { subscribeToMembers } from '../lib/tribes'
import { compatibilityScore } from '@plus-ultra/core'
import type { TribeMember, PsychArchetype, PsychProfile } from '@plus-ultra/core'

const ARCHETYPE_COLORS: Record<PsychArchetype, string> = {
  Commander: 'bg-red-900/50 text-red-300 border-red-800',
  Scout:     'bg-amber-900/50 text-amber-300 border-amber-800',
  Strategist:'bg-blue-900/50 text-blue-300 border-blue-800',
  Connector: 'bg-green-900/50 text-green-300 border-green-800',
  Planner:   'bg-purple-900/50 text-purple-300 border-purple-800',
  Sustainer: 'bg-cyan-900/50 text-cyan-300 border-cyan-800',
}

function CompatScore({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  return (
    <span className={`text-xs font-mono font-semibold ${
      pct >= 70 ? 'text-forest-400' : pct >= 50 ? 'text-warning-400' : 'text-danger-400'
    }`}>
      {pct}%
    </span>
  )
}

export default function PsychOverviewScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/psych' })
  const profiles = useTribePsychProfiles(tribeId)
  const [members, setMembers] = useState<TribeMember[]>([])

  useEffect(() => {
    const unsub = subscribeToMembers(tribeId, setMembers)
    return unsub
  }, [tribeId])

  // Archetype distribution
  const archetypeCounts = new Map<PsychArchetype, number>()
  for (const profile of profiles.values()) {
    archetypeCounts.set(profile.archetype, (archetypeCounts.get(profile.archetype) ?? 0) + 1)
  }
  const archetypeOrder: PsychArchetype[] = ['Commander', 'Scout', 'Strategist', 'Connector', 'Planner', 'Sustainer']

  // Members without profiles
  const withoutProfile = members.filter(m => !profiles.has(m.pubkey))

  // Member list sorted by archetype
  const membersSorted = [...members].sort((a, b) => {
    const pa = profiles.get(a.pubkey)?.archetype ?? 'ZZZ'
    const pb = profiles.get(b.pubkey)?.archetype ?? 'ZZZ'
    return pa.localeCompare(pb)
  })

  // Leadership members (founder + elder_council) with profiles
  const leadershipProfiles: { member: TribeMember; profile: PsychProfile }[] = members
    .filter(m => ['founder', 'elder_council'].includes(m.authorityRole ?? 'member'))
    .filter(m => profiles.has(m.pubkey))
    .map(m => ({ member: m, profile: profiles.get(m.pubkey)! }))

  const showCompatMatrix = leadershipProfiles.length >= 2

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Dashboard
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-100">Tribe Psychology</h2>
        <Link
          to="/tribe/$tribeId/psych/assessment"
          params={{ tribeId }}
          className="btn-primary text-sm px-3 py-1.5"
        >
          Take Assessment
        </Link>
      </div>

      {/* Archetype distribution */}
      <div className="card mb-4">
        <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-3">Archetype Distribution</h3>
        {profiles.size === 0 ? (
          <p className="text-gray-500 text-sm">No profiles yet — members need to complete the assessment.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {archetypeOrder.map(arch => {
              const count = archetypeCounts.get(arch) ?? 0
              if (count === 0) return null
              return (
                <div
                  key={arch}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${ARCHETYPE_COLORS[arch]}`}
                >
                  <span>{arch}</span>
                  <span className="opacity-70">×{count}</span>
                </div>
              )
            })}
          </div>
        )}
        {withoutProfile.length > 0 && (
          <p className="text-xs text-gray-500 mt-3">
            {withoutProfile.length} member{withoutProfile.length !== 1 ? 's' : ''} without a profile
          </p>
        )}
      </div>

      {/* Leadership compatibility matrix */}
      {showCompatMatrix && (
        <div className="card mb-4">
          <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-3">
            Leadership Compatibility
          </h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr>
                  <th className="text-left text-gray-500 pb-2 pr-3"></th>
                  {leadershipProfiles.map(({ member }) => (
                    <th key={member.pubkey} className="text-gray-400 pb-2 px-2 text-center font-normal">
                      {member.displayName.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leadershipProfiles.map(({ member: mA, profile: pA }) => (
                  <tr key={mA.pubkey}>
                    <td className="text-gray-400 pr-3 py-1">{mA.displayName.split(' ')[0]}</td>
                    {leadershipProfiles.map(({ member: mB, profile: pB }) => (
                      <td key={mB.pubkey} className="px-2 py-1 text-center">
                        {mA.pubkey === mB.pubkey ? (
                          <span className="text-gray-600">—</span>
                        ) : (
                          <CompatScore score={compatibilityScore(pA.dimensions, pB.dimensions)} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Member list sorted by archetype */}
      <div className="mb-4">
        <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-3">
          Members by Archetype
        </h3>
        <div className="space-y-2">
          {membersSorted.map(member => {
            const profile = profiles.get(member.pubkey)
            return (
              <Link
                key={member.pubkey}
                to="/tribe/$tribeId/member/$memberPub"
                params={{ tribeId, memberPub: member.pubkey }}
                className="card flex items-center gap-3 hover:border-forest-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-200 font-medium">{member.displayName}</span>
                </div>
                {profile ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${ARCHETYPE_COLORS[profile.archetype]}`}>
                    {profile.archetype}
                  </span>
                ) : (
                  <span className="text-xs text-gray-600">No profile</span>
                )}
                <span className="text-forest-400">→</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
