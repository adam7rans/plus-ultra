import { useState } from 'react'
import { useIdentity } from '../contexts/IdentityContext'
import { useTribe } from '../contexts/TribeContext'
import { shortId } from '../lib/identity'
import { Link } from '@tanstack/react-router'
import CameraQrScanner from '../components/CameraQrScanner'

export default function HomeScreen() {
  const { identity, loading: identityLoading } = useIdentity()
  const { myTribes, loadingTribes } = useTribe()
  const [scanning, setScanning] = useState(false)
  const [pastingLink, setPastingLink] = useState(false)
  const [pastedLink, setPastedLink] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)

  function handleQrScan(data: string) {
    setScanning(false)
    navigateToInvite(data)
  }

  function navigateToInvite(raw: string) {
    try {
      const url = new URL(raw.trim())
      if (!url.searchParams.get('tribe') || !url.searchParams.get('token')) {
        setPasteError('Not a valid tribe invite link.')
        return
      }
      window.location.href = url.pathname + url.search
    } catch {
      setPasteError('Not a valid URL.')
    }
  }

  function handlePasteSubmit() {
    setPasteError(null)
    navigateToInvite(pastedLink)
  }

  if (identityLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-forest-400 text-sm font-mono animate-pulse">Initializing identity...</div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-forest-300 tracking-tight">PLUS ULTRA</h1>
          <p className="text-gray-300 text-sm mt-0.5">Tribal Operating System</p>
        </div>
        <Link to="/identity">
          <div className="card py-2 px-3 cursor-pointer hover:border-forest-600 transition-colors">
            <div className="text-xs text-gray-300 mb-0.5">ID</div>
            <div className="font-mono text-forest-300 text-sm tracking-wider">
              {identity ? shortId(identity.pub) : '—'}
            </div>
          </div>
        </Link>
      </div>

      {/* Backup warning */}
      {identity && !identity.backedUp && (
        <Link to="/identity">
          <div className="card border-warning-700 bg-warning-700/10 mb-4 cursor-pointer hover:border-warning-500 transition-colors">
            <p className="text-warning-400 text-sm font-semibold">⚠ Back up your identity</p>
            <p className="text-gray-300 text-xs mt-0.5">
              Losing your phone without a backup means losing tribe access forever.
            </p>
          </div>
        </Link>
      )}

      {/* Tribes section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">My Tribes</h2>
        </div>

        {loadingTribes ? (
          <div className="card">
            <div className="text-gray-600 text-sm animate-pulse">Loading...</div>
          </div>
        ) : myTribes.length === 0 ? (
          <div className="card border-dashed border-2 border-forest-800 text-center py-8">
            <div className="text-4xl mb-3">🏕</div>
            <p className="text-gray-400 text-sm font-medium mb-1">No tribe yet</p>
            <p className="text-gray-600 text-xs">Create one or join via invite link</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myTribes.map(tribe => (
              <Link key={tribe.tribeId} to="/tribe/$tribeId" params={{ tribeId: tribe.tribeId }}>
                <div className="card hover:border-forest-600 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-100">{tribe.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{tribe.location}</div>
                    </div>
                    <span className="text-forest-500 text-lg">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* QR scanner */}
      {scanning && (
        <div className="mb-4">
          <CameraQrScanner onScan={handleQrScan} onClose={() => setScanning(false)} />
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <Link to="/create-tribe" className="block">
          <button className="btn-primary w-full">+ Create New Tribe</button>
        </Link>
        <button
          className="btn-secondary w-full"
          onClick={() => { setScanning(prev => !prev); setPastingLink(false) }}
        >
          {scanning ? 'Cancel Scan' : '📷 Scan QR to Join'}
        </button>
        <button
          className="btn-secondary w-full"
          onClick={() => { setPastingLink(prev => !prev); setScanning(false); setPasteError(null) }}
        >
          {pastingLink ? 'Cancel' : '🔗 Paste Invite Link'}
        </button>
        {pastingLink && (
          <div className="space-y-2">
            <input
              type="url"
              className="input w-full"
              placeholder="Paste invite link here..."
              value={pastedLink}
              onChange={e => { setPastedLink(e.target.value); setPasteError(null) }}
              onKeyDown={e => e.key === 'Enter' && handlePasteSubmit()}
              autoFocus
            />
            {pasteError && <p className="text-xs text-danger-400">{pasteError}</p>}
            <button className="btn-primary w-full" onClick={handlePasteSubmit}>
              Go →
            </button>
          </div>
        )}
      </div>

      {/* Diagnostics link (dev/validation only) */}
      <div className="mt-8 text-center">
        <Link to="/diagnostics" className="text-xs text-gray-500 hover:text-gray-400">
          diagnostics
        </Link>
      </div>
    </div>
  )
}
