import type { Flow } from '../types'

export const flow: Flow = {
  id: 29,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'Knowledge Base Browse',
  summary:
    "Members browse the tribe's internal knowledge base — SOPs, guides, maps, references — organized by category.",
  steps: [
    {
      n: '1a',
      screen: 'Knowledge Base — empty',
      route: '/tribe/{TRIBE}/kb',
      desc: 'Empty KB. "No articles yet" state. "Create Article" CTA.',
      action: 'Observe the empty knowledge base.',
    },
    {
      n: '1b',
      screen: 'Knowledge Base — populated',
      route: '/tribe/{TRIBE}/kb',
      desc: 'Category sidebar (Medical/Food/Security/Comms/Governance/Other). Article list with title, author, date, tag chips. Search bar. "Create Article" button.',
      action: 'Browse categories. Use search. Tap an article to read.',
      injectIDB: [
        {
          store: 'tribe-docs',
          key: '{TRIBE}:doc001',
          data: {
            id: 'doc001',
            tribeId: '{TRIBE}',
            title: 'Water Purification SOP',
            category: 'medical',
            content:
              '# Water Purification SOP\n\nBoil all water for 5 minutes minimum...',
            authorPub: '{SELF_PUB}',
            status: 'published',
            createdAt: '{NOW-14d}',
            updatedAt: '{NOW-14d}',
          },
        },
        {
          store: 'tribe-docs',
          key: '{TRIBE}:doc002',
          data: {
            id: 'doc002',
            tribeId: '{TRIBE}',
            title: 'Comms Frequencies Reference',
            category: 'comms',
            content:
              '# Comms Frequencies\n\nPrimary: 146.520 MHz (VHF simplex)\nAlternate: 462.550 MHz (GMRS)...',
            authorPub: 'dummy_pub_3_jordan_blake',
            status: 'published',
            createdAt: '{NOW-10d}',
            updatedAt: '{NOW-8d}',
          },
        },
        {
          store: 'tribe-docs',
          key: '{TRIBE}:doc003',
          data: {
            id: 'doc003',
            tribeId: '{TRIBE}',
            title: 'Medical Supply Inventory',
            category: 'medical',
            content:
              '# Medical Supply Inventory\n\nQuarterly check all expiry dates...',
            authorPub: 'dummy_pub_2_sam_chen',
            status: 'published',
            createdAt: '{NOW-7d}',
            updatedAt: '{NOW-7d}',
          },
        },
      ],
    },
  ],
}
