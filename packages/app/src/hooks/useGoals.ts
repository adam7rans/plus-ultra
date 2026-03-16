import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToGoals, subscribeToMilestones, subscribeToTasks } from '../lib/tasks'
import { useIsGridUp } from './useIsGridUp'
import type { TribeGoal, GoalMilestone, TribeTask } from '@plus-ultra/core'

export function useGoals(tribeId: string | null) {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexGoals = useQuery(
    api.goals.listGoals,
    gridUp && tribeId ? { tribeId } : 'skip'
  )
  const convexMilestones = useQuery(
    api.goals.listMilestones,
    gridUp && tribeId ? { tribeId } : 'skip'
  )
  const convexTasks = useQuery(
    api.tasks.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscriptions
  const [gunGoals, setGunGoals] = useState<TribeGoal[]>([])
  const [gunMilestones, setGunMilestones] = useState<GoalMilestone[]>([])
  const [gunTasks, setGunTasks] = useState<TribeTask[]>([])
  const [gunLoading, setGunLoading] = useState(true)

  useEffect(() => {
    if (gridUp || !tribeId) return
    const timer = setTimeout(() => setGunLoading(false), 3000)
    const u1 = subscribeToGoals(tribeId, g => {
      setGunGoals(g)
      setGunLoading(false)
      clearTimeout(timer)
    })
    const u2 = subscribeToMilestones(tribeId, setGunMilestones)
    const u3 = subscribeToTasks(tribeId, setGunTasks)
    return () => { u1(); u2(); u3(); clearTimeout(timer) }
  }, [tribeId, gridUp])

  const goals = gridUp ? (convexGoals ?? []) as unknown as TribeGoal[] : gunGoals
  const milestones = gridUp ? (convexMilestones ?? []) as unknown as GoalMilestone[] : gunMilestones
  const tasks = gridUp ? (convexTasks ?? []) as unknown as TribeTask[] : gunTasks
  const loading = gridUp
    ? convexGoals === undefined || convexMilestones === undefined || convexTasks === undefined
    : gunLoading

  const getGoalTasks = (goalId: string) => tasks.filter(t => t.goalId === goalId)
  const getMilestoneTasks = (milestoneId: string) => tasks.filter(t => t.milestoneId === milestoneId)
  const getMyTasks = (myPub: string) => tasks.filter(t => t.assignedTo.includes(myPub))
  const goalProgress = (goalId: string): number => {
    const gt = getGoalTasks(goalId)
    if (!gt.length) return 0
    return Math.round((gt.filter(t => t.status === 'done').length / gt.length) * 100)
  }

  return { goals, milestones, tasks, loading, getGoalTasks, getMilestoneTasks, getMyTasks, goalProgress }
}
