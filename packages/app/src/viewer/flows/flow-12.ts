import type { Flow } from '../types'

export const flow: Flow = {
  id: 12,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'Tribe Psych Overview',
  summary:
    'Tribe-level view of psychological profiles — aggregate stress patterns, role balance, and compatibility insights.',
  steps: [
    {
      n: 1,
      screen: 'Tribe Psych Overview',
      route: '/tribe/{TRIBE}/psych',
      desc: 'Aggregate charts: stress response distribution, conflict style mix, role balance heatmap. Individual member psych summaries. Insights and recommendations.',
      action: 'Review the tribe-level psychological readiness overview.',
    },
  ],
}
