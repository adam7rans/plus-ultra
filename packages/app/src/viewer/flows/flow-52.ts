import type { Flow } from '../types'

export const flow: Flow = {
  id: 52,
  section: 'Grid Down Operations',
  mode: 'Grid Down',
  title: 'Offline Escalation Stages',
  summary: 'The app tracks offline duration and escalates through 5 stages (Stage 1: monitoring to Stage 5: emergency), each with different UI indicators and feature unlocks.',
  steps: [
    {
      n: 1,
      screen: 'Stage 1 — Monitoring (5 min offline)',
      route: '/tribe/{TRIBE}',
      gridDown: true,
      gridDownKey: 'plusultra:offlineSince',
      gridDownValue: () => Date.now() - 5 * 60 * 1000,
      desc: 'Dashboard with subtle yellow banner: "Stage 1 — Monitoring. Grid connectivity lost 5 minutes ago." Normal dashboard features available.',
      action: 'Inject 5-minute offline time. Observe Stage 1 banner.',
    },
    {
      n: 2,
      screen: 'Stage 3 — Escalated (4 hours offline)',
      route: '/tribe/{TRIBE}',
      gridDown: true,
      gridDownKey: 'plusultra:offlineSince',
      gridDownValue: () => Date.now() - 4 * 60 * 60 * 1000,
      desc: 'Dashboard with orange escalated banner: "Stage 3 — Escalated. 4 hours offline." Grid-down drill checklist visible. Mesh discovery active.',
      action: 'Inject 4-hour offline time. Observe Stage 3 escalation banner and drill checklist.',
    },
    {
      n: 3,
      screen: 'Stage 5 — Emergency (48+ hours offline)',
      route: '/tribe/{TRIBE}',
      gridDown: true,
      gridDownKey: 'plusultra:offlineSince',
      gridDownValue: () => Date.now() - 48 * 60 * 60 * 1000,
      desc: 'Dashboard with red emergency banner: "Stage 5 — Emergency. 48+ hours offline." Bug-out CTA visible. Emergency features unlocked.',
      action: 'Inject 48-hour offline time. Observe full emergency stage UI.',
    },
  ],
}
