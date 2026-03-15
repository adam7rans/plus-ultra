import { useEffect, useState, useMemo } from 'react'
import { useSurvivabilityScore } from './useSurvivabilityScore'
import { useInventory } from './useInventory'
import { useConsumption } from './useConsumption'
import { useMapData } from './useMapData'
import { usePacePlan } from './usePacePlan'
import { useCertifications } from './useCertifications'
import { useGoals } from './useGoals'
import { useTrainingSessions } from './useTrainingSessions'
import { useTribePsychProfiles } from './useTribePsychProfiles'
import { getMusterHistory } from '../lib/rollcall'
import { compatibilityScore, computeCompositeReadiness } from '@plus-ultra/core'
import type { CompositeReadinessReport, MusterCall } from '@plus-ultra/core'

const HEALTH_TO_SCORE: Record<string, number> = {
  well: 1.0,
  minor_injury: 0.7,
  major_injury: 0.2,
  critical: 0.0,
  deceased: 0.0,
}

export function useReadiness(tribeId: string): { report: CompositeReadinessReport | null; loading: boolean } {
  const { members, score: skillScore } = useSurvivabilityScore(tribeId)
  const inventory = useInventory(tribeId)
  const consumption = useConsumption(tribeId, members.length, inventory)
  const { territory, pins, routes, loading: mapLoading } = useMapData(tribeId)
  const { plan } = usePacePlan(tribeId)
  const { certs, loading: certsLoading } = useCertifications(tribeId)
  const { goals, tasks, loading: goalsLoading } = useGoals(tribeId)
  const { sessions, loading: trainingLoading } = useTrainingSessions(tribeId)
  const psychProfiles = useTribePsychProfiles(tribeId)
  const [musterHistory, setMusterHistory] = useState<MusterCall[]>([])
  const [musterLoaded, setMusterLoaded] = useState(false)

  useEffect(() => {
    if (!tribeId) return
    getMusterHistory(tribeId).then(h => {
      setMusterHistory(h)
      setMusterLoaded(true)
    })
  }, [tribeId])

  const loading = mapLoading || certsLoading || goalsLoading || trainingLoading || !musterLoaded

  const report = useMemo(() => {
    const now = Date.now()
    const d30 = 30 * 24 * 60 * 60 * 1000

    const healthScores = members.map(m => HEALTH_TO_SCORE[m.currentHealthStatus ?? 'well'] ?? 1.0)

    const lastTrainingSessionAt =
      sessions.length > 0 ? Math.max(...sessions.map(s => s.date)) : null

    const consumptionStatuses = (['food_reserve', 'water_reserve', 'fuel_reserve'] as const).map(asset => ({
      asset,
      status: consumption.get(asset)?.status ?? 'none',
    }))

    let paceLevelsCount = 0
    let hasCheckInSchedules = false
    let hasRallyPoints = false
    if (plan) {
      try {
        const methods = JSON.parse(plan.methodsJson) as { level: string }[]
        paceLevelsCount = new Set(methods.map(m => m.level)).size
      } catch { /* ignore */ }
      try {
        hasCheckInSchedules = (JSON.parse(plan.checkInSchedulesJson) as unknown[]).length > 0
      } catch { /* ignore */ }
      try {
        hasRallyPoints = (JSON.parse(plan.rallyPointsJson) as unknown[]).length > 0
      } catch { /* ignore */ }
    }

    const hasHamCert = certs.some(c => {
      const name = c.certName.toLowerCase()
      return name.includes('ham') || name.includes('amateur radio')
    })

    const activeGoalCount = goals.filter(g => g.status === 'active').length
    const recentTaskCount = tasks.filter(t => (t.updatedAt ?? t.createdAt) > now - d30).length

    const lastMusterAt =
      musterHistory.length > 0
        ? Math.max(...musterHistory.map(m => m.initiatedAt))
        : null

    const profilesArr = [...psychProfiles.values()]
    const archetypeCount = new Set(profilesArr.map(p => p.archetype)).size

    let avgCompatibility = 0.5
    if (profilesArr.length >= 2) {
      const capped = profilesArr.slice(0, 15)
      let total = 0
      let pairs = 0
      for (let i = 0; i < capped.length; i++) {
        for (let j = i + 1; j < capped.length; j++) {
          total += compatibilityScore(capped[i].dimensions, capped[j].dimensions)
          pairs++
        }
      }
      if (pairs > 0) avgCompatibility = total / pairs
    }

    return computeCompositeReadiness({
      tribeId,
      memberCount: members.length,
      skillScore,
      healthScores,
      lastTrainingSessionAt,
      inventoryForReadiness: inventory.map(i => ({ asset: i.asset, quantity: i.quantity })),
      consumptionStatuses,
      hasTerritory: territory !== null,
      pinCount: pins.length,
      routeCount: routes.length,
      paceLevelsCount,
      hasCheckInSchedules,
      hasRallyPoints,
      hasHamCert,
      activeGoalCount,
      recentTaskCount,
      lastMusterAt,
      profileCount: psychProfiles.size,
      archetypeCount,
      avgCompatibility,
    })
  }, [
    tribeId, members, skillScore, inventory, consumption,
    territory, pins, routes, plan, certs, goals, tasks,
    sessions, psychProfiles, musterHistory,
  ])

  return { report, loading }
}
