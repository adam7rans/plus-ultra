import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useTribeChannel } from '../hooks/useChannel'
import { sendTribeMessage, queueMessage, flushQueue, addTribeReaction, markChannelRead } from '../lib/messaging'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useTribe } from '../contexts/TribeContext'
import { fetchTribeMeta } from '../lib/tribes'
import MessageBubble from '../components/MessageBubble'
import MessageInput from '../components/MessageInput'
import type { Message, Tribe } from '@plus-ultra/core'
import { nanoid } from 'nanoid'

export default function TribeChannelScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/channel' })
  const { identity } = useIdentity()
  const { members } = useTribe()
  const online = useOnlineStatus()
  const { messages, loading } = useTribeChannel(tribeId)
  const [tribe, setTribe] = useState<Tribe | null>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTribeMeta(tribeId).then(setTribe)
  }, [tribeId])

  // Drain queued messages on mount (if online) and whenever we come back online
  useEffect(() => {
    if (online) void flushQueue()
  }, [online])

  useEffect(() => {
    function handleOnline() { void flushQueue() }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  // Auto-scroll to bottom on new messages + mark as read
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    void markChannelRead('tribe-wide')
  }, [messages.length])

  function getMemberName(pubkey: string): string {
    const member = members.find(m => m.pubkey === pubkey)
    return member?.displayName ?? pubkey.slice(0, 8)
  }

  async function handleSendText(text: string) {
    if (!identity) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    if (online) {
      await sendTribeMessage(tribeId, identity.pub, pair, 'text', text, undefined, replyingTo?.id)
    } else {
      await queueMessage({
        id: nanoid(), tribeId, channelId: 'tribe-wide',
        senderId: identity.pub, type: 'text', content: text,
        sentAt: Date.now(), sig: '',
        ...(replyingTo ? { replyTo: replyingTo.id } : {}),
      })
    }
    setReplyingTo(null)
  }

  async function handleSendVoice(base64: string, mimeType: string) {
    if (!identity) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    await sendTribeMessage(tribeId, identity.pub, pair, 'voice', base64, mimeType)
    setReplyingTo(null)
  }

  async function handleSendPhoto(base64: string, mimeType: string) {
    if (!identity) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    await sendTribeMessage(tribeId, identity.pub, pair, 'photo', base64, mimeType)
    setReplyingTo(null)
  }

  async function handleReact(msg: Message, emoji: string) {
    if (!identity) return
    await addTribeReaction(tribeId, msg.id, emoji, identity.pub)
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
            {messages.map(msg => {
              const replySource = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : undefined
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMe={msg.senderId === identity?.pub}
                  senderName={getMemberName(msg.senderId)}
                  replyToContent={replySource ? (replySource.type === 'text' ? replySource.content : `[${replySource.type}]`) : undefined}
                  replyToSenderName={replySource ? getMemberName(replySource.senderId) : undefined}
                  onReact={(emoji) => handleReact(msg, emoji)}
                  onReply={() => setReplyingTo(msg)}
                />
              )
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-forest-900 border-t border-forest-800 flex-shrink-0">
          <span className="text-xs text-forest-400">↩</span>
          <span className="text-xs text-gray-400 truncate flex-1">
            {getMemberName(replyingTo.senderId)}: {replyingTo.type === 'text' ? replyingTo.content : `[${replyingTo.type}]`}
          </span>
          <button className="text-gray-500 text-xs hover:text-gray-300" onClick={() => setReplyingTo(null)}>
            ✕
          </button>
        </div>
      )}

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
