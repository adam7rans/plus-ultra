import type { Flow } from '../types'

export const flow: Flow = {
  id: 11,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'Psych Assessment',
  summary:
    'Members complete a psychological readiness assessment covering stress responses, conflict style, and team role preferences.',
  steps: [
    {
      n: 1,
      screen: 'Psych Assessment Screen',
      route: '/tribe/{TRIBE}/psych/assessment',
      desc: 'Multi-question form: stress response, conflict style, decision-making style, team role preference. Progress indicator. Submit button.',
      action: 'Answer all questions and submit the assessment.',
    },
  ],
}
