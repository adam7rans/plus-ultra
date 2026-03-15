export type BugOutStatus = 'draft' | 'ready' | 'active'

export interface BugOutVehicle {
  id: string
  label: string
  capacity: number
  driverPub?: string
  passengerPubs: string[]
}

export interface LoadPriority {
  id: string
  order: number
  category: string
  description?: string
  assignedTo?: string
}

export interface BugOutPlan {
  id: string
  tribeId: string
  name: string
  status: BugOutStatus
  triggerCondition: string
  routeId?: string
  vehiclesJson: string
  loadPrioritiesJson: string
  rallyPointIdsJson: string
  notes?: string
  activatedAt?: number
  activatedBy?: string
  createdAt: number
  createdBy: string
  updatedAt: number
}
