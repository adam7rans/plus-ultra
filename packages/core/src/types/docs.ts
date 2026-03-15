export type DocCategory = 'medical' | 'security' | 'food_water' | 'comms' | 'evacuation' | 'governance' | 'training' | 'other'
export type DocStatus = 'draft' | 'active' | 'superseded' | 'archived'

export interface TribeDoc {
  id: string
  tribeId: string
  title: string
  category: DocCategory
  status: DocStatus
  content: string           // Markdown — stored directly in Gun (no chunking needed; soft 50k char limit)
  version: number           // incremented on each content edit
  authorPub: string
  approvedBy?: string
  createdAt: number
  updatedAt: number
  approvedAt?: number
  linkedRoles?: string[]    // stored as linkedRolesJson in Gun
  tags?: string[]           // stored as tagsJson in Gun
}
