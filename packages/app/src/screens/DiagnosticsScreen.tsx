import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { closeDB } from '../lib/db'

const isDev = import.meta.env.DEV

interface DiagResult {
  label: string
  value: string
  ok: boolean
}

export default function DiagnosticsScreen() {
  const [results, setResults] = useState<DiagResult[]>([])
  const [resetting, setResetting] = useState(false)

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

    // IndexedDB
    out.push({
      label: 'IndexedDB',
      value: typeof indexedDB !== 'undefined' ? 'available' : 'MISSING',
      ok: typeof indexedDB !== 'undefined',
    })

    // MediaRecorder + MIME types
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined'
    out.push({
      label: 'MediaRecorder',
      value: hasMediaRecorder ? 'available' : 'MISSING',
      ok: hasMediaRecorder,
    })

    if (hasMediaRecorder) {
      const mimeTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/ogg',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac',
      ]
      for (const t of mimeTypes) {
        const supported = MediaRecorder.isTypeSupported(t)
        out.push({ label: `  ${t}`, value: supported ? 'supported' : 'not supported', ok: supported })
      }
    }

    // getUserMedia
    out.push({
      label: 'getUserMedia',
      value: typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'available' : 'MISSING',
      ok: typeof navigator.mediaDevices?.getUserMedia === 'function',
    })

    // Crypto (SEA keypairs)
    out.push({
      label: 'WebCrypto',
      value: typeof crypto?.subtle !== 'undefined' ? 'available' : 'MISSING',
      ok: typeof crypto?.subtle !== 'undefined',
    })

    setResults(out)
  }, [])

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/" className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← Home
      </Link>
      <h2 className="text-xl font-bold text-gray-100 mb-6">Diagnostics</h2>

      {isDev && (
        <button
          onClick={resetAllData}
          disabled={resetting}
          className="w-full mb-6 py-2 px-4 rounded bg-danger-600 hover:bg-danger-500 disabled:opacity-50 text-white text-sm font-semibold"
        >
          {resetting ? 'Wiping data…' : 'Reset All Data (dev only)'}
        </button>
      )}

      <div className="space-y-1 font-mono text-xs">
        {results.map((r, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={r.ok ? 'text-forest-400' : 'text-danger-400'}>{r.ok ? '✓' : '✗'}</span>
            <span className="text-gray-400 min-w-[200px] flex-shrink-0">{r.label}</span>
            <span className={r.ok ? 'text-gray-300' : 'text-danger-300'} style={{ wordBreak: 'break-all' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
