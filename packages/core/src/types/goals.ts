export type GoalHorizon = 'immediate' | 'short_term' | 'long_term'
export type GoalStatus = 'active' | 'paused' | 'completed' | 'cancelled'
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

export interface TribeGoal {
  id: string
  tribeId: string
  title: string
  description?: string
  horizon: GoalHorizon
  status: GoalStatus
  linkedProposalId?: string
  createdAt: number
  createdBy: string
  updatedAt: number
}

export interface GoalMilestone {
  id: string
  goalId: string
  tribeId: string
  title: string
  dueDate?: number
  completedAt?: number
  createdAt: number
}

export interface TribeTask {
  id: string
  tribeId: string
  goalId?: string
  milestoneId?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignedTo: string[]
  dueDate?: number
  completedAt?: number
  createdAt: number
  createdBy: string
  updatedAt: number
}

export const TASK_STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo:        { label: 'To Do',       color: 'text-gray-400' },
  in_progress: { label: 'In Progress', color: 'text-yellow-400' },
  blocked:     { label: 'Blocked',     color: 'text-orange-400' },
  done:        { label: 'Done',        color: 'text-forest-400' },
}

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:      { label: 'Low',      color: 'text-gray-500' },
  normal:   { label: 'Normal',   color: 'text-gray-300' },
  high:     { label: 'High',     color: 'text-yellow-400' },
  critical: { label: 'Critical', color: 'text-red-400' },
}

export const GOAL_STATUS_META: Record<GoalStatus, { label: string; color: string }> = {
  active:    { label: 'Active',    color: 'text-forest-400' },
  paused:    { label: 'Paused',    color: 'text-yellow-400' },
  completed: { label: 'Completed', color: 'text-blue-400' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500' },
}
