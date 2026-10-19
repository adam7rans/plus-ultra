import { useEffect, useRef, useState } from 'react'
import type { Message } from '@plus-ultra/core'
import AppIcon from './AppIcon'

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
  syncStatus?: 'pending'
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
      className="block w-full h-8 min-w-0"
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
      className="block w-full h-auto rounded-xl cursor-pointer"
      onClick={() => setExpanded(true)}
      alt="Photo"
    />
  )
}

function VideoMessage({ base64, mimeType }: { base64: string; mimeType: string }) {
  const [failed, setFailed] = useState(false)
  if (!base64 || base64.startsWith('[') || base64.startsWith('SEA{')) {
    return <span className="text-xs text-red-400">Video not yet available</span>
  }
  const clean = base64.replace(/\s+/g, '')
  return (
    <div className="w-[220px] max-w-full">
      {failed ? (
        <span className="text-xs text-red-400">Format not supported ({mimeType})</span>
      ) : (
        <video
          controls
          playsInline
          preload="metadata"
          className="block w-full h-auto rounded-xl"
          src={`data:${mimeType};base64,${clean}`}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

export default function MessageBubble({
  message, isMe, senderName, decryptedContent,
  replyToContent, replyToSenderName,
  onReact, onReply, syncStatus,
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

      {/* min-w-0 + max-w-full: the nowrap reply quote has huge min-content
          that would otherwise size this flex item past the screen width. */}
      <div className="relative min-w-0 max-w-full">
        {/* Long-press target: reply quote + bubble share one width-capped
            box, so the quote can never stick out past the message below it. */}
        <div
            onMouseDown={startLongPress}
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
            className={`flex flex-col select-none ${isMe ? 'items-end' : 'items-start'}`}
          >
            <div className="max-w-[75%] min-w-0">
              {replyToContent !== undefined && (
                <div className="mb-1 px-2 py-1 rounded-lg text-xs bg-black/25 border-l-2 border-forest-500 truncate">
                  <span className="text-forest-400 font-medium mr-1">{replyToSenderName ?? 'Unknown'}</span>
                  <span className="text-gray-400">{replyToContent}</span>
                </div>
              )}

              <div
                className={`rounded-2xl ${
                  message.type === 'text'
                    ? 'px-3 py-2'
                    : 'p-1.5 overflow-hidden'
                } ${
                  isMe
                    ? 'bg-forest-700 text-white rounded-br-sm'
                    : 'bg-forest-900 border border-forest-800 text-gray-100 rounded-bl-sm'
                }`}
              >
                {message.type === 'text' && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>
                )}
                {message.type === 'voice' && (
                  <div className="w-[200px] max-w-full">
                    <AudioPlayer base64={content} mimeType={message.mimeType ?? 'audio/webm'} />
                  </div>
                )}
                {message.type === 'photo' && (
                  <PhotoMessage base64={content} />
                )}
                {message.type === 'video' && (
                  <VideoMessage base64={content} mimeType={message.mimeType ?? 'video/webm'} />
                )}
              </div>
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
                <AppIcon name="reply" size={16} />
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

      <span className={`flex items-center gap-1 text-xs text-gray-600 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
        {formatTime(message.sentAt)}
        {syncStatus === 'pending' && (
          <span className="text-gray-400 inline-flex" title="Pending relay sync"><AppIcon name="clock" size={14} /></span>
        )}
      </span>
    </div>
  )
}
