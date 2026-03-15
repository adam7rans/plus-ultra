import { useState, useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useBugOut } from '../hooks/useBugOut'
import { useMapData } from '../hooks/useMapData'
import { saveBugOutPlan, deleteBugOutPlan, activateBugOutPlan } from '../lib/bugout'
import { fetchTribeMeta } from '../lib/tribes'
import { getAuthority, hasAuthority } from '@plus-ultra/core'
import type { Tribe, BugOutPlan, BugOutVehicle, LoadPriority } from '@plus-ultra/core'
import { nanoid } from 'nanoid'
import { useOfflineStage } from '../hooks/useOfflineStage'
import OfflineStageBanner from '../components/OfflineStageBanner'

export default function BugOutScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/bugout' })
  const { identity } = useIdentity()
  const { members } = useSurvivabilityScore(tribeId)
  const { plans, activePlan } = useBugOut(tribeId)
  const { routes } = useMapData(tribeId)
  const [tribe, setTribe] = useState<Tribe | null>(null)
  const { offlineStage, offlineSince } = useOfflineStage()

  const [editingPlan, setEditingPlan] = useState<BugOutPlan | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [showActivateConfirm, setShowActivateConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formTrigger, setFormTrigger] = useState('')
  const [formStatus, setFormStatus] = useState<'draft' | 'ready'>('draft')
  const [formRouteId, setFormRouteId] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formVehicles, setFormVehicles] = useState<BugOutVehicle[]>([])
  const [formLoadPriorities, setFormLoadPriorities] = useState<LoadPriority[]>([])

  useEffect(() => {
    fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) })
  }, [tribeId])

  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember && tribe ? getAuthority(myMember, tribe) : 'member'
  const canManage = hasAuthority(myAuth, 'elder_council')

  function startNewPlan() {
    setFormName('')
    setFormTrigger('')
    setFormStatus('draft')
    setFormRouteId('')
    setFormNotes('')
    setFormVehicles([])
    setFormLoadPriorities([])
    setEditingPlan(null)
    setShowNewForm(true)
  }

  function startEditPlan(plan: BugOutPlan) {
    setFormName(plan.name)
    setFormTrigger(plan.triggerCondition)
    setFormStatus(plan.status === 'active' ? 'ready' : plan.status as 'draft' | 'ready')
    setFormRouteId(plan.routeId ?? '')
    setFormNotes(plan.notes ?? '')
    try { setFormVehicles(JSON.parse(plan.vehiclesJson)) } catch { setFormVehicles([]) }
    try { setFormLoadPriorities(JSON.parse(plan.loadPrioritiesJson)) } catch { setFormLoadPriorities([]) }
    setEditingPlan(plan)
    setShowNewForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim() || !identity) return
    setSaving(true)
    try {
      const now = Date.now()
      await saveBugOutPlan(tribeId, {
        id: editingPlan?.id,
        tribeId,
        name: formName.trim(),
        status: formStatus,
        triggerCondition: formTrigger.trim(),
        routeId: formRouteId || undefined,
        vehiclesJson: JSON.stringify(formVehicles),
        loadPrioritiesJson: JSON.stringify(formLoadPriorities),
        rallyPointIdsJson: editingPlan?.rallyPointIdsJson ?? '[]',
        notes: formNotes.trim() || undefined,
        activatedAt: editingPlan?.activatedAt,
        activatedBy: editingPlan?.activatedBy,
        createdAt: editingPlan?.createdAt ?? now,
        createdBy: editingPlan?.createdBy ?? identity.pub,
        updatedAt: now,
      })
      setShowNewForm(false)
      setEditingPlan(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleActivate(planId: string) {
    if (!identity) return
    await activateBugOutPlan(tribeId, planId, identity.pub)
    setShowActivateConfirm(null)
  }

  async function handleDeactivate(plan: BugOutPlan) {
    if (!identity) return
    await saveBugOutPlan(tribeId, {
      ...plan,
      status: 'ready',
      activatedAt: undefined,
      activatedBy: undefined,
      updatedAt: Date.now(),
    })
  }

  function addVehicle() {
    setFormVehicles(prev => [...prev, { id: nanoid(), label: '', capacity: 4, passengerPubs: [] }])
  }

  function updateVehicle(idx: number, patch: Partial<BugOutVehicle>) {
    setFormVehicles(prev => prev.map((v, i) => i === idx ? { ...v, ...patch } : v))
  }

  function removeVehicle(idx: number) {
    setFormVehicles(prev => prev.filter((_, i) => i !== idx))
  }

  function addLoadPriority() {
    setFormLoadPriorities(prev => [...prev, { id: nanoid(), order: prev.length + 1, category: '' }])
  }

  function updateLoadPriority(idx: number, patch: Partial<LoadPriority>) {
    setFormLoadPriorities(prev => prev.map((lp, i) => i === idx ? { ...lp, ...patch } : lp))
  }

  function removeLoadPriority(idx: number) {
    setFormLoadPriorities(prev => prev.filter((_, i) => i !== idx))
  }

  const STATUS_BADGE: Record<string, string> = {
    draft: 'text-gray-400 border-gray-700',
    ready: 'text-forest-400 border-forest-700',
    active: 'text-orange-400 border-orange-700',
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/tribe/$tribeId" params={{ tribeId }} className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← Dashboard
      </Link>
      <OfflineStageBanner stage={offlineStage} offlineSince={offlineSince} />
      <h2 className="text-xl font-bold text-gray-100 mb-4">Bug-Out Planning</h2>

      {/* Active plan banner */}
      {activePlan && (
        <div className="card border-orange-700/60 bg-orange-950/30 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
            <span className="text-sm font-bold text-orange-300">BUG-OUT ACTIVE: {activePlan.name}</span>
          </div>
          <p className="text-xs text-orange-400 mb-2">{activePlan.triggerCondition}</p>
          {canManage && (
            <button
              className="text-xs text-gray-400 hover:text-gray-300 border border-gray-700 px-2 py-1 rounded"
              onClick={() => handleDeactivate(activePlan)}
            >
              Deactivate
            </button>
          )}
        </div>
      )}

      {canManage && !showNewForm && (
        <button className="btn-primary w-full text-sm mb-4" onClick={startNewPlan}>
          + New Bug-Out Plan
        </button>
      )}

      {/* Plan form */}
      {showNewForm && (
        <form onSubmit={handleSave} className="card space-y-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-200">
            {editingPlan ? 'Edit Plan' : 'New Bug-Out Plan'}
          </h3>
          <input
            className="input text-sm"
            placeholder="Plan name *"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            required
          />
          <textarea
            className="input text-sm"
            placeholder="Trigger condition (e.g. 'Immediate threat to base')"
            value={formTrigger}
            onChange={e => setFormTrigger(e.target.value)}
            rows={2}
          />
          <select
            className="input text-sm"
            value={formStatus}
            onChange={e => setFormStatus(e.target.value as 'draft' | 'ready')}
          >
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
          </select>
          <select
            className="input text-sm"
            value={formRouteId}
            onChange={e => setFormRouteId(e.target.value)}
          >
            <option value="">No route selected</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          {/* Vehicles */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400">Vehicles</p>
              <button type="button" className="text-xs text-forest-400 hover:text-forest-300" onClick={addVehicle}>
                + Add
              </button>
            </div>
            {formVehicles.map((v, idx) => (
              <div key={v.id} className="border border-forest-800 rounded-lg p-2 mb-2 space-y-1">
                <div className="flex gap-2">
                  <input
                    className="input text-xs flex-1"
                    placeholder="Label (e.g. Main truck)"
                    value={v.label}
                    onChange={e => updateVehicle(idx, { label: e.target.value })}
                  />
                  <input
                    className="input text-xs w-16"
                    type="number"
                    placeholder="Cap."
                    value={v.capacity}
                    onChange={e => updateVehicle(idx, { capacity: Number(e.target.value) })}
                    min={1}
                  />
                  <button type="button" className="text-danger-400 text-sm px-1" onClick={() => removeVehicle(idx)}>×</button>
                </div>
                <select
                  className="input text-xs"
                  value={v.driverPub ?? ''}
                  onChange={e => updateVehicle(idx, { driverPub: e.target.value || undefined })}
                >
                  <option value="">No driver</option>
                  {members.map(m => (
                    <option key={m.pubkey} value={m.pubkey}>{m.displayName}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Load priorities */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400">Load Priorities</p>
              <button type="button" className="text-xs text-forest-400 hover:text-forest-300" onClick={addLoadPriority}>
                + Add
              </button>
            </div>
            {formLoadPriorities.map((lp, idx) => (
              <div key={lp.id} className="border border-forest-800 rounded-lg p-2 mb-2 space-y-1">
                <div className="flex gap-2">
                  <input
                    className="input text-xs w-12"
                    type="number"
                    placeholder="#"
                    value={lp.order}
                    onChange={e => updateLoadPriority(idx, { order: Number(e.target.value) })}
                    min={1}
                  />
                  <input
                    className="input text-xs flex-1"
                    placeholder="Category (e.g. Water)"
                    value={lp.category}
                    onChange={e => updateLoadPriority(idx, { category: e.target.value })}
                  />
                  <button type="button" className="text-danger-400 text-sm px-1" onClick={() => removeLoadPriority(idx)}>×</button>
                </div>
                <input
                  className="input text-xs"
                  placeholder="Description"
                  value={lp.description ?? ''}
                  onChange={e => updateLoadPriority(idx, { description: e.target.value || undefined })}
                />
                <select
                  className="input text-xs"
                  value={lp.assignedTo ?? ''}
                  onChange={e => updateLoadPriority(idx, { assignedTo: e.target.value || undefined })}
                >
                  <option value="">No assignee</option>
                  {members.map(m => (
                    <option key={m.pubkey} value={m.pubkey}>{m.displayName}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <textarea
            className="input text-sm"
            placeholder="Notes"
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            rows={2}
          />

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 text-sm" disabled={saving || !formName.trim()}>
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
            <button type="button" className="btn-secondary flex-1 text-sm" onClick={() => { setShowNewForm(false); setEditingPlan(null) }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Plan list */}
      <div className="space-y-3">
        {plans.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">No bug-out plans yet</p>
        ) : (
          plans.map(plan => {
            const route = routes.find(r => r.id === plan.routeId)
            let vehicles: BugOutVehicle[] = []
            try { vehicles = JSON.parse(plan.vehiclesJson) } catch { /* empty */ }
            return (
              <div key={plan.id} className="card">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-100 flex-1">{plan.name}</span>
                  <span className={`text-xs border px-1.5 py-0.5 rounded flex-shrink-0 ${STATUS_BADGE[plan.status] ?? ''}`}>
                    {plan.status}
                  </span>
                </div>
                {plan.triggerCondition && (
                  <p className="text-xs text-gray-400 mb-1">{plan.triggerCondition}</p>
                )}
                {route && (
                  <p className="text-xs text-gray-500 mb-1">Route: {route.name}</p>
                )}
                {vehicles.length > 0 && (
                  <p className="text-xs text-gray-500 mb-2">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</p>
                )}
                {canManage && (
                  <div className="flex gap-2 mt-2">
                    <button
                      className="text-xs text-forest-400 hover:text-forest-300"
                      onClick={() => startEditPlan(plan)}
                    >
                      Edit
                    </button>
                    {plan.status === 'ready' && (
                      <button
                        className="text-xs text-orange-400 hover:text-orange-300"
                        onClick={() => setShowActivateConfirm(plan.id)}
                      >
                        Activate
                      </button>
                    )}
                    {plan.status === 'active' && (
                      <button
                        className="text-xs text-gray-400 hover:text-gray-300"
                        onClick={() => handleDeactivate(plan)}
                      >
                        Deactivate
                      </button>
                    )}
                    <button
                      className="text-xs text-danger-400 hover:text-danger-300 ml-auto"
                      onClick={() => deleteBugOutPlan(tribeId, plan.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Activate confirm modal */}
      {showActivateConfirm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end justify-center z-[2000]"
          onClick={e => { if (e.target === e.currentTarget) setShowActivateConfirm(null) }}
        >
          <div className="bg-forest-950 border border-orange-700 rounded-t-2xl w-full max-w-md px-6 pt-5 pb-8">
            <h3 className="text-gray-100 font-semibold mb-2">Activate Bug-Out Plan?</h3>
            <p className="text-xs text-gray-400 mb-4">
              This will alert all tribe members. Confirm?
            </p>
            <div className="flex gap-2">
              <button
                className="btn-primary flex-1 bg-orange-700 hover:bg-orange-600 border-orange-600"
                onClick={() => handleActivate(showActivateConfirm)}
              >
                Activate
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowActivateConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
