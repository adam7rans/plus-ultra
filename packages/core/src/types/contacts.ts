export type ContactCategory =
  | 'medical'
  | 'legal'
  | 'comms'
  | 'supply'
  | 'mutual_aid'
  | 'authority'
  | 'other'

export interface ExternalContact {
  id: string
  tribeId: string
  name: string
  category: ContactCategory
  role?: string
  phone?: string
  radioFreq?: string
  lat?: number
  lng?: number
  location?: string
  notes?: string
  addedBy: string
  addedAt: number
  lastVerified?: number
}
