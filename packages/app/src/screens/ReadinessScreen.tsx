import { useState } from 'react'
import { useParams, Link, useNavigate } from '@tanstack/react-router'
import { useReadiness } from '../hooks/useReadiness'
import RadarChart from '../components/RadarChart'
import type { ReadinessDimensionResult } from '@plus-ultra/core'

const DIMENSION_CONFIG: {
  key: 'personnel' | 'supply' | 'infrastructure' | 'comms' | 'coordination' | 'cohesion'
  label: string
  icon: string
  route: string
}[] = [
  { key: 'personnel', label: 'Personnel', icon: '👤', route: 'schematic' },
  { key: 'supply', label: 'Supply', icon: '📦', route: 'inventory' },
  { key: 'infrastructure', label: 'Infrastructure', icon: '🏕️', route: 'map' },
  { key: 'comms', label: 'Comms', icon: '📻', route: 'comms' },
  { key: 'coordination', label: 'Coordination', icon: '🎯', route: 'goals' },
  { key: 'cohesion', label: 'Cohesion', icon: '🧠', route: 'psych' },
]

type TribeSubRoute =
  | '/tribe/$tribeId/people'
  | '/tribe/$tribeId/schematic'
  | '/tribe/$tribeId/inventory'
  | '/tribe/$tribeId/map'
  | '/tribe/$tribeId/comms'
  | '/tribe/$tribeId/training'
  | '/tribe/$tribeId/goals'
  | '/tribe/$tribeId/rollcall'
  | '/tribe/$tribeId/psych'

function gapRoute(gap: string): TribeSubRoute | null {
  if (gap.includes('health status')) return '/tribe/$tribeId/people'
  if (gap.includes('skill gaps')) return '/tribe/$tribeId/schematic'
  if (gap.includes('Food supply')) return '/tribe/$tribeId/inventory'
  if (gap.includes('Water supply')) return '/tribe/$tribeId/inventory'
  if (gap.includes('Fuel supply')) return '/tribe/$tribeId/inventory'
  if (gap.includes('territory')) return '/tribe/$tribeId/map'
  if (gap.includes('PACE plan')) return '/tribe/$tribeId/comms'
  if (gap.includes('HAM radio')) return '/tribe/$tribeId/training'
  if (gap.includes('active tribe goals')) return '/tribe/$tribeId/goals'
  if (gap.includes('muster drill')) return '/tribe/$tribeId/rollcall'
  if (gap.includes('psych profiles')) return '/tribe/$tribeId/psych'
  return null
}

function gradeColor(grade: string): string {
  if (grade === 'A') return 'text-forest-400 bg-forest-900/40 border-forest-600'
  if (grade === 'B') return 'text-forest-500 bg-forest-900/30 border-forest-700'
  if (grade === 'C') return 'text-warning-400 bg-warning-900/30 border-warning-700'
  if (grade === 'D') return 'text-warning-500 bg-warning-900/20 border-warning-800'
  return 'text-danger-400 bg-danger-900/20 border-danger-700'
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-forest-400'
  if (score >= 60) return 'text-warning-400'
  return 'text-danger-400'
}

function scoreBg(score: number): string {
  if (score >= 75) return 'bg-forest-500'
  if (score >= 60) return 'bg-warning-400'
  return 'bg-danger-400'
}

function formatFactorValue(value: number): string {
  return `${Math.round(value * 100)}%`
}

function DimensionCard({ dim, icon, label }: {
  dim: ReadinessDimensionResult
  icon: string
  label: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      className="card w-full text-left hover:border-forest-700 transition-colors"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-gray-200">{label}</span>
            <span className={`text-sm font-bold font-mono ${scoreColor(dim.score)}`}>
              {dim.score}%
            </span>
          </div>
          <div className="h-1.5 bg-forest-950 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${scoreBg(dim.score)}`}
              style={{ width: `${dim.score}%` }}
            />
          </div>
        </div>
        <span className="text-forest-400 text-xs ml-1 flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-forest-900 pt-3">
          {dim.factors.map((factor, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`text-xs flex-shrink-0 ${factor.ok ? 'text-forest-400' : 'text-danger-400'}`}>
                {factor.ok ? '✓' : '✗'}
              </span>
              <span className="text-xs text-gray-300 flex-1">{factor.label}</span>
              <span className="text-xs font-mono text-gray-400">{formatFactorValue(factor.value)}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

export default function ReadinessScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/readiness' })
  const navigate = useNavigate()
  const { report, loading } = useReadiness(tribeId)

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Link to="/tribe/$tribeId" params={{ tribeId }} className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
          ← Dashboard
        </Link>
        <div className="space-y-3 animate-pulse">
          <div className="h-8 bg-forest-900 rounded w-2/3" />
          <div className="h-32 bg-forest-900 rounded" />
          <div className="h-48 bg-forest-900 rounded" />
          <div className="h-24 bg-forest-900 rounded" />
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Link to="/tribe/$tribeId" params={{ tribeId }} className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
          ← Dashboard
        </Link>
        <div className="card text-center py-10">
          <p className="text-gray-400 text-sm">Not enough data yet — fill in more tribe information.</p>
        </div>
      </div>
    )
  }

  const radarScores: [number, number, number, number, number, number] = [
    report.dimensions.personnel.score,
    report.dimensions.supply.score,
    report.dimensions.infrastructure.score,
    report.dimensions.comms.score,
    report.dimensions.coordination.score,
    report.dimensions.cohesion.score,
  ]

  const computedAgo = Date.now() - report.computedAt
  const agoLabel =
    computedAgo < 60_000
      ? 'just now'
      : computedAgo < 3_600_000
      ? `${Math.floor(computedAgo / 60_000)}m ago`
      : `${Math.floor(computedAgo / 3_600_000)}h ago`

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Dashboard
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-4">Readiness Report</h2>

      {/* Overall score card */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-5xl font-bold font-mono text-gray-100 leading-none">
              {report.overall}
            </div>
            <div className="text-xs text-gray-400 mt-1">out of 100</div>
          </div>
          <div className="text-right">
            <div
              className={`inline-block text-3xl font-bold px-4 py-2 rounded-lg border ${gradeColor(report.grade)}`}
            >
              {report.grade}
            </div>
            <div className="text-xs text-gray-500 mt-1">computed {agoLabel}</div>
          </div>
        </div>
        <div className="h-2 bg-forest-950 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all ${scoreBg(report.overall)}`}
            style={{ width: `${report.overall}%` }}
          />
        </div>
      </div>

      {/* Radar chart */}
      <div className="card mb-4 flex justify-center">
        <RadarChart scores={radarScores} />
      </div>

      {/* Dimension cards */}
      <div className="space-y-2 mb-4">
        {DIMENSION_CONFIG.map(({ key, label, icon }) => (
          <DimensionCard
            key={key}
            dim={report.dimensions[key]}
            icon={icon}
            label={label}
          />
        ))}
      </div>

      {/* Critical gaps */}
      {report.criticalGaps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-3">Critical Gaps</h3>
          <div className="space-y-2">
            {report.criticalGaps.map((gap, i) => {
              const route = gapRoute(gap)
              return route ? (
                <button
                  key={i}
                  className="card w-full text-left flex items-center gap-3 hover:border-danger-600 transition-colors"
                  onClick={() => navigate({ to: route, params: { tribeId } })}
                >
                  <span className="text-danger-400 flex-shrink-0">→</span>
                  <span className="text-sm text-gray-300 flex-1">{gap}</span>
                  <span className="text-forest-400 text-xs">Fix →</span>
                </button>
              ) : (
                <div key={i} className="card flex items-center gap-3">
                  <span className="text-danger-400 flex-shrink-0">→</span>
                  <span className="text-sm text-gray-300">{gap}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {report.criticalGaps.length === 0 && (
        <div className="card text-center py-4 border-forest-700 bg-forest-900/20">
          <p className="text-forest-400 text-sm font-semibold">No critical gaps detected</p>
          <p className="text-gray-500 text-xs mt-1">Tribe is well-prepared across all dimensions</p>
        </div>
      )}
    </div>
  )
}
