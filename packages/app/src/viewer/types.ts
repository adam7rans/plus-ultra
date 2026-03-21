export const SECTIONS = [
  'Setup & Identity',
  'Daily Ops — Profile & People',
  'Resources & Logistics',
  'Governance & Planning',
  'Communication',
  'Emergency & Accountability',
  'Federation',
  'Grid Down Operations',
  'Technical',
] as const

export type Section = typeof SECTIONS[number]

export interface IDBRecord {
  store: string
  key: string
  data: unknown
}

export interface PrefillField {
  selector: string
  value?: string
  type?: 'click'
}

export interface Step {
  n: number | string
  screen: string
  route?: string
  desc: string
  action: string
  note?: string
  manual?: boolean
  manualDesc?: string
  gridDown?: boolean
  gridDownKey?: string
  gridDownValue?: () => string | number
  injectIDB?: IDBRecord[]
  prefillForm?: PrefillField[]
}

export interface Flow {
  id: number
  section: Section
  mode: 'Both' | 'Grid Up' | 'Grid Down'
  title: string
  summary: string
  steps: Step[]
}
