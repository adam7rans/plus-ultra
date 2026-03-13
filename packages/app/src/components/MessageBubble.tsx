import { useEffect, useRef, useState } from 'react'
import type { Message } from '@plus-ultra/core'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '⚠️', '✅']

interface Props {
  message: Message
  isMe: boolean
  senderName: string
  // For DMs: decrypted content is passed in
  decryptedContent?: string
  // Reply context
  replyToContent?: string
  replyToSenderName?: string
  // Interaction callbacks
  onReact?: (emoji: string) => void
  onReply?: () => void
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function AudioPlayer({ base64, mimeType }: { base64: string; mimeType: string }) {
  const [decodeError, setDecodeError] = useState<string | null>(null)
  const [srcUrl, setSrcUrl] = useState<string | null>(null)

  useEffect(() => {
    // Detect decryption failure before attempting base64 decode
    if (!base64 || base64.startsWith('[') || base64.startsWith('SEA{')) {
      setDecodeError('Voice message not yet available')
      return
    }
    // Strip whitespace — FileReader.readAsDataURL can embed newlines in long base64 strings
    const clean = base64.replace(/\s+/g, '')
    try {
      atob(clean.slice(0, 16))  // cheap validity check on first few chars
    } catch {
      setDecodeError(`Invalid audio data (${clean.slice(0, 8)}…)`)
      return
    }
    setSrcUrl(`data:${mimeType};base64,${clean}`)
  }, [base64, mimeType])

  if (decodeError) {
    return <span className="text-xs text-red-400">{decodeError}</span>
  }

  if (!srcUrl) return null

  return (
    <audio
      controls
      src={srcUrl}
      className="max-w-[220px] h-8"
      onError={() => setDecodeError(`Format not supported (${mimeType})`)}
    />
  )
}

function PhotoMessage({ base64 }: { base64: string }) {
  const [expanded, setExpanded] = useState(false)
  const src = `data:image/jpeg;base64,${base64}`

  if (expanded) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setExpanded(false)}>
        <img src={src} className="max-w-full max-h-full object-contain" alt="Photo" />
      </div>
    )
  }

  return (
    <img
      src={src}
      className="max-w-[200px] rounded-lg cursor-pointer"
      onClick={() => setExpanded(true)}
      alt="Photo"
    />
  )
}

export default function MessageBubble({
  message, isMe, senderName, decryptedContent,
  replyToContent, replyToSenderName,
  onReact, onReply,
}: Props) {
  const content = decryptedContent ?? message.content
  const [showPicker, setShowPicker] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Long press to show reaction picker
  function startLongPress() {
    longPressTimer.current = setTimeout(() => setShowPicker(true), 500)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Dismiss picker on outside click
  useEffect(() => {
    if (!showPicker) return
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [showPicker])

  function handleReact(emoji: string) {
    onReact?.(emoji)
    setShowPicker(false)
  }

  function handleReply() {
    onReply?.()
    setShowPicker(false)
  }

  // Aggregate reactions for display: {emoji: count, myReaction: bool}
  const reactions = message.reactions
  const hasReactions = reactions && Object.keys(reactions).some(e => reactions[e].length > 0)

  return (
    <div className={`flex flex-col mb-3 ${isMe ? 'items-end' : 'items-start'}`}>
      {!isMe && (
        <span className="text-xs text-gray-500 mb-1 ml-1">{senderName}</span>
      )}

      <div className="relative">
        {/* Long-press target wrapping the bubble */}
        <div
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          className="select-none"
        >
          {/* Reply quote */}
          {replyToContent !== undefined && (
            <div className={`mb-1 px-2 py-1 rounded text-xs border-l-2 border-forest-500 bg-forest-900/60 max-w-[75vw] truncate ${isMe ? 'mr-0' : 'ml-0'}`}>
              <span className="text-forest-400 font-medium mr-1">{replyToSenderName ?? 'Unknown'}</span>
              <span className="text-gray-400">{replyToContent}</span>
            </div>
          )}

          <div
            className={`max-w-[75%] rounded-2xl px-3 py-2 ${
              isMe
                ? 'bg-forest-700 text-white rounded-br-sm'
                : 'bg-forest-900 border border-forest-800 text-gray-100 rounded-bl-sm'
            }`}
          >
            {message.type === 'text' && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>
            )}
            {message.type === 'voice' && (
              <AudioPlayer base64={content} mimeType={message.mimeType ?? 'audio/webm'} />
            )}
            {message.type === 'photo' && (
              <PhotoMessage base64={content} />
            )}
          </div>
        </div>

        {/* Reaction picker (appears on long press) */}
        {showPicker && (
          <div
            ref={pickerRef}
            className={`absolute z-20 flex items-center gap-1 bg-forest-800 border border-forest-700 rounded-full px-2 py-1.5 shadow-lg -top-10 ${isMe ? 'right-0' : 'left-0'}`}
          >
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                className="text-base hover:scale-125 transition-transform"
                onClick={() => handleReact(emoji)}
              >
                {emoji}
              </button>
            ))}
            {onReply && (
              <button
                className="text-sm text-forest-400 hover:text-forest-300 ml-1 pl-1 border-l border-forest-700"
                onClick={handleReply}
                title="Reply"
              >
                ↩
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reaction bar */}
      {hasReactions && (
        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
          {Object.entries(reactions!).map(([emoji, pubkeys]) => {
            if (pubkeys.length === 0) return null
            return (
              <button
                key={emoji}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-forest-900 border border-forest-800 hover:border-forest-600 transition-colors"
                onClick={() => onReact?.(emoji)}
                title={`${pubkeys.length} reaction${pubkeys.length !== 1 ? 's' : ''}`}
              >
                <span>{emoji}</span>
                <span className="text-gray-400">{pubkeys.length}</span>
              </button>
            )
          })}
        </div>
      )}

      <span className={`text-xs text-gray-600 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
        {formatTime(message.sentAt)}
      </span>
    </div>
  )
}
