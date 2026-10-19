import { useState, useRef, useEffect } from 'react'
import { createVoiceRecorder, compressPhoto, pickNativePhoto } from '../lib/platform/media'
import { isNative } from '../lib/platform/types'
import AppButton from './ui/AppButton'
import { AppTextarea } from './ui/AppField'

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

  async function handlePhotoButton() {
    // Native shell: system photo picker. Web: file input (unchanged).
    if (isNative()) {
      const picked = await pickNativePhoto()
      if (!picked) return
      setSending(true)
      try {
        await onSendPhoto(picked.base64, picked.mimeType)
      } finally {
        setSending(false)
      }
      return
    }
    fileRef.current?.click()
  }

  if (recording) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 pb-safe border-t border-forest-800 bg-forest-950">
        <div className="flex-1 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-danger-400 rounded-full animate-pulse" />
          <span className="text-danger-400 text-sm font-mono">
            Recording {recordingSeconds}s / 30s
          </span>
        </div>
        <AppButton
          variant="danger"
          size="sm"
          onClick={stopRecording}
        >
          Stop &amp; Send
        </AppButton>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 px-3 py-3 pb-safe border-t border-forest-800 bg-forest-950">
      {/* Photo */}
      <AppButton
        variant="icon"
        icon="camera"
        iconSize={20}
        onClick={() => void handlePhotoButton()}
        disabled={disabled || sending}
        title="Send photo"
      />
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
      <AppTextarea
        className="flex-1 resize-none text-sm py-2 max-h-24"
        rows={1}
        placeholder="Message tribe..."
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => void handleKeyDown(e)}
        disabled={disabled || sending}
      />

      {/* Voice or Send */}
      {text.trim() ? (
        <AppButton
          variant="icon"
          icon="send"
          iconSize={20}
          onClick={() => void handleSendText()}
          disabled={sending}
          aria-label="Send"
          className="!bg-accent-500 hover:!bg-accent-400 !text-white"
        />
      ) : (
        <AppButton
          variant="icon"
          icon="mic"
          iconSize={20}
          onMouseDown={() => void startRecording()}
          onTouchStart={() => void startRecording()}
          disabled={disabled || sending}
          title="Hold to record voice"
        />
      )}
    </div>
  )
}
