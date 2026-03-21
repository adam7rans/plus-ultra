import type { Flow } from '../types'

export const flow: Flow = {
  id: 27,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'PACE Comms Plan Setup',
  summary:
    "Configure the tribe's PACE (Primary/Alternate/Contingency/Emergency) communication plan covering all connectivity scenarios.",
  steps: [
    {
      n: '1a',
      screen: 'PACE Comms — empty',
      route: '/tribe/{TRIBE}/comms',
      desc: 'Empty PACE form. Four tiers (Primary/Alternate/Contingency/Emergency) with blank method selectors and notes.',
      action: 'Observe the empty PACE comms form.',
    },
    {
      n: '1b',
      screen: 'PACE Comms — configured',
      route: '/tribe/{TRIBE}/comms',
      desc: 'Four PACE tiers, each with comms method selector (Internet/Radio/Mesh/Physical), frequency/channel, schedule, and notes. Save button. Shareable plan card.',
      action: 'Configure each PACE tier. Enter frequency/method details. Tap Save.',
      injectIDB: [
        {
          store: 'pace-plan',
          key: '{TRIBE}',
          data: {
            tribeId: '{TRIBE}',
            updatedAt: '{NOW-1d}',
            methodsJson: JSON.stringify([
              {
                tier: 'primary',
                method: 'internet',
                detail: 'Signal app group',
                notes: 'Main comms when grid up',
              },
              {
                tier: 'alternate',
                method: 'radio',
                detail: 'Baofeng 146.520 MHz',
                notes: 'VHF simplex, no repeater needed',
              },
              {
                tier: 'contingency',
                method: 'physical',
                detail: 'Mailbox dead drop at ridge',
                notes: 'Leave note in mailbox flag up',
              },
              {
                tier: 'emergency',
                method: 'signal',
                detail: 'Red flare at Skyline Gap',
                notes: 'Only for life-threatening emergency',
              },
            ]),
            checkInSchedulesJson: JSON.stringify([
              { day: 'Saturday', time: '09:00', method: 'radio' },
            ]),
            rallyPointsJson: JSON.stringify([
              {
                name: 'Skyline Gap',
                coords: '38.8N 78.4W',
                notes: 'Main rally — 30 min from all members',
              },
            ]),
            codeWordsJson: JSON.stringify([
              { word: 'BLUEBELL', meaning: 'All clear, normal status' },
              { word: 'REDWOOD', meaning: 'Evacuate to rally point A' },
            ]),
          },
        },
      ],
    },
  ],
}
