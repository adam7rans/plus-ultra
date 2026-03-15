export type CommsLevel = 'primary' | 'alternate' | 'contingency' | 'emergency'
export type CommsMethod = 'app' | 'ham_radio' | 'frs_gmrs' | 'cb' | 'phone' | 'runner' | 'signal_mirror' | 'other'

export interface PaceMethod {
  level: CommsLevel
  method: CommsMethod
  details: string           // freq, callsign, channel, etc.
  triggerCondition: string  // "when app relay unreachable"
  notes?: string
}

export interface CheckInSchedule {
  id: string
  label: string             // "Morning net"
  timeOfDay: string         // "08:00"
  frequency: 'daily' | 'twice_daily' | 'weekly' | 'as_needed'
  method: CommsMethod
  details: string
  notes?: string
}

export interface RallyPoint {
  id: string
  label: string             // "Primary rally"
  description: string
  lat?: number
  lng?: number
  triggerCondition: string
  notes?: string
}

export interface TribePacePlan {
  tribeId: string
  // Arrays stored as JSON strings in Gun (same waypointsJson pattern); native arrays in IDB
  methodsJson: string          // JSON.stringify(PaceMethod[])
  checkInSchedulesJson: string // JSON.stringify(CheckInSchedule[])
  rallyPointsJson: string      // JSON.stringify(RallyPoint[])
  codeWordsJson?: string       // JSON.stringify(Record<string, string>)  label → meaning
  lastUpdatedAt: number
  lastUpdatedBy: string
}
