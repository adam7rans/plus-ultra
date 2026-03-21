import type { Flow } from '../types'

export const flow: Flow = {
  id: 58,
  section: 'Grid Down Operations',
  mode: 'Grid Down',
  title: 'Grid-Down Drill Mode',
  summary: 'Activate drill mode to simulate a grid-down scenario without actually going offline. Tests tribe readiness procedures.',
  steps: [
    {
      n: 1,
      screen: 'Grid-Down Drill Mode',
      route: '/tribe/{TRIBE}',
      gridDown: true,
      gridDownKey: 'plusultra:drillMode',
      gridDownValue: () => JSON.stringify({ active: true, startedAt: Date.now() }),
      desc: 'Dashboard with drill mode banner (orange with "DRILL" badge, distinct from real offline). Drill checklist: 8 tasks to complete. Drill timer. "End Drill" button.',
      action: 'Inject drill mode. Complete drill checklist items. Observe drill timer. End drill.',
    },
  ],
}
