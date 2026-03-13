import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { updateMemberProfile } from '../lib/tribes'
import { vouchForSkill } from '../lib/skills'
import {
  ROLE_BY_KEY, AUTHORITY_META,
  getAuthority, canManageRoles, assignableRoles,
  getSpecializationsForRole,
} from '@plus-ultra/core'
import type { TribeMember, MemberSkill, AuthorityRole, Tribe } from '@plus-ultra/core'
import { fetchTribeMeta, setAuthorityRole } from '../lib/tribes'
import { useEffect } from 'react'

const PROFICIENCY_COLORS: Record<string, string> = {
  basic: 'bg-gray-700 text-gray-300',
  intermediate: 'bg-blue-900/50 text-blue-300',
  expert: 'bg-purple-900/50 text-purple-300',
  verified_expert: 'bg-yellow-900/50 text-yellow-300',
}

const AVAILABILITY_LABELS: Record<string, string> = {
  full_time: '🕐 Full-time',
  part_time: '🕑 Part-time',
  on_call: '📟 On-call',
}

export default function MemberProfileScreen() {
  const { tribeId, memberPub } = useParams({ from: '/tribe/$tribeId/member/$memberPub' })
  const { identity } = useIdentity()
  const { members, skills } = useSurvivabilityScore(tribeId)
  const [tribe, setTribe] = useState<Tribe | null>(null)
  const [vouchingRole, setVouchingRole] = useState<string | null>(null)

  // Edit profile state
  const [editing, setEditing] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editAvailability, setEditAvailability] = useState<string>('')
  const [editLimitations, setEditLimitations] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) })
  }, [tribeId])

  const member = members.find(m => m.pubkey === memberPub)
  const memberSkills = skills.filter(s => s.memberId === memberPub)
  const isYou = identity?.pub === memberPub
  const actorMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined

  // Authority
  const auth = member && tribe ? getAuthority(member, tribe) : (member?.authorityRole ?? 'member')
  const authMeta = AUTHORITY_META[auth]
  const canManage = actorMember && tribe && !isYou ? canManageRoles(actorMember, tribe) : false
  const availableRoles = actorMember && member && tribe && !isYou
    ? assignableRoles(actorMember, member, tribe)
    : []
  const [showRoles, setShowRoles] = useState(false)

  function startEditing() {
    if (!member) return
    setEditBio(member.bio ?? '')
    setEditAvailability(member.availability ?? '')
    setEditLimitations(member.physicalLimitations ?? '')
    setEditing(true)
  }

  async function saveProfile() {
    if (!identity || !member) return
    setSaving(true)
    try {
      await updateMemberProfile(tribeId, identity.pub, {
        bio: editBio.trim() || undefined,
        availability: (editAvailability as TribeMember['availability']) || undefined,
        physicalLimitations: editLimitations.trim() || undefined,
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleVouch(skill: MemberSkill) {
    if (!identity || isYou) return
    setVouchingRole(skill.role)
    try {
      await vouchForSkill(tribeId, skill.memberId, skill.role, identity.pub)
    } finally {
      setVouchingRole(null)
    }
  }

  async function handleSetRole(role: AuthorityRole) {
    await setAuthorityRole(tribeId, memberPub, role)
    setShowRoles(false)
  }

  if (!member) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Link to="/tribe/$tribeId" params={{ tribeId }} className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
          ← Back to Dashboard
        </Link>
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-gray-400 text-sm">Member not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link to="/tribe/$tribeId" params={{ tribeId }} className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← Back to Dashboard
      </Link>

      {/* Profile header */}
      <div className="card mb-4">
        <div className="flex items-center gap-4 mb-4">
          {member.photo ? (
            <img src={member.photo} alt={member.displayName} className="w-16 h-16 rounded-full object-cover border-2 border-forest-600" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-forest-800 flex items-center justify-center text-gray-500 text-2xl">👤</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100 truncate">{member.displayName}</h2>
              {isYou && (
                <span className="text-xs bg-forest-800 text-forest-300 px-1.5 py-0.5 rounded">you</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                auth === 'founder' ? 'bg-yellow-900/50 text-yellow-300' :
                auth === 'elder_council' ? 'bg-purple-900/50 text-purple-300' :
                auth === 'lead' ? 'bg-blue-900/50 text-blue-300' :
                auth === 'restricted' ? 'bg-gray-800 text-gray-400' :
                'bg-forest-800 text-forest-300'
              }`}>
                {authMeta.icon} {authMeta.label}
              </span>
              <span className="text-xs text-gray-500 capitalize">{member.memberType}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {!editing && member.bio && (
          <p className="text-sm text-gray-300 mb-3">{member.bio}</p>
        )}

        {/* Details */}
        {!editing && (
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            {member.availability && (
              <span>{AVAILABILITY_LABELS[member.availability] ?? member.availability}</span>
            )}
            {member.physicalLimitations && (
              <span>⚠ {member.physicalLimitations}</span>
            )}
          </div>
        )}

        {/* Edit form (own profile only) */}
        {editing && (
          <div className="space-y-3 mt-2">
            <div>
              <label className="label">Bio</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Tell the tribe about yourself..."
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Availability</label>
              <div className="flex gap-2">
                {(['full_time', 'part_time', 'on_call'] as const).map(val => (
                  <button
                    key={val}
                    onClick={() => setEditAvailability(val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      editAvailability === val
                        ? 'bg-forest-600 text-forest-100 border border-forest-500'
                        : 'bg-forest-950 text-gray-400 border border-forest-800 hover:border-forest-700'
                    }`}
                  >
                    {AVAILABILITY_LABELS[val]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Physical Limitations</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. bad knee, limited vision..."
                value={editLimitations}
                onChange={e => setEditLimitations(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!editing && (
          <div className="flex gap-2 mt-4">
            {isYou && (
              <button className="btn-secondary flex-1 text-sm" onClick={startEditing}>
                ✏️ Edit Profile
              </button>
            )}
            {!isYou && (
              <Link
                to="/tribe/$tribeId/dm/$memberPub"
                params={{ tribeId, memberPub }}
                className="btn-primary flex-1 text-sm text-center"
              >
                💬 Message
              </Link>
            )}
            {canManage && availableRoles.length > 0 && (
              <button
                className="btn-secondary text-sm"
                onClick={() => setShowRoles(prev => !prev)}
              >
                ⚙️ Role
              </button>
            )}
          </div>
        )}

        {/* Authority role dropdown */}
        {showRoles && (
          <div className="mt-3 pt-3 border-t border-forest-800">
            <div className="text-xs text-gray-400 mb-2">Set authority role:</div>
            <div className="flex flex-wrap gap-1.5">
              {availableRoles.map(role => {
                const meta = AUTHORITY_META[role]
                const isActive = auth === role
                return (
                  <button
                    key={role}
                    className={`px-2.5 py-1.5 rounded text-xs border flex items-center gap-1 ${
                      isActive
                        ? 'border-forest-500 bg-forest-900/50 text-forest-300'
                        : 'border-forest-800 text-gray-400 hover:border-forest-600'
                    }`}
                    onClick={() => handleSetRole(role)}
                    disabled={isActive}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Skills section */}
      <div className="mb-6">
        <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">
          Skills ({memberSkills.length})
        </h3>
        {memberSkills.length === 0 ? (
          <div className="card text-center py-4">
            <p className="text-gray-500 text-sm">No skills declared yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {memberSkills.map(skill => {
              const spec = ROLE_BY_KEY[skill.role]
              if (!spec) return null
              const alreadyVouched = identity ? skill.vouchedBy?.includes(identity.pub) : false
              const vouchCount = skill.vouchedBy?.length ?? 0
              const roleSpecEntry = getSpecializationsForRole(skill.role)
              const roleSpecs = roleSpecEntry?.specializations

              return (
                <div key={skill.role} className="card">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{spec.icon}</span>
                    <span className="text-sm font-semibold text-gray-200">{spec.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${PROFICIENCY_COLORS[skill.proficiency] ?? ''}`}>
                      {skill.proficiency.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Experience */}
                  {skill.yearsExperience && (
                    <p className="text-xs text-gray-500 ml-7">{skill.yearsExperience}</p>
                  )}

                  {/* Specializations */}
                  {skill.specializations && skill.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 ml-7">
                      {skill.specializations.map(specKey => {
                        const specLabel = roleSpecs?.find(s => s.key === specKey)?.label ?? specKey
                        return (
                          <span key={specKey} className="px-2 py-0.5 rounded-full text-xs bg-forest-900 text-forest-300 border border-forest-800">
                            {specLabel}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Notes */}
                  {skill.notes && (
                    <p className="text-xs text-gray-500 mt-1 ml-7 italic">{skill.notes}</p>
                  )}

                  {/* Vouch section */}
                  <div className="flex items-center gap-2 mt-2 ml-7">
                    {vouchCount > 0 && (
                      <span className="text-xs text-forest-400">✓ {vouchCount} vouch{vouchCount !== 1 ? 'es' : ''}</span>
                    )}
                    {!isYou && identity && (
                      <button
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          alreadyVouched
                            ? 'border-forest-700 text-forest-500 cursor-default'
                            : 'border-forest-800 text-gray-400 hover:border-forest-600 hover:text-forest-300'
                        }`}
                        onClick={() => !alreadyVouched && handleVouch(skill)}
                        disabled={alreadyVouched || vouchingRole === skill.role}
                      >
                        {vouchingRole === skill.role ? '...' : alreadyVouched ? '✓ Vouched' : '👍 Vouch'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick links for own profile */}
      {isYou && (
        <div className="space-y-2">
          <Link
            to="/tribe/$tribeId/skills"
            params={{ tribeId }}
            className="card flex items-center gap-3 hover:border-forest-600 transition-colors"
          >
            <span className="text-xl">🎯</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-200">Edit My Skills</div>
              <div className="text-xs text-gray-500">Update roles and proficiency</div>
            </div>
            <span className="text-forest-400">→</span>
          </Link>
        </div>
      )}
    </div>
  )
}
