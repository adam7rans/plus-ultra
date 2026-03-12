import { describe, it, expect } from 'vitest'
import {
  getAuthority, outranks, hasAuthority,
  canCreateEvent, canEditEvent,
  canManageRoles, canSetAuthority, assignableRoles,
  getLeadDomains,
} from './permissions.js'
import type { Tribe, TribeMember, AuthorityRole } from '../types/tribe.js'
import type { ScheduledEvent } from '../types/events.js'

const tribe: Tribe = {
  id: 'tribe-1', pub: 'tpub', priv: 'tpriv', name: 'Test',
  location: 'Austin', region: 'texas', createdAt: 0,
  constitutionTemplate: 'council', founderId: 'founder-pub',
}

function makeMember(pubkey: string, authorityRole?: AuthorityRole): TribeMember {
  return {
    pubkey, tribeId: 'tribe-1', joinedAt: 0, lastSeen: 0,
    status: 'active', attachmentScore: 1.0, memberType: 'adult',
    displayName: pubkey, authorityRole,
  }
}

function makeEvent(createdBy: string, type: string = 'duty'): ScheduledEvent {
  return {
    id: 'e1', tribeId: 'tribe-1', type: type as ScheduledEvent['type'],
    title: 'Test', description: '', startAt: 0, durationMin: 60,
    recurrence: { frequency: 'once' }, createdBy, createdAt: 0,
    assignedTo: [], location: '', cancelled: false,
  }
}

const securitySkills = [{ memberId: 'lead-pub', role: 'tactical_shooter' }]

describe('getAuthority', () => {
  it('returns founder for the founderId regardless of stored role', () => {
    const member = makeMember('founder-pub', 'member')
    expect(getAuthority(member, tribe)).toBe('founder')
  })

  it('returns stored authorityRole when not founder', () => {
    expect(getAuthority(makeMember('a', 'elder_council'), tribe)).toBe('elder_council')
    expect(getAuthority(makeMember('b', 'lead'), tribe)).toBe('lead')
    expect(getAuthority(makeMember('c', 'restricted'), tribe)).toBe('restricted')
  })

  it('defaults to member when authorityRole is undefined', () => {
    expect(getAuthority(makeMember('d'), tribe)).toBe('member')
  })
})

describe('outranks / hasAuthority', () => {
  it('founder outranks everything', () => {
    expect(outranks('founder', 'elder_council')).toBe(true)
    expect(outranks('founder', 'member')).toBe(true)
  })

  it('member does not outrank lead', () => {
    expect(outranks('member', 'lead')).toBe(false)
  })

  it('hasAuthority checks minimum level', () => {
    expect(hasAuthority('elder_council', 'lead')).toBe(true)
    expect(hasAuthority('member', 'lead')).toBe(false)
    expect(hasAuthority('lead', 'lead')).toBe(true)
  })
})

describe('canCreateEvent', () => {
  it('founder can create any event type', () => {
    const founder = makeMember('founder-pub')
    expect(canCreateEvent(founder, 'watch', tribe, [])).toBe(true)
    expect(canCreateEvent(founder, 'meal', tribe, [])).toBe(true)
    expect(canCreateEvent(founder, 'alert', tribe, [])).toBe(true)
  })

  it('elder_council can create any event type', () => {
    const elder = makeMember('elder-pub', 'elder_council')
    expect(canCreateEvent(elder, 'watch', tribe, [])).toBe(true)
    expect(canCreateEvent(elder, 'medical', tribe, [])).toBe(true)
  })

  it('lead can create events in their domain', () => {
    const lead = makeMember('lead-pub', 'lead')
    expect(canCreateEvent(lead, 'watch', tribe, securitySkills)).toBe(true)  // security domain
    expect(canCreateEvent(lead, 'alert', tribe, securitySkills)).toBe(true)  // security domain
  })

  it('lead can create generic (null-domain) events', () => {
    const lead = makeMember('lead-pub', 'lead')
    expect(canCreateEvent(lead, 'duty', tribe, securitySkills)).toBe(true)
    expect(canCreateEvent(lead, 'social', tribe, securitySkills)).toBe(true)
  })

  it('lead cannot create events outside their domain', () => {
    const lead = makeMember('lead-pub', 'lead')
    expect(canCreateEvent(lead, 'medical', tribe, securitySkills)).toBe(false)
    expect(canCreateEvent(lead, 'meal', tribe, securitySkills)).toBe(false)
  })

  it('member can only create personal events', () => {
    const member = makeMember('m-pub')
    expect(canCreateEvent(member, 'personal', tribe, [])).toBe(true)
    expect(canCreateEvent(member, 'watch', tribe, [])).toBe(false)
    expect(canCreateEvent(member, 'duty', tribe, [])).toBe(false)
  })

  it('restricted cannot create any events', () => {
    const restricted = makeMember('r-pub', 'restricted')
    expect(canCreateEvent(restricted, 'personal', tribe, [])).toBe(false)
    expect(canCreateEvent(restricted, 'duty', tribe, [])).toBe(false)
  })
})

describe('canEditEvent', () => {
  it('anyone can edit their own event (except restricted)', () => {
    const member = makeMember('m-pub')
    const event = makeEvent('m-pub')
    expect(canEditEvent(member, event, tribe, [])).toBe(true)
  })

  it('restricted cannot edit even their own event', () => {
    const restricted = makeMember('r-pub', 'restricted')
    const event = makeEvent('r-pub')
    expect(canEditEvent(restricted, event, tribe, [])).toBe(false)
  })

  it('elder_council can edit any event', () => {
    const elder = makeMember('elder-pub', 'elder_council')
    const event = makeEvent('someone-else')
    expect(canEditEvent(elder, event, tribe, [])).toBe(true)
  })

  it('lead can edit events in their domain', () => {
    const lead = makeMember('lead-pub', 'lead')
    const event = makeEvent('someone-else', 'watch')  // security domain
    expect(canEditEvent(lead, event, tribe, securitySkills)).toBe(true)
  })

  it('lead cannot edit events outside their domain', () => {
    const lead = makeMember('lead-pub', 'lead')
    const event = makeEvent('someone-else', 'medical')
    expect(canEditEvent(lead, event, tribe, securitySkills)).toBe(false)
  })

  it('member cannot edit others events', () => {
    const member = makeMember('m-pub')
    const event = makeEvent('someone-else')
    expect(canEditEvent(member, event, tribe, [])).toBe(false)
  })
})

describe('canManageRoles', () => {
  it('founder can manage roles', () => {
    expect(canManageRoles(makeMember('founder-pub'), tribe)).toBe(true)
  })

  it('elder_council can manage roles', () => {
    expect(canManageRoles(makeMember('e', 'elder_council'), tribe)).toBe(true)
  })

  it('lead cannot manage roles', () => {
    expect(canManageRoles(makeMember('l', 'lead'), tribe)).toBe(false)
  })

  it('member cannot manage roles', () => {
    expect(canManageRoles(makeMember('m'), tribe)).toBe(false)
  })
})

describe('canSetAuthority', () => {
  it('cannot change founder role', () => {
    const actor = makeMember('elder-pub', 'elder_council')
    const target = makeMember('founder-pub')
    expect(canSetAuthority(actor, target, 'member', tribe)).toBe(false)
  })

  it('cannot promote to founder', () => {
    const founder = makeMember('founder-pub')
    const target = makeMember('someone')
    expect(canSetAuthority(founder, target, 'founder', tribe)).toBe(false)
  })

  it('founder can promote anyone to elder_council', () => {
    const founder = makeMember('founder-pub')
    const target = makeMember('someone')
    expect(canSetAuthority(founder, target, 'elder_council', tribe)).toBe(true)
  })

  it('elder_council can promote to lead but not to elder_council', () => {
    const elder = makeMember('elder-pub', 'elder_council')
    const target = makeMember('someone')
    expect(canSetAuthority(elder, target, 'lead', tribe)).toBe(true)
    expect(canSetAuthority(elder, target, 'elder_council', tribe)).toBe(false)
  })

  it('elder_council cannot demote another elder_council', () => {
    const elder = makeMember('elder-1', 'elder_council')
    const target = makeMember('elder-2', 'elder_council')
    expect(canSetAuthority(elder, target, 'member', tribe)).toBe(false)
  })

  it('founder can demote elder_council to member', () => {
    const founder = makeMember('founder-pub')
    const target = makeMember('elder-pub', 'elder_council')
    expect(canSetAuthority(founder, target, 'member', tribe)).toBe(true)
  })
})

describe('assignableRoles', () => {
  it('founder can assign all non-founder roles', () => {
    const founder = makeMember('founder-pub')
    const target = makeMember('someone')
    const roles = assignableRoles(founder, target, tribe)
    expect(roles).toContain('elder_council')
    expect(roles).toContain('lead')
    expect(roles).toContain('member')
    expect(roles).toContain('restricted')
    expect(roles).not.toContain('founder')
  })

  it('elder_council can assign lead, member, restricted', () => {
    const elder = makeMember('elder-pub', 'elder_council')
    const target = makeMember('someone')
    const roles = assignableRoles(elder, target, tribe)
    expect(roles).toContain('lead')
    expect(roles).toContain('member')
    expect(roles).toContain('restricted')
    expect(roles).not.toContain('elder_council')
  })
})

describe('getLeadDomains', () => {
  it('returns domains from member skills', () => {
    const member = makeMember('lead-pub', 'lead')
    const skills = [
      { memberId: 'lead-pub', role: 'tactical_shooter' },
      { memberId: 'lead-pub', role: 'nurse' },
    ]
    const domains = getLeadDomains(member, skills)
    expect(domains).toContain('security')
    expect(domains).toContain('medical')
    expect(domains).toHaveLength(2)
  })

  it('returns empty for member with no skills', () => {
    const member = makeMember('lead-pub', 'lead')
    expect(getLeadDomains(member, [])).toEqual([])
  })
})
