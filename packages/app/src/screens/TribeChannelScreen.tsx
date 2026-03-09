import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useTribeChannel } from '../hooks/useChannel'
import { sendTribeMessage, queueMessage } from '../lib/messaging'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useTribe } from '../contexts/TribeContext'
import { fetchTribeMeta } from '../lib/tribes'
import MessageBubble from '../components/MessageBubble'
import MessageInput from '../components/MessageInput'
import type { Tribe } from '@plus-ultra/core'
import { nanoid } from 'nanoid'

export default function TribeChannelScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/channel' })
  const { identity } = useIdentity()
  const { members } = useTribe()
  const online = useOnlineStatus()
  const { messages, loading } = useTribeChannel(tribeId)
  const [tribe, setTribe] = useState<Tribe | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTribeMeta(tribeId).then(setTribe)
  }, [tribeId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function getMemberName(pubkey: string): string {
    const member = members.find(m => m.pubkey === pubkey)
    return member?.displayName ?? pubkey.slice(0, 8)
  }

  async function handleSendText(text: string) {
    if (!identity) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    if (online) {
      await sendTribeMessage(tribeId, identity.pub, pair, 'text', text)
    } else {
      // Queue for later
      await queueMessage({
        id: nanoid(), tribeId, channelId: 'tribe-wide',
        senderId: identity.pub, type: 'text', content: text,
        sentAt: Date.now(), sig: '',
      })
    }
  }

  async function handleSendVoice(base64: string, mimeType: string) {
    if (!identity) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    await sendTribeMessage(tribeId, identity.pub, pair, 'voice', base64, mimeType)
  }

  async function handleSendPhoto(base64: string, mimeType: string) {
    if (!identity) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    await sendTribeMessage(tribeId, identity.pub, pair, 'photo', base64, mimeType)
  }

  return (
    <div className="flex flex-col h-screen bg-forest-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-forest-800 bg-forest-900 flex-shrink-0">
        <Link to="/tribe/$tribeId" params={{ tribeId }} className="text-forest-400 hover:text-forest-300">
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-100 truncate">
            {tribe?.name ?? 'Tribe Channel'}
          </div>
          <div className="text-xs text-gray-500">
            {online ? `${members.length} members` : '⚡ Offline — messages queued'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-forest-400 text-sm animate-pulse">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">📡</div>
            <p className="text-gray-400 text-sm font-medium">No messages yet</p>
            <p className="text-gray-600 text-xs mt-1">Be the first to say something</p>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMe={msg.senderId === identity?.pub}
                senderName={getMemberName(msg.senderId)}
              />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendText={handleSendText}
          onSendVoice={handleSendVoice}
          onSendPhoto={handleSendPhoto}
        />
      </div>
    </div>
  )
}
