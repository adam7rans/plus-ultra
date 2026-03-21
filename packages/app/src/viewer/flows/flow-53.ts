import type { Flow } from '../types'

export const flow: Flow = {
  id: 53,
  section: 'Grid Down Operations',
  mode: 'Grid Down',
  title: 'Grid-Down Dashboard',
  summary: 'Full grid-down dashboard view with all offline-mode features: stage banner, drill checklist, infra checklist, mesh status, queue indicator.',
  steps: [
    {
      n: 1,
      screen: 'Grid-Down Dashboard (2 hours offline)',
      route: '/tribe/{TRIBE}',
      gridDown: true,
      gridDownKey: 'plusultra:offlineSince',
      gridDownValue: () => Date.now() - 2 * 60 * 60 * 1000,
      desc: 'Full grid-down dashboard: Stage 2 banner, drill checklist card, infra status checklist, mesh peer count, message queue indicator, bug-out plan CTA.',
      action: 'Inject 2-hour offline time. Explore all grid-down cards and features.',
    },
  ],
}
