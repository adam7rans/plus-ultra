import { useState, useRef, useEffect } from 'react'
import { createVoiceRecorder, compressPhoto } from '../lib/media'

interface Props {
  onSendText: (text: string) => Promise<void>
  onSendVoice: (base64: string, mimeType: string) => Promise<void>
  onSendPhoto: (base64: string, mimeType: string) => Promise<void>
  disabled?: boolean
}

export default function MessageInput({ onSendText, onSendVoice, onSendPhoto, disabled }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<ReturnType<typeof createVoiceRecorder> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  async function handleSendText() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await onSendText(text.trim())
      setText('')
    } finally {
      setSending(false)
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      await handleSendText()
    }
  }

  async function startRecording() {
    const recorder = createVoiceRecorder(async (base64, mimeType) => {
      setRecording(false)
      setRecordingSeconds(0)
      if (timerRef.current) clearInterval(timerRef.current)
      setSending(true)
      try {
        await onSendVoice(base64, mimeType)
      } finally {
        setSending(false)
      }
    })

    const started = await recorder.start()
    if (started) {
      recorderRef.current = recorder
      setRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => {
          if (s >= 29) {
            stopRecording()
            return s
          }
          return s + 1
        })
      }, 1000)
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  async function handlePhotoSelected(file: File) {
    setSending(true)
    try {
      const { base64, mimeType } = await compressPhoto(file)
      await onSendPhoto(base64, mimeType)
    } finally {
      setSending(false)
    }
  }

  if (recording) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-t border-forest-800 bg-forest-950">
        <div className="flex-1 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-danger-400 rounded-full animate-pulse" />
          <span className="text-danger-400 text-sm font-mono">
            Recording {recordingSeconds}s / 30s
          </span>
        </div>
        <button
          onClick={stopRecording}
          className="bg-danger-700 hover:bg-danger-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Stop &amp; Send
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 px-3 py-3 border-t border-forest-800 bg-forest-950">
      {/* Photo */}
      <button
        className="text-gray-500 hover:text-forest-400 p-2 flex-shrink-0 transition-colors"
        onClick={() => fileRef.current?.click()}
        disabled={disabled || sending}
        title="Send photo"
      >
        <span className="text-xl">📷</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) void handlePhotoSelected(file)
          e.target.value = ''
        }}
      />

      {/* Text input */}
      <textarea
        className="flex-1 input resize-none text-sm py-2 max-h-24"
        rows={1}
        placeholder="Message tribe..."
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => void handleKeyDown(e)}
        disabled={disabled || sending}
      />

      {/* Voice or Send */}
      {text.trim() ? (
        <button
          className="bg-forest-500 hover:bg-forest-400 text-white p-2 rounded-lg flex-shrink-0 transition-colors active:scale-95"
          onClick={() => void handleSendText()}
          disabled={sending}
        >
          <span className="text-lg">↑</span>
        </button>
      ) : (
        <button
          className="text-gray-500 hover:text-forest-400 p-2 flex-shrink-0 transition-colors active:scale-95"
          onMouseDown={() => void startRecording()}
          onTouchStart={() => void startRecording()}
          disabled={disabled || sending}
          title="Hold to record voice"
        >
          <span className="text-xl">🎙</span>
        </button>
      )}
    </div>
  )
}
