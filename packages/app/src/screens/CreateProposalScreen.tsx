import { useState } from 'react'
import { useParams, useNavigate, Link } from '@tanstack/react-router'
import { useTribe } from '../contexts/TribeContext'
import { useIdentity } from '../contexts/IdentityContext'
import { fetchTribeMeta } from '../lib/tribes'
import { createProposal } from '../lib/proposals'
import { proposalDuration } from '@plus-ultra/core'
import type { Tribe } from '@plus-ultra/core'
import type { ProposalScope } from '@plus-ultra/core'
import { useEffect } from 'react'

export default function CreateProposalScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/proposals/new' })
  const navigate = useNavigate()
  const { identity } = useIdentity()
  const { myTribes } = useTribe()
  const localRef = myTribes.find(t => t.tribeId === tribeId)

  const [tribe, setTribe] = useState<Tribe | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [scope, setScope] = useState<ProposalScope>('major')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) })
  }, [tribeId])

  const isHybrid = tribe?.constitutionTemplate === 'hybrid'

  function deadlineLabel(): string {
    if (!tribe) return ''
    const ms = proposalDuration(tribe)
    const hours = ms / (60 * 60 * 1000)
    return `${hours}h`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!identity || !tribe) return
    if (!title.trim()) { setError('Title is required'); return }

    setSubmitting(true)
    setError('')
    try {
      const proposal = await createProposal(
        tribeId,
        { title: title.trim(), body: body.trim(), scope },
        identity.pub,
        tribe,
      )
      navigate({ to: '/tribe/$tribeId/proposals/$proposalId', params: { tribeId, proposalId: proposal.id } })
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const tribeName = tribe?.name ?? localRef?.name ?? ''

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link
        to="/tribe/$tribeId/proposals"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Proposals
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-1">New Proposal</h2>
      {tribeName && <p className="text-gray-400 text-sm mb-6">{tribeName}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Title</label>
          <input
            className="input w-full"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Short, clear title"
            maxLength={120}
            required
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Details</label>
          <textarea
            className="input w-full min-h-[100px] resize-y"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Describe the proposal, context, and what a 'yes' vote means"
          />
        </div>

        {isHybrid && (
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-2">Scope</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`card py-3 text-sm font-medium transition-colors ${
                  scope === 'major'
                    ? 'border-forest-500 bg-forest-900/50 text-forest-300'
                    : 'text-gray-400 hover:border-forest-700'
                }`}
                onClick={() => setScope('major')}
              >
                <div className="font-semibold">Major</div>
                <div className="text-xs text-gray-400 mt-0.5">All members vote</div>
              </button>
              <button
                type="button"
                className={`card py-3 text-sm font-medium transition-colors ${
                  scope === 'operational'
                    ? 'border-forest-500 bg-forest-900/50 text-forest-300'
                    : 'text-gray-400 hover:border-forest-700'
                }`}
                onClick={() => setScope('operational')}
              >
                <div className="font-semibold">Operational</div>
                <div className="text-xs text-gray-400 mt-0.5">Leads+ vote</div>
              </button>
            </div>
          </div>
        )}

        {tribe && (
          <div className="card bg-forest-950 py-2 text-xs text-gray-400">
            Voting closes in <span className="text-forest-300 font-semibold">{deadlineLabel()}</span> after submission
          </div>
        )}

        {error && <p className="text-danger-400 text-sm">{error}</p>}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={submitting || !title.trim()}
        >
          {submitting ? 'Submitting...' : 'Submit Proposal'}
        </button>
      </form>
    </div>
  )
}
