import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useTribe } from '../contexts/TribeContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useFederation } from '../hooks/useFederation'
import { useFederationChannel } from '../hooks/useFederationChannel'
import {
  sendFederatedMessage,
  respondToTrade,
  proposeTrade,
  confirmTradeFulfillment,
  getLocalTribeEpub,
  getLocalTribeEpriv,
  updateRelationshipStatus,
} from '../lib/federation'
import { canDiplomatize, ASSET_BY_KEY, ASSETS_BY_CATEGORY } from '@plus-ultra/core'
import type { FederatedMessage, FederatedTradeProposal, TradeItem } from '@plus-ultra/core'
import type { AssetType } from '@plus-ultra/core'

type Tab = 'messages' | 'trade' | 'intel'

export default function FederationChannelScreen() {
  const { tribeId, channelId } = useParams({ from: '/tribe/$tribeId/federation/$channelId' })
  const { identity } = useIdentity()
  const { myTribes } = useTribe()
  const { members } = useSurvivabilityScore(tribeId)

  const { relationships } = useFederation(tribeId)
  const rel = relationships.find(r => r.channelId === channelId)

  const [myTribeEpub, setMyTribeEpub] = useState<string | null>(null)
  const [myTribeEpriv, setMyTribeEpriv] = useState<string | null>(null)

  useEffect(() => {
    getLocalTribeEpub(tribeId).then(setMyTribeEpub)
    getLocalTribeEpriv(tribeId).then(setMyTribeEpriv)
  }, [tribeId])

  const { messages, trades } = useFederationChannel(
    channelId,
    myTribeEpub,
    myTribeEpriv,
    rel?.otherTribeEpub ?? null,
  )

  const localRef = myTribes.find(t => t.tribeId === tribeId)
  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const tribeForAuth = { id: tribeId, founderId: members[0]?.pubkey ?? '' } as Parameters<typeof canDiplomatize>[1]
  const canDiplomat = myMember ? canDiplomatize(myMember, tribeForAuth) : false
  const hasKey = !!myTribeEpriv

  const [tab, setTab] = useState<Tab>('messages')

  const intelMessages = messages.filter(m => m.type === 'intel')
  const textMessages = messages.filter(m => m.type === 'text')

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId/federation"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Federation
      </Link>

      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-100">
          {rel?.otherTribeName || 'Federation Channel'}
        </h2>
        {rel?.otherTribeLocation && (
          <p className="text-gray-500 text-sm">{rel.otherTribeLocation}</p>
        )}
        {rel && (
          <RelationshipStatusBar
            rel={rel}
            tribeId={tribeId}
            myTribeName={localRef?.name ?? ''}
            canDiplomat={canDiplomat}
          />
        )}
      </div>

      {!hasKey && (
        <div className="card border-warning-700 bg-warning-900/20 mb-4">
          <p className="text-warning-400 text-sm font-semibold">No encryption key</p>
          <p className="text-gray-400 text-xs mt-1">
            Your tribe's encryption key is not loaded. Only founders hold this key initially.
            A founder must distribute it to you before you can send or read encrypted messages.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-forest-800 mb-4">
        {(['messages', 'trade', 'intel'] as Tab[]).map(t => (
          <button
            key={t}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
              tab === t
                ? 'text-forest-400 border-b-2 border-forest-400 -mb-px'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => setTab(t)}
          >
            {t === 'messages' ? `Messages (${textMessages.length})` :
             t === 'trade'    ? `Trade (${trades.length})` :
                                `Intel (${intelMessages.length})`}
          </button>
        ))}
      </div>

      {tab === 'messages' && (
        <MessagesTab
          messages={textMessages}
          canDiplomat={canDiplomat}
          hasKey={hasKey}
          myTribeId={tribeId}
          myTribeName={localRef?.name ?? ''}
          senderPub={identity?.pub ?? ''}
          senderName={myMember?.displayName ?? ''}
          channelId={channelId}
          myTribeEpub={myTribeEpub ?? ''}
          myTribeEpriv={myTribeEpriv ?? ''}
          otherTribeEpub={rel?.otherTribeEpub ?? ''}
        />
      )}

      {tab === 'trade' && (
        <TradeTab
          trades={trades}
          myTribeId={tribeId}
          myTribeName={localRef?.name ?? ''}
          otherTribeName={rel?.otherTribeName ?? ''}
          channelId={channelId}
          senderPub={identity?.pub ?? ''}
          memberCount={members.length}
          canDiplomat={canDiplomat}
        />
      )}

      {tab === 'intel' && (
        <IntelTab
          messages={intelMessages}
          canDiplomat={canDiplomat}
          hasKey={hasKey}
          myTribeId={tribeId}
          myTribeName={localRef?.name ?? ''}
          senderPub={identity?.pub ?? ''}
          senderName={myMember?.displayName ?? ''}
          channelId={channelId}
          myTribeEpub={myTribeEpub ?? ''}
          myTribeEpriv={myTribeEpriv ?? ''}
          otherTribeEpub={rel?.otherTribeEpub ?? ''}
        />
      )}
    </div>
  )
}

// ─── Relationship status bar ───────────────────────────────────────────────────

function RelationshipStatusBar({
  rel,
  tribeId,
  myTribeName,
  canDiplomat,
}: {
  rel: { channelId: string; status: string; otherTribeName: string }
  tribeId: string
  myTribeName: string
  canDiplomat: boolean
}) {
  const [changing, setChanging] = useState(false)
  const statusColor = rel.status === 'allied' ? 'text-forest-400' : rel.status === 'distrusted' ? 'text-danger-400' : 'text-gray-400'

  async function toggleAlliance() {
    if (!canDiplomat) return
    setChanging(true)
    const newStatus = rel.status === 'allied' ? 'contact' : 'allied'
    await updateRelationshipStatus(tribeId, myTribeName, rel.channelId, newStatus as 'contact' | 'allied' | 'distrusted')
    setChanging(false)
  }

  return (
    <div className="flex items-center gap-3 mt-1">
      <span className={`text-xs ${statusColor}`}>
        {rel.status === 'allied' ? 'Allied' : rel.status === 'distrusted' ? 'Distrusted' : 'Contact'}
      </span>
      {canDiplomat && rel.status !== 'distrusted' && (
        <button
          className="text-xs text-gray-500 hover:text-gray-300 underline disabled:opacity-40"
          onClick={toggleAlliance}
          disabled={changing}
        >
          {rel.status === 'allied' ? 'Revoke alliance' : 'Declare allied'}
        </button>
      )}
    </div>
  )
}

// ─── Messages tab ─────────────────────────────────────────────────────────────

function MessagesTab({
  messages,
  canDiplomat,
  hasKey,
  myTribeId,
  myTribeName,
  senderPub,
  senderName,
  channelId,
  myTribeEpub,
  myTribeEpriv,
  otherTribeEpub,
}: {
  messages: FederatedMessage[]
  canDiplomat: boolean
  hasKey: boolean
  myTribeId: string
  myTribeName: string
  senderPub: string
  senderName: string
  channelId: string
  myTribeEpub: string
  myTribeEpriv: string
  otherTribeEpub: string
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !canDiplomat || !hasKey) return
    setSending(true)
    try {
      await sendFederatedMessage(
        channelId, myTribeId, myTribeName, senderPub, senderName,
        'text', text.trim(), myTribeEpub, myTribeEpriv, otherTribeEpub,
      )
      setText('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      {messages.length === 0 && (
        <div className="text-center py-8 text-gray-600 text-sm">No messages yet</div>
      )}
      {messages.map(msg => (
        <MessageBubble key={msg.id} msg={msg} isOwn={msg.fromTribeId === myTribeId} />
      ))}

      {canDiplomat && hasKey && (
        <form onSubmit={handleSend} className="flex gap-2 mt-4">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Message..."
            className="flex-1 text-sm bg-forest-900 border border-forest-800 rounded-lg px-3 py-2 text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-forest-600"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="btn-primary text-sm px-4 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      )}
    </div>
  )
}

function MessageBubble({ msg, isOwn }: { msg: FederatedMessage; isOwn: boolean }) {
  const date = new Date(msg.sentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
        isOwn ? 'bg-forest-800 text-gray-100' : 'bg-forest-900 border border-forest-800 text-gray-200'
      }`}>
        {!isOwn && (
          <div className="text-xs text-gray-500 mb-1">
            {msg.fromTribeName} · {msg.senderName}
          </div>
        )}
        <div className="text-sm">{msg.content}</div>
        <div className="text-xs text-gray-600 mt-1 text-right">{date}</div>
      </div>
    </div>
  )
}

// ─── Intel tab ────────────────────────────────────────────────────────────────

function IntelTab({
  messages,
  canDiplomat,
  hasKey,
  myTribeId,
  myTribeName,
  senderPub,
  senderName,
  channelId,
  myTribeEpub,
  myTribeEpriv,
  otherTribeEpub,
}: {
  messages: FederatedMessage[]
  canDiplomat: boolean
  hasKey: boolean
  myTribeId: string
  myTribeName: string
  senderPub: string
  senderName: string
  channelId: string
  myTribeEpub: string
  myTribeEpriv: string
  otherTribeEpub: string
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showForm, setShowForm] = useState(false)
  void hasKey  // available if needed for gating in future

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !canDiplomat || !hasKey) return
    setSending(true)
    try {
      await sendFederatedMessage(
        channelId, myTribeId, myTribeName, senderPub, senderName,
        'intel', text.trim(), myTribeEpub, myTribeEpriv, otherTribeEpub,
      )
      setText('')
      setShowForm(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      {canDiplomat && hasKey && (
        <button
          className="text-xs text-forest-400 hover:text-forest-300 transition-colors mb-2"
          onClick={() => setShowForm(prev => !prev)}
        >
          {showForm ? '▲ Cancel' : '+ Post Intel'}
        </button>
      )}

      {showForm && (
        <form onSubmit={handlePost} className="card mb-4 space-y-2">
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-widest">New Intel Post</div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Threat report, observation, situation update..."
            rows={3}
            className="w-full text-sm bg-forest-950 border border-forest-800 rounded-lg px-3 py-2 text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-forest-600 resize-none"
          />
          <button type="submit" disabled={sending || !text.trim()} className="btn-primary w-full text-sm disabled:opacity-40">
            {sending ? 'Posting...' : 'Post Intel'}
          </button>
        </form>
      )}

      {messages.length === 0 && (
        <div className="text-center py-8 text-gray-600 text-sm">No intel posts yet</div>
      )}

      {[...messages].sort((a, b) => b.sentAt - a.sentAt).map(msg => (
        <div key={msg.id} className="card border-l-2 border-l-warning-600">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-warning-400 font-semibold uppercase tracking-wide">Intel</span>
            <span className="text-xs text-gray-500">
              {msg.fromTribeName} · {new Date(msg.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <p className="text-sm text-gray-200">{msg.content}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Trade tab ────────────────────────────────────────────────────────────────

function TradeTab({
  trades,
  myTribeId,
  myTribeName,
  otherTribeName,
  channelId,
  senderPub,
  memberCount,
  canDiplomat,
}: {
  trades: FederatedTradeProposal[]
  myTribeId: string
  myTribeName: string
  otherTribeName: string
  channelId: string
  senderPub: string
  memberCount: number
  canDiplomat: boolean
}) {
  const [showForm, setShowForm] = useState(false)

  const active = trades.filter(t => !['rejected', 'fulfilled'].includes(t.status))
  const historical = trades.filter(t => ['rejected', 'fulfilled'].includes(t.status))

  return (
    <div className="space-y-3">
      {canDiplomat && (
        <button
          className="text-xs text-forest-400 hover:text-forest-300 transition-colors"
          onClick={() => setShowForm(prev => !prev)}
        >
          {showForm ? '▲ Cancel' : '+ Propose Trade'}
        </button>
      )}

      {showForm && canDiplomat && (
        <ProposeTradeForm
          channelId={channelId}
          myTribeId={myTribeId}
          myTribeName={myTribeName}
          otherTribeName={otherTribeName}
          proposedBy={senderPub}
          onDone={() => setShowForm(false)}
        />
      )}

      {active.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-600 text-sm">No active trade proposals</div>
      )}

      {active.map(trade => (
        <TradeCard
          key={trade.id}
          trade={trade}
          myTribeId={myTribeId}
          channelId={channelId}
          respondedBy={senderPub}
          memberCount={memberCount}
          canDiplomat={canDiplomat}
        />
      ))}

      {historical.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-gray-600 uppercase tracking-widest mb-2">History</div>
          {historical.map(trade => (
            <TradeCard
              key={trade.id}
              trade={trade}
              myTribeId={myTribeId}
              channelId={channelId}
              respondedBy={senderPub}
              memberCount={memberCount}
              canDiplomat={canDiplomat}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProposeTradeForm({
  channelId,
  myTribeId,
  myTribeName,
  otherTribeName,
  proposedBy,
  onDone,
}: {
  channelId: string
  myTribeId: string
  myTribeName: string
  otherTribeName: string
  proposedBy: string
  onDone: () => void
}) {
  const toTribeId = channelId.split(':').find(id => id !== myTribeId) ?? ''
  const allStoreAssets = ASSETS_BY_CATEGORY['stores']

  const [offer, setOffer] = useState<TradeItem[]>([{ asset: 'food_reserve', amount: 0 }])
  const [request, setRequest] = useState<TradeItem[]>([{ asset: 'fuel_reserve', amount: 0 }])
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateItem(list: TradeItem[], idx: number, field: 'asset' | 'amount', value: string | number) {
    return list.map((item, i) => i === idx ? { ...item, [field]: value } : item)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validOffer = offer.filter(i => i.amount > 0)
    const validRequest = request.filter(i => i.amount > 0)
    if (validOffer.length === 0 || validRequest.length === 0) return
    setSubmitting(true)
    try {
      await proposeTrade(channelId, myTribeId, toTribeId, myTribeName, otherTribeName,
        validOffer, validRequest, message, proposedBy)
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Propose Trade</div>

      <div>
        <div className="text-xs text-gray-500 mb-2">We offer:</div>
        {offer.map((item, i) => (
          <div key={i} className="flex gap-2 mb-1.5">
            <select
              value={item.asset}
              onChange={e => setOffer(updateItem(offer, i, 'asset', e.target.value))}
              className="flex-1 text-xs bg-forest-950 border border-forest-800 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-forest-600"
            >
              {allStoreAssets.map(spec => (
                <option key={spec.asset} value={spec.asset}>{spec.label}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="any"
              value={item.amount || ''}
              onChange={e => setOffer(updateItem(offer, i, 'amount', parseFloat(e.target.value) || 0))}
              placeholder="Qty"
              className="w-20 text-xs bg-forest-950 border border-forest-800 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-forest-600"
            />
            {offer.length > 1 && (
              <button type="button" className="text-danger-400 text-xs" onClick={() => setOffer(offer.filter((_, j) => j !== i))}>✕</button>
            )}
          </div>
        ))}
        <button type="button" className="text-xs text-gray-500 hover:text-gray-300" onClick={() => setOffer([...offer, { asset: 'food_reserve', amount: 0 }])}>
          + Add item
        </button>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-2">We request:</div>
        {request.map((item, i) => (
          <div key={i} className="flex gap-2 mb-1.5">
            <select
              value={item.asset}
              onChange={e => setRequest(updateItem(request, i, 'asset', e.target.value))}
              className="flex-1 text-xs bg-forest-950 border border-forest-800 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-forest-600"
            >
              {allStoreAssets.map(spec => (
                <option key={spec.asset} value={spec.asset}>{spec.label}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="any"
              value={item.amount || ''}
              onChange={e => setRequest(updateItem(request, i, 'amount', parseFloat(e.target.value) || 0))}
              placeholder="Qty"
              className="w-20 text-xs bg-forest-950 border border-forest-800 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-forest-600"
            />
            {request.length > 1 && (
              <button type="button" className="text-danger-400 text-xs" onClick={() => setRequest(request.filter((_, j) => j !== i))}>✕</button>
            )}
          </div>
        ))}
        <button type="button" className="text-xs text-gray-500 hover:text-gray-300" onClick={() => setRequest([...request, { asset: 'fuel_reserve', amount: 0 }])}>
          + Add item
        </button>
      </div>

      <input
        type="text"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Message (optional)"
        className="w-full text-xs bg-forest-950 border border-forest-800 rounded-lg px-2.5 py-1.5 text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-forest-600"
      />

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary flex-1 text-sm disabled:opacity-40">
          {submitting ? 'Proposing...' : 'Propose Trade'}
        </button>
        <button type="button" className="btn-secondary flex-1 text-sm" onClick={onDone}>Cancel</button>
      </div>
    </form>
  )
}

function TradeCard({
  trade,
  myTribeId,
  channelId,
  respondedBy,
  memberCount,
  canDiplomat,
}: {
  trade: FederatedTradeProposal
  myTribeId: string
  channelId: string
  respondedBy: string
  memberCount: number
  canDiplomat: boolean
}) {
  const isFrom = trade.fromTribeId === myTribeId
  const isMyTurn = canDiplomat &&
    (trade.status === 'pending' || trade.status === 'countered') &&
    trade.lastRespondedByTribeId !== myTribeId

  const [responding, setResponding] = useState(false)
  const [showCounter, setShowCounter] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const allStoreAssets = ASSETS_BY_CATEGORY['stores']
  const [counterOffer, setCounterOffer] = useState<{ offer: TradeItem[]; request: TradeItem[] }>({
    offer: [...trade.offer],
    request: [...trade.request],
  })

  const statusColors: Record<string, string> = {
    pending: 'text-warning-400',
    countered: 'text-warning-400',
    accepted: 'text-forest-400',
    pending_fulfillment: 'text-forest-400',
    fulfilled: 'text-gray-500',
    rejected: 'text-danger-400',
  }

  async function respond(response: 'accepted' | 'rejected' | 'countered', co?: typeof counterOffer) {
    setResponding(true)
    try {
      await respondToTrade(channelId, trade.id, myTribeId, response, respondedBy,
        response === 'countered' ? co : undefined)
      setShowCounter(false)
    } finally {
      setResponding(false)
    }
  }

  async function handleConfirmFulfillment() {
    setConfirming(true)
    try {
      await confirmTradeFulfillment(channelId, trade.id, myTribeId, memberCount, respondedBy)
    } finally {
      setConfirming(false)
    }
  }

  const myFulfilled = isFrom ? trade.fromFulfilled : trade.toFulfilled

  function renderItems(items: TradeItem[], label: string) {
    return (
      <div>
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        {items.map((item, i) => {
          const spec = ASSET_BY_KEY[item.asset]
          return (
            <div key={i} className="text-xs text-gray-300">
              {spec?.label ?? item.asset}: {item.amount} {spec?.unit ?? ''}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-400">
          {isFrom ? `You → ${trade.toTribeName}` : `${trade.fromTribeName} → You`}
        </div>
        <span className={`text-xs font-semibold ${statusColors[trade.status] ?? 'text-gray-400'}`}>
          {trade.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {renderItems(trade.offer, `${trade.fromTribeName} offers`)}
        {renderItems(trade.request, `${trade.fromTribeName} wants`)}
      </div>

      {trade.message && (
        <p className="text-xs text-gray-500 italic mb-2">"{trade.message}"</p>
      )}

      {trade.counterOffer && (
        <div className="border-t border-forest-800 pt-2 mt-2">
          <div className="text-xs text-warning-400 font-semibold mb-1">Counter-offer:</div>
          <div className="grid grid-cols-2 gap-3">
            {renderItems(trade.counterOffer.offer, 'Offers instead')}
            {renderItems(trade.counterOffer.request, 'Wants instead')}
          </div>
        </div>
      )}

      {/* Actions */}
      {isMyTurn && !showCounter && (
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            className="text-xs px-3 py-1.5 rounded border border-forest-600 text-forest-400 hover:border-forest-400 disabled:opacity-40"
            onClick={() => respond('accepted')}
            disabled={responding}
          >
            Accept
          </button>
          <button
            className="text-xs px-3 py-1.5 rounded border border-warning-700 text-warning-400 hover:border-warning-500 disabled:opacity-40"
            onClick={() => setShowCounter(true)}
            disabled={responding}
          >
            Counter
          </button>
          <button
            className="text-xs px-3 py-1.5 rounded border border-danger-800 text-danger-400 hover:border-danger-600 disabled:opacity-40"
            onClick={() => respond('rejected')}
            disabled={responding}
          >
            Reject
          </button>
        </div>
      )}

      {showCounter && (
        <div className="mt-3 pt-3 border-t border-forest-800 space-y-3">
          <div className="text-xs text-gray-400 font-semibold">Counter-offer — edit terms:</div>
          <div>
            <div className="text-xs text-gray-500 mb-1">We offer:</div>
            {counterOffer.offer.map((item, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <select
                  value={item.asset}
                  onChange={e => setCounterOffer(co => ({ ...co, offer: co.offer.map((x, j) => j === i ? { ...x, asset: e.target.value as AssetType } : x) }))}
                  className="flex-1 text-xs bg-forest-950 border border-forest-800 rounded px-2 py-1 text-gray-200"
                >
                  {allStoreAssets.map(spec => <option key={spec.asset} value={spec.asset}>{spec.label}</option>)}
                </select>
                <input
                  type="number" min="0" step="any"
                  value={item.amount || ''}
                  onChange={e => setCounterOffer(co => ({ ...co, offer: co.offer.map((x, j) => j === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x) }))}
                  className="w-20 text-xs bg-forest-950 border border-forest-800 rounded px-2 py-1 text-gray-200"
                />
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">We request:</div>
            {counterOffer.request.map((item, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <select
                  value={item.asset}
                  onChange={e => setCounterOffer(co => ({ ...co, request: co.request.map((x, j) => j === i ? { ...x, asset: e.target.value as AssetType } : x) }))}
                  className="flex-1 text-xs bg-forest-950 border border-forest-800 rounded px-2 py-1 text-gray-200"
                >
                  {allStoreAssets.map(spec => <option key={spec.asset} value={spec.asset}>{spec.label}</option>)}
                </select>
                <input
                  type="number" min="0" step="any"
                  value={item.amount || ''}
                  onChange={e => setCounterOffer(co => ({ ...co, request: co.request.map((x, j) => j === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x) }))}
                  className="w-20 text-xs bg-forest-950 border border-forest-800 rounded px-2 py-1 text-gray-200"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1 text-xs py-1.5 disabled:opacity-40" disabled={responding} onClick={() => respond('countered', counterOffer)}>
              Send Counter
            </button>
            <button className="btn-secondary flex-1 text-xs py-1.5" onClick={() => setShowCounter(false)}>Cancel</button>
          </div>
        </div>
      )}

      {trade.status === 'pending_fulfillment' && !myFulfilled && canDiplomat && (
        <div className="mt-3 pt-3 border-t border-forest-800">
          <p className="text-xs text-gray-400 mb-2">
            Trade accepted. Confirm you have {isFrom ? 'received the requested items' : 'delivered your offer'}.
          </p>
          <button
            className="btn-primary w-full text-sm disabled:opacity-40"
            disabled={confirming}
            onClick={handleConfirmFulfillment}
          >
            {confirming ? 'Confirming...' : 'Confirm Fulfillment'}
          </button>
        </div>
      )}

      {trade.status === 'pending_fulfillment' && myFulfilled && (
        <p className="text-xs text-gray-500 mt-2">Waiting for other tribe to confirm their side.</p>
      )}
    </div>
  )
}
