import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useOfflineStage } from '../hooks/useOfflineStage'
import OfflineStageBanner from '../components/OfflineStageBanner'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useGoals } from '../hooks/useGoals'
import { createGoal, createTask, updateTask } from '../lib/tasks'
import { getAuthority, hasAuthority } from '@plus-ultra/core'
import type { GoalHorizon, TaskPriority, TaskStatus, TribeTask } from '@plus-ultra/core'
import { TASK_STATUS_META, TASK_PRIORITY_META, GOAL_STATUS_META } from '@plus-ultra/core'
import { fetchTribeMeta } from '../lib/tribes'
import { useEffect } from 'react'
import type { Tribe } from '@plus-ultra/core'

const HORIZON_LABEL: Record<GoalHorizon, string> = {
  immediate: 'Immediate',
  short_term: 'Short Term',
  long_term: 'Long Term',
}

type ActiveTab = 'goals' | 'my_tasks' | 'all_tasks'

export default function GoalsScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/goals' })
  const { identity } = useIdentity()
  const { members } = useSurvivabilityScore(tribeId)
  const { goals, tasks, loading, getGoalTasks, getMyTasks, goalProgress } = useGoals(tribeId)
  const [tribe, setTribe] = useState<Tribe | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('goals')
  const { offlineStage, offlineSince } = useOfflineStage()

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDesc, setGoalDesc] = useState('')
  const [goalHorizon, setGoalHorizon] = useState<GoalHorizon>('short_term')
  const [savingGoal, setSavingGoal] = useState(false)

  // Task form
  const [taskFormGoalId, setTaskFormGoalId] = useState<string | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('normal')
  const [taskAssignees, setTaskAssignees] = useState<string[]>([])
  const [savingTask, setSavingTask] = useState(false)

  // Expanded goals
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) })
  }, [tribeId])

  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember && tribe ? getAuthority(myMember, tribe) : 'member'
  const canCreateGoal = hasAuthority(myAuth, 'elder_council')
  const canManageTasks = hasAuthority(myAuth, 'lead')

  const sortedGoals = [...goals].sort((a, b) => {
    const order = { active: 0, paused: 1, completed: 2, cancelled: 3 }
    return (order[a.status] ?? 4) - (order[b.status] ?? 4)
  })

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!goalTitle.trim() || !identity) return
    setSavingGoal(true)
    try {
      await createGoal(tribeId, {
        title: goalTitle.trim(),
        description: goalDesc.trim() || undefined,
        horizon: goalHorizon,
        creatorPub: identity.pub,
      })
      setGoalTitle('')
      setGoalDesc('')
      setGoalHorizon('short_term')
      setShowGoalForm(false)
    } finally {
      setSavingGoal(false)
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskTitle.trim() || !identity || !taskFormGoalId) return
    setSavingTask(true)
    try {
      await createTask(tribeId, {
        goalId: taskFormGoalId,
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        priority: taskPriority,
        assignedTo: taskAssignees,
        creatorPub: identity.pub,
      })
      setTaskTitle('')
      setTaskDesc('')
      setTaskPriority('normal')
      setTaskAssignees([])
      setTaskFormGoalId(null)
    } finally {
      setSavingTask(false)
    }
  }

  async function handleStatusChange(task: TribeTask, status: TaskStatus) {
    const patch: Partial<TribeTask> = { status }
    if (status === 'done') patch.completedAt = Date.now()
    await updateTask(tribeId, task.id, patch)
  }

  function toggleAssignee(pub: string) {
    setTaskAssignees(prev =>
      prev.includes(pub) ? prev.filter(p => p !== pub) : [...prev, pub]
    )
  }

  function toggleGoalExpand(goalId: string) {
    setExpandedGoalIds(prev => {
      const next = new Set(prev)
      if (next.has(goalId)) next.delete(goalId)
      else next.add(goalId)
      return next
    })
  }

  const myTasks = identity ? getMyTasks(identity.pub) : []
  const myTasksGrouped = {
    in_progress: myTasks.filter(t => t.status === 'in_progress'),
    blocked: myTasks.filter(t => t.status === 'blocked'),
    todo: myTasks.filter(t => t.status === 'todo'),
    done: myTasks.filter(t => t.status === 'done'),
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/tribe/$tribeId" params={{ tribeId }} className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← Dashboard
      </Link>
      <OfflineStageBanner stage={offlineStage} offlineSince={offlineSince} />
      <h2 className="text-xl font-bold text-gray-100 mb-4">Goals &amp; Tasks</h2>

      {/* Tabs */}
      <div className="flex border-b border-forest-900 mb-4">
        {(['goals', 'my_tasks', 'all_tasks'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab ? 'text-forest-400 border-b-2 border-forest-400' : 'text-gray-500 hover:text-gray-400'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'goals' ? 'Goals' : tab === 'my_tasks' ? 'My Tasks' : 'All Tasks'}
          </button>
        ))}
      </div>

      {/* Goals tab */}
      {activeTab === 'goals' && (
        <div className="space-y-3">
          {canCreateGoal && !showGoalForm && (
            <button
              className="btn-primary w-full text-sm"
              onClick={() => setShowGoalForm(true)}
            >
              + New Goal
            </button>
          )}

          {showGoalForm && (
            <form onSubmit={handleCreateGoal} className="card space-y-3">
              <h3 className="text-sm font-semibold text-gray-200">New Goal</h3>
              <input
                className="input text-sm"
                placeholder="Title *"
                value={goalTitle}
                onChange={e => setGoalTitle(e.target.value)}
                required
              />
              <textarea
                className="input text-sm"
                placeholder="Description"
                value={goalDesc}
                onChange={e => setGoalDesc(e.target.value)}
                rows={2}
              />
              <select
                className="input text-sm"
                value={goalHorizon}
                onChange={e => setGoalHorizon(e.target.value as GoalHorizon)}
              >
                <option value="immediate">Immediate</option>
                <option value="short_term">Short Term</option>
                <option value="long_term">Long Term</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 text-sm" disabled={savingGoal || !goalTitle.trim()}>
                  {savingGoal ? 'Saving...' : 'Create Goal'}
                </button>
                <button type="button" className="btn-secondary flex-1 text-sm" onClick={() => setShowGoalForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-xs text-gray-500 text-center py-8 animate-pulse">Loading goals...</p>
          ) : sortedGoals.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No goals yet</p>
          ) : (
            sortedGoals.map(goal => {
              const goalTasks = getGoalTasks(goal.id)
              const progress = goalProgress(goal.id)
              const expanded = expandedGoalIds.has(goal.id)
              const meta = GOAL_STATUS_META[goal.status]
              return (
                <div key={goal.id} className="card">
                  <button
                    className="w-full text-left"
                    onClick={() => toggleGoalExpand(goal.id)}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-100 flex-1">{goal.title}</span>
                      <span className={`text-xs ${meta.color} flex-shrink-0`}>{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">{HORIZON_LABEL[goal.horizon]}</span>
                      <span className="text-xs text-gray-600">·</span>
                      <span className="text-xs text-gray-500">{goalTasks.length} task{goalTasks.length !== 1 ? 's' : ''}</span>
                    </div>
                    {goalTasks.length > 0 && (
                      <div className="w-full bg-forest-950 rounded-full h-1.5 mb-1">
                        <div
                          className="bg-forest-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                    <div className="text-[10px] text-gray-500">{progress}% complete</div>
                  </button>

                  {expanded && (
                    <div className="mt-3 space-y-2 border-t border-forest-900 pt-3">
                      {goal.description && (
                        <p className="text-xs text-gray-400">{goal.description}</p>
                      )}

                      {goalTasks.map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          members={members}
                          canManage={canManageTasks}
                          isMyTask={identity ? task.assignedTo.includes(identity.pub) : false}
                          onStatusChange={status => handleStatusChange(task, status)}
                        />
                      ))}

                      {canManageTasks && goal.status === 'active' && (
                        taskFormGoalId === goal.id ? (
                          <form onSubmit={handleCreateTask} className="space-y-2 border border-forest-800 rounded-lg p-3">
                            <input
                              className="input text-sm"
                              placeholder="Task title *"
                              value={taskTitle}
                              onChange={e => setTaskTitle(e.target.value)}
                              required
                            />
                            <textarea
                              className="input text-sm"
                              placeholder="Description"
                              value={taskDesc}
                              onChange={e => setTaskDesc(e.target.value)}
                              rows={2}
                            />
                            <select
                              className="input text-sm"
                              value={taskPriority}
                              onChange={e => setTaskPriority(e.target.value as TaskPriority)}
                            >
                              {(['low', 'normal', 'high', 'critical'] as TaskPriority[]).map(p => (
                                <option key={p} value={p}>{TASK_PRIORITY_META[p].label}</option>
                              ))}
                            </select>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Assign to:</p>
                              <div className="flex flex-wrap gap-1">
                                {members.map(m => (
                                  <button
                                    key={m.pubkey}
                                    type="button"
                                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                      taskAssignees.includes(m.pubkey)
                                        ? 'border-forest-500 bg-forest-800 text-forest-300'
                                        : 'border-forest-800 text-gray-400 hover:border-forest-600'
                                    }`}
                                    onClick={() => toggleAssignee(m.pubkey)}
                                  >
                                    {m.displayName}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button type="submit" className="btn-primary flex-1 text-xs py-1.5" disabled={savingTask || !taskTitle.trim()}>
                                {savingTask ? '...' : 'Add Task'}
                              </button>
                              <button type="button" className="btn-secondary flex-1 text-xs py-1.5" onClick={() => setTaskFormGoalId(null)}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            className="text-xs text-forest-400 hover:text-forest-300"
                            onClick={() => setTaskFormGoalId(goal.id)}
                          >
                            + New Task
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* My Tasks tab */}
      {activeTab === 'my_tasks' && (
        <div className="space-y-4">
          {myTasks.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No tasks assigned to you</p>
          ) : (
            (['in_progress', 'blocked', 'todo', 'done'] as TaskStatus[]).map(status => {
              const grouped = myTasksGrouped[status]
              if (grouped.length === 0) return null
              return (
                <div key={status}>
                  <h3 className={`text-xs uppercase tracking-widest mb-2 ${TASK_STATUS_META[status].color}`}>
                    {TASK_STATUS_META[status].label} ({grouped.length})
                  </h3>
                  <div className="space-y-2">
                    {grouped.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        members={members}
                        canManage={canManageTasks}
                        isMyTask
                        onStatusChange={st => handleStatusChange(task, st)}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* All Tasks tab */}
      {activeTab === 'all_tasks' && (
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No tasks yet</p>
          ) : (
            tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                members={members}
                canManage={canManageTasks}
                isMyTask={identity ? task.assignedTo.includes(identity.pub) : false}
                onStatusChange={st => handleStatusChange(task, st)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Task row component ───────────────────────────────────────────────────────

interface TaskRowProps {
  task: TribeTask
  members: { pubkey: string; displayName: string }[]
  canManage: boolean
  isMyTask: boolean
  onStatusChange: (status: TaskStatus) => void
}

function TaskRow({ task, members, canManage, isMyTask, onStatusChange }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false)
  const statusMeta = TASK_STATUS_META[task.status]
  const priorityMeta = TASK_PRIORITY_META[task.priority]

  function memberName(pub: string) {
    return members.find(m => m.pubkey === pub)?.displayName ?? pub.slice(0, 8) + '…'
  }

  const canUpdateStatus = canManage || isMyTask

  return (
    <div className="card py-2">
      <button className="w-full text-left" onClick={() => setExpanded(prev => !prev)}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-200 flex-1 truncate">{task.title}</span>
          <span className={`text-xs flex-shrink-0 ${priorityMeta.color}`}>{priorityMeta.label}</span>
          <span className={`text-xs flex-shrink-0 ${statusMeta.color}`}>{statusMeta.label}</span>
        </div>
        {task.assignedTo.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {task.assignedTo.map(pub => (
              <span key={pub} className="text-[10px] text-gray-500 bg-forest-900 px-1.5 py-0.5 rounded">
                {memberName(pub)}
              </span>
            ))}
          </div>
        )}
      </button>

      {expanded && (
        <div className="mt-2 border-t border-forest-900 pt-2 space-y-2">
          {task.description && (
            <p className="text-xs text-gray-400">{task.description}</p>
          )}
          {task.dueDate && (
            <p className="text-xs text-gray-500">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
          )}
          {canUpdateStatus && (
            <div className="flex gap-1 flex-wrap">
              {(['todo', 'in_progress', 'blocked', 'done'] as TaskStatus[]).map(s => (
                <button
                  key={s}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    task.status === s
                      ? 'border-forest-500 bg-forest-800 text-forest-300'
                      : 'border-forest-800 text-gray-400 hover:border-forest-600'
                  }`}
                  onClick={() => onStatusChange(s)}
                  disabled={task.status === s}
                >
                  {TASK_STATUS_META[s].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
