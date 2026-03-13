import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useInventory } from '../hooks/useInventory'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { updateAsset } from '../lib/inventory'
import {
  CATEGORY_ORDER, CATEGORY_META, ASSETS_BY_CATEGORY,
  assetsNeeded, assetReadiness,
  canEditInventory,
} from '@plus-ultra/core'
import type { AssetCategory, AssetType, AssetSpec } from '@plus-ultra/core'

export default function InventoryScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/inventory' })
  const { identity } = useIdentity()
  const inventory = useInventory(tribeId)
  const { members, skills } = useSurvivabilityScore(tribeId)
  const memberCount = members.length

  const myRoles = identity ? skills.filter(s => s.memberId === identity.pub).map(s => s.role) : []

  const inventoryMap = new Map(inventory.map(i => [i.asset, i]))

  const readiness = assetReadiness(memberCount || 1, inventory)
  const readinessPct = Math.round(readiness * 100)

  const [expanded, setExpanded] = useState<Set<AssetCategory>>(
    () => new Set(CATEGORY_ORDER.length > 0 ? [CATEGORY_ORDER[0]] : [])
  )

  function toggleCategory(cat: AssetCategory) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function handleQuantityChange(asset: AssetType, delta: number) {
    const current = inventoryMap.get(asset)
    const newQty = Math.max(0, (current?.quantity ?? 0) + delta)
    const notes = current?.notes ?? ''
    updateAsset(tribeId, asset, newQty, notes, identity!.pub)
  }

  function handleNotesChange(asset: AssetType, notes: string) {
    const current = inventoryMap.get(asset)
    const qty = current?.quantity ?? 0
    updateAsset(tribeId, asset, qty, notes, identity!.pub)
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

      <h2 className="text-xl font-bold text-gray-100 mb-1">Inventory</h2>
      <p className="text-gray-500 text-sm mb-6">
        Track tribe assets and supplies against population-based needs.
      </p>

      {/* Asset Readiness score */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-bold text-gray-100">Asset Readiness</div>
            <div className="text-xs text-gray-500">{memberCount} member{memberCount !== 1 ? 's' : ''}</div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold font-mono ${
              readinessPct >= 70 ? 'text-forest-400' :
              readinessPct >= 40 ? 'text-warning-400' :
              'text-danger-400'
            }`}>{readinessPct}%</div>
            <div className="text-xs text-gray-600">readiness</div>
          </div>
        </div>
        <div className="h-1.5 bg-forest-950 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              readinessPct >= 70 ? 'bg-forest-400' :
              readinessPct >= 40 ? 'bg-warning-500' :
              'bg-danger-700'
            }`}
            style={{ width: `${readinessPct}%` }}
          />
        </div>
      </div>

      {/* Category sections */}
      <div className="space-y-2">
        {CATEGORY_ORDER.map(cat => {
          const meta = CATEGORY_META[cat]
          const assets = ASSETS_BY_CATEGORY[cat]
          const activeAssets = assets.filter(a => assetsNeeded(memberCount, a) > 0)
          if (activeAssets.length === 0) return null

          const trackedCount = activeAssets.filter(a => {
            const have = inventoryMap.get(a.asset)?.quantity ?? 0
            return have > 0
          }).length
          const isExpanded = expanded.has(cat)
          const canEdit = canEditInventory(myRoles, cat)

          return (
            <div key={cat}>
              <button
                className="card w-full text-left"
                onClick={() => toggleCategory(cat)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{meta.icon}</span>
                    <span className="text-sm font-semibold text-gray-200">{meta.label}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {trackedCount}/{activeAssets.length} tracked
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    Needed at {memberCount} members
                  </span>
                  <span className="text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="mt-1 space-y-1">
                  {activeAssets.map(spec => (
                    <AssetRow
                      key={spec.asset}
                      spec={spec}
                      memberCount={memberCount}
                      inventoryMap={inventoryMap}
                      canEdit={canEdit}
                      onQuantityChange={handleQuantityChange}
                      onNotesChange={handleNotesChange}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AssetRow({
  spec,
  memberCount,
  inventoryMap,
  canEdit,
  onQuantityChange,
  onNotesChange,
}: {
  spec: AssetSpec
  memberCount: number
  inventoryMap: Map<AssetType, { quantity: number; notes: string }>
  canEdit: boolean
  onQuantityChange: (asset: AssetType, delta: number) => void
  onNotesChange: (asset: AssetType, notes: string) => void
}) {
  const needed = assetsNeeded(memberCount, spec)
  const current = inventoryMap.get(spec.asset)
  const have = current?.quantity ?? 0
  const notes = current?.notes ?? ''
  const unitLabel = spec.unit === 'days_supply' ? 'days' : spec.unit

  const colorClass =
    have >= needed ? 'text-forest-400' :
    have > 0 ? 'text-warning-400' :
    spec.critical ? 'text-danger-400' :
    'text-gray-500'

  return (
    <div className="card">
      <div className="flex items-center gap-2">
        <span className="text-sm">{spec.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-200 truncate">{spec.label}</span>
            {spec.critical && <span className="text-warning-400 text-xs">★</span>}
          </div>
          <div className="text-xs text-gray-600">
            Need ×{needed} {unitLabel}
          </div>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-1.5">
            <button
              className="w-7 h-7 rounded-lg bg-forest-950 border border-forest-800 text-gray-300 text-sm font-bold hover:border-forest-600 transition-colors"
              onClick={() => onQuantityChange(spec.asset, -1)}
            >
              −
            </button>
            <span className={`text-sm font-mono font-bold w-8 text-center ${colorClass}`}>
              {have}
            </span>
            <button
              className="w-7 h-7 rounded-lg bg-forest-950 border border-forest-800 text-gray-300 text-sm font-bold hover:border-forest-600 transition-colors"
              onClick={() => onQuantityChange(spec.asset, 1)}
            >
              +
            </button>
          </div>
        ) : (
          <span className={`text-sm font-mono font-bold ${colorClass}`}>
            {have}/{needed}
          </span>
        )}
      </div>

      {canEdit && (
        <input
          type="text"
          value={notes}
          onChange={e => onNotesChange(spec.asset, e.target.value)}
          placeholder="e.g. Honda EU2200i"
          className="mt-2 w-full text-xs bg-forest-950 border border-forest-800 rounded-lg px-2.5 py-1.5 text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-forest-600"
        />
      )}
    </div>
  )
}
