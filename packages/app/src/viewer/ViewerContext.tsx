import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react'

interface ViewerContextValue {
  appUrl: string
  setAppUrl: (url: string) => void
  tribeId: string
  setTribeId: (id: string) => void
  frameScale: number
  setFrameScale: (s: number) => void
  toast: string
  showToast: (msg: string, isError?: boolean) => void
}

const ViewerContext = createContext<ViewerContextValue | null>(null)

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [appUrl, setAppUrlRaw] = useState(
    () => localStorage.getItem('pu:appUrl') || window.location.origin,
  )
  const [tribeId, setTribeIdRaw] = useState(
    () => localStorage.getItem('pu:tribeId') || '',
  )
  const [frameScale, setFrameScaleRaw] = useState(
    () => parseFloat(localStorage.getItem('pu:frameScale') || '0.55'),
  )
  const [toast, setToast] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setAppUrl = useCallback((url: string) => {
    const clean = url.trim().replace(/\/$/, '')
    setAppUrlRaw(clean)
    localStorage.setItem('pu:appUrl', clean)
  }, [])

  const setTribeId = useCallback((id: string) => {
    const clean = id.trim()
    setTribeIdRaw(clean)
    localStorage.setItem('pu:tribeId', clean)
  }, [])

  const setFrameScale = useCallback((s: number) => {
    const clamped = Math.round(Math.min(1.0, Math.max(0.3, s)) * 100) / 100
    setFrameScaleRaw(clamped)
    localStorage.setItem('pu:frameScale', String(clamped))
  }, [])

  const showToast = useCallback((msg: string, _isError?: boolean) => {
    setToast(msg)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(''), 3000)
  }, [])

  return (
    <ViewerContext.Provider value={{ appUrl, setAppUrl, tribeId, setTribeId, frameScale, setFrameScale, toast, showToast }}>
      {children}
    </ViewerContext.Provider>
  )
}

export function useViewer() {
  const ctx = useContext(ViewerContext)
  if (!ctx) throw new Error('useViewer must be inside ViewerProvider')
  return ctx
}
