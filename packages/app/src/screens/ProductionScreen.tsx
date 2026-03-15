import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useOfflineStage } from '../hooks/useOfflineStage'
import OfflineStageBanner from '../components/OfflineStageBanner'
import { useProduction } from '../hooks/useProduction'
import { useConsumption } from '../hooks/useConsumption'
import { useInventory } from '../hooks/useInventory'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { logProductionEntry } from '../lib/production'
import {
  ASSET_REGISTRY, ASSET_BY_KEY,
  computeNetRate, computeNetDaysRemaining,
} from '@plus-ultra/core'
import type { AssetType } from '@plus-ultra/core'
import type { ProductionEntry } from '@plus-ultra/core'

export default function ProductionScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/production' })
  const { identity } = useIdentity()
  const { members } = useSurvivabilityScore(tribeId)
  const inventory = useInventory(tribeId)
  const consumption = useConsumption(tribeId, members.length, inventory)
  const { entries, rateByAsset } = useProduction(tribeId)
  const { offlineStage, offlineSince } = useOfflineStage()

  // Group entries by asset for history display
  const byAsset = new Map<AssetType, ProductionEntry[]>()
  for (const e of entries) {
    const list = byAsset.get(e.assetType) ?? []
    list.push(e)
    byAsset.set(e.assetType, list)
  }

  // Assets with any production data
  const assetsWithProduction = Array.from(rateByAsset.keys())

  const [expandedHistory, setExpandedHistory] = useState<Set<AssetType>>(new Set())
  function toggleHistory(asset: AssetType) {
    setExpandedHistory(prev => {
      const next = new Set(prev)
      if (next.has(asset)) next.delete(asset)
      else next.add(asset)
      return next
    })
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Dashboard
      </Link>

      <OfflineStageBanner stage={offlineStage} offlineSince={offlineSince} />

      <h2 className="text-xl font-bold text-gray-100 mb-1">Production</h2>
      <p className="text-gray-500 text-sm mb-6">
        Track tribe output — food, water, energy, and more.
      </p>

      {/* Net Positions — only if production data exists */}
      {assetsWithProduction.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-3">Net Positions</h3>
          <div className="space-y-2">
            {assetsWithProduction.map(assetType => {
              const spec = ASSET_BY_KEY[assetType]
              if (!spec) return null
              const prodRate = rateByAsset.get(assetType) ?? null
              const burnData = consumption.get(assetType)
              const burnRate = burnData?.burnRate ?? null
              const netRate = computeNetRate(prodRate, burnRate)
              const invItem = inventory.find(i => i.asset === assetType)
              const stock = invItem?.quantity ?? 0
              const netDays = computeNetDaysRemaining(stock, netRate)
              const unitLabel = spec.unit === 'days_supply' ? 'days' : spec.unit

              return (
                <div key={assetType} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center">{spec.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-200 truncate">{spec.label}</div>
                    {netRate !== null ? (
                      <div className={`text-xs font-mono ${netRate >= 0 ? 'text-forest-400' : 'text-warning-400'}`}>
                        {netRate >= 0 ? '+' : ''}{netRate.toFixed(1)} {unitLabel}/day
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">no burn data</div>
                    )}
                  </div>
                  <div className="text-right">
                    {netRate !== null && netRate >= 0 ? (
                      <span className="text-xs text-forest-400">surplus</span>
                    ) : netRate !== null && netDays !== Infinity ? (
                      <span className="text-xs text-warning-400">{Math.round(netDays)}d left</span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Log Production form */}
      <div className="card mb-6">
        <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-3">Log Production</h3>
        <LogProductionForm
          tribeId={tribeId}
          loggedBy={identity?.pub ?? ''}
        />
      </div>

      {/* History grouped by asset */}
      {byAsset.size > 0 && (
        <div>
          <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-3">History</h3>
          <div className="space-y-2">
            {Array.from(byAsset.entries()).map(([assetType, assetEntries]) => {
              const spec = ASSET_BY_KEY[assetType]
              if (!spec) return null
              const unitLabel = spec.unit === 'days_supply' ? 'days' : spec.unit
              const sorted = [...assetEntries].sort((a, b) => b.loggedAt - a.loggedAt)
              const isExpanded = expandedHistory.has(assetType)

              return (
                <div key={assetType} className="card">
                  <button
                    className="w-full flex items-center gap-2 text-left"
                    onClick={() => toggleHistory(assetType)}
                  >
                    <span className="text-base">{spec.icon}</span>
                    <span className="text-sm text-gray-200 flex-1">{spec.label}</span>
                    <span className="text-xs text-gray-600">{sorted.length} entr{sorted.length !== 1 ? 'ies' : 'y'}</span>
                    <span className="text-gray-600 text-xs ml-1">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-forest-900 space-y-1.5">
                      {sorted.map(entry => {
                        const date = new Date(entry.loggedAt)
                        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        return (
                          <div key={entry.id} className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-12 shrink-0">{dateStr}</span>
                            <span className="text-forest-400">+{entry.amount} {unitLabel}</span>
                            <span className="text-gray-600">/ {entry.periodDays}d</span>
                            {entry.source && (
                              <span className="truncate text-gray-600">· {entry.source}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Log Production Form ──────────────────────────────────────────────────────

function LogProductionForm({ tribeId, loggedBy }: { tribeId: string; loggedBy: string }) {
  const [assetSearch, setAssetSearch] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<AssetType | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('7')
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const filteredAssets = ASSET_REGISTRY.filter(spec =>
    spec.label.toLowerCase().includes(assetSearch.toLowerCase()) ||
    spec.asset.toLowerCase().includes(assetSearch.toLowerCase())
  ).slice(0, 12)

  const selectedSpec = selectedAsset ? ASSET_BY_KEY[selectedAsset] : null
  const unitLabel = selectedSpec
    ? (selectedSpec.unit === 'days_supply' ? 'days' : selectedSpec.unit)
    : ''

  function selectAsset(assetType: AssetType) {
    setSelectedAsset(assetType)
    const spec = ASSET_BY_KEY[assetType]
    setAssetSearch(spec?.label ?? assetType)
    setShowDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAsset) return
    const amt = parseFloat(amount)
    const days = parseInt(period, 10)
    if (!amt || amt <= 0 || !days || days < 1) return
    setSubmitting(true)
    try {
      await logProductionEntry(tribeId, selectedAsset, amt, days, loggedBy, {
        source: source || undefined,
        notes: notes || undefined,
      })
      setAmount('')
      setPeriod('7')
      setSource('')
      setNotes('')
      setSelectedAsset(null)
      setAssetSearch('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Asset selector */}
      <div className="relative">
        <label className="text-xs text-gray-500 mb-1 block">Asset</label>
        <input
          type="text"
          value={assetSearch}
          onChange={e => {
            setAssetSearch(e.target.value)
            setSelectedAsset(null)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search assets..."
          className="w-full text-xs bg-forest-950 border border-forest-800 rounded-lg px-2.5 py-1.5 text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-forest-600"
        />
        {showDropdown && filteredAssets.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-forest-900 border border-forest-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredAssets.map(spec => (
              <button
                key={spec.asset}
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-forest-800 transition-colors"
                onMouseDown={() => selectAsset(spec.asset)}
              >
                <span className="text-sm">{spec.icon}</span>
                <span className="text-xs text-gray-300">{spec.label}</span>
                <span className="text-xs text-gray-600 ml-auto">{spec.unit}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Amount + period */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Amount</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0.01"
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-24 text-xs bg-forest-950 border border-forest-800 rounded-lg px-2.5 py-1.5 text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-forest-600"
              required
            />
            {unitLabel && <span className="text-xs text-gray-500">{unitLabel}</span>}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Period</label>
          <div className="flex items-center gap-1.5">
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
        </div>
      </div>

      {/* Source */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Source (optional)</label>
        <input
          type="text"
          value={source}
          onChange={e => setSource(e.target.value)}
          placeholder="e.g. south garden, solar array"
          className="w-full text-xs bg-forest-950 border border-forest-800 rounded-lg px-2.5 py-1.5 text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-forest-600"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional context"
          className="w-full text-xs bg-forest-950 border border-forest-800 rounded-lg px-2.5 py-1.5 text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-forest-600"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !selectedAsset}
        className="btn-primary text-xs py-1.5 w-full"
      >
        {success ? 'Logged!' : submitting ? 'Logging...' : 'Log Production'}
      </button>
    </form>
  )
}
