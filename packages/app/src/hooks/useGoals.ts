import { useEffect, useState } from 'react'
import { subscribeToGoals, subscribeToMilestones, subscribeToTasks } from '../lib/tasks'
import type { TribeGoal, GoalMilestone, TribeTask } from '@plus-ultra/core'

export function useGoals(tribeId: string | null) {
  const [goals, setGoals] = useState<TribeGoal[]>([])
  const [milestones, setMilestones] = useState<GoalMilestone[]>([])
  const [tasks, setTasks] = useState<TribeTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tribeId) return
    const timer = setTimeout(() => setLoading(false), 3000)
    const u1 = subscribeToGoals(tribeId, g => {
      setGoals(g)
      setLoading(false)
      clearTimeout(timer)
    })
    const u2 = subscribeToMilestones(tribeId, setMilestones)
    const u3 = subscribeToTasks(tribeId, setTasks)
    return () => { u1(); u2(); u3(); clearTimeout(timer) }
  }, [tribeId])

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
