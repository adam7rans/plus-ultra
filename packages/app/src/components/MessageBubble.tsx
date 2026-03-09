import { useState } from 'react'
import type { Message } from '@plus-ultra/core'

interface Props {
  message: Message
  isMe: boolean
  senderName: string
  // For DMs: decrypted content is passed in
  decryptedContent?: string
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function AudioPlayer({ base64, mimeType }: { base64: string; mimeType: string }) {
  const [playing, setPlaying] = useState(false)
  const [audio] = useState(() => {
    const a = new Audio(`data:${mimeType};base64,${base64}`)
    a.onended = () => setPlaying(false)
    return a
  })

  function toggle() {
    if (playing) {
      audio.pause()
      audio.currentTime = 0
      setPlaying(false)
    } else {
      void audio.play()
      setPlaying(true)
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 bg-forest-800 hover:bg-forest-700 rounded-lg px-3 py-2 transition-colors"
    >
      <span className="text-lg">{playing ? '⏹' : '▶'}</span>
      <span className="text-xs text-forest-300">Voice message</span>
    </button>
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

export default function MessageBubble({ message, isMe, senderName, decryptedContent }: Props) {
  const content = decryptedContent ?? message.content

  return (
    <div className={`flex flex-col mb-3 ${isMe ? 'items-end' : 'items-start'}`}>
      {!isMe && (
        <span className="text-xs text-gray-500 mb-1 ml-1">{senderName}</span>
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
      <span className={`text-xs text-gray-600 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
        {formatTime(message.sentAt)}
      </span>
    </div>
  )
}
