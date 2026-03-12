import { useEffect, useState } from 'react'
import { useNavigate, useSearch, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { joinTribe, fetchTribeMeta } from '../lib/tribes'
import type { Tribe } from '@plus-ultra/core'

export default function JoinTribeScreen() {
  const { identity } = useIdentity()
  const navigate = useNavigate()
  // TanStack Router parses search params
  const search = useSearch({ strict: false }) as { tribe?: string; token?: string; name?: string; loc?: string; pub?: string }

  const tribeId = search.tribe
  const token = search.token
  // Tribe info embedded in URL for offline join (no Gun/relay needed)
  const urlTribeName = search.name
  const urlTribeLoc = search.loc
  const urlTribePub = search.pub

  const [tribe, setTribe] = useState<Tribe | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tribeId) {
      setError('Invalid invite link — missing tribe ID')
      setLoading(false)
      return
    }
    fetchTribeMeta(tribeId).then(data => {
      if (data) {
        setTribe(data)
      }
      // If no Gun data, we still show the invite using URL-embedded name/loc
      setLoading(false)
    })
  }, [tribeId])

  async function handleJoin() {
    if (!identity || !tribeId || !token) return
    setJoining(true)
    setError(null)
    try {
      const fallback = (urlTribeName && urlTribePub)
        ? { name: urlTribeName, location: urlTribeLoc ?? '', pub: urlTribePub }
        : undefined
      await joinTribe(tribeId, token, identity.pub, identity.displayName, identity.epub, fallback)
      window.dispatchEvent(new Event('tribe-joined'))
      await navigate({ to: '/tribe/$tribeId/onboarding', params: { tribeId } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join tribe')
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-forest-400 text-sm font-mono animate-pulse">Loading tribe info...</div>
      </div>
    )
  }

  if (!tribeId || !token) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="card border-danger-700">
          <p className="text-danger-400 font-semibold mb-1">Invalid invite link</p>
          <p className="text-gray-400 text-sm">This link is missing required parameters.</p>
          <Link to="/" className="block mt-4">
            <button className="btn-secondary w-full">Go home</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/" className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← Back
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-2">Join a Tribe</h2>

      {error ? (
        <div className="card border-danger-700 bg-danger-900/20 mb-6">
          <p className="text-danger-400 text-sm">{error}</p>
        </div>
      ) : (tribe || urlTribeName) ? (
        <div className="space-y-6">
          {/* Tribe preview */}
          <div className="card">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">You're invited to join</div>
            <div className="text-2xl font-bold text-gray-100 mb-1">{tribe?.name ?? urlTribeName}</div>
            <div className="text-gray-400 text-sm">{tribe?.location ?? urlTribeLoc}</div>
            {tribe && (
              <div className="mt-3 pt-3 border-t border-forest-800">
                <span className="text-xs text-gray-600">Governance: </span>
                <span className="text-xs text-gray-400">
                  {tribe.constitutionTemplate === 'direct_democracy' ? 'Direct Democracy'
                    : tribe.constitutionTemplate === 'council' ? 'Council Model'
                    : 'Hybrid'}
                </span>
              </div>
            )}
          </div>

          <button
            className="btn-primary w-full"
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? 'Joining...' : `Join ${tribe?.name ?? urlTribeName}`}
          </button>
        </div>
      ) : (
        <div className="card border-warning-700">
          <p className="text-warning-400 text-sm">Could not load tribe info. Make sure you have internet or are connected to another tribe member's device.</p>
        </div>
      )}
    </div>
  )
}
