import { useIdentity } from '../contexts/IdentityContext'
import { shortId } from '../lib/identity'
import { Link } from '@tanstack/react-router'

export default function HomeScreen() {
  const { identity, loading } = useIdentity()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-forest-400 text-sm font-mono animate-pulse">
          Initializing identity...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forest-300 tracking-tight">PLUS ULTRA</h1>
        <p className="text-gray-500 text-sm mt-1">Tribal Operating System</p>
      </div>

      {/* Identity card */}
      {identity && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-widest">Your Identity</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${identity.backedUp ? 'bg-forest-800 text-forest-300' : 'bg-warning-700 text-warning-400'}`}>
              {identity.backedUp ? 'Backed up' : 'Not backed up'}
            </span>
          </div>
          <div className="font-mono text-forest-300 text-lg tracking-wider">
            {shortId(identity.pub)}
          </div>
          <div className="text-xs text-gray-600 mt-1 font-mono break-all">
            {identity.pub.slice(0, 32)}...
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <Link to="/identity" className="block">
          <button className="btn-secondary w-full text-left">
            Manage Identity &amp; Backup →
          </button>
        </Link>

        {!identity?.backedUp && (
          <div className="card border-warning-700 bg-warning-700/10">
            <p className="text-warning-400 text-sm font-semibold mb-1">⚠ Back up your identity</p>
            <p className="text-gray-400 text-xs">
              If you lose your phone without a backup, your identity and tribe access cannot be recovered.
            </p>
          </div>
        )}

        <div className="card opacity-50">
          <p className="text-sm text-gray-400">Tribes — Sprint 2</p>
        </div>
        <div className="card opacity-50">
          <p className="text-sm text-gray-400">Messaging — Sprint 4</p>
        </div>
      </div>
    </div>
  )
}
