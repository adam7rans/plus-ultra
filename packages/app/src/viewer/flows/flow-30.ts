import type { Flow } from '../types'

export const flow: Flow = {
  id: 30,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'KB Create / Approve',
  summary:
    'Members draft new knowledge articles. Admins review and approve before publication.',
  steps: [
    {
      n: 1,
      screen: 'Knowledge Base — Create',
      route: '/tribe/{TRIBE}/kb',
      desc: 'Article editor: title, category selector, tags, markdown body editor, submit for review button.',
      action: 'Tap "Create Article". Write content. Submit for review.',
      note: 'Tap "Create Article" or the "New" button to open the article editor.',
      prefillForm: [
        {
          selector: 'input[placeholder*="title" i], input[name="title"]',
          value: 'Winter Prep Checklist',
        },
        {
          selector: 'textarea[placeholder*="content" i], textarea[name="content"]',
          value:
            '# Winter Prep Checklist\n\n## Before First Frost\n- [ ] Inspect all water storage containers\n- [ ] Check generator fuel and oil\n- [ ] Rotate food stock (FIFO)\n- [ ] Test all comms equipment\n- [ ] Review and update bug-out bags',
        },
      ],
    },
  ],
}
