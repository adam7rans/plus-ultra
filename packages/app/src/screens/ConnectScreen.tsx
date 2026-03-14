import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useTribe } from '../contexts/TribeContext'
import { addFederationContact, getLocalTribeEpub } from '../lib/federation'
import { getDB } from '../lib/db'

function parseContactCard(): {
  tribeId: string
  name: string
  location: string
  pub: string
  epub: string
} | null {
  const params = new URLSearchParams(window.location.search)
  const tribeId = params.get('tribe') ?? ''
  const name = params.get('name') ?? ''
  const loc = params.get('loc') ?? ''
  const pub = params.get('pub') ?? ''
  const epub = params.get('epub') ?? ''
  if (!tribeId || !epub) return null
  return { tribeId, name, location: loc, pub, epub }
}

export default function ConnectScreen() {
  const { identity } = useIdentity()
  const { myTribes } = useTribe()
  const navigate = useNavigate()
  const card = parseContactCard()

  const [selectedTribeId, setSelectedTribeId] = useState<string>(myTribes[0]?.tribeId ?? '')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!card) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Link to="/" className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
          ← Home
        </Link>
        <div className="card text-center py-8">
          <p className="text-gray-400 text-sm">Invalid or missing contact card.</p>
        </div>
      </div>
    )
  }

  async function handleAdd() {
    if (!selectedTribeId || !identity || !card) return
    setAdding(true)
    setError(null)

    try {
      // Verify actor can diplomatize — load member record
      const db = await getDB()
      const memberRecord = await db.get('members', `${selectedTribeId}:${identity.pub}`)
      const tribe = await db.get('tribe-cache', selectedTribeId)

      if (!memberRecord || !tribe) {
        setError('Could not verify your membership.')
        return
      }

      // For simplicity, any member of the tribe can add a contact via the URL
      // (the contact card was shared deliberately). Permission gate happens in FederationScreen.

      // Fetch our own tribe epub
      const myEpub = await getLocalTribeEpub(selectedTribeId)
      if (!myEpub) {
        setError('Your tribe encryption key is not available. Only founders can add federation contacts.')
        return
      }

      const localRef = myTribes.find(t => t.tribeId === selectedTribeId)
      const myTribeName = localRef?.name ?? selectedTribeId

      await addFederationContact(selectedTribeId, myTribeName, card, identity.pub)

      navigate({ to: '/tribe/$tribeId/federation', params: { tribeId: selectedTribeId } })
    } catch (e) {
      setError(String(e))
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/" className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← Home
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-1">Federation Contact Card</h2>
      <p className="text-gray-500 text-sm mb-6">
        Add this tribe as a federation contact to enable inter-tribe messaging and trade.
      </p>

      {/* Contact info */}
      <div className="card mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Contact</div>
        <div className="text-lg font-bold text-gray-100">{card.name || 'Unknown Tribe'}</div>
        {card.location && <div className="text-sm text-gray-400 mt-0.5">{card.location}</div>}
        <div className="text-xs text-gray-600 mt-2 font-mono truncate">{card.tribeId}</div>
        {card.epub && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xs text-forest-400">Encryption key present</span>
          </div>
        )}
      </div>

      {/* Tribe selector */}
      {myTribes.length > 1 && (
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1">Connect from which tribe?</label>
          <select
            value={selectedTribeId}
            onChange={e => setSelectedTribeId(e.target.value)}
            className="w-full text-sm bg-forest-900 border border-forest-800 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-forest-600"
          >
            {myTribes.map(t => (
              <option key={t.tribeId} value={t.tribeId}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {myTribes.length === 0 && (
        <div className="card text-center py-6 mb-4">
          <p className="text-gray-400 text-sm">You need to be in a tribe before adding federation contacts.</p>
        </div>
      )}

      {error && (
        <div className="card border-danger-700 bg-danger-900/20 mb-4">
          <p className="text-danger-400 text-sm">{error}</p>
        </div>
      )}

      {myTribes.length > 0 && (
        <button
          className="btn-primary w-full"
          onClick={handleAdd}
          disabled={adding || !selectedTribeId}
        >
          {adding ? 'Adding...' : 'Add as Federation Contact'}
        </button>
      )}
    </div>
  )
}
