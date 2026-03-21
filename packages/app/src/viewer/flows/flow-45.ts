import type { Flow } from '../types'

export const flow: Flow = {
  id: 45,
  section: 'Emergency & Accountability',
  mode: 'Both',
  title: 'Activate Bug-Out Plan',
  summary:
    'Admin activates the bug-out plan, pushing notifications to all members with their assignments.',
  steps: [
    {
      n: 1,
      screen: 'Bug-Out Screen — Activate',
      route: '/tribe/{TRIBE}/bugout',
      desc: 'Existing bug-out plan displayed. "Activate Plan" button. Confirmation modal with countdown. All members notified with their assignments and rally point.',
      action: 'Tap "Activate Plan". Confirm in the modal. Observe activation status.',
      note: 'Requires a saved bug-out plan (created in Flow 44). Tap "Activate Plan" button.',
      injectIDB: [
        {
          store: 'bugout-plans',
          key: '{TRIBE}:bugout001',
          data: {
            id: 'bugout001',
            tribeId: '{TRIBE}',
            planName: 'Blue Ridge Fallback',
            status: 'ready',
            rallyPointA: 'Skyline Gap — mile marker 42',
            rallyPointB: 'Cedar Hollow shelter',
            primaryRoute: 'Route 33 to Skyline Drive',
            alternateRoute: 'Forest Service Road 274',
            activationCondition: 'Stage 4 or higher offline, or direct threat',
            assignments: [
              { memberPub: '{SELF_PUB}', role: 'Driver', vehicle: 'F-150' },
              { memberPub: 'dummy_pub_2_sam_chen', role: 'Navigator', vehicle: 'None — ride with Alex' },
              { memberPub: 'dummy_pub_3_jordan_blake', role: 'Rear Security', vehicle: 'Jeep' },
            ],
            createdAt: '{NOW-3d}',
            updatedAt: '{NOW-1d}',
          },
        },
      ],
    },
  ],
}
