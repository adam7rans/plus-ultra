import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { updateMemberProfile } from '../lib/tribes'
import { vouchForSkill } from '../lib/skills'
import {
  ROLE_BY_KEY, AUTHORITY_META,
  getAuthority, canManageRoles, assignableRoles,
  getSpecializationsForRole, toBigFive,
} from '@plus-ultra/core'
import type { TribeMember, MemberSkill, AuthorityRole, Tribe, PsychArchetype } from '@plus-ultra/core'
import { fetchTribeMeta, setAuthorityRole } from '../lib/tribes'
import { useEffect } from 'react'
import { usePsychProfile } from '../hooks/usePsychProfile'
import { hasRatedThisWeek, submitPeerRating } from '../lib/psych'

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

  // Psych profile
  const psychProfile = usePsychProfile(tribeId, memberPub)
  const [psychTab, setPsychTab] = useState<'archetype' | 'radar' | 'bigfive'>('archetype')
  const [profileTab, setProfileTab] = useState<'skills' | 'psych'>('skills')

  // Peer rating state
  const [peerStress, setPeerStress] = useState(50)
  const [peerLeader, setPeerLeader] = useState(50)
  const [peerConflict, setPeerConflict] = useState(50)
  const [alreadyRated, setAlreadyRated] = useState(false)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)

  useEffect(() => {
    if (!identity || isYou) return
    hasRatedThisWeek(tribeId, memberPub, identity.pub).then(setAlreadyRated)
  }, [tribeId, memberPub, identity, isYou])

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

  async function handleSubmitRating() {
    if (!identity || isYou || submittingRating) return
    setSubmittingRating(true)
    try {
      await submitPeerRating(tribeId, memberPub, identity.pub, {
        stressTolerance: peerStress,
        leadershipStyle: peerLeader,
        conflictApproach: peerConflict,
      })
      setAlreadyRated(true)
      setRatingSubmitted(true)
    } finally {
      setSubmittingRating(false)
    }
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

      {/* Tab switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setProfileTab('skills')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
            profileTab === 'skills'
              ? 'border-forest-500 bg-forest-900/50 text-forest-200'
              : 'border-forest-800 text-gray-400 hover:border-forest-600'
          }`}
        >
          Skills
        </button>
        <button
          onClick={() => setProfileTab('psych')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
            profileTab === 'psych'
              ? 'border-forest-500 bg-forest-900/50 text-forest-200'
              : 'border-forest-800 text-gray-400 hover:border-forest-600'
          }`}
        >
          Psych
        </button>
      </div>

      {/* Psych tab */}
      {profileTab === 'psych' && (
        <PsychTab
          tribeId={tribeId}
          memberPub={memberPub}
          isYou={isYou}
          psychProfile={psychProfile}
          psychTab={psychTab}
          setPsychTab={setPsychTab}
          peerStress={peerStress}
          peerLeader={peerLeader}
          peerConflict={peerConflict}
          setPeerStress={setPeerStress}
          setPeerLeader={setPeerLeader}
          setPeerConflict={setPeerConflict}
          alreadyRated={alreadyRated}
          submittingRating={submittingRating}
          ratingSubmitted={ratingSubmitted}
          onSubmitRating={handleSubmitRating}
        />
      )}

      {/* Skills section */}
      {profileTab === 'skills' && (
      <>
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
      </>
      )}
    </div>
  )
}

// ─── Psych tab sub-component ──────────────────────────────────────────────────

const ARCHETYPE_COLORS: Record<PsychArchetype, string> = {
  Commander: 'text-red-400',
  Scout:     'text-amber-400',
  Strategist:'text-blue-400',
  Connector: 'text-green-400',
  Planner:   'text-purple-400',
  Sustainer: 'text-cyan-400',
}

const ARCHETYPE_DESCRIPTIONS: Record<PsychArchetype, { tagline: string; description: string }> = {
  Commander:  { tagline: 'Decisive under fire', description: 'Acts fast and holds steady under pressure. Others look to this person for direction when things get hard.' },
  Scout:      { tagline: 'First in, adapts fast', description: 'Thrives at the edge of the known — high risk, high reward. Invaluable for reconnaissance and first contact.' },
  Strategist: { tagline: 'Thinks three moves ahead', description: 'Reads the landscape, finds angles others miss, and builds plans that hold up when conditions change.' },
  Connector:  { tagline: 'The tribe\'s social backbone', description: 'Builds trust, mediates tensions, and holds relationships together.' },
  Planner:    { tagline: 'Steady, methodical, reliable', description: 'Ensures nothing falls through the cracks. Cautious, thorough, and consistent.' },
  Sustainer:  { tagline: 'Calm center in the storm', description: 'Keeps people together when pressure peaks. The tribe\'s stabilizing force.' },
}

const DIM_LABELS: Record<string, { label: string; low: string; high: string }> = {
  decisionSpeed:   { label: 'Decision Speed', low: 'Deliberate', high: 'Decisive' },
  stressTolerance: { label: 'Stress Tolerance', low: 'Reactive', high: 'Resilient' },
  leadershipStyle: { label: 'Leadership', low: 'Directive', high: 'Collaborative' },
  conflictApproach:{ label: 'Conflict', low: 'Avoidant', high: 'Assertive' },
  riskAppetite:    { label: 'Risk Appetite', low: 'Conservative', high: 'Bold' },
  socialEnergy:    { label: 'Social Energy', low: 'Introverted', high: 'Extraverted' },
}

const DIM_ORDER = ['decisionSpeed', 'stressTolerance', 'leadershipStyle', 'conflictApproach', 'riskAppetite', 'socialEnergy'] as const

const BIG_FIVE_LABELS = [
  { key: 'openness', label: 'Openness' },
  { key: 'conscientiousness', label: 'Conscientiousness' },
  { key: 'extraversion', label: 'Extraversion' },
  { key: 'agreeableness', label: 'Agreeableness' },
  { key: 'neuroticism', label: 'Neuroticism' },
] as const

// Simple hexagonal radar SVG
function RadarChart({ dims }: { dims: Record<string, number> }) {
  const cx = 100, cy = 100, r = 75
  const keys = DIM_ORDER
  const n = keys.length
  const angleStep = (2 * Math.PI) / n

  function axis(i: number, scale: number) {
    const angle = -Math.PI / 2 + i * angleStep
    return {
      x: cx + Math.cos(angle) * r * scale,
      y: cy + Math.sin(angle) * r * scale,
    }
  }

  const outerPts = keys.map((_, i) => axis(i, 1))
  const valuePts = keys.map((k, i) => axis(i, (dims[k] ?? 50) / 100))

  const outerPath = outerPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
  const valuePath = valuePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[200px] mx-auto">
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(scale => {
        const pts = outerPts.map((_, i) => axis(i, scale))
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
        return <path key={scale} d={path} fill="none" stroke="#1a2e1a" strokeWidth="1" />
      })}
      {/* Axis lines */}
      {outerPts.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#1a2e1a" strokeWidth="1" />
      ))}
      {/* Outer hexagon */}
      <path d={outerPath} fill="none" stroke="#2d4a2d" strokeWidth="1" />
      {/* Value polygon */}
      <path d={valuePath} fill="rgba(74,222,128,0.15)" stroke="#4ade80" strokeWidth="1.5" />
      {/* Value dots */}
      {valuePts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4ade80" />
      ))}
      {/* Labels */}
      {outerPts.map((p, i) => {
        const key = keys[i]
        const info = DIM_LABELS[key]
        const lx = cx + (p.x - cx) * 1.28
        const ly = cy + (p.y - cy) * 1.28
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="7" fill="#9ca3af">
            {info?.label ?? key}
          </text>
        )
      })}
    </svg>
  )
}

interface PsychTabProps {
  tribeId: string
  memberPub: string
  isYou: boolean
  psychProfile: import('@plus-ultra/core').PsychProfile | null
  psychTab: 'archetype' | 'radar' | 'bigfive'
  setPsychTab: (t: 'archetype' | 'radar' | 'bigfive') => void
  peerStress: number
  peerLeader: number
  peerConflict: number
  setPeerStress: (v: number) => void
  setPeerLeader: (v: number) => void
  setPeerConflict: (v: number) => void
  alreadyRated: boolean
  submittingRating: boolean
  ratingSubmitted: boolean
  onSubmitRating: () => void
}

function PsychTab({
  tribeId, memberPub: _memberPub, isYou, psychProfile, psychTab, setPsychTab,
  peerStress, peerLeader, peerConflict, setPeerStress, setPeerLeader, setPeerConflict,
  alreadyRated, submittingRating, ratingSubmitted, onSubmitRating,
}: PsychTabProps) {
  if (!psychProfile) {
    if (isYou) {
      return (
        <div className="card mb-4 text-center py-6">
          <p className="text-gray-400 text-sm mb-3">You haven't completed a psychological assessment yet.</p>
          <Link
            to="/tribe/$tribeId/psych/assessment"
            params={{ tribeId }}
            className="btn-primary inline-block text-sm"
          >
            Take Assessment
          </Link>
        </div>
      )
    }
    return (
      <div className="card mb-4 text-center py-6">
        <p className="text-gray-500 text-sm">No psychological profile yet.</p>
        <p className="text-xs text-gray-600 mt-1">You can still rate this member to help build their profile.</p>
      </div>
    )
  }

  const archMeta = ARCHETYPE_DESCRIPTIONS[psychProfile.archetype]
  const bigFive = toBigFive(psychProfile.dimensions)
  const isPeerOnly = psychProfile.quizCompletedAt === null

  return (
    <div className="mb-6 space-y-3">
      {isPeerOnly && (
        <p className="text-xs text-gray-500">Peer data only — quiz not completed</p>
      )}

      {/* View toggle */}
      <div className="flex gap-1.5">
        {(['archetype', 'radar', 'bigfive'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setPsychTab(tab)}
            className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
              psychTab === tab
                ? 'border-forest-500 bg-forest-900/50 text-forest-200'
                : 'border-forest-800 text-gray-400 hover:border-forest-600'
            }`}
          >
            {tab === 'archetype' ? 'Archetype' : tab === 'radar' ? 'Radar' : 'Big Five'}
          </button>
        ))}
      </div>

      {/* Archetype view */}
      {psychTab === 'archetype' && (
        <div className="card">
          <div className={`text-2xl font-bold mb-1 ${ARCHETYPE_COLORS[psychProfile.archetype]}`}>
            {psychProfile.archetype}
          </div>
          <div className="text-xs text-gray-400 mb-2">{archMeta.tagline}</div>
          <p className="text-sm text-gray-300 leading-relaxed">{archMeta.description}</p>
          {psychProfile.peerRatingCount > 0 && (
            <p className="text-xs text-gray-500 mt-2">{psychProfile.peerRatingCount} peer rating{psychProfile.peerRatingCount !== 1 ? 's' : ''}</p>
          )}
        </div>
      )}

      {/* Radar view */}
      {psychTab === 'radar' && (
        <div className="card">
          <RadarChart dims={psychProfile.dimensions as unknown as Record<string, number>} />
        </div>
      )}

      {/* Big Five view */}
      {psychTab === 'bigfive' && (
        <div className="card space-y-3">
          {BIG_FIVE_LABELS.map(({ key, label }) => {
            const val = bigFive[key]
            return (
              <div key={key}>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{label}</span>
                  <span>{val}</span>
                </div>
                <div className="w-full bg-forest-950 rounded-full h-2">
                  <div className="bg-forest-500 h-2 rounded-full" style={{ width: `${val}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Peer rating (other members only) */}
      {!isYou && (
        <div className="card">
          <h4 className="text-xs text-gray-400 uppercase tracking-widest mb-3">Rate Anonymously</h4>
          {ratingSubmitted ? (
            <p className="text-xs text-forest-400 text-center py-2">Rating submitted — thank you</p>
          ) : alreadyRated ? (
            <p className="text-xs text-gray-500 text-center py-2">You've already rated this member this week</p>
          ) : (
            <div className="space-y-3">
              <RatingSlider label="Stress Tolerance" low="Reactive" high="Resilient" value={peerStress} onChange={setPeerStress} />
              <RatingSlider label="Leadership" low="Directive" high="Collaborative" value={peerLeader} onChange={setPeerLeader} />
              <RatingSlider label="Conflict Approach" low="Avoidant" high="Assertive" value={peerConflict} onChange={setPeerConflict} />
              <button
                className="btn-primary w-full text-sm"
                onClick={onSubmitRating}
                disabled={submittingRating}
              >
                {submittingRating ? 'Submitting...' : 'Submit Anonymous Rating'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Own profile: link to assessment */}
      {isYou && (
        <Link
          to="/tribe/$tribeId/psych/assessment"
          params={{ tribeId }}
          className="card flex items-center gap-3 hover:border-forest-600 transition-colors"
        >
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-200">Retake Assessment</div>
            <div className="text-xs text-gray-500">Profile updates continuously via peer ratings</div>
          </div>
          <span className="text-forest-400">→</span>
        </Link>
      )}
    </div>
  )
}

function RatingSlider({
  label, low, high, value, onChange,
}: {
  label: string
  low: string
  high: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-600">{low}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-[10px] text-gray-600">{high}</span>
      </div>
    </div>
  )
}
