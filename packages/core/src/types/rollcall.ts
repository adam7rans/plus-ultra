export type MusterStatus =
  | 'present'
  | 'away_authorized'
  | 'away_unplanned'
  | 'injured'
  | 'need_help'
  | 'unknown'

export type MusterReason =
  | 'emergency'
  | 'security'
  | 'routine_drill'
  | 'check_in'
  | 'other'

export interface MusterCall {
  id: string
  tribeId: string
  initiatedBy: string       // memberPub
  initiatedByName: string
  initiatedAt: number
  closedAt?: number
  reason: MusterReason
  message?: string
  status: 'active' | 'closed'
}

export interface MusterResponse {
  musterId: string
  memberPub: string
  memberName: string
  status: MusterStatus
  respondedAt: number
  respondedByPub: string    // may differ from memberPub when proxied
  location?: string
  note?: string
  voiceNote?: string        // base64 audio — IDB only, not synced via Gun
}

export const MUSTER_STATUS_META: Record<MusterStatus, { label: string; icon: string; color: string }> = {
  present:         { label: 'Present',          icon: '✅', color: 'text-forest-400' },
  away_authorized: { label: 'Away',             icon: '🚶', color: 'text-warning-400' },
  away_unplanned:  { label: 'Away (unplanned)', icon: '❓', color: 'text-warning-600' },
  injured:         { label: 'Injured',          icon: '🩹', color: 'text-danger-400' },
  need_help:       { label: 'Need Help',        icon: '🆘', color: 'text-danger-600' },
  unknown:         { label: 'Unknown',          icon: '⬜', color: 'text-gray-500' },
}

export const MUSTER_REASON_META: Record<MusterReason, { label: string; icon: string }> = {
  emergency:    { label: 'Emergency',    icon: '🚨' },
  security:     { label: 'Security',     icon: '🔴' },
  routine_drill:{ label: 'Routine Drill',icon: '📋' },
  check_in:     { label: 'Check-In',     icon: '✔️' },
  other:        { label: 'Other',        icon: '📣' },
}
