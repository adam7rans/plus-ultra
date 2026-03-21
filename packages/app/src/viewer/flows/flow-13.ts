import type { Flow } from '../types'

export const flow: Flow = {
  id: 13,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'My People (Member Roster)',
  summary:
    'Full roster of tribe members with status, skills summary, station assignment, and availability.',
  steps: [
    {
      n: '1a',
      screen: 'My People — empty',
      route: '/tribe/{TRIBE}/people',
      desc: 'Empty member roster. "No members yet" illustration. "Invite Members" CTA.',
      action: 'Observe the empty roster state.',
    },
    {
      n: '1b',
      screen: 'My People — populated',
      route: '/tribe/{TRIBE}/people',
      desc: 'Member list with avatar, name, member type, status (active/away), skill tier badge, station. Tap to view full profile. Filter/sort controls.',
      action: 'Browse members. Tap a member card to view their full profile.',
      injectIDB: [
        {
          store: 'members',
          key: '{TRIBE}:{SELF_PUB}',
          data: {
            pubkey: '{SELF_PUB}',
            tribeId: '{TRIBE}',
            displayName: 'Alex Rivera',
            memberType: 'adult',
            status: 'active',
            authorityRole: 'founder',
            availability: 'full_time',
            joinedAt: '{NOW-7d}',
          },
        },
        {
          store: 'members',
          key: '{TRIBE}:dummy_pub_2_sam_chen',
          data: {
            pubkey: 'dummy_pub_2_sam_chen',
            tribeId: '{TRIBE}',
            displayName: 'Sam Chen',
            memberType: 'adult',
            status: 'active',
            authorityRole: 'member',
            availability: 'part_time',
            joinedAt: '{NOW-5d}',
          },
        },
        {
          store: 'members',
          key: '{TRIBE}:dummy_pub_3_jordan_blake',
          data: {
            pubkey: 'dummy_pub_3_jordan_blake',
            tribeId: '{TRIBE}',
            displayName: 'Jordan Blake',
            memberType: 'adult',
            status: 'active',
            authorityRole: 'lead',
            availability: 'on_call',
            joinedAt: '{NOW-6d}',
          },
        },
      ],
    },
  ],
}
