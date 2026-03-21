import type { Flow } from '../types'

export const flow: Flow = {
  id: 23,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'Add and Assign Tasks',
  summary:
    'Within a goal, members add tasks, assign them to tribe members, and set due dates.',
  steps: [
    {
      n: 1,
      screen: 'Goals Screen — Add Task',
      route: '/tribe/{TRIBE}/goals',
      desc: 'Expanded goal with task list. "Add Task" button. Task form: title, description, assigned member selector, due date, priority.',
      action: 'Tap a goal to expand. Tap "Add Task". Fill in task details, assign member, save.',
      note: 'Tap a goal card to expand it, then tap "Add Task" to reveal the task creation form.',
      injectIDB: [
        {
          store: 'tribe-goals',
          key: '{TRIBE}:goal001',
          data: {
            id: 'goal001',
            tribeId: '{TRIBE}',
            title: 'Build 3-month food cache',
            status: 'active',
            horizon: 'short_term',
            createdAt: '{NOW-5d}',
            createdBy: '{SELF_PUB}',
            proposalId: 'prop001',
          },
        },
        {
          store: 'goal-milestones',
          key: '{TRIBE}:ms001',
          data: {
            id: 'ms001',
            tribeId: '{TRIBE}',
            goalId: 'goal001',
            title: 'Research suppliers',
            status: 'done',
            dueDate: '{NOW-2d}',
          },
        },
        {
          store: 'goal-milestones',
          key: '{TRIBE}:ms002',
          data: {
            id: 'ms002',
            tribeId: '{TRIBE}',
            goalId: 'goal001',
            title: 'Purchase and receive stock',
            status: 'in_progress',
            dueDate: '{NOW+7d}',
          },
        },
      ],
      prefillForm: [
        {
          selector: 'input[placeholder*="task" i], input[name="title"]',
          value: 'Source #10 cans from FoodCo',
        },
      ],
    },
  ],
}
