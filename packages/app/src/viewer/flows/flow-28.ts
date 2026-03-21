import type { Flow } from '../types'

export const flow: Flow = {
  id: 28,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'Tribe Schematic & Readiness',
  summary:
    "Visual schematic of the tribe's domain coverage, skill gaps, and readiness score breakdown across 6 buckets.",
  steps: [
    {
      n: 1,
      screen: 'Tribe Schematic',
      route: '/tribe/{TRIBE}/schematic',
      desc: 'Visual hexagonal or radial skill map showing domain coverage per member. Gap indicators. "View Readiness" link.',
      action: 'Explore the schematic. Identify coverage gaps by domain.',
    },
    {
      n: 2,
      screen: 'Readiness Detail',
      route: '/tribe/{TRIBE}/readiness',
      desc: 'Detailed readiness score breakdown: People, Resources, Communications, Planning, Training, Governance. Per-bucket progress bars and gap list.',
      action: 'Review each readiness bucket. Tap a gap item to navigate to the relevant screen.',
    },
  ],
}
