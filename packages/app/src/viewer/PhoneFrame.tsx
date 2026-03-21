import { useRef, useCallback, useEffect } from 'react'
import { useViewer } from './ViewerContext'
import { injectIDBData } from './utils/idbInject'
import { prefillFormFields } from './utils/prefill'
import type { IDBRecord, PrefillField } from './types'

const PHONE_W = 215
const PHONE_H = 464
const IFRAME_W = 390
const IFRAME_H = 844
const SCALE = PHONE_W / IFRAME_W

interface Props {
  iframeId: string
  route: string
  injectIDB?: IDBRecord[]
  prefillForm?: PrefillField[]
  gridDown?: boolean
  gridDownKey?: string
  gridDownValue?: () => string | number
}

export default function PhoneFrame({
  iframeId, route, injectIDB, prefillForm, gridDown, gridDownKey, gridDownValue,
}: Props) {
  const { appUrl, tribeId, showToast } = useViewer()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // tracks whether IDB injection has already fired for the current src
  const injectedRef = useRef(false)
  const prevSrcRef = useRef('')

  const selfPub = localStorage.getItem('plusultra:dummyPub') || 'dummy_self_pub_key_abc123'
  const resolved = route
    .replace(/\{TRIBE\}/g, tribeId || 'DEMO_TRIBE')
    .replace(/\{SELF_PUB\}/g, selfPub)
  const src = `${appUrl.replace(/\/$/, '')}${resolved}`

  // Reset injection flag whenever src changes (new flow step or tribe id update)
  if (prevSrcRef.current !== src) {
    prevSrcRef.current = src
    injectedRef.current = false
  }

  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    if (injectIDB && !injectedRef.current) {
      // First load: inject data then let it reload
      injectedRef.current = true
      injectIDBData(iframe, injectIDB, tribeId, showToast)
    } else if (prefillForm) {
      // After reload (or on first load if no IDB injection): prefill forms
      prefillFormFields(iframe, prefillForm, showToast)
    }
  }, [injectIDB, prefillForm, tribeId, showToast])

  // Attach load handler
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [handleLoad])

  const reset = useCallback(() => {
    if (!iframeRef.current) return
    injectedRef.current = false
    iframeRef.current.src = src
  }, [src])

  const handleSeed = useCallback(() => {
    if (!iframeRef.current || !injectIDB) return
    injectedRef.current = true
    injectIDBData(iframeRef.current, injectIDB, tribeId, showToast)
  }, [injectIDB, tribeId, showToast])

  const handlePrefill = useCallback(() => {
    if (!iframeRef.current || !prefillForm) return
    prefillFormFields(iframeRef.current, prefillForm, showToast)
  }, [prefillForm, showToast])

  const handleGridDown = useCallback(() => {
    if (!iframeRef.current || !gridDownKey || !gridDownValue) return
    try {
      iframeRef.current.contentWindow?.localStorage.setItem(gridDownKey, String(gridDownValue()))
      iframeRef.current.contentWindow?.location.reload()
      showToast(`Injected: ${gridDownKey}`)
    } catch {
      showToast('Injection failed — same origin required', true)
    }
  }, [gridDownKey, gridDownValue, showToast])

  return (
    <div>
      <div
        className="overflow-hidden rounded-[28px] border-2 border-zinc-700 bg-black shadow-2xl"
        style={{ width: PHONE_W, height: PHONE_H }}
      >
        <iframe
          id={iframeId}
          ref={iframeRef}
          src={src}
          loading="lazy"
          title={iframeId}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          style={{
            width: IFRAME_W,
            height: IFRAME_H,
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            border: 'none',
            display: 'block',
          }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 items-center">
        <button
          onClick={reset}
          className="px-2 py-0.5 text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-400 rounded hover:text-zinc-200 hover:bg-zinc-700"
        >
          ↺ reset
        </button>
        <span className="text-[10px] text-zinc-600">390×844 · 0.55×</span>
        {injectIDB && (
          <button
            onClick={handleSeed}
            className="px-2 py-0.5 text-[11px] bg-yellow-950 border border-yellow-800 text-yellow-400 rounded hover:bg-yellow-900"
          >
            ⬡ Seed Data
          </button>
        )}
        {prefillForm && (
          <button
            onClick={handlePrefill}
            className="px-2 py-0.5 text-[11px] bg-blue-950 border border-blue-800 text-blue-400 rounded hover:bg-blue-900"
          >
            ✏ Pre-fill
          </button>
        )}
        {gridDown && (
          <button
            onClick={handleGridDown}
            className="px-2 py-0.5 text-[11px] bg-amber-950 border border-amber-800 text-amber-400 rounded hover:bg-amber-900"
          >
            ⚡ Inject Offline
          </button>
        )}
      </div>
    </div>
  )
}
