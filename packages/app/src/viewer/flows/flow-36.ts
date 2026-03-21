import type { Flow } from '../types'

export const flow: Flow = {
  id: 36,
  section: 'Communication',
  mode: 'Both',
  title: 'Training — Log Session',
  summary:
    'Members log training sessions (drills, skills practice, physical training) with duration, type, and notes.',
  steps: [
    {
      n: '1a',
      screen: 'Training Screen — empty',
      route: '/tribe/{TRIBE}/training',
      desc: 'Empty training log. "Log Session" button. No history shown.',
      action: 'Observe the empty training log.',
    },
    {
      n: '1b',
      screen: 'Training Screen — populated',
      route: '/tribe/{TRIBE}/training',
      desc: 'Training log list by date. "Log Session" button. Session form: type selector, duration, skill domain, notes, date. Training history below.',
      action: 'Tap "Log Session". Fill in training details. Save.',
      injectIDB: [
        {
          store: 'training-sessions',
          key: '{TRIBE}:ts001',
          data: {
            id: 'ts001',
            tribeId: '{TRIBE}',
            type: 'first_aid',
            domain: 'medical',
            durationMinutes: 120,
            notes: 'CPR and wound care review. All members participated.',
            conductedAt: '{NOW-7d}',
            loggedBy: '{SELF_PUB}',
            attendeesJson: JSON.stringify(['{SELF_PUB}', 'dummy_pub_2_sam_chen', 'dummy_pub_3_jordan_blake']),
          },
        },
        {
          store: 'training-sessions',
          key: '{TRIBE}:ts002',
          data: {
            id: 'ts002',
            tribeId: '{TRIBE}',
            type: 'comms_drill',
            domain: 'comms',
            durationMinutes: 90,
            notes: 'HAM radio check-in drill. PACE plan walkthrough.',
            conductedAt: '{NOW-5d}',
            loggedBy: 'dummy_pub_3_jordan_blake',
            attendeesJson: JSON.stringify(['{SELF_PUB}', 'dummy_pub_3_jordan_blake']),
          },
        },
        {
          store: 'training-sessions',
          key: '{TRIBE}:ts003',
          data: {
            id: 'ts003',
            tribeId: '{TRIBE}',
            type: 'physical',
            domain: 'security',
            durationMinutes: 60,
            notes: 'Rucking with loaded packs. 5km trail.',
            conductedAt: '{NOW-3d}',
            loggedBy: '{SELF_PUB}',
            attendeesJson: JSON.stringify(['{SELF_PUB}', 'dummy_pub_2_sam_chen']),
          },
        },
      ],
    },
  ],
}
