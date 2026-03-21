import type { Flow } from '../types'

export const flow: Flow = {
  id: 21,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'Vote on a Proposal',
  summary:
    'Members review open proposals and cast their vote (Yes / No / Abstain). Results calculated live.',
  steps: [
    {
      n: '1a',
      screen: 'Proposals — empty',
      route: '/tribe/{TRIBE}/proposals',
      desc: 'Empty proposals list. "No proposals yet" empty state. "Create Proposal" CTA.',
      action: 'Observe the empty proposals state.',
    },
    {
      n: '1b',
      screen: 'Proposals — populated',
      route: '/tribe/{TRIBE}/proposals',
      desc: 'Open proposals list with title, author, deadline countdown, current vote tally. Closed proposals section. Tap to expand proposal details and vote.',
      action: 'Tap a proposal. Read details. Cast vote (Yes/No/Abstain). Confirm.',
      injectIDB: [
        {
          store: 'proposals',
          key: '{TRIBE}:prop001',
          data: {
            id: 'prop001',
            tribeId: '{TRIBE}',
            title: 'Purchase 3-month food reserve',
            body: 'Allocate $800 for emergency food supply from FoodCo.',
            type: 'resource',
            status: 'open',
            authorPub: '{SELF_PUB}',
            createdAt: '{NOW-3d}',
            deadline: '{NOW+4d}',
          },
        },
        {
          store: 'proposals',
          key: '{TRIBE}:prop002',
          data: {
            id: 'prop002',
            tribeId: '{TRIBE}',
            title: 'Upgrade comms to Meshtastic network',
            body: 'Purchase 4x Meshtastic radios for tribe-wide mesh coverage.',
            type: 'resource',
            status: 'open',
            authorPub: 'dummy_pub_3_jordan_blake',
            createdAt: '{NOW-2d}',
            deadline: '{NOW+5d}',
          },
        },
        {
          store: 'proposals',
          key: '{TRIBE}:prop003',
          data: {
            id: 'prop003',
            tribeId: '{TRIBE}',
            title: 'Monthly training drill schedule',
            body: 'Commit to first Saturday each month for skills drills.',
            type: 'policy',
            status: 'passed',
            authorPub: '{SELF_PUB}',
            createdAt: '{NOW-14d}',
            deadline: '{NOW-7d}',
          },
        },
        {
          store: 'proposal-votes',
          key: 'prop001:{SELF_PUB}',
          data: {
            proposalId: 'prop001',
            memberPub: '{SELF_PUB}',
            vote: 'yes',
            votedAt: '{NOW-2d}',
          },
        },
        {
          store: 'proposal-votes',
          key: 'prop001:dummy_pub_2_sam_chen',
          data: {
            proposalId: 'prop001',
            memberPub: 'dummy_pub_2_sam_chen',
            vote: 'yes',
            votedAt: '{NOW-1d}',
          },
        },
        {
          store: 'proposal-votes',
          key: 'prop001:dummy_pub_3_jordan_blake',
          data: {
            proposalId: 'prop001',
            memberPub: 'dummy_pub_3_jordan_blake',
            vote: 'yes',
            votedAt: '{NOW-1d}',
          },
        },
        {
          store: 'proposal-votes',
          key: 'prop002:dummy_pub_2_sam_chen',
          data: {
            proposalId: 'prop002',
            memberPub: 'dummy_pub_2_sam_chen',
            vote: 'yes',
            votedAt: '{NOW-1d}',
          },
        },
        {
          store: 'proposal-votes',
          key: 'prop002:dummy_pub_3_jordan_blake',
          data: {
            proposalId: 'prop002',
            memberPub: 'dummy_pub_3_jordan_blake',
            vote: 'no',
            votedAt: '{NOW-1d}',
          },
        },
      ],
    },
  ],
}
