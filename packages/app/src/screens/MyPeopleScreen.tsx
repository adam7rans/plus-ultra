import { useState, useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { getDB } from '../lib/db'
import type { TribeMember } from '@plus-ultra/core'

type Relationship = 'family' | 'friend'

interface PersonLink {
  pubkey: string
  relationship: Relationship
  addedAt: number
}

// IDB helpers for my-people store
async function getMyPeople(tribeId: string, myPub: string): Promise<PersonLink[]> {
  const db = await getDB()
  const key = `${tribeId}:${myPub}`
  const data = await db.get('my-people' as never, key as never) as PersonLink[] | undefined
  return data ?? []
}

async function saveMyPeople(tribeId: string, myPub: string, people: PersonLink[]): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${myPub}`
  await db.put('my-people' as never, people as never, key as never)
}

const STATUS_LABELS: Record<TribeMember['status'], { label: string; color: string }> = {
  active:           { label: 'Active',  color: 'bg-forest-400' },
  away_declared:    { label: 'Away',    color: 'bg-warning-500' },
  away_undeclared:  { label: 'Away',    color: 'bg-warning-700' },
  departed:         { label: 'Gone',    color: 'bg-gray-600' },
}

export default function MyPeopleScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/people' })
  const { identity } = useIdentity()
  const { members } = useSurvivabilityScore(tribeId)

  const [myPeople, setMyPeople] = useState<PersonLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState<Relationship | null>(null)

  useEffect(() => {
    if (!identity) return
    getMyPeople(tribeId, identity.pub).then(p => {
      setMyPeople(p)
      setLoading(false)
    })
  }, [tribeId, identity])

  const familyPubs = new Set(myPeople.filter(p => p.relationship === 'family').map(p => p.pubkey))
  const friendPubs = new Set(myPeople.filter(p => p.relationship === 'friend').map(p => p.pubkey))

  const familyMembers = members.filter(m => familyPubs.has(m.pubkey))
  const friendMembers = members.filter(m => friendPubs.has(m.pubkey))

  // Available members to add (not already in list, not self)
  const availableToAdd = members.filter(m =>
    m.pubkey !== identity?.pub &&
    !familyPubs.has(m.pubkey) &&
    !friendPubs.has(m.pubkey)
  )

  async function addPerson(pubkey: string, relationship: Relationship) {
    if (!identity) return
    const updated = [...myPeople, { pubkey, relationship, addedAt: Date.now() }]
    setMyPeople(updated)
    await saveMyPeople(tribeId, identity.pub, updated)
    setShowAddModal(null)
  }

  async function removePerson(pubkey: string) {
    if (!identity) return
    const updated = myPeople.filter(p => p.pubkey !== pubkey)
    setMyPeople(updated)
    await saveMyPeople(tribeId, identity.pub, updated)
  }

  function renderPersonRow(member: TribeMember) {
    const status = STATUS_LABELS[member.status]
    const lastSeenAgo = Date.now() - member.lastSeen
    const lastSeenLabel = lastSeenAgo < 60000 ? 'just now'
      : lastSeenAgo < 3600000 ? `${Math.floor(lastSeenAgo / 60000)}m ago`
      : lastSeenAgo < 86400000 ? `${Math.floor(lastSeenAgo / 3600000)}h ago`
      : `${Math.floor(lastSeenAgo / 86400000)}d ago`

    return (
      <div key={member.pubkey} className="card flex items-center gap-3 py-3">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status.color}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-100 truncate">
            {member.displayName}
          </div>
          <div className="text-xs text-gray-500">
            {status.label} · {lastSeenLabel}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/tribe/$tribeId/dm/$memberPub"
            params={{ tribeId, memberPub: member.pubkey }}
            className="text-gray-500 hover:text-forest-400 transition-colors"
          >
            <span className="text-lg">💬</span>
          </Link>
          <button
            onClick={() => removePerson(member.pubkey)}
            className="text-gray-700 hover:text-danger-400 transition-colors text-xs"
            title="Remove"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-forest-400 text-sm animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Back to Dashboard
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-1">My People</h2>
      <p className="text-gray-500 text-sm mb-6">
        Family and friends — quick access to who matters most.
      </p>

      {/* Family */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs text-gray-300 uppercase tracking-widest flex items-center gap-2">
            👨‍👩‍👧 Family ({familyMembers.length})
          </h3>
          <button
            className="text-xs text-forest-400 hover:text-forest-300"
            onClick={() => setShowAddModal('family')}
          >
            + Add
          </button>
        </div>
        {familyMembers.length === 0 ? (
          <div className="card text-center py-4">
            <p className="text-gray-500 text-sm">No family members added yet</p>
            <button
              className="text-forest-400 text-xs mt-1 hover:text-forest-300"
              onClick={() => setShowAddModal('family')}
            >
              Add family members →
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {familyMembers.map(m => renderPersonRow(m))}
          </div>
        )}
      </div>

      {/* Friends */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs text-gray-300 uppercase tracking-widest flex items-center gap-2">
            🤝 Friends ({friendMembers.length})
          </h3>
          <button
            className="text-xs text-forest-400 hover:text-forest-300"
            onClick={() => setShowAddModal('friend')}
          >
            + Add
          </button>
        </div>
        {friendMembers.length === 0 ? (
          <div className="card text-center py-4">
            <p className="text-gray-500 text-sm">No friends added yet</p>
            <button
              className="text-forest-400 text-xs mt-1 hover:text-forest-300"
              onClick={() => setShowAddModal('friend')}
            >
              Add friends →
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {friendMembers.map(m => renderPersonRow(m))}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-forest-950 border border-forest-800 rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden">
            <div className="p-4 border-b border-forest-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-100">
                Add {showAddModal === 'family' ? 'Family Member' : 'Friend'}
              </h3>
              <button
                className="text-gray-500 hover:text-gray-300"
                onClick={() => setShowAddModal(null)}
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {availableToAdd.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  All tribe members are already in your lists
                </p>
              ) : (
                <div className="space-y-1.5">
                  {availableToAdd.map(member => (
                    <button
                      key={member.pubkey}
                      className="card w-full text-left flex items-center gap-3 py-2.5 hover:border-forest-600 transition-colors"
                      onClick={() => addPerson(member.pubkey, showAddModal)}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        STATUS_LABELS[member.status].color
                      }`} />
                      <span className="text-sm text-gray-200 flex-1 truncate">
                        {member.displayName}
                      </span>
                      <span className="text-xs text-forest-400">+ Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
