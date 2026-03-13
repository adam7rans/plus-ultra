import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import {
  getAuthority, canManageRoles, assignableRoles,
  AUTHORITY_META, currentAttachmentScore, hasAuthority,
} from '@plus-ultra/core'
import type { Tribe, TribeMember, AuthorityRole } from '@plus-ultra/core'
import {
  fetchTribeMeta, updateTribeMeta, leaveTribe,
  removeMember, deleteTribe, setAuthorityRole,
} from '../lib/tribes'

const STATUS_COLORS: Record<TribeMember['status'], string> = {
  active: 'bg-forest-400',
  away_declared: 'bg-warning-500',
  away_undeclared: 'bg-warning-700',
  departed: 'bg-gray-600',
}

const GOVERNANCE_META: Record<Tribe['constitutionTemplate'], { label: string; description: string }> = {
  council: {
    label: 'Elder Council',
    description: 'Decisions are made by elder council members. Domain leads have authority in their area. Members can request a vote.',
  },
  direct_democracy: {
    label: 'Direct Democracy',
    description: 'All members vote on major decisions. Quorum is required. Every voice counts equally.',
  },
  hybrid: {
    label: 'Hybrid',
    description: 'Elder Council handles urgent decisions; major decisions go to an all-member vote with quorum.',
  },
}

// ─── MemberRow ───────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: TribeMember
  isYou: boolean
  tribe: Tribe | null
  actorMember: TribeMember | undefined
  localRole?: AuthorityRole
  isDeparted: boolean
  onSetRole: (pubkey: string, role: AuthorityRole) => void
  onRemove: (pubkey: string) => void
}

function MemberRow({
  member, isYou, tribe, actorMember, localRole, isDeparted, onSetRole, onRemove,
}: MemberRowProps) {
  const [showRoles, setShowRoles] = useState(false)
  const [removing, setRemoving] = useState(false)

  const auth = localRole ?? (tribe ? getAuthority(member, tribe) : (member.authorityRole ?? 'member'))
  const authMeta = AUTHORITY_META[auth]
  const score = Math.round(currentAttachmentScore(member) * 100)
  const availableRoles = actorMember && tribe && !isYou ? assignableRoles(actorMember, member, tribe) : []
  const canManageThis = actorMember && tribe ? canManageRoles(actorMember, tribe) : false
  const canRemove = canManageThis && !isYou && auth !== 'founder' && !isDeparted

  const lastSeenMs = member.lastSeen ? Date.now() - member.lastSeen : null
  const lastSeenLabel = lastSeenMs === null ? 'unknown'
    : lastSeenMs < 60_000 ? 'just now'
    : lastSeenMs < 3_600_000 ? `${Math.floor(lastSeenMs / 60_000)}m ago`
    : lastSeenMs < 86_400_000 ? `${Math.floor(lastSeenMs / 3_600_000)}h ago`
    : `${Math.floor(lastSeenMs / 86_400_000)}d ago`

  async function handleRemove() {
    setRemoving(true)
    try {
      await onRemove(member.pubkey)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className={`py-2.5 border-b border-forest-900 last:border-0 ${isDeparted ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[isDeparted ? 'departed' : member.status]}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm text-gray-200 font-medium truncate">{member.displayName}</span>
            {isYou && (
              <span className="text-xs bg-forest-800 text-forest-300 px-1.5 py-0.5 rounded">you</span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              auth === 'founder'       ? 'bg-yellow-900/50 text-yellow-300' :
              auth === 'elder_council' ? 'bg-purple-900/50 text-purple-300' :
              auth === 'lead'          ? 'bg-blue-900/50 text-blue-300' :
              auth === 'restricted'    ? 'bg-gray-800 text-gray-400' :
                                        'bg-forest-800 text-forest-400'
            }`}>
              {authMeta.icon} {authMeta.label}
            </span>
            {isDeparted && (
              <span className="text-xs text-gray-500">departed</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            <span>Bond: {score}%</span>
            <span>·</span>
            <span>{lastSeenLabel}</span>
          </div>
        </div>

        {!isDeparted && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {canManageThis && availableRoles.length > 0 && (
              <button
                className="text-xs px-2 py-1 rounded border border-forest-800 text-gray-400 hover:border-forest-600 hover:text-forest-300 transition-colors"
                onClick={() => setShowRoles(prev => !prev)}
              >
                Role
              </button>
            )}
            {canRemove && (
              <button
                className="text-xs px-2 py-1 rounded border border-danger-800 text-danger-400 hover:bg-danger-900/30 transition-colors"
                onClick={handleRemove}
                disabled={removing}
              >
                {removing ? '...' : 'Remove'}
              </button>
            )}
          </div>
        )}
      </div>

      {showRoles && availableRoles.length > 0 && (
        <div className="mt-2 ml-4 flex flex-wrap gap-1.5">
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
                onClick={() => {
                  onSetRole(member.pubkey, role)
                  setShowRoles(false)
                }}
                disabled={isActive}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── TribeSettingsScreen ──────────────────────────────────────────────────────

export default function TribeSettingsScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/settings' })
  const navigate = useNavigate()
  const { identity } = useIdentity()
  const { members } = useSurvivabilityScore(tribeId)
  const [tribe, setTribe] = useState<Tribe | null>(null)

  // Edit tribe info
  const [editingInfo, setEditingInfo] = useState(false)
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editRegion, setEditRegion] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  // Coordinates section
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')
  const [savingCoords, setSavingCoords] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [coordsSaved, setCoordsSaved] = useState(false)

  // Local overrides for immediate UI feedback
  const [roleOverrides, setRoleOverrides] = useState<Map<string, AuthorityRole>>(new Map())
  const [departedPubs, setDepartedPubs] = useState<Set<string>>(new Set())

  // Danger zone
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchTribeMeta(tribeId).then(t => {
      if (t) {
        setTribe(t)
        setEditLat(t.lat !== undefined ? String(t.lat) : '')
        setEditLng(t.lng !== undefined ? String(t.lng) : '')
      }
    })
  }, [tribeId])

  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember && tribe ? getAuthority(myMember, tribe) : 'member'
  const isFounder = tribe ? identity?.pub === tribe.founderId : false
  const canManage = myMember && tribe ? canManageRoles(myMember, tribe) : false

  function startEditingInfo() {
    if (!tribe) return
    setEditName(tribe.name)
    setEditLocation(tribe.location)
    setEditRegion(tribe.region)
    setEditingInfo(true)
  }

  async function saveInfo() {
    if (!tribe) return
    setSavingInfo(true)
    try {
      const updates: { name?: string; location?: string; region?: string } = {}
      if (editName.trim() && editName.trim() !== tribe.name) updates.name = editName.trim()
      if (editLocation.trim() && editLocation.trim() !== tribe.location) updates.location = editLocation.trim()
      if (editRegion.trim() && editRegion.trim() !== tribe.region) updates.region = editRegion.trim()
      if (Object.keys(updates).length > 0) {
        await updateTribeMeta(tribeId, updates)
        setTribe(prev => prev ? { ...prev, ...updates } : prev)
      }
      setEditingInfo(false)
    } finally {
      setSavingInfo(false)
    }
  }

  async function handleLeave() {
    if (!identity) return
    setLeaving(true)
    try {
      await leaveTribe(tribeId, identity.pub)
      void navigate({ to: '/' })
    } finally {
      setLeaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteTribe(tribeId)
      void navigate({ to: '/' })
    } finally {
      setDeleting(false)
    }
  }

  function handleSetRole(targetPubkey: string, role: AuthorityRole) {
    void setAuthorityRole(tribeId, targetPubkey, role)
    setRoleOverrides(prev => new Map([...prev, [targetPubkey, role]]))
  }

  async function handleRemoveMember(targetPubkey: string) {
    await removeMember(tribeId, targetPubkey)
    setDepartedPubs(prev => new Set([...prev, targetPubkey]))
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setEditLat(pos.coords.latitude.toFixed(6))
        setEditLng(pos.coords.longitude.toFixed(6))
        setGeoLoading(false)
      },
      () => {
        setGeoError('Could not get location')
        setGeoLoading(false)
      },
    )
  }

  async function handleSaveCoords() {
    const parsedLat = editLat ? parseFloat(editLat) : undefined
    const parsedLng = editLng ? parseFloat(editLng) : undefined
    if (parsedLat !== undefined && isNaN(parsedLat)) return
    if (parsedLng !== undefined && isNaN(parsedLng)) return
    setSavingCoords(true)
    try {
      await updateTribeMeta(tribeId, { lat: parsedLat, lng: parsedLng })
      setTribe(prev => prev ? { ...prev, lat: parsedLat, lng: parsedLng } : prev)
      setCoordsSaved(true)
      setTimeout(() => setCoordsSaved(false), 2000)
    } finally {
      setSavingCoords(false)
    }
  }

  const govMeta = tribe ? GOVERNANCE_META[tribe.constitutionTemplate] : null

  // Sort: active first, departed last
  const sortedMembers = [...members].sort((a, b) => {
    const aDep = departedPubs.has(a.pubkey) || a.status === 'departed'
    const bDep = departedPubs.has(b.pubkey) || b.status === 'departed'
    if (aDep !== bDep) return aDep ? 1 : -1
    return 0
  })

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-100 mb-6">Tribe Settings</h1>

      {/* ── Tribe Info (5.1) ── */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs text-gray-300 uppercase tracking-widest">Tribe Info</h2>
          {canManage && !editingInfo && (
            <button className="text-xs text-forest-400 hover:text-forest-300" onClick={startEditingInfo}>
              Edit
            </button>
          )}
        </div>

        {editingInfo ? (
          <div className="space-y-3">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Location</label>
              <input
                type="text"
                className="input"
                value={editLocation}
                onChange={e => setEditLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Region</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. texas, pacific-northwest"
                value={editRegion}
                onChange={e => setEditRegion(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={saveInfo} disabled={savingInfo}>
                {savingInfo ? 'Saving...' : 'Save'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setEditingInfo(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="text-gray-200">{tribe?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Location</span>
              <span className="text-gray-200">{tribe?.location ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Region</span>
              <span className="text-gray-200">{tribe?.region ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-200">
                {tribe?.createdAt ? new Date(tribe.createdAt).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Founder</span>
              <span className="text-gray-200 text-xs truncate max-w-[180px]">
                {tribe?.founderId
                  ? (members.find(m => m.pubkey === tribe.founderId)?.displayName ?? tribe.founderId.slice(0, 12) + '…')
                  : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Coordinates ── */}
      <div className="card mb-4">
        <h2 className="text-xs text-gray-300 uppercase tracking-widest mb-3">Home Coordinates</h2>
        <p className="text-xs text-gray-500 mb-3">
          Used as the map center and home pin. General area only — exact location stays private.
        </p>
        <button
          type="button"
          className="btn-secondary w-full text-sm mb-3"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
        >
          {geoLoading ? 'Getting location...' : 'Use My Current Location'}
        </button>
        {geoError && <p className="text-xs text-danger-400 mb-2">{geoError}</p>}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="label text-xs">Latitude</label>
            <input
              type="number"
              step="0.0001"
              className="input text-sm"
              placeholder="48.8584"
              value={editLat}
              onChange={e => setEditLat(e.target.value)}
            />
          </div>
          <div>
            <label className="label text-xs">Longitude</label>
            <input
              type="number"
              step="0.0001"
              className="input text-sm"
              placeholder="2.2945"
              value={editLng}
              onChange={e => setEditLng(e.target.value)}
            />
          </div>
        </div>
        {editLat && editLng && !isNaN(parseFloat(editLat)) && !isNaN(parseFloat(editLng)) && (
          <p className="text-xs text-gray-500 mb-3">
            {Math.abs(parseFloat(editLat)).toFixed(4)}° {parseFloat(editLat) >= 0 ? 'N' : 'S'},&nbsp;
            {Math.abs(parseFloat(editLng)).toFixed(4)}° {parseFloat(editLng) >= 0 ? 'E' : 'W'}
          </p>
        )}
        <button
          className={`btn-primary w-full text-sm ${coordsSaved ? 'bg-forest-600' : ''}`}
          onClick={handleSaveCoords}
          disabled={savingCoords}
        >
          {coordsSaved ? 'Saved ✓' : savingCoords ? 'Saving...' : 'Update Coordinates'}
        </button>
      </div>

      {/* ── Governance (5.3) ── */}
      {govMeta && (
        <div className="card mb-4">
          <h2 className="text-xs text-gray-300 uppercase tracking-widest mb-3">Governance</h2>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-100">{govMeta.label}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-forest-900 text-forest-300 border border-forest-800">
              {tribe?.constitutionTemplate}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4">{govMeta.description}</p>

          <div className="space-y-2">
            {(Object.entries(AUTHORITY_META) as [AuthorityRole, typeof AUTHORITY_META[AuthorityRole]][]).map(([role, meta]) => (
              <div key={role} className="flex items-start gap-2 text-xs">
                <span className="flex-shrink-0 text-sm">{meta.icon}</span>
                <div>
                  <span className={`font-medium ${
                    hasAuthority(myAuth, role) ? 'text-gray-200' : 'text-gray-500'
                  }`}>{meta.label}</span>
                  <span className="text-gray-500 ml-1">— {meta.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Member Management (5.2) ── */}
      <div className="card mb-4">
        <h2 className="text-xs text-gray-300 uppercase tracking-widest mb-3">
          Members ({members.length})
        </h2>
        {sortedMembers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No members yet</p>
        ) : (
          <div>
            {sortedMembers.map(member => (
              <MemberRow
                key={member.pubkey}
                member={member}
                isYou={member.pubkey === identity?.pub}
                tribe={tribe}
                actorMember={myMember}
                localRole={roleOverrides.get(member.pubkey)}
                isDeparted={departedPubs.has(member.pubkey) || member.status === 'departed'}
                onSetRole={handleSetRole}
                onRemove={handleRemoveMember}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Danger Zone ── */}
      <div className="card border-danger-800">
        <h2 className="text-xs font-semibold text-danger-400 uppercase tracking-widest mb-4">Danger Zone</h2>

        {/* Leave Tribe */}
        <div className="mb-3">
          {!confirmLeave ? (
            <button
              className="w-full text-sm text-left px-3 py-2.5 rounded-lg border border-danger-800 text-danger-400 hover:bg-danger-900/30 transition-colors"
              onClick={() => setConfirmLeave(true)}
            >
              Leave Tribe
            </button>
          ) : (
            <div className="rounded-lg border border-danger-700 bg-danger-900/20 p-3">
              <p className="text-sm text-danger-300 mb-3">
                {isFounder
                  ? 'You are the founder. Leaving will not delete the tribe. Your data stays.'
                  : 'You will lose access to this tribe. This cannot be undone locally.'}
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 px-3 py-2 rounded text-sm bg-danger-700 text-white hover:bg-danger-600 transition-colors"
                  onClick={handleLeave}
                  disabled={leaving}
                >
                  {leaving ? 'Leaving...' : 'Yes, Leave'}
                </button>
                <button className="flex-1 btn-secondary text-sm" onClick={() => setConfirmLeave(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Tribe (founder only) */}
        {isFounder && (
          <div>
            {!confirmDelete ? (
              <button
                className="w-full text-sm text-left px-3 py-2.5 rounded-lg border border-danger-700 bg-danger-900/10 text-danger-300 hover:bg-danger-900/30 transition-colors"
                onClick={() => setConfirmDelete(true)}
              >
                Delete Tribe
              </button>
            ) : (
              <div className="rounded-lg border border-danger-600 bg-danger-900/30 p-3">
                <p className="text-sm text-danger-200 mb-3">
                  This marks the tribe as deleted for all members. Member data is retained but the tribe becomes inaccessible. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    className="flex-1 px-3 py-2 rounded text-sm bg-danger-600 text-white hover:bg-danger-500 transition-colors"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete Tribe'}
                  </button>
                  <button className="flex-1 btn-secondary text-sm" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
