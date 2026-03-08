import { useState } from 'react'
import { useIdentity } from '../contexts/IdentityContext'
import { shortId, markBackedUp } from '../lib/identity'
import QrDisplay from '../components/QrDisplay'
import QrScanner from '../components/QrScanner'
import { Link } from '@tanstack/react-router'

type View = 'main' | 'backup' | 'restore'

export default function IdentityScreen() {
  const { identity, loading, restoreIdentity } = useIdentity()
  const [view, setView] = useState<View>('main')
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreSuccess, setRestoreSuccess] = useState(false)
  const [showPrivateWarning, setShowPrivateWarning] = useState(false)

  if (loading || !identity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-forest-400 text-sm font-mono animate-pulse">Loading...</div>
      </div>
    )
  }

  async function handleBackupShown() {
    await markBackedUp()
  }

  async function handleQrScanned(data: string) {
    try {
      setRestoreError(null)
      await restoreIdentity(data)
      setRestoreSuccess(true)
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Failed to restore identity')
    }
  }

  if (view === 'backup') {
    const backupData = JSON.stringify({
      pub: identity.pub,
      priv: identity.priv,
      epub: identity.epub,
      epriv: identity.epriv,
      createdAt: identity.createdAt,
      backedUp: true,
    })

    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <button onClick={() => setView('main')} className="text-forest-400 text-sm mb-6 flex items-center gap-2">
          ← Back
        </button>

        <h2 className="text-xl font-bold text-gray-100 mb-2">Backup Identity</h2>
        <p className="text-gray-400 text-sm mb-6">
          Print this QR code and store it offline — in a Faraday bag or fire safe.
          Anyone with this QR code can access your identity.
        </p>

        <div className="card mb-4 flex justify-center">
          <QrDisplay value={backupData} onShown={handleBackupShown} />
        </div>

        <div className="card border-danger-700 bg-danger-900/20 mb-6">
          <p className="text-danger-400 text-sm font-semibold mb-1">⚠ Keep this private</p>
          <p className="text-gray-400 text-xs">
            This QR contains your private key. Guard it like cash.
          </p>
        </div>

        <button className="btn-primary w-full" onClick={() => setView('main')}>
          Done — I've saved my backup
        </button>
      </div>
    )
  }

  if (view === 'restore') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <button onClick={() => setView('main')} className="text-forest-400 text-sm mb-6 flex items-center gap-2">
          ← Back
        </button>

        <h2 className="text-xl font-bold text-gray-100 mb-2">Restore Identity</h2>
        <p className="text-gray-400 text-sm mb-6">
          Scan your backup QR code to restore your identity on this device.
        </p>

        {restoreSuccess ? (
          <div className="card border-forest-600 bg-forest-800/20">
            <p className="text-forest-300 font-semibold mb-1">✓ Identity restored</p>
            <p className="text-gray-400 text-sm">Your identity has been restored successfully.</p>
            <Link to="/" className="block mt-4">
              <button className="btn-primary w-full">Continue</button>
            </Link>
          </div>
        ) : (
          <>
            <QrScanner onScan={handleQrScanned} />
            {restoreError && (
              <div className="card border-danger-700 bg-danger-900/20 mt-4">
                <p className="text-danger-400 text-sm">{restoreError}</p>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Main view
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/" className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← Back
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-6">Your Identity</h2>

      {/* Public key display */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Public Key</span>
          <span className="text-xs text-gray-600">Safe to share</span>
        </div>
        <div className="font-mono text-forest-300 text-xl tracking-wider mb-2">
          {shortId(identity.pub)}
        </div>
        <div className="text-xs text-gray-600 font-mono break-all leading-relaxed">
          {identity.pub}
        </div>
      </div>

      {/* Private key — hidden */}
      <div className="card mb-6 border-danger-700/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Private Key</span>
          <span className="text-xs text-danger-400">Never share</span>
        </div>
        {showPrivateWarning ? (
          <div>
            <div className="text-xs text-gray-600 font-mono break-all leading-relaxed mb-2">
              {identity.priv}
            </div>
            <button
              className="text-xs text-danger-400 hover:text-danger-300"
              onClick={() => setShowPrivateWarning(false)}
            >
              Hide
            </button>
          </div>
        ) : (
          <button
            className="text-xs text-gray-600 hover:text-gray-400"
            onClick={() => setShowPrivateWarning(true)}
          >
            ••••••••••••••••••••••••••••••• (tap to reveal)
          </button>
        )}
      </div>

      {/* Backup status */}
      <div className={`card mb-6 ${identity.backedUp ? 'border-forest-600/30' : 'border-warning-700'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${identity.backedUp ? 'bg-forest-400' : 'bg-warning-500 animate-pulse'}`} />
          <span className={`text-sm font-semibold ${identity.backedUp ? 'text-forest-300' : 'text-warning-400'}`}>
            {identity.backedUp ? 'Identity backed up' : 'Not backed up — do this now'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {identity.backedUp
            ? 'You have a backup QR code for this identity.'
            : 'Without a backup, losing your phone means losing your tribe access forever.'}
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button className="btn-primary w-full" onClick={() => setView('backup')}>
          {identity.backedUp ? 'View Backup QR Code' : '⚠ Back Up Now'}
        </button>
        <button className="btn-secondary w-full" onClick={() => setView('restore')}>
          Restore from QR Code
        </button>
      </div>

      <p className="text-xs text-gray-600 text-center mt-6">
        Created {new Date(identity.createdAt).toLocaleDateString()}
      </p>
    </div>
  )
}
