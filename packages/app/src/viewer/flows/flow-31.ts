import type { Flow } from '../types'

export const flow: Flow = {
  id: 31,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'Map View Territory',
  summary:
    "View the tribe's defined territory on an interactive map with member locations, resources, and waypoints.",
  steps: [
    {
      n: 1,
      screen: 'Map Screen',
      route: '/tribe/{TRIBE}/map',
      desc: 'Interactive map centered on tribe coordinates. Territory boundary polygon. Member location pins. Resource/cache markers. Waypoint list.',
      action: 'Pan and zoom the map. Tap a marker to see details.',
    },
  ],
}
