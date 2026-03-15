import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useDMChannel } from '../hooks/useChannel'
import { sendDM, prepareDM, queueMessage, flushQueue, decryptDMContent, addDMReaction, markChannelRead } from '../lib/messaging'
import { useOfflineStage } from '../hooks/useOfflineStage'
import { useTribe } from '../contexts/TribeContext'
import MessageBubble from '../components/MessageBubble'
import MessageInput from '../components/MessageInput'
import { usePendingMessageIds } from '../hooks/usePendingMessageIds'
import type { Message, TribeMember } from '@plus-ultra/core'

export default function DirectMessageScreen() {
  const { tribeId, memberPub } = useParams({ from: '/tribe/$tribeId/dm/$memberPub' })
  const { identity } = useIdentity()
  const { members } = useTribe()
  const { offlineStage } = useOfflineStage()
  const { messages, loading, inject, channelId } = useDMChannel(identity?.pub ?? '', memberPub)
  const pendingMessageIds = usePendingMessageIds()
  const [decrypted, setDecrypted] = useState<Map<string, string>>(new Map())
  const sentPlaintexts = useRef<Map<string, string>>(new Map())
  const bottomRef = useRef<HTMLDivElement>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)

  const recipient = members.find(m => m.pubkey === memberPub)

  // Decrypt messages as they arrive
  useEffect(() => {
    if (!identity || !recipient?.epub) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }

    async function decryptAll() {
      const newDecrypted = new Map<string, string>()
      const otherEpub = (recipient as TribeMember & { epub?: string }).epub ?? ''

      for (const msg of messages) {
        const sentPlaintext = sentPlaintexts.current.get(msg.id)
        if (sentPlaintext) {
          newDecrypted.set(msg.id, sentPlaintext)
          continue
        }
        if (!otherEpub) {
          newDecrypted.set(msg.id, msg.content)
          continue
        }
        try {
          const plaintext = await decryptDMContent(msg.content, otherEpub, pair)
          newDecrypted.set(msg.id, plaintext)
        } catch {
          newDecrypted.set(msg.id, '[encrypted]')
        }
      }
      setDecrypted(newDecrypted)
    }

    void decryptAll()
  }, [messages, identity, recipient])

  // Drain queued DMs when relay becomes reachable
  useEffect(() => {
    if (offlineStage === 0) void flushQueue()
  }, [offlineStage])

  // Auto-scroll to bottom + mark as read
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    void markChannelRead(channelId)
  }, [messages.length, channelId])

  async function handleSendText(text: string) {
    if (!identity || !recipient?.epub) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    const recipientEpub = (recipient as TribeMember & { epub?: string }).epub ?? ''
    if (offlineStage === 0) {
      const msg = await sendDM(tribeId, identity.pub, pair, memberPub, recipientEpub, 'text', text, undefined, replyingTo?.id)
      sentPlaintexts.current.set(msg.id, text)
      inject(msg)
      setDecrypted(prev => new Map(prev).set(msg.id, text))
    } else {
      const msg = await prepareDM(tribeId, identity.pub, pair, memberPub, recipientEpub, 'text', text, undefined, replyingTo?.id)
      await queueMessage(msg)
      sentPlaintexts.current.set(msg.id, text)
      inject(msg)
      setDecrypted(prev => new Map(prev).set(msg.id, text))
    }
    setReplyingTo(null)
  }

  async function handleSendVoice(base64: string, mimeType: string) {
    if (!identity || !recipient?.epub) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    const recipientEpub = (recipient as TribeMember & { epub?: string }).epub ?? ''
    if (offlineStage === 0) {
      const msg = await sendDM(tribeId, identity.pub, pair, memberPub, recipientEpub, 'voice', base64, mimeType)
      sentPlaintexts.current.set(msg.id, base64)
      inject(msg)
      setDecrypted(prev => new Map(prev).set(msg.id, base64))
    } else {
      const msg = await prepareDM(tribeId, identity.pub, pair, memberPub, recipientEpub, 'voice', base64, mimeType)
      await queueMessage(msg)
      sentPlaintexts.current.set(msg.id, base64)
      inject(msg)
      setDecrypted(prev => new Map(prev).set(msg.id, base64))
    }
    setReplyingTo(null)
  }

  async function handleSendPhoto(base64: string, mimeType: string) {
    if (!identity || !recipient?.epub) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    const recipientEpub = (recipient as TribeMember & { epub?: string }).epub ?? ''
    if (offlineStage === 0) {
      const msg = await sendDM(tribeId, identity.pub, pair, memberPub, recipientEpub, 'photo', base64, mimeType)
      sentPlaintexts.current.set(msg.id, base64)
      inject(msg)
      setDecrypted(prev => new Map(prev).set(msg.id, base64))
    } else {
      const msg = await prepareDM(tribeId, identity.pub, pair, memberPub, recipientEpub, 'photo', base64, mimeType)
      await queueMessage(msg)
      sentPlaintexts.current.set(msg.id, base64)
      inject(msg)
      setDecrypted(prev => new Map(prev).set(msg.id, base64))
    }
    setReplyingTo(null)
  }

  async function handleReact(msg: Message, emoji: string) {
    if (!identity) return
    await addDMReaction(channelId, msg.id, emoji, identity.pub)
  }

  const recipientName = recipient?.displayName ?? memberPub.slice(0, 8)

  return (
    <div className="flex flex-col h-screen bg-forest-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-forest-800 bg-forest-900 flex-shrink-0">
        <Link to="/tribe/$tribeId" params={{ tribeId }} className="text-forest-400 hover:text-forest-300">
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-100">{recipientName}</div>
          <div className="text-xs text-gray-500">
            🔒 End-to-end encrypted {offlineStage > 0 && '· ⚡ Offline'}
          </div>
        </div>
      </div>

      {/* No epub warning */}
      {!recipient?.epub && (
        <div className="bg-warning-700/20 border-b border-warning-700/40 px-4 py-2">
          <p className="text-warning-400 text-xs">
            Cannot encrypt messages — this member's encryption key is not available yet. They may need to re-sync.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-forest-400 text-sm animate-pulse">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-gray-400 text-sm font-medium">Encrypted channel</p>
            <p className="text-gray-600 text-xs mt-1">Only you and {recipientName} can read these</p>
          </div>
        ) : (
          <>
            {messages.map(msg => {
              const replySource = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : undefined
              const replyToDecrypted = replySource ? (decrypted.get(replySource.id) ?? (replySource.type !== 'text' ? `[${replySource.type}]` : undefined)) : undefined
              const replyToSenderName = replySource
                ? (replySource.senderId === identity?.pub ? 'You' : recipientName)
                : undefined
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMe={msg.senderId === identity?.pub}
                  senderName={recipientName}
                  decryptedContent={decrypted.get(msg.id)}
                  replyToContent={replyToDecrypted}
                  replyToSenderName={replyToSenderName}
                  onReact={(emoji) => handleReact(msg, emoji)}
                  onReply={() => setReplyingTo(msg)}
                  syncStatus={pendingMessageIds.has(msg.id) ? 'pending' : undefined}
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
            {replyingTo.senderId === identity?.pub ? 'You' : recipientName}:{' '}
            {replyingTo.type === 'text'
              ? (decrypted.get(replyingTo.id) ?? '[encrypted]')
              : `[${replyingTo.type}]`}
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
          disabled={!recipient?.epub}
        />
      </div>
    </div>
  )
}
