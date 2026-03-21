import { useState, useEffect, useCallback } from 'react'
import { useViewer } from './ViewerContext'
import { injectIDBData, BASE_TRIBE_RECORDS } from './utils/idbInject'

export default function ConfigBar() {
  const { appUrl, setAppUrl, tribeId, setTribeId, showToast } = useViewer()
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [latency, setLatency] = useState<number | null>(null)

  const check = useCallback(() => {
    const start = Date.now()
    const img = new Image()
    img.onload = () => { setStatus('online'); setLatency(Date.now() - start) }
    img.onerror = () => { setStatus('offline'); setLatency(null) }
    img.src = `${appUrl.replace(/\/$/, '')}/favicon.ico?${Date.now()}`
  }, [appUrl])

  useEffect(() => {
    check()
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [check])

  const handleSeedBase = () => {
    if (!tribeId) { showToast('Set a Tribe ID first', true); return }
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[id^="iframe-"]')
    if (!iframe) { showToast('Select a flow first', true); return }
    localStorage.setItem('plusultra:dummyPub', 'dummy_self_pub_key_abc123')
    injectIDBData(iframe, BASE_TRIBE_RECORDS, tribeId, showToast)
  }

  const statusColor = status === 'online' ? 'bg-zinc-300' : 'bg-zinc-600'
  const statusText =
    status === 'online' ? `online (${latency}ms)`
    : status === 'offline' ? 'server not reachable'
    : 'checking...'

  return (
    <div className="h-[52px] bg-zinc-900 border-b border-zinc-800 flex items-center gap-3 px-4 flex-shrink-0 font-mono text-[12px]">
      <span className="font-bold text-zinc-200 tracking-wider">PLUS ULTRA</span>
      <span className="text-zinc-700">|</span>
      <label className="text-[11px] text-zinc-500">App URL</label>
      <input
        className="bg-zinc-800 border border-zinc-700 text-zinc-200 px-2 py-1 rounded text-[12px] w-[190px] outline-none focus:border-zinc-500"
        value={appUrl}
        onChange={e => setAppUrl(e.target.value)}
        placeholder="http://localhost:5175"
      />
      <span className="text-zinc-700">|</span>
      <label className="text-[11px] text-zinc-500">Tribe ID</label>
      <input
        className="bg-zinc-800 border border-zinc-700 text-zinc-200 px-2 py-1 rounded text-[12px] w-[220px] outline-none focus:border-zinc-500"
        value={tribeId}
        onChange={e => setTribeId(e.target.value)}
        placeholder="Paste tribeId after creating a tribe"
      />
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
      <span className="text-[11px] text-zinc-500">{statusText}</span>
      <span className="text-zinc-700">|</span>
      <button
        onClick={handleSeedBase}
        className="px-2.5 py-1 text-[11px] bg-green-950 border border-green-800 text-green-400 rounded hover:bg-green-900 whitespace-nowrap"
      >
        ⬡ Seed Base
      </button>
    </div>
  )
}
