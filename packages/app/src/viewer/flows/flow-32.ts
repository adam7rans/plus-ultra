import type { Flow } from '../types'

export const flow: Flow = {
  id: 32,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'Map Draw Territory',
  summary: 'Tribe admin draws or updates the territory boundary on the map using draw tools.',
  steps: [
    {
      n: 1,
      screen: 'Map Screen — Draw Mode',
      route: '/tribe/{TRIBE}/map',
      desc: 'Draw toolbar (polygon, waypoint, erase). Tap points to define territory polygon. "Save Territory" button. Layer toggles.',
      action: 'Tap "Draw". Click points to define territory. Tap "Save Territory".',
      note: 'Tap the "Draw" button on the map screen to enter draw mode.',
    },
  ],
}
