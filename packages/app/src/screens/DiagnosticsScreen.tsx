import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { seedDemoTribe } from '../lib/demo-seed'
import { closeDB } from '../lib/platform/storage'
import { hasMediaRecorder, hasGetUserMedia, isAudioMimeSupported } from '../lib/platform/media'
import { getPlatform, getMeshCapabilities } from '../lib/platform'
import { getQueueStats } from '../lib/messaging'
import AppIcon from '../components/AppIcon'
import { AppButton } from '../components/ui'

const isDev = import.meta.env.DEV

interface DiagResult {
  label: string
  value: string
  ok: boolean
}

export default function DiagnosticsScreen() {
  const [results, setResults] = useState<DiagResult[]>([])
  const [resetting, setResetting] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedStatus, setSeedStatus] = useState<string | null>(null)
  const { identity } = useIdentity()
  const navigate = useNavigate()

  async function handleSeedDemo() {
    if (!identity) return
    if (!window.confirm('Load the Pinecrest demo tribe (25 members, seeded chats)? Your current data stays untouched.')) return
    setSeeding(true)
    setSeedStatus('Starting…')
    try {
      const result = await seedDemoTribe(identity, { onProgress: setSeedStatus })
      setSeedStatus(`Seeded ${result.memberCount} members, ${result.messageCount} messages`)
      // Same event create/join flows dispatch — refreshes the home tribe list
      // so Pinecrest appears in My Tribes instead of being reachable only
      // via the auto-navigation below.
      window.dispatchEvent(new Event('tribe-joined'))
      await navigate({ to: '/tribe/$tribeId', params: { tribeId: result.tribeId } })
    } catch (err) {
      setSeedStatus(`Seed failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSeeding(false)
    }
  }

  function resetAllData() {
    setResetting(true)
    closeDB() // release our connection so delete isn't blocked
    const req = indexedDB.deleteDatabase('plus-ultra')
    req.onsuccess = () => window.location.reload()
    req.onerror = () => setResetting(false)
    req.onblocked = () => {
      // Another connection still open — wait a tick and reload anyway
      setTimeout(() => window.location.reload(), 500)
    }
  }

  useEffect(() => {
    const out: DiagResult[] = []

    // Platform
    out.push({ label: 'User-Agent', value: navigator.userAgent, ok: true })
    out.push({ label: 'Online', value: String(navigator.onLine), ok: navigator.onLine })
    out.push({ label: 'App Platform', value: getPlatform(), ok: true })
    out.push({ label: 'Mesh', value: getMeshCapabilities().note, ok: true })

    // IndexedDB
    out.push({
      label: 'IndexedDB',
      value: typeof indexedDB !== 'undefined' ? 'available' : 'MISSING',
      ok: typeof indexedDB !== 'undefined',
    })

    // MediaRecorder + MIME types
    const hasRecorder = hasMediaRecorder()
    out.push({
      label: 'MediaRecorder',
      value: hasRecorder ? 'available' : 'MISSING',
      ok: hasRecorder,
    })

    if (hasRecorder) {
      const mimeTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/ogg',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac',
      ]
      for (const t of mimeTypes) {
        const supported = isAudioMimeSupported(t)
        out.push({ label: `  ${t}`, value: supported ? 'supported' : 'not supported', ok: supported })
      }
    }

    // getUserMedia
    const hasGum = hasGetUserMedia()
    out.push({
      label: 'getUserMedia',
      value: hasGum ? 'available' : 'MISSING',
      ok: hasGum,
    })

    // Crypto (SEA keypairs)
    out.push({
      label: 'WebCrypto',
      value: typeof crypto?.subtle !== 'undefined' ? 'available' : 'MISSING',
      ok: typeof crypto?.subtle !== 'undefined',
    })

    // Message queue
    getQueueStats().then(({ pending, maxAttempts }) => {
      setResults(prev => [...prev, {
        label: 'Message Queue',
        value: pending === 0 ? 'empty' : `${pending} pending (max ${maxAttempts} attempts)`,
        ok: pending === 0,
      }])
    })

    setResults(out)
  }, [])

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/" className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← Home
      </Link>
      <h2 className="text-xl font-bold text-gray-100 mb-6">Diagnostics</h2>

      <Link to="/design-system" className="block mb-6">
        <AppButton variant="secondary" fullWidth className="text-sm">
          Open Design System gallery
        </AppButton>
      </Link>

      {isDev && (
        <AppButton
          variant="danger"
          fullWidth
          className="mb-6 text-sm"
          onClick={resetAllData}
          disabled={resetting}
        >
          {resetting ? 'Wiping data…' : 'Reset All Data (dev only)'}
        </AppButton>
      )}

      <AppButton
        fullWidth
        className="mb-2 text-sm"
        onClick={() => void handleSeedDemo()}
        disabled={seeding || !identity}
      >
        {seeding ? 'Seeding demo tribe…' : 'Load Demo Tribe (25 members)'}
      </AppButton>
      {seedStatus && (
        <p className="text-xs text-gray-400 font-mono mb-6" style={{ wordBreak: 'break-all' }}>
          {seedStatus}
        </p>
      )}

      <div className="space-y-1 font-mono text-xs">
        {results.map((r, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={r.ok ? 'text-forest-400' : 'text-danger-400'}>{r.ok ? <AppIcon name="check" size={16} /> : <AppIcon name="close" size={16} />}</span>
            <span className="text-gray-400 min-w-[200px] flex-shrink-0">{r.label}</span>
            <span className={r.ok ? 'text-gray-300' : 'text-danger-300'} style={{ wordBreak: 'break-all' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
