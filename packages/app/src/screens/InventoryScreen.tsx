import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { usePendingSyncIds } from '../hooks/usePendingSyncIds'
import { useInventory } from '../hooks/useInventory'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useConsumption } from '../hooks/useConsumption'
import { useProduction } from '../hooks/useProduction'
import { updateAsset } from '../lib/inventory'
import { logConsumption } from '../lib/consumption'
import {
  CATEGORY_ORDER, CATEGORY_META, ASSETS_BY_CATEGORY,
  assetsNeeded, assetReadiness,
  canEditInventory,
  computeNetRate, computeNetDaysRemaining,
} from '@plus-ultra/core'
import type { AssetCategory, AssetType, AssetSpec, TribeAsset } from '@plus-ultra/core'
import type { AssetConsumptionData } from '../hooks/useConsumption'
import type { ConsumptionEntry } from '@plus-ultra/core'

export default function InventoryScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/inventory' })
  const { identity } = useIdentity()
  const inventory = useInventory(tribeId)
  const { members, skills } = useSurvivabilityScore(tribeId)
  const memberCount = members.length
  const consumption = useConsumption(tribeId, memberCount, inventory)

  const { rateByAsset: productionRateByAsset } = useProduction(tribeId)
  const pendingSyncIds = usePendingSyncIds(tribeId)

  const myRoles = identity ? skills.filter(s => s.memberId === identity.pub).map(s => s.role) : []

  const inventoryMap = new Map(inventory.map(i => [i.asset, i]))

  const readiness = assetReadiness(memberCount || 1, inventory)
  const readinessPct = Math.round(readiness * 100)

  const [expanded, setExpanded] = useState<Set<AssetCategory>>(
    () => new Set(CATEGORY_ORDER.length > 0 ? [CATEGORY_ORDER[0]] : [])
  )
  const [expandedAssets, setExpandedAssets] = useState<Set<AssetType>>(new Set())

  function toggleCategory(cat: AssetCategory) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function toggleAsset(asset: AssetType) {
    setExpandedAssets(prev => {
      const next = new Set(prev)
      if (next.has(asset)) next.delete(asset)
      else next.add(asset)
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
                      isStores={cat === 'stores'}
                      isExpandedAsset={expandedAssets.has(spec.asset)}
                      consumptionData={consumption.get(spec.asset) ?? null}
                      productionRate={productionRateByAsset.get(spec.asset) ?? null}
                      isSyncing={pendingSyncIds.has(`inventory:${tribeId}:${spec.asset}`)}
                      onToggleAsset={() => toggleAsset(spec.asset)}
                      onQuantityChange={handleQuantityChange}
                      onNotesChange={handleNotesChange}
                      onLogConsumption={(amount, periodDays, notes) =>
                        logConsumption(tribeId, spec.asset, amount, periodDays, identity!.pub, notes, memberCount)
                      }
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

// ─── Days badge ────────────────────────────────────────────────────────────

function DaysBadge({ data }: { data: AssetConsumptionData }) {
  if (data.burnRate === null) return null

  const days = data.daysRemaining
  const label = days === Infinity ? '--' : `${Math.round(days)}d`

  const colorClass =
    data.status === 'critical' ? 'bg-danger-900 text-danger-400 border-danger-700' :
    data.status === 'warning'  ? 'bg-warning-900/50 text-warning-400 border-warning-700' :
                                 'bg-forest-950 text-forest-400 border-forest-800'

  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${colorClass}`}>
      {label}
    </span>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────

function Sparkline({ entries }: { entries: ConsumptionEntry[] }) {
  const last8 = [...entries].sort((a, b) => a.loggedAt - b.loggedAt).slice(-8)
  if (last8.length === 0) return null

  const max = Math.max(...last8.map(e => e.amount))
  const W = 80
  const H = 24
  const barW = Math.floor(W / last8.length) - 1

  return (
    <svg width={W} height={H} className="inline-block" style={{ verticalAlign: 'middle' }}>
      {last8.map((e, i) => {
        const barH = max > 0 ? Math.max(2, Math.round((e.amount / max) * (H - 2))) : 2
        const x = i * (barW + 1)
        const y = H - barH
        return (
          <rect
            key={e.id}
            x={x} y={y}
            width={barW} height={barH}
            fill="#4ade80"
            opacity={0.7}
          />
        )
      })}
    </svg>
  )
}

// ─── Log form ─────────────────────────────────────────────────────────────

function LogForm({
  unitLabel,
  onSubmit,
}: {
  unitLabel: string
  onSubmit: (amount: number, periodDays: number, notes: string) => Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('1')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    const days = parseInt(period, 10)
    if (!amt || amt <= 0 || !days || days < 1) return
    setSubmitting(true)
    try {
      await onSubmit(amt, days, notes)
      setAmount('')
      setPeriod('1')
      setNotes('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0.1"
          step="any"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Amount"
          className="w-24 text-xs bg-forest-950 border border-forest-800 rounded-lg px-2.5 py-1.5 text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-forest-600"
          required
        />
        <span className="text-xs text-gray-500">{unitLabel}</span>
        <span className="text-xs text-gray-600 ml-1">over</span>
        <input
          type="number"
          min="1"
          step="1"
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="w-14 text-xs bg-forest-950 border border-forest-800 rounded-lg px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-forest-600"
          required
        />
        <span className="text-xs text-gray-500">days</span>
      </div>
      <input
        type="text"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full text-xs bg-forest-950 border border-forest-800 rounded-lg px-2.5 py-1.5 text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-forest-600"
      />
      <button
        type="submit"
        disabled={submitting}
        className="btn-primary text-xs py-1.5 w-full"
      >
        {submitting ? 'Logging...' : 'Log Consumption'}
      </button>
    </form>
  )
}

// ─── Asset row ────────────────────────────────────────────────────────────

function AssetRow({
  spec,
  memberCount,
  inventoryMap,
  canEdit,
  isStores,
  isExpandedAsset,
  consumptionData,
  productionRate,
  isSyncing,
  onToggleAsset,
  onQuantityChange,
  onNotesChange,
  onLogConsumption,
}: {
  spec: AssetSpec
  memberCount: number
  inventoryMap: Map<AssetType, TribeAsset>
  canEdit: boolean
  isStores: boolean
  isExpandedAsset: boolean
  consumptionData: AssetConsumptionData | null
  productionRate: number | null
  isSyncing?: boolean
  onToggleAsset: () => void
  onQuantityChange: (asset: AssetType, delta: number) => void
  onNotesChange: (asset: AssetType, notes: string) => void
  onLogConsumption: (amount: number, periodDays: number, notes: string) => Promise<unknown>
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

  const [showLogForm, setShowLogForm] = useState(false)

  return (
    <div className="card">
      {/* Main row — clickable for stores to expand */}
      <div
        className={`flex items-center gap-2 ${isStores ? 'cursor-pointer' : ''}`}
        onClick={isStores ? onToggleAsset : undefined}
      >
        <span className="text-sm">{spec.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-200 truncate">{spec.label}</span>
            {spec.critical && <span className="text-warning-400 text-xs">★</span>}
            {consumptionData && <DaysBadge data={consumptionData} />}
            {isSyncing && <span className="text-gray-400 text-xs" title="Pending relay sync">⏱</span>}
          </div>
          <div className="text-xs text-gray-600">
            Need ×{needed} {unitLabel}
          </div>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
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

        {isStores && (
          <span className="text-gray-600 text-xs ml-1">{isExpandedAsset ? '▲' : '▼'}</span>
        )}
      </div>

      {/* Notes input (non-stores categories) */}
      {canEdit && !isStores && (
        <input
          type="text"
          value={notes}
          onChange={e => onNotesChange(spec.asset, e.target.value)}
          placeholder="e.g. Honda EU2200i"
          className="mt-2 w-full text-xs bg-forest-950 border border-forest-800 rounded-lg px-2.5 py-1.5 text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-forest-600"
        />
      )}

      {/* Expanded stores panel */}
      {isStores && isExpandedAsset && (
        <div className="mt-3 pt-3 border-t border-forest-900">
          {/* Sparkline + burn rate */}
          {consumptionData && consumptionData.burnRate !== null ? (
            <div className="flex items-center gap-3 mb-2">
              <Sparkline entries={consumptionData.entries} />
              <span className="text-xs text-gray-400">
                burn: {consumptionData.burnRate.toFixed(1)} {unitLabel}/day
              </span>
            </div>
          ) : (
            <p className="text-xs text-gray-600 mb-2">No burn rate data yet</p>
          )}

          {/* Production + Net rate */}
          {productionRate !== null && (
            <div className="space-y-0.5 mb-2">
              <div className="text-xs text-forest-400">
                prod: +{productionRate.toFixed(1)} {unitLabel}/day
              </div>
              {consumptionData && consumptionData.burnRate !== null && (() => {
                const netRate = computeNetRate(productionRate, consumptionData.burnRate)
                const stock = inventoryMap.get(spec.asset)?.quantity ?? 0
                const netDays = computeNetDaysRemaining(stock, netRate)
                const isPositive = netRate !== null && netRate >= 0
                return (
                  <div className={`text-xs font-mono ${isPositive ? 'text-forest-400' : 'text-warning-400'}`}>
                    net: {netRate !== null ? (netRate >= 0 ? '+' : '') + netRate.toFixed(1) : '—'} {unitLabel}/day
                    {!isPositive && netDays !== Infinity && (
                      <span className="text-gray-500 font-sans ml-1">· {Math.round(netDays)}d left</span>
                    )}
                    {isPositive && (
                      <span className="text-gray-500 font-sans ml-1">· surplus</span>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Recent entries */}
          {consumptionData && consumptionData.entries.length > 0 && (
            <div className="space-y-1 mb-3">
              {consumptionData.entries.slice(0, 5).map(entry => {
                const date = new Date(entry.loggedAt)
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <div key={entry.id} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-12 shrink-0">{dateStr}</span>
                    <span className="text-danger-400">-{entry.amount} {unitLabel}</span>
                    {entry.notes && <span className="truncate text-gray-600">· {entry.notes}</span>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Log consumption */}
          {canEdit && (
            <>
              <button
                className="text-xs text-forest-400 hover:text-forest-300 transition-colors"
                onClick={() => setShowLogForm(prev => !prev)}
              >
                {showLogForm ? '▲ Hide form' : '[Log Consumption]'}
              </button>
              {showLogForm && (
                <LogForm
                  unitLabel={unitLabel}
                  onSubmit={async (amount, periodDays, notes) => {
                    await onLogConsumption(amount, periodDays, notes)
                    setShowLogForm(false)
                  }}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
