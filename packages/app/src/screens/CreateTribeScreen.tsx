import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { createTribe } from '../lib/tribes'
import type { Tribe } from '@plus-ultra/core'

const CONSTITUTION_OPTIONS: { value: Tribe['constitutionTemplate']; label: string; description: string }[] = [
  {
    value: 'council',
    label: 'Council Model',
    description: 'Domain leads vote on decisions. Coordinator has tie-break. Efficient for action.',
  },
  {
    value: 'direct_democracy',
    label: 'Direct Democracy',
    description: 'Every member votes on all decisions. Maximum inclusion, slower decisions.',
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    description: 'Council handles operations. Full tribe votes on major changes.',
  },
]

export default function CreateTribeScreen() {
  const { identity } = useIdentity()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [region, setRegion] = useState('')
  const [constitution, setConstitution] = useState<Tribe['constitutionTemplate']>('council')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!identity) return
    if (!name.trim() || !location.trim() || !region.trim()) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const tribe = await createTribe(
        { name: name.trim(), location: location.trim(), region: region.trim(), constitutionTemplate: constitution },
        identity.pub,
        identity.displayName,
        identity.epub
      )
      // Notify TribeContext to refresh
      window.dispatchEvent(new Event('tribe-joined'))
      await navigate({ to: '/tribe/$tribeId', params: { tribeId: tribe.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tribe')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/" className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← Back
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-2">Create a Tribe</h2>
      <p className="text-gray-500 text-sm mb-8">
        You'll be the founding member. Invite others after setup.
      </p>

      <div className="space-y-5">
        {/* Tribe name */}
        <div>
          <label className="label">Tribe name <span className="text-danger-400">*</span></label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Austin North Tribe"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
          />
        </div>

        {/* Location */}
        <div>
          <label className="label">Location <span className="text-danger-400">*</span></label>
          <input
            className="input"
            type="text"
            placeholder="City or neighborhood (no exact addresses)"
            value={location}
            onChange={e => setLocation(e.target.value)}
            maxLength={80}
          />
          <p className="text-xs text-gray-600 mt-1">General area only — exact location stays private.</p>
        </div>

        {/* Region */}
        <div>
          <label className="label">Region <span className="text-danger-400">*</span></label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Texas, California, Scotland"
            value={region}
            onChange={e => setRegion(e.target.value)}
            maxLength={40}
          />
        </div>

        {/* Constitution */}
        <div>
          <label className="label">Governance model</label>
          <div className="space-y-2">
            {CONSTITUTION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setConstitution(opt.value)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  constitution === opt.value
                    ? 'border-forest-500 bg-forest-900'
                    : 'border-forest-800 bg-forest-950 hover:border-forest-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${constitution === opt.value ? 'border-forest-400 bg-forest-400' : 'border-gray-600'}`} />
                  <span className="font-semibold text-gray-100 text-sm">{opt.label}</span>
                </div>
                <p className="text-xs text-gray-500 ml-5">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="card border-danger-700 bg-danger-900/20">
            <p className="text-danger-400 text-sm">{error}</p>
          </div>
        )}

        <button
          className="btn-primary w-full"
          onClick={handleCreate}
          disabled={loading || !name.trim() || !location.trim() || !region.trim()}
        >
          {loading ? 'Creating...' : 'Found This Tribe'}
        </button>
      </div>
    </div>
  )
}
