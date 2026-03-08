import type { TribeMember } from '../types/tribe.js'

const DECAY_RATE_PER_DAY = 0.05  // lose 5% per day when absent without declaration

export function currentAttachmentScore(member: TribeMember): number {
  if (member.status === 'active') return member.attachmentScore

  if (member.status === 'away_declared' && member.declaredReturnAt) {
    const now = Date.now()
    if (now < member.declaredReturnAt) return member.attachmentScore
    const daysOverdue = (now - member.declaredReturnAt) / (1000 * 60 * 60 * 24)
    return Math.max(0, member.attachmentScore - (daysOverdue * DECAY_RATE_PER_DAY))
  }

  if (member.status === 'away_undeclared') {
    const daysSinceLastSeen = (Date.now() - member.lastSeen) / (1000 * 60 * 60 * 24)
    return Math.max(0, member.attachmentScore - (daysSinceLastSeen * DECAY_RATE_PER_DAY))
  }

  return member.attachmentScore
}
