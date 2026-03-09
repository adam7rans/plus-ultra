import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useDMChannel } from '../hooks/useChannel'
import { sendDM, decryptDMContent } from '../lib/messaging'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useTribe } from '../contexts/TribeContext'
import MessageBubble from '../components/MessageBubble'
import MessageInput from '../components/MessageInput'
import type { TribeMember } from '@plus-ultra/core'

export default function DirectMessageScreen() {
  const { tribeId, memberPub } = useParams({ from: '/tribe/$tribeId/dm/$memberPub' })
  const { identity } = useIdentity()
  const { members } = useTribe()
  const online = useOnlineStatus()
  const { messages, loading, inject } = useDMChannel(identity?.pub ?? '', memberPub)
  const [decrypted, setDecrypted] = useState<Map<string, string>>(new Map())
  const bottomRef = useRef<HTMLDivElement>(null)

  const recipient = members.find(m => m.pubkey === memberPub)

  // Decrypt messages as they arrive
  useEffect(() => {
    if (!identity || !recipient?.epub) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }

    async function decryptAll() {
      const newDecrypted = new Map<string, string>()
      // ECDH: SEA.secret(otherEpub, myPair) == SEA.secret(myEpub, otherPair)
      // So both sender and recipient always derive the shared secret using the OTHER person's epub.
      const otherEpub = (recipient as TribeMember & { epub?: string }).epub ?? ''

      for (const msg of messages) {
        if (msg.type !== 'text') {
          newDecrypted.set(msg.id, msg.content)
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSendText(text: string) {
    if (!identity || !recipient?.epub) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    const recipientEpub = (recipient as TribeMember & { epub?: string }).epub ?? ''
    const msg = await sendDM(tribeId, identity.pub, pair, memberPub, recipientEpub, 'text', text)
    inject(msg)
    setDecrypted(prev => new Map(prev).set(msg.id, text))
  }

  async function handleSendVoice(base64: string, mimeType: string) {
    if (!identity || !recipient?.epub) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    const recipientEpub = (recipient as TribeMember & { epub?: string }).epub ?? ''
    const msg = await sendDM(tribeId, identity.pub, pair, memberPub, recipientEpub, 'voice', base64, mimeType)
    inject(msg)
    setDecrypted(prev => new Map(prev).set(msg.id, base64))
  }

  async function handleSendPhoto(base64: string, mimeType: string) {
    if (!identity || !recipient?.epub) return
    const pair = identity as { pub: string; priv: string; epub: string; epriv: string }
    const recipientEpub = (recipient as TribeMember & { epub?: string }).epub ?? ''
    const msg = await sendDM(tribeId, identity.pub, pair, memberPub, recipientEpub, 'photo', base64, mimeType)
    inject(msg)
    setDecrypted(prev => new Map(prev).set(msg.id, base64))
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
            🔒 End-to-end encrypted {!online && '· ⚡ Offline'}
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
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMe={msg.senderId === identity?.pub}
                senderName={recipientName}
                decryptedContent={decrypted.get(msg.id)}
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
          disabled={!recipient?.epub}
        />
      </div>
    </div>
  )
}
