import type { SkillRole } from './skills.js'

export interface TrainingSession {
  id: string
  tribeId: string
  title: string
  skillRole: SkillRole | null   // null = general/multi-skill; stored as '' in Gun
  date: number                  // epoch ms
  durationMinutes: number
  trainerId: string             // pubkey
  attendeesJson: string         // JSON.stringify(string[]) — Gun can't store arrays
  notes: string                 // '' if empty, never undefined
  loggedBy: string
  loggedAt: number
}

export interface MemberCertification {
  id: string
  tribeId: string
  memberId: string
  certName: string
  issuingBody: string           // '' if none
  licenseNumber: string         // '' if none
  issuedAt: number
  expiresAt: number             // 0 = no expiry
  linkedRole: SkillRole | null  // if set, verification → verified_expert; stored as '' in Gun
  verifiedBy: string            // '' = unverified, pubkey = verified by that lead
  verifiedAt: number            // 0 if unverified
  addedBy: string
  addedAt: number
}
