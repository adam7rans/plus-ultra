import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useTribe } from '../contexts/TribeContext'
import { useFederation } from '../hooks/useFederation'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import {
  updateRelationshipStatus,
  buildContactCardUrl,
  getLocalTribeEpub,
} from '../lib/federation'
import { canDiplomatize } from '@plus-ultra/core'
import type { FederationRelationship, FederationRelationshipStatus } from '@plus-ultra/core'
import QrDisplay from '../components/QrDisplay'
import { copyText } from '../lib/platform/share'
import { getDB } from '../lib/platform/storage'
import AppIcon from '../components/AppIcon'
import { AppButton, AppCard, AppEmptyState } from '../components/ui'

export default function FederationScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/federation' })
  const { identity } = useIdentity()
  const { myTribes } = useTribe()
  const { members } = useSurvivabilityScore(tribeId)
  const { relationships } = useFederation(tribeId)

  const localRef = myTribes.find(t => t.tribeId === tribeId)
  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined

  // Fake tribe object for canDiplomatize — only needs id and founderId
  const tribeForAuth = { id: tribeId, founderId: members[0]?.pubkey ?? '' } as Parameters<typeof canDiplomatize>[1]
  const canDiplomat = myMember ? canDiplomatize(myMember, tribeForAuth) : false

  const [contactCardUrl, setContactCardUrl] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generatingCard, setGeneratingCard] = useState(false)
  const [pasteMode, setPasteMode] = useState(false)
  const [pastedUrl, setPastedUrl] = useState('')
  const [statusChanging, setStatusChanging] = useState<string | null>(null)

  async function handleGenerateCard() {
    setGeneratingCard(true)
    try {
      const epub = await getLocalTribeEpub(tribeId)
      if (!epub) {
        alert('Your tribe encryption key is not available. Only the founder can generate contact cards.')
        return
      }
      const db = await getDB()
      const myTribeRecord = await db.get('my-tribes', tribeId)
      const url = buildContactCardUrl({
        id: tribeId,
        name: localRef?.name ?? '',
        location: localRef?.location ?? '',
        pub: myTribeRecord?.tribePub ?? '',
        epub,
      })
      setContactCardUrl(url)
    } finally {
      setGeneratingCard(false)
    }
  }

  async function handleCopyCard() {
    if (!contactCardUrl) return
    await copyText(contactCardUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePasteNavigate() {
    if (!pastedUrl.trim()) return
    // Navigate to the /connect route with the pasted URL's params
    try {
      const parsed = new URL(pastedUrl.trim())
      const params = parsed.searchParams
      const connectUrl = `/connect?${params.toString()}`
      window.location.href = connectUrl
    } catch {
      alert('Invalid contact card URL')
    }
  }

  async function handleStatusChange(rel: FederationRelationship, status: FederationRelationshipStatus) {
    setStatusChanging(rel.channelId)
    try {
      await updateRelationshipStatus(tribeId, localRef?.name ?? '', rel.channelId, status)
    } finally {
      setStatusChanging(null)
    }
  }

  const allied = relationships.filter(r => r.status === 'allied')
  const contacts = relationships.filter(r => r.status === 'contact')
  const distrusted = relationships.filter(r => r.status === 'distrusted')

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        <AppIcon name="back" size={16} /> Back to Dashboard
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-1">Federation</h2>
      <p className="text-gray-500 text-sm mb-6">
        Inter-tribe contacts, alliances, and trade.
      </p>

      {!canDiplomat && (
        <AppCard className="!border-warning-700 !bg-warning-900/20 mb-6">
          <p className="text-warning-400 text-sm font-semibold mb-1">Diplomat access required</p>
          <p className="text-gray-400 text-xs">
            Only designated diplomats and founders can manage federation contacts.
            A tribe proposal is required to grant diplomat status.
          </p>
        </AppCard>
      )}

      {/* Contact card generation */}
      {canDiplomat && (
        <AppCard className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Your Contact Card</h3>
          <p className="text-xs text-gray-500 mb-3">
            Share this link with another tribe's diplomat to establish a federation channel.
          </p>

          {contactCardUrl ? (
            <div className="space-y-3">
              <button
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-forest-900 border border-forest-700 hover:border-forest-500 transition-colors"
                onClick={() => setShowQr(prev => !prev)}
              >
                <span className="text-sm text-gray-300">Show QR Code</span>
                <span className="text-forest-400 text-sm">{showQr ? <AppIcon name="caretUp" size={16} /> : <AppIcon name="caretDown" size={16} />}</span>
              </button>
              {showQr && (
                <div className="flex justify-center py-2">
                  <QrDisplay value={contactCardUrl} />
                </div>
              )}
              <div className="bg-forest-950 rounded-lg p-3 font-mono text-xs text-gray-400 break-all">
                {contactCardUrl}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <AppButton className={copied ? '!bg-forest-600' : ''} onClick={handleCopyCard}>
                  {copied ? <span className="inline-flex items-center gap-1"><AppIcon name="check" size={16} /> Copied!</span> : 'Copy Link'}
                </AppButton>
                <AppButton variant="secondary" onClick={() => setContactCardUrl(null)}>
                  Regenerate
                </AppButton>
              </div>
            </div>
          ) : (
            <AppButton
              fullWidth
              onClick={handleGenerateCard}
              disabled={generatingCard}
            >
              {generatingCard ? 'Generating...' : 'Generate Contact Card'}
            </AppButton>
          )}
        </AppCard>
      )}

      {/* Add contact by pasting URL */}
      {canDiplomat && (
        <AppCard className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Add Contact</h3>
          <p className="text-xs text-gray-500 mb-3">
            Paste a contact card URL from another tribe, or scan their QR code.
          </p>
          {pasteMode ? (
            <div className="space-y-2">
              <input
                type="text"
                value={pastedUrl}
                onChange={e => setPastedUrl(e.target.value)}
                placeholder="Paste contact card URL..."
                className="w-full text-xs bg-forest-950 border border-forest-800 rounded-lg px-3 py-2 text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-forest-600"
              />
              <div className="flex gap-2">
                <AppButton className="flex-1 text-sm" onClick={handlePasteNavigate}>
                  Add
                </AppButton>
                <AppButton variant="secondary" className="flex-1 text-sm" onClick={() => { setPasteMode(false); setPastedUrl('') }}>
                  Cancel
                </AppButton>
              </div>
            </div>
          ) : (
            <AppButton variant="secondary" fullWidth onClick={() => setPasteMode(true)}>
              Paste Contact Card URL
            </AppButton>
          )}
        </AppCard>
      )}

      {/* Allied tribes */}
      {allied.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">
            Allied Tribes ({allied.length})
          </h3>
          <div className="space-y-2">
            {allied.map(rel => (
              <RelationshipCard
                key={rel.channelId}
                rel={rel}
                tribeId={tribeId}
                canDiplomat={canDiplomat}
                changing={statusChanging === rel.channelId}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Contacts */}
      {contacts.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">
            Contacts ({contacts.length})
          </h3>
          <div className="space-y-2">
            {contacts.map(rel => (
              <RelationshipCard
                key={rel.channelId}
                rel={rel}
                tribeId={tribeId}
                canDiplomat={canDiplomat}
                changing={statusChanging === rel.channelId}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Distrusted */}
      {distrusted.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">
            Distrusted ({distrusted.length})
          </h3>
          <div className="space-y-2">
            {distrusted.map(rel => (
              <RelationshipCard
                key={rel.channelId}
                rel={rel}
                tribeId={tribeId}
                canDiplomat={canDiplomat}
                changing={statusChanging === rel.channelId}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {relationships.length === 0 && (
        <AppEmptyState
          icon="handshake"
          title="No federation contacts yet."
          body="Generate a contact card and share it with another tribe's diplomat."
        />
      )}
    </div>
  )
}

function RelationshipCard({
  rel,
  tribeId,
  canDiplomat,
  changing,
  onStatusChange,
}: {
  rel: FederationRelationship
  tribeId: string
  canDiplomat: boolean
  changing: boolean
  onStatusChange: (rel: FederationRelationship, status: FederationRelationshipStatus) => void
}) {
  const statusColors: Record<FederationRelationshipStatus, string> = {
    allied:    'text-forest-400',
    contact:   'text-gray-400',
    distrusted:'text-danger-400',
  }

  const statusLabel: Record<FederationRelationshipStatus, string> = {
    allied:    'Allied',
    contact:   'Contact',
    distrusted:'Distrusted',
  }

  return (
    <AppCard>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-100 truncate">
              {rel.otherTribeName || rel.otherTribeId}
            </span>
            <span className={`text-xs ${statusColors[rel.status]}`}>
              {statusLabel[rel.status]}
            </span>
          </div>
          {rel.otherTribeLocation && (
            <div className="text-xs text-gray-500 mt-0.5">{rel.otherTribeLocation}</div>
          )}
        </div>
        <Link
          to="/tribe/$tribeId/federation/$channelId"
          params={{ tribeId, channelId: rel.channelId }}
          className="text-forest-400 text-sm hover:text-forest-300 flex-shrink-0 flex items-center gap-1"
        >
          Open <AppIcon name="forward" size={16} />
        </Link>
      </div>

      {canDiplomat && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {rel.status !== 'allied' && (
            <AppButton
              variant="ghost"
              size="sm"
              className="!border !border-forest-700 !text-forest-400 hover:!border-forest-500"
              onClick={() => onStatusChange(rel, 'allied')}
              disabled={changing}
            >
              Declare Allied
            </AppButton>
          )}
          {rel.status !== 'contact' && (
            <AppButton
              variant="ghost"
              size="sm"
              className="!border !border-forest-800 !text-gray-400 hover:!border-forest-600"
              onClick={() => onStatusChange(rel, 'contact')}
              disabled={changing}
            >
              Set Contact
            </AppButton>
          )}
          {rel.status !== 'distrusted' && (
            <AppButton
              variant="ghost"
              size="sm"
              className="!border !border-danger-800 !text-danger-400 hover:!border-danger-600"
              onClick={() => onStatusChange(rel, 'distrusted')}
              disabled={changing}
            >
              Distrust
            </AppButton>
          )}
        </div>
      )}
    </AppCard>
  )
}
