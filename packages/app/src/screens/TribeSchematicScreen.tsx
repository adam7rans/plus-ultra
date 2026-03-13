import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useInventory } from '../hooks/useInventory'
import {
  getTribeScale, getNextScale, scaleProgress,
  DOMAINS_BY_TIER, DOMAIN_META, ROLES_BY_DOMAIN, slotsNeeded,
  CATEGORY_ORDER, CATEGORY_META, ASSETS_BY_CATEGORY, assetsNeeded,
  assetReadiness,
} from '@plus-ultra/core'
import type { SkillDomain, AssetCategory } from '@plus-ultra/core'

const TIER_LABELS = ['Tier 1 — Critical', 'Tier 2 — Essential', 'Tier 3 — Multipliers']

export default function TribeSchematicScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/schematic' })
  const { score, members, skills, criticalGaps } = useSurvivabilityScore(tribeId)
  const memberCount = members.length

  const scale = getTribeScale(memberCount || 1)
  const nextScale = getNextScale(memberCount || 1)
  const progress = scaleProgress(memberCount || 1)

  const inventory = useInventory(tribeId)
  const inventoryMap = new Map(inventory.map(i => [i.asset, i]))
  const readiness = Math.round(assetReadiness(memberCount || 1, inventory.map(i => ({ asset: i.asset, quantity: i.quantity }))) * 100)

  const [expandedDomain, setExpandedDomain] = useState<SkillDomain | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<AssetCategory | null>(null)

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Back to Dashboard
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-1">Tribe Schematic</h2>
      <p className="text-gray-500 text-sm mb-6">
        Bird's eye view of tribal readiness — people and resources.
      </p>

      {/* Scale badge */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{scale.icon}</span>
            <div>
              <div className="text-sm font-bold text-gray-100">{scale.label}</div>
              <div className="text-xs text-gray-500">{memberCount} member{memberCount !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-forest-400">{score}%</div>
            <div className="text-xs text-gray-600">readiness</div>
          </div>
        </div>
        <div className="text-xs text-gray-500 mb-1.5">{scale.description}</div>
        {nextScale && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Next: {nextScale.icon} {nextScale.label}</span>
              <span>{nextScale.minPop - memberCount} more needed</span>
            </div>
            <div className="h-1.5 bg-forest-950 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-forest-500 transition-all duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── PERSONNEL SECTION ─────────────────────────────────── */}
      <div className="mb-8">
        <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
          👥 Personnel
          <span className="text-gray-600 normal-case tracking-normal">
            ({skills.length} declared)
          </span>
        </h3>

        <div className="space-y-6">
          {DOMAINS_BY_TIER.map((domains, tierIdx) => (
            <div key={tierIdx}>
              <div className="text-xs text-gray-600 uppercase tracking-widest mb-2">
                {TIER_LABELS[tierIdx]}
              </div>
              <div className="space-y-2">
                {domains.map(domain => {
                  const meta = DOMAIN_META[domain]
                  const roles = ROLES_BY_DOMAIN[domain]
                  const activeRoles = roles.filter(r => slotsNeeded(memberCount, r) > 0)
                  if (activeRoles.length === 0) return null

                  const totalSlots = activeRoles.reduce((s, r) => s + slotsNeeded(memberCount, r), 0)
                  const filledSlots = activeRoles.reduce((s, r) => {
                    return s + Math.min(slotsNeeded(memberCount, r), skills.filter(sk => sk.role === r.role).length)
                  }, 0)
                  const vacancies = totalSlots - filledSlots
                  const pct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0
                  const isExpanded = expandedDomain === domain
                  const hasCriticalGap = roles.some(r => r.tier === 1 && criticalGaps.includes(r.role))

                  return (
                    <button
                      key={domain}
                      className={`card w-full text-left transition-colors ${
                        hasCriticalGap ? 'border-danger-700/60' : ''
                      }`}
                      onClick={() => setExpandedDomain(isExpanded ? null : domain)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{meta.icon}</span>
                          <span className="text-sm font-semibold text-gray-200">{meta.label}</span>
                        </div>
                        <span className={`text-sm font-mono font-bold ${
                          pct >= 80 ? 'text-forest-400' :
                          pct >= 50 ? 'text-warning-400' :
                          'text-danger-400'
                        }`}>{pct}%</span>
                      </div>

                      {/* Fill bar */}
                      <div className="h-1.5 bg-forest-950 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 80 ? 'bg-forest-400' :
                            pct >= 50 ? 'bg-warning-500' :
                            'bg-danger-700'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          {filledSlots} filled · {vacancies > 0 ? (
                            <span className="text-warning-400">{vacancies} vacant</span>
                          ) : (
                            <span className="text-forest-400">fully staffed</span>
                          )}
                        </span>
                        <span className="text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                      </div>

                      {/* Expanded role slots */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-forest-800 space-y-1.5" onClick={e => e.stopPropagation()}>
                          {activeRoles.map(roleSpec => {
                            const needed = slotsNeeded(memberCount, roleSpec)
                            const have = skills.filter(s => s.role === roleSpec.role).length
                            const filled = Math.min(have, needed)
                            return (
                              <div key={roleSpec.role} className="flex items-center gap-2">
                                <span className="text-sm">{roleSpec.icon}</span>
                                <span className="text-xs text-gray-300 flex-1 truncate">{roleSpec.label}</span>
                                <div className="flex gap-0.5">
                                  {Array.from({ length: needed }, (_, i) => (
                                    <div
                                      key={i}
                                      className={`w-2.5 h-2.5 rounded-sm ${
                                        i < filled ? 'bg-forest-400' : 'bg-forest-900 border border-forest-700'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-mono text-gray-600 w-8 text-right">
                                  {have}/{needed}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RESOURCES SECTION ─────────────────────────────────── */}
      <div>
        <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
          📦 Resources
          <span className={`text-sm font-mono font-bold ${
            readiness >= 70 ? 'text-forest-400' : readiness >= 40 ? 'text-warning-400' : 'text-danger-400'
          }`}>{readiness}%</span>
        </h3>

        <div className="space-y-2">
          {CATEGORY_ORDER.map(cat => {
            const meta = CATEGORY_META[cat]
            const assets = ASSETS_BY_CATEGORY[cat]
            const activeAssets = assets.filter(a => assetsNeeded(memberCount, a) > 0)
            if (activeAssets.length === 0) return null

            const criticalCount = activeAssets.filter(a => a.critical).length
            const isExpanded = expandedCategory === cat

            return (
              <button
                key={cat}
                className="card w-full text-left"
                onClick={() => setExpandedCategory(isExpanded ? null : cat)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{meta.icon}</span>
                    <span className="text-sm font-semibold text-gray-200">{meta.label}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {activeAssets.length} items
                    {criticalCount > 0 && (
                      <span className="text-warning-400 ml-1">· {criticalCount} critical</span>
                    )}
                  </span>
                </div>

                {(() => {
                  const catHave = activeAssets.reduce((s, a) => s + Math.min(inventoryMap.get(a.asset)?.quantity ?? 0, assetsNeeded(memberCount, a)), 0)
                  const catNeed = activeAssets.reduce((s, a) => s + assetsNeeded(memberCount, a), 0)
                  const catPct = catNeed > 0 ? Math.round((catHave / catNeed) * 100) : 0
                  return (
                    <div className="h-1 bg-forest-950 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full rounded-full transition-all ${
                          catPct >= 70 ? 'bg-forest-400' : catPct >= 40 ? 'bg-warning-500' : 'bg-danger-700'
                        }`}
                        style={{ width: `${catPct}%` }}
                      />
                    </div>
                  )
                })()}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    Needed at {memberCount} members
                  </span>
                  <span className="text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* Expanded asset list */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-forest-800 space-y-1.5" onClick={e => e.stopPropagation()}>
                    {activeAssets.map(assetSpec => {
                      const needed = assetsNeeded(memberCount, assetSpec)
                      const unitLabel = assetSpec.unit === 'days_supply' ? 'days' : assetSpec.unit
                      return (
                        <div key={assetSpec.asset} className="flex items-center gap-2">
                          <span className="text-sm">{assetSpec.icon}</span>
                          <span className="text-xs text-gray-300 flex-1 truncate">{assetSpec.label}</span>
                          {(() => {
                            const have = inventoryMap.get(assetSpec.asset)?.quantity ?? 0
                            return (
                              <span className={`text-xs font-mono ${
                                have >= needed ? 'text-forest-400' :
                                have > 0 ? 'text-warning-400' :
                                assetSpec.critical ? 'text-danger-400' : 'text-gray-500'
                              }`}>
                                {have}/{needed} {unitLabel}
                              </span>
                            )
                          })()}
                          {assetSpec.critical && (
                            <span className="text-warning-400 text-xs">★</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
