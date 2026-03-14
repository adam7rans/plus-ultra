import { useState, useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useTrainingSessions } from '../hooks/useTrainingSessions'
import { useCertifications } from '../hooks/useCertifications'
import { useLevelUpQueue } from '../hooks/useLevelUpQueue'
import {
  logTrainingSession, updateTrainingSession, deleteTrainingSession, approveLevelUp,
} from '../lib/training'
import {
  addCertification, updateCertification, verifyCertification, deleteCertification,
} from '../lib/certifications'
import { fetchTribeMeta } from '../lib/tribes'
import { getAuthority, hasAuthority, ROLE_BY_KEY, ALL_ROLES } from '@plus-ultra/core'
import type { SkillRole, Tribe, MemberCertification, TrainingSession } from '@plus-ultra/core'

type Tab = 'sessions' | 'certifications' | 'levelup'

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function expiryBadge(expiresAt: number): { label: string; cls: string } | null {
  if (!expiresAt) return null
  const now = Date.now()
  const daysLeft = Math.floor((expiresAt - now) / 86400000)
  if (daysLeft < 0) return { label: 'Expired', cls: 'text-danger-400 border-danger-700' }
  if (daysLeft < 90) return { label: `${daysLeft}d left`, cls: 'text-warning-400 border-warning-700' }
  return { label: formatDate(expiresAt), cls: 'text-forest-400 border-forest-700' }
}

export default function TrainingScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/training' })
  const { identity } = useIdentity()
  const { members, skills } = useSurvivabilityScore(tribeId)
  const { sessions, loading: sessionsLoading } = useTrainingSessions(tribeId)
  const { certs, loading: certsLoading } = useCertifications(tribeId)
  const levelUpQueue = useLevelUpQueue(skills, sessions, members)

  const [tribe, setTribe] = useState<Tribe | null>(null)
  useEffect(() => { fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) }) }, [tribeId])

  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember && tribe ? getAuthority(myMember, tribe) : 'member'
  const isLead = hasAuthority(myAuth, 'lead')

  const [activeTab, setActiveTab] = useState<Tab>('sessions')

  // Redirect non-leads away from levelup tab
  useEffect(() => {
    if (activeTab === 'levelup' && !isLead) setActiveTab('sessions')
  }, [activeTab, isLead])

  // ── Session form state ────────────────────────────────────────────────────
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null)
  const [sTitle, setSTitle] = useState('')
  const [sRole, setSRole] = useState<SkillRole | ''>('')
  const [sDate, setSDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [sDuration, setSDuration] = useState(60)
  const [sTrainer, setSTrainer] = useState('')
  const [sAttendees, setSAttendees] = useState<string[]>([])
  const [sNotes, setSNotes] = useState('')
  const [sSaving, setSSaving] = useState(false)

  function openSessionForm(session?: TrainingSession) {
    if (session) {
      setEditingSession(session)
      setSTitle(session.title)
      setSRole(session.skillRole ?? '')
      setSDate(new Date(session.date).toISOString().slice(0, 10))
      setSDuration(session.durationMinutes)
      setSTrainer(session.trainerId)
      try { setSAttendees(JSON.parse(session.attendeesJson)) } catch { setSAttendees([]) }
      setSNotes(session.notes)
    } else {
      setEditingSession(null)
      setSTitle('')
      setSRole('')
      setSDate(new Date().toISOString().slice(0, 10))
      setSDuration(60)
      setSTrainer(identity?.pub ?? '')
      setSAttendees(identity ? [identity.pub] : [])
      setSNotes('')
    }
    setShowSessionForm(true)
  }

  async function handleSaveSession() {
    if (!sTitle.trim() || !identity) return
    setSSaving(true)
    try {
      const params = {
        title: sTitle.trim(),
        skillRole: sRole === '' ? null : sRole as SkillRole,
        date: new Date(sDate).getTime(),
        durationMinutes: sDuration,
        trainerId: sTrainer,
        attendees: sAttendees,
        notes: sNotes,
      }
      if (editingSession) {
        await updateTrainingSession(tribeId, editingSession.id, { ...params, attendees: sAttendees })
      } else {
        await logTrainingSession(tribeId, params, identity.pub)
      }
      setShowSessionForm(false)
    } finally {
      setSSaving(false)
    }
  }

  // ── Cert form state ───────────────────────────────────────────────────────
  const [showCertForm, setShowCertForm] = useState(false)
  const [certForMember, setCertForMember] = useState<string>('')
  const [editingCert, setEditingCert] = useState<MemberCertification | null>(null)
  const [cCertName, setCCertName] = useState('')
  const [cIssuingBody, setCIssuingBody] = useState('')
  const [cLicenseNumber, setCLicenseNumber] = useState('')
  const [cIssuedAt, setCIssuedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [cExpiresAt, setCExpiresAt] = useState('')
  const [cNoExpiry, setCNoExpiry] = useState(false)
  const [cLinkedRole, setCLinkedRole] = useState<SkillRole | ''>('')
  const [cSaving, setCSaving] = useState(false)
  const [certMemberToggle, setCertMemberToggle] = useState<'mine' | 'all'>('mine')
  const [verifyConfirmId, setVerifyConfirmId] = useState<string | null>(null)

  function openCertForm(memberId: string, cert?: MemberCertification) {
    setCertForMember(memberId)
    if (cert) {
      setEditingCert(cert)
      setCCertName(cert.certName)
      setCIssuingBody(cert.issuingBody)
      setCLicenseNumber(cert.licenseNumber)
      setCIssuedAt(new Date(cert.issuedAt).toISOString().slice(0, 10))
      setCNoExpiry(cert.expiresAt === 0)
      setCExpiresAt(cert.expiresAt ? new Date(cert.expiresAt).toISOString().slice(0, 10) : '')
      setCLinkedRole(cert.linkedRole ?? '')
    } else {
      setEditingCert(null)
      setCCertName('')
      setCIssuingBody('')
      setCLicenseNumber('')
      setCIssuedAt(new Date().toISOString().slice(0, 10))
      setCNoExpiry(false)
      setCExpiresAt('')
      setCLinkedRole('')
    }
    setShowCertForm(true)
  }

  async function handleSaveCert() {
    if (!cCertName.trim() || !identity) return
    setCSaving(true)
    try {
      const params = {
        certName: cCertName.trim(),
        issuingBody: cIssuingBody.trim(),
        licenseNumber: cLicenseNumber.trim(),
        issuedAt: new Date(cIssuedAt).getTime(),
        expiresAt: cNoExpiry ? 0 : (cExpiresAt ? new Date(cExpiresAt).getTime() : 0),
        linkedRole: cLinkedRole === '' ? null : cLinkedRole as SkillRole,
      }
      if (editingCert) {
        await updateCertification(tribeId, editingCert.id, certForMember, params)
      } else {
        await addCertification(tribeId, certForMember, params, identity.pub)
      }
      setShowCertForm(false)
    } finally {
      setCSaving(false)
    }
  }

  async function handleVerify(cert: MemberCertification) {
    if (!identity) return
    await verifyCertification(tribeId, cert.id, cert.memberId, identity.pub)
    setVerifyConfirmId(null)
  }

  // ── Derived cert lists ────────────────────────────────────────────────────
  const displayedCerts = certMemberToggle === 'mine' && identity
    ? certs.filter(c => c.memberId === identity.pub)
    : certs

  const sortedSessions = [...sessions].sort((a, b) => b.date - a.date)

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Back to Dashboard
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-1">Training & Skills</h2>
      <p className="text-gray-500 text-sm mb-4">Track sessions, certifications, and progression.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-forest-900 rounded-lg p-1">
        {(['sessions', 'certifications', ...(isLead ? ['levelup'] : [])] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
              activeTab === tab
                ? 'bg-forest-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'sessions' ? 'Sessions' : tab === 'certifications' ? 'Certifications' : 'Level Up'}
          </button>
        ))}
      </div>

      {/* ── SESSIONS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'sessions' && (
        <div>
          {isLead && (
            <button
              className="btn-primary w-full mb-4 text-sm"
              onClick={() => openSessionForm()}
            >
              + Log Session
            </button>
          )}

          {/* Session form */}
          {showSessionForm && (
            <div className="card mb-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-200">
                {editingSession ? 'Edit Session' : 'Log Training Session'}
              </h3>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                <input
                  className="input w-full text-sm"
                  value={sTitle}
                  onChange={e => setSTitle(e.target.value)}
                  placeholder="e.g. First Aid Refresher"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Skill Role (optional)</label>
                <select
                  className="input w-full text-sm"
                  value={sRole}
                  onChange={e => setSRole(e.target.value as SkillRole | '')}
                >
                  <option value="">General / Multi-skill</option>
                  {ALL_ROLES.map(role => {
                    const spec = ROLE_BY_KEY[role]
                    return (
                      <option key={role} value={role}>
                        {spec.icon} {spec.label}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Date</label>
                  <input
                    type="date"
                    className="input w-full text-sm"
                    value={sDate}
                    onChange={e => setSDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Duration (minutes)</label>
                  <input
                    type="number"
                    className="input w-full text-sm"
                    value={sDuration}
                    min={1}
                    onChange={e => setSDuration(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Trainer</label>
                <select
                  className="input w-full text-sm"
                  value={sTrainer}
                  onChange={e => setSTrainer(e.target.value)}
                >
                  <option value="">Select trainer...</option>
                  {members.map(m => (
                    <option key={m.pubkey} value={m.pubkey}>
                      {m.displayName}{m.pubkey === identity?.pub ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-2 block">Attendees</label>
                <div className="space-y-1">
                  {members.map(m => (
                    <label key={m.pubkey} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sAttendees.includes(m.pubkey)}
                        onChange={e => {
                          setSAttendees(prev =>
                            e.target.checked
                              ? [...prev, m.pubkey]
                              : prev.filter(p => p !== m.pubkey)
                          )
                        }}
                        className="accent-forest-500"
                      />
                      <span className="text-xs text-gray-300">
                        {m.displayName}{m.pubkey === identity?.pub ? ' (you)' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notes</label>
                <textarea
                  className="input w-full text-sm"
                  value={sNotes}
                  onChange={e => setSNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  className="btn-primary flex-1 text-sm"
                  onClick={handleSaveSession}
                  disabled={sSaving || !sTitle.trim()}
                >
                  {sSaving ? 'Saving...' : 'Save Session'}
                </button>
                <button
                  className="btn-secondary flex-1 text-sm"
                  onClick={() => setShowSessionForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Session list */}
          {sessionsLoading ? (
            <div className="text-center py-8 text-gray-500 text-sm animate-pulse">Loading sessions...</div>
          ) : sortedSessions.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500 text-sm">No training sessions logged yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSessions.map(session => {
                const roleSpec = session.skillRole ? ROLE_BY_KEY[session.skillRole] : null
                let attendees: string[] = []
                try { attendees = JSON.parse(session.attendeesJson) } catch { attendees = [] }
                const trainerMember = members.find(m => m.pubkey === session.trainerId)

                return (
                  <div key={session.id} className="card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-100 truncate">{session.title}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {roleSpec ? (
                            <span className="text-xs bg-forest-900 border border-forest-700 rounded px-1.5 py-0.5 text-forest-300">
                              {roleSpec.icon} {roleSpec.label}
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-400">
                              General
                            </span>
                          )}
                          <span className="text-xs text-gray-500">{formatDate(session.date)}</span>
                          <span className="text-xs text-gray-500">{formatDuration(session.durationMinutes)}</span>
                          <span className="text-xs text-gray-500">{attendees.length} attendee{attendees.length !== 1 ? 's' : ''}</span>
                        </div>
                        {trainerMember && (
                          <div className="text-xs text-gray-500 mt-0.5">Trainer: {trainerMember.displayName}</div>
                        )}
                      </div>
                      {isLead && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            className="text-xs text-forest-400 hover:text-forest-300 px-2 py-1"
                            onClick={() => openSessionForm(session)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs text-danger-400 hover:text-danger-300 px-2 py-1"
                            onClick={() => deleteTrainingSession(tribeId, session.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CERTIFICATIONS TAB ──────────────────────────────────────────── */}
      {activeTab === 'certifications' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            {isLead && (
              <div className="flex gap-1 bg-forest-900 rounded-lg p-0.5">
                <button
                  onClick={() => setCertMemberToggle('mine')}
                  className={`text-xs px-3 py-1 rounded-md transition-colors ${
                    certMemberToggle === 'mine' ? 'bg-forest-600 text-white' : 'text-gray-400'
                  }`}
                >
                  My Certs
                </button>
                <button
                  onClick={() => setCertMemberToggle('all')}
                  className={`text-xs px-3 py-1 rounded-md transition-colors ${
                    certMemberToggle === 'all' ? 'bg-forest-600 text-white' : 'text-gray-400'
                  }`}
                >
                  All Members
                </button>
              </div>
            )}
            <button
              className="btn-primary text-sm"
              onClick={() => openCertForm(
                isLead && certMemberToggle === 'all' ? '' : (identity?.pub ?? '')
              )}
            >
              + Add Cert
            </button>
          </div>

          {/* Cert form */}
          {showCertForm && (
            <div className="card mb-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-200">
                {editingCert ? 'Edit Certification' : 'Add Certification'}
              </h3>

              {isLead && certMemberToggle === 'all' && !editingCert && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Member</label>
                  <select
                    className="input w-full text-sm"
                    value={certForMember}
                    onChange={e => setCertForMember(e.target.value)}
                  >
                    <option value="">Select member...</option>
                    {members.map(m => (
                      <option key={m.pubkey} value={m.pubkey}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Certification Name *</label>
                <input
                  className="input w-full text-sm"
                  value={cCertName}
                  onChange={e => setCCertName(e.target.value)}
                  placeholder="e.g. Wilderness First Responder"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Issuing Body</label>
                <input
                  className="input w-full text-sm"
                  value={cIssuingBody}
                  onChange={e => setCIssuingBody(e.target.value)}
                  placeholder="e.g. NOLS, Red Cross"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">License / Certificate #</label>
                <input
                  className="input w-full text-sm"
                  value={cLicenseNumber}
                  onChange={e => setCLicenseNumber(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Issued Date</label>
                  <input
                    type="date"
                    className="input w-full text-sm"
                    value={cIssuedAt}
                    onChange={e => setCIssuedAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Expiry Date</label>
                  <input
                    type="date"
                    className="input w-full text-sm"
                    value={cExpiresAt}
                    onChange={e => setCExpiresAt(e.target.value)}
                    disabled={cNoExpiry}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cNoExpiry}
                  onChange={e => setCNoExpiry(e.target.checked)}
                  className="accent-forest-500"
                />
                <span className="text-xs text-gray-400">No expiry</span>
              </label>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Linked Role (optional)</label>
                <select
                  className="input w-full text-sm"
                  value={cLinkedRole}
                  onChange={e => setCLinkedRole(e.target.value as SkillRole | '')}
                >
                  <option value="">None</option>
                  {ALL_ROLES.map(role => {
                    const spec = ROLE_BY_KEY[role]
                    return (
                      <option key={role} value={role}>
                        {spec.icon} {spec.label}
                      </option>
                    )
                  })}
                </select>
                {cLinkedRole && (
                  <p className="text-xs text-forest-400 mt-1">
                    Verification will elevate this role to Verified Expert.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  className="btn-primary flex-1 text-sm"
                  onClick={handleSaveCert}
                  disabled={cSaving || !cCertName.trim()}
                >
                  {cSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="btn-secondary flex-1 text-sm"
                  onClick={() => setShowCertForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Verify confirm modal */}
          {verifyConfirmId && (() => {
            const cert = certs.find(c => c.id === verifyConfirmId)
            if (!cert) return null
            return (
              <div className="card mb-4 border-warning-700/50 space-y-3">
                <p className="text-sm text-gray-200">
                  Verify <span className="font-semibold">{cert.certName}</span>?
                  {cert.linkedRole && (
                    <span className="text-warning-400">
                      {' '}This will set {ROLE_BY_KEY[cert.linkedRole]?.label} to Verified Expert.
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    className="btn-primary flex-1 text-sm"
                    onClick={() => handleVerify(cert)}
                  >
                    Confirm Verify
                  </button>
                  <button
                    className="btn-secondary flex-1 text-sm"
                    onClick={() => setVerifyConfirmId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Cert list */}
          {certsLoading ? (
            <div className="text-center py-8 text-gray-500 text-sm animate-pulse">Loading certifications...</div>
          ) : displayedCerts.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500 text-sm">No certifications added yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedCerts.map(cert => {
                const badge = expiryBadge(cert.expiresAt)
                const ownerMember = members.find(m => m.pubkey === cert.memberId)
                const isOwn = cert.memberId === identity?.pub

                return (
                  <div key={cert.id} className="card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {!isOwn && ownerMember && (
                          <div className="text-xs text-gray-500 mb-0.5">{ownerMember.displayName}</div>
                        )}
                        <div className="text-sm font-semibold text-gray-100">{cert.certName}</div>
                        {cert.issuingBody && (
                          <div className="text-xs text-gray-500">{cert.issuingBody}</div>
                        )}
                        {cert.licenseNumber && (
                          <div className="text-xs text-gray-500">#{cert.licenseNumber}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {badge && (
                            <span className={`text-xs border rounded px-1.5 py-0.5 ${badge.cls}`}>
                              {badge.label}
                            </span>
                          )}
                          {cert.verifiedBy ? (
                            <span className="text-xs bg-forest-900 border border-forest-700 rounded px-1.5 py-0.5 text-forest-300">
                              Verified
                            </span>
                          ) : (
                            <span className="text-xs border border-gray-700 rounded px-1.5 py-0.5 text-gray-500">
                              Unverified
                            </span>
                          )}
                          {cert.linkedRole && (
                            <span className="text-xs text-gray-500">
                              → {ROLE_BY_KEY[cert.linkedRole]?.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0 items-end">
                        {isLead && !cert.verifiedBy && (
                          <button
                            className="text-xs text-warning-400 hover:text-warning-300 px-2 py-1 border border-warning-700/50 rounded"
                            onClick={() => setVerifyConfirmId(cert.id)}
                          >
                            Verify
                          </button>
                        )}
                        {(isOwn || isLead) && (
                          <button
                            className="text-xs text-forest-400 hover:text-forest-300 px-2 py-1"
                            onClick={() => openCertForm(cert.memberId, cert)}
                          >
                            Edit
                          </button>
                        )}
                        {(isOwn || isLead) && (
                          <button
                            className="text-xs text-danger-400 hover:text-danger-300 px-2 py-1"
                            onClick={() => deleteCertification(tribeId, cert.id, cert.memberId)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── LEVEL UP TAB (leads only) ───────────────────────────────────── */}
      {activeTab === 'levelup' && isLead && (
        <div>
          <p className="text-xs text-gray-500 mb-4">
            Members eligible for promotion based on training hours and vouches.
          </p>
          {levelUpQueue.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500 text-sm">No members currently eligible for level-up.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {levelUpQueue.map(item => {
                const roleSpec = ROLE_BY_KEY[item.role]
                const { eligibility } = item
                return (
                  <div key={`${item.memberId}:${item.role}`} className="card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-100">{item.memberName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {roleSpec.icon} {roleSpec.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.skill.proficiency} → {eligibility.nextLevel}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs border rounded px-1.5 py-0.5 ${
                            eligibility.currentHours >= eligibility.neededHours
                              ? 'border-forest-700 text-forest-400'
                              : 'border-gray-700 text-gray-500'
                          }`}>
                            {eligibility.currentHours.toFixed(1)}/{eligibility.neededHours}h
                          </span>
                          <span className={`text-xs border rounded px-1.5 py-0.5 ${
                            eligibility.currentVouches >= eligibility.neededVouches
                              ? 'border-forest-700 text-forest-400'
                              : 'border-gray-700 text-gray-500'
                          }`}>
                            {eligibility.currentVouches}/{eligibility.neededVouches} vouches
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn-primary text-xs flex-shrink-0"
                        onClick={() => {
                          if (!identity || !eligibility.nextLevel) return
                          approveLevelUp(tribeId, item.memberId, item.role, eligibility.nextLevel, identity.pub)
                        }}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
