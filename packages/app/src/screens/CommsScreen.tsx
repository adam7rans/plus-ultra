import { useState, useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { nanoid } from 'nanoid'
import { useIdentity } from '../contexts/IdentityContext'
import { usePacePlan } from '../hooks/usePacePlan'
import { savePacePlan, exportPacePlanAsText } from '../lib/comms'
import { subscribeToMembers, fetchTribeMeta } from '../lib/tribes'
import { hasAuthority, getAuthority } from '@plus-ultra/core'
import type {
  TribeMember, Tribe,
  PaceMethod, CheckInSchedule, RallyPoint,
  CommsLevel, CommsMethod,
} from '@plus-ultra/core'
import { useOfflineStage } from '../hooks/useOfflineStage'
import OfflineStageBanner from '../components/OfflineStageBanner'
import { copyText } from '../lib/platform/share'
import AppIcon from '../components/AppIcon'
import { AppButton, AppCard, AppEmptyState, AppField, AppInput, AppSelect } from '../components/ui'

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMS_LEVEL_ORDER: CommsLevel[] = ['primary', 'alternate', 'contingency', 'emergency']

const COMMS_LEVEL_META: Record<CommsLevel, { label: string; color: string }> = {
  primary:     { label: 'Primary',     color: 'text-forest-400' },
  alternate:   { label: 'Alternate',   color: 'text-blue-400' },
  contingency: { label: 'Contingency', color: 'text-yellow-400' },
  emergency:   { label: 'Emergency',   color: 'text-red-400' },
}

const COMMS_METHOD_LABELS: Record<CommsMethod, string> = {
  app:          'App (this app)',
  ham_radio:    'HAM Radio',
  frs_gmrs:     'FRS/GMRS',
  cb:           'CB Radio',
  phone:        'Phone/SMS',
  runner:       'Runner',
  signal_mirror:'Signal Mirror',
  other:        'Other',
}

const FREQ_LABELS: Record<string, string> = {
  daily:       'Daily',
  twice_daily: 'Twice daily',
  weekly:      'Weekly',
  as_needed:   'As needed',
}

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = 'pace' | 'checkins' | 'rally' | 'codewords'

export default function CommsScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/comms' })
  const { identity } = useIdentity()
  const { plan } = usePacePlan(tribeId)
  const { offlineStage, offlineSince } = useOfflineStage()
  const [members, setMembers] = useState<TribeMember[]>([])
  const [tribe, setTribe] = useState<Tribe | null>(null)
  const [tab, setTab] = useState<Tab>('pace')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) })
    const unsub = subscribeToMembers(tribeId, setMembers)
    return unsub
  }, [tribeId])

  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember && tribe ? getAuthority(myMember, tribe) : (myMember?.authorityRole ?? 'member')
  const canEdit = hasAuthority(myAuth, 'elder_council')

  // Parse plan data — guard against corrupted JSON from Gun partial writes
  function safeParse<T>(json: string | undefined, fallback: T): T {
    try { return JSON.parse(json ?? '') as T } catch { return fallback }
  }
  const methods: PaceMethod[] = plan ? safeParse<PaceMethod[]>(plan.methodsJson, []) : []
  const checkIns: CheckInSchedule[] = plan ? safeParse<CheckInSchedule[]>(plan.checkInSchedulesJson, []) : []
  const rallyPoints: RallyPoint[] = plan ? safeParse<RallyPoint[]>(plan.rallyPointsJson, []) : []
  const codeWords: Record<string, string> = plan ? safeParse<Record<string, string>>(plan.codeWordsJson, {}) : {}

  // HAM cert members and comms contacts suggestion
  const hamMembers = members.filter(m => m.role && ['ham_operator', 'comms_specialist'].includes(m.role as string))

  async function handleSave(
    newMethods: PaceMethod[],
    newCheckIns: CheckInSchedule[],
    newRallyPoints: RallyPoint[],
    newCodeWords: Record<string, string>,
  ) {
    if (!identity) return
    setSaving(true)
    try {
      await savePacePlan(tribeId, newMethods, newCheckIns, newRallyPoints, newCodeWords, identity.pub)
    } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    if (!plan) return
    const text = exportPacePlanAsText(plan)
    await copyText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        <AppIcon name="back" size={16} /> Dashboard
      </Link>

      <OfflineStageBanner stage={offlineStage} offlineSince={offlineSince} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-100">Comms Plan</h2>
        {plan && (
          <AppButton
            variant="secondary"
            size="sm"
            className={copied ? '!border-forest-500 !text-forest-300' : '!border-forest-800 !text-gray-400 hover:!border-forest-600'}
            onClick={handleExport}
          >
            {copied ? <span className="inline-flex items-center gap-1"><AppIcon name="check" size={16} /> Copied</span> : 'Export'}
          </AppButton>
        )}
      </div>

      {!canEdit && (
        <p className="text-xs text-gray-500 mb-4">Read-only — elder council can edit</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {(['pace', 'checkins', 'rally', 'codewords'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              tab === t
                ? 'border-forest-500 bg-forest-900/50 text-forest-200'
                : 'border-forest-800 text-gray-400 hover:border-forest-600'
            }`}
          >
            {t === 'pace' ? 'PACE' : t === 'checkins' ? 'Check-Ins' : t === 'rally' ? 'Rally Points' : 'Code Words'}
          </button>
        ))}
      </div>

      {/* PACE Tab */}
      {tab === 'pace' && (
        <PaceTab
          methods={methods}
          canEdit={canEdit}
          saving={saving}
          hamMembers={hamMembers}
          onSave={m => handleSave(m, checkIns, rallyPoints, codeWords)}
        />
      )}

      {/* Check-Ins Tab */}
      {tab === 'checkins' && (
        <CheckInsTab
          checkIns={checkIns}
          canEdit={canEdit}
          saving={saving}
          onSave={c => handleSave(methods, c, rallyPoints, codeWords)}
        />
      )}

      {/* Rally Points Tab */}
      {tab === 'rally' && (
        <RallyTab
          rallyPoints={rallyPoints}
          canEdit={canEdit}
          saving={saving}
          onSave={r => handleSave(methods, checkIns, r, codeWords)}
        />
      )}

      {/* Code Words Tab */}
      {tab === 'codewords' && (
        <CodeWordsTab
          codeWords={codeWords}
          canEdit={canEdit}
          saving={saving}
          onSave={cw => handleSave(methods, checkIns, rallyPoints, cw)}
        />
      )}
    </div>
  )
}

// ─── PACE Tab ─────────────────────────────────────────────────────────────────

function PaceTab({
  methods, canEdit, saving, hamMembers, onSave,
}: {
  methods: PaceMethod[]
  canEdit: boolean
  saving: boolean
  hamMembers: TribeMember[]
  onSave: (m: PaceMethod[]) => void
}) {
  const [editing, setEditing] = useState<CommsLevel | null>(null)
  const [editMethod, setEditMethod] = useState<CommsMethod>('app')
  const [editDetails, setEditDetails] = useState('')
  const [editTrigger, setEditTrigger] = useState('')
  const [editNotes, setEditNotes] = useState('')

  function startEdit(level: CommsLevel) {
    const existing = methods.find(m => m.level === level)
    setEditMethod(existing?.method ?? 'app')
    setEditDetails(existing?.details ?? '')
    setEditTrigger(existing?.triggerCondition ?? '')
    setEditNotes(existing?.notes ?? '')
    setEditing(level)
  }

  function saveEntry() {
    if (!editing) return
    const updated = methods.filter(m => m.level !== editing)
    updated.push({ level: editing, method: editMethod, details: editDetails, triggerCondition: editTrigger, notes: editNotes || undefined })
    // Sort by canonical level order
    updated.sort((a, b) => COMMS_LEVEL_ORDER.indexOf(a.level) - COMMS_LEVEL_ORDER.indexOf(b.level))
    onSave(updated)
    setEditing(null)
  }

  return (
    <div className="space-y-3">
      {COMMS_LEVEL_ORDER.map(level => {
        const m = methods.find(e => e.level === level)
        const meta = COMMS_LEVEL_META[level]
        const isEditing = editing === level

        return (
          <AppCard key={level}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold uppercase tracking-widest ${meta.color}`}>
                {meta.label}
              </span>
              {canEdit && !isEditing && (
                <AppButton
                  variant="ghost"
                  size="sm"
                  className="!text-gray-500 hover:!text-forest-400"
                  onClick={() => startEdit(level)}
                >
                  {m ? 'Edit' : '+ Add'}
                </AppButton>
              )}
            </div>

            {!isEditing && m && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-14">Method</span>
                  <span className="text-xs text-gray-200">{COMMS_METHOD_LABELS[m.method]}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-500 w-14">Details</span>
                  <span className="text-xs text-gray-300">{m.details}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-500 w-14">Trigger</span>
                  <span className="text-xs text-gray-400 italic">{m.triggerCondition}</span>
                </div>
                {m.notes && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-500 w-14">Notes</span>
                    <span className="text-xs text-gray-500">{m.notes}</span>
                  </div>
                )}
              </div>
            )}

            {!isEditing && !m && (
              <p className="text-xs text-gray-600">Not configured</p>
            )}

            {isEditing && (
              <div className="space-y-2 mt-1">
                <AppField label="Method">
                  <AppSelect
                    value={editMethod}
                    onChange={e => setEditMethod(e.target.value as CommsMethod)}
                  >
                    {(Object.keys(COMMS_METHOD_LABELS) as CommsMethod[]).map(k => (
                      <option key={k} value={k}>{COMMS_METHOD_LABELS[k]}</option>
                    ))}
                  </AppSelect>
                  {/* HAM suggestions */}
                  {editMethod === 'ham_radio' && hamMembers.length > 0 && (
                    <p className="text-xs text-forest-400 mt-1">
                      HAM ops in tribe: {hamMembers.map(m => m.displayName).join(', ')}
                    </p>
                  )}
                </AppField>
                <AppField label="Details (freq, channel, callsign…)">
                  <AppInput
                    type="text"
                    placeholder={editMethod === 'ham_radio' ? '146.520 MHz / KD9XYZ' : editMethod === 'frs_gmrs' ? 'Channel 7' : ''}
                    value={editDetails}
                    onChange={e => setEditDetails(e.target.value)}
                  />
                </AppField>
                <AppField label="Trigger condition">
                  <AppInput
                    type="text"
                    placeholder="When app relay is unreachable…"
                    value={editTrigger}
                    onChange={e => setEditTrigger(e.target.value)}
                  />
                </AppField>
                <AppField label="Notes (optional)">
                  <AppInput
                    type="text"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                  />
                </AppField>
                <div className="flex gap-2">
                  <AppButton className="flex-1 text-sm" onClick={saveEntry} disabled={saving || !editDetails.trim() || !editTrigger.trim()}>
                    {saving ? 'Saving…' : 'Save'}
                  </AppButton>
                  <AppButton variant="secondary" className="flex-1 text-sm" onClick={() => setEditing(null)}>Cancel</AppButton>
                </div>
              </div>
            )}
          </AppCard>
        )
      })}
    </div>
  )
}

// ─── Check-Ins Tab ────────────────────────────────────────────────────────────

function CheckInsTab({
  checkIns, canEdit, saving, onSave,
}: {
  checkIns: CheckInSchedule[]
  canEdit: boolean
  saving: boolean
  onSave: (c: CheckInSchedule[]) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [timeOfDay, setTimeOfDay] = useState('08:00')
  const [frequency, setFrequency] = useState<CheckInSchedule['frequency']>('daily')
  const [method, setMethod] = useState<CommsMethod>('ham_radio')
  const [details, setDetails] = useState('')
  const [notes, setNotes] = useState('')

  function openNew() {
    setEditId(null); setLabel(''); setTimeOfDay('08:00'); setFrequency('daily')
    setMethod('ham_radio'); setDetails(''); setNotes(''); setShowForm(true)
  }

  function openEdit(c: CheckInSchedule) {
    setEditId(c.id); setLabel(c.label); setTimeOfDay(c.timeOfDay)
    setFrequency(c.frequency); setMethod(c.method); setDetails(c.details)
    setNotes(c.notes ?? ''); setShowForm(true)
  }

  function saveEntry() {
    if (!label.trim() || !details.trim()) return
    const entry: CheckInSchedule = { id: editId ?? nanoid(), label, timeOfDay, frequency, method, details, notes: notes || undefined }
    const updated = editId ? checkIns.map(c => c.id === editId ? entry : c) : [...checkIns, entry]
    onSave(updated)
    setShowForm(false)
  }

  return (
    <div className="space-y-3">
      {checkIns.length === 0 && !showForm && (
        <AppEmptyState icon="clock" title="No check-in schedules yet" />
      )}
      {checkIns.map(c => (
        <AppCard key={c.id}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-200">{c.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {c.timeOfDay} · {FREQ_LABELS[c.frequency]} · {COMMS_METHOD_LABELS[c.method]}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{c.details}</div>
              {c.notes && <div className="text-xs text-gray-600 mt-0.5">{c.notes}</div>}
            </div>
            {canEdit && (
              <div className="flex gap-2 ml-2">
                <AppButton variant="ghost" size="sm" className="!text-gray-500 hover:!text-forest-400" onClick={() => openEdit(c)}>Edit</AppButton>
                <AppButton variant="icon" icon="close" iconSize={16} className="hover:!text-red-400" onClick={() => onSave(checkIns.filter(x => x.id !== c.id))} aria-label="Delete schedule" />
              </div>
            )}
          </div>
        </AppCard>
      ))}

      {canEdit && !showForm && (
        <button className="w-full py-2.5 rounded-xl border border-dashed border-forest-800 text-forest-500 text-sm hover:border-forest-600" onClick={openNew}>
          + Add Schedule
        </button>
      )}

      {showForm && (
        <AppCard className="space-y-2">
          <AppField label="Label">
            <AppInput type="text" placeholder="Morning net" value={label} onChange={e => setLabel(e.target.value)} />
          </AppField>
          <div className="flex gap-2">
            <div className="flex-1">
              <AppField label="Time">
                <AppInput type="time" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)} />
              </AppField>
            </div>
            <div className="flex-1">
              <AppField label="Frequency">
                <AppSelect value={frequency} onChange={e => setFrequency(e.target.value as CheckInSchedule['frequency'])}>
                  {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </AppSelect>
              </AppField>
            </div>
          </div>
          <AppField label="Method">
            <AppSelect value={method} onChange={e => setMethod(e.target.value as CommsMethod)}>
              {(Object.keys(COMMS_METHOD_LABELS) as CommsMethod[]).map(k => (
                <option key={k} value={k}>{COMMS_METHOD_LABELS[k]}</option>
              ))}
            </AppSelect>
          </AppField>
          <AppField label="Details">
            <AppInput type="text" placeholder="146.520 MHz, Channel 7…" value={details} onChange={e => setDetails(e.target.value)} />
          </AppField>
          <AppField label="Notes (optional)">
            <AppInput type="text" value={notes} onChange={e => setNotes(e.target.value)} />
          </AppField>
          <div className="flex gap-2">
            <AppButton className="flex-1 text-sm" onClick={saveEntry} disabled={saving || !label.trim() || !details.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </AppButton>
            <AppButton variant="secondary" className="flex-1 text-sm" onClick={() => setShowForm(false)}>Cancel</AppButton>
          </div>
        </AppCard>
      )}
    </div>
  )
}

// ─── Rally Points Tab ─────────────────────────────────────────────────────────

function RallyTab({
  rallyPoints, canEdit, saving, onSave,
}: {
  rallyPoints: RallyPoint[]
  canEdit: boolean
  saving: boolean
  onSave: (r: RallyPoint[]) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [trigger, setTrigger] = useState('')
  const [notes, setNotes] = useState('')

  function openNew() {
    setEditId(null); setLabel(''); setDescription(''); setTrigger(''); setNotes('')
    setShowForm(true)
  }

  function openEdit(r: RallyPoint) {
    setEditId(r.id); setLabel(r.label); setDescription(r.description)
    setTrigger(r.triggerCondition); setNotes(r.notes ?? ''); setShowForm(true)
  }

  function saveEntry() {
    if (!label.trim() || !description.trim() || !trigger.trim()) return
    const entry: RallyPoint = { id: editId ?? nanoid(), label, description, triggerCondition: trigger, notes: notes || undefined }
    const updated = editId ? rallyPoints.map(r => r.id === editId ? entry : r) : [...rallyPoints, entry]
    onSave(updated)
    setShowForm(false)
  }

  return (
    <div className="space-y-3">
      {rallyPoints.length === 0 && !showForm && (
        <AppEmptyState icon="pin" title="No rally points configured" />
      )}
      {rallyPoints.map(r => (
        <AppCard key={r.id}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-200">{r.label}</div>
              <div className="text-xs text-gray-300 mt-0.5">{r.description}</div>
              <div className="text-xs text-gray-500 mt-0.5">Trigger: {r.triggerCondition}</div>
              {r.notes && <div className="text-xs text-gray-600 mt-0.5">{r.notes}</div>}
            </div>
            {canEdit && (
              <div className="flex gap-2 ml-2">
                <AppButton variant="ghost" size="sm" className="!text-gray-500 hover:!text-forest-400" onClick={() => openEdit(r)}>Edit</AppButton>
                <AppButton variant="icon" icon="close" iconSize={16} className="hover:!text-red-400" onClick={() => onSave(rallyPoints.filter(x => x.id !== r.id))} aria-label="Delete rally point" />
              </div>
            )}
          </div>
        </AppCard>
      ))}

      {canEdit && !showForm && (
        <button className="w-full py-2.5 rounded-xl border border-dashed border-forest-800 text-forest-500 text-sm hover:border-forest-600" onClick={openNew}>
          + Add Rally Point
        </button>
      )}

      {showForm && (
        <AppCard className="space-y-2">
          <AppField label="Label">
            <AppInput type="text" placeholder="Primary rally" value={label} onChange={e => setLabel(e.target.value)} />
          </AppField>
          <AppField label="Description / Location">
            <AppInput type="text" placeholder="Old barn at crossroads on County Rd 5" value={description} onChange={e => setDescription(e.target.value)} />
          </AppField>
          <AppField label="Trigger condition">
            <AppInput type="text" placeholder="If separated from base…" value={trigger} onChange={e => setTrigger(e.target.value)} />
          </AppField>
          <AppField label="Notes (optional)">
            <AppInput type="text" value={notes} onChange={e => setNotes(e.target.value)} />
          </AppField>
          <div className="flex gap-2">
            <AppButton className="flex-1 text-sm" onClick={saveEntry} disabled={saving || !label.trim() || !description.trim() || !trigger.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </AppButton>
            <AppButton variant="secondary" className="flex-1 text-sm" onClick={() => setShowForm(false)}>Cancel</AppButton>
          </div>
        </AppCard>
      )}
    </div>
  )
}

// ─── Code Words Tab ───────────────────────────────────────────────────────────

function CodeWordsTab({
  codeWords, canEdit, saving, onSave,
}: {
  codeWords: Record<string, string>
  canEdit: boolean
  saving: boolean
  onSave: (cw: Record<string, string>) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [word, setWord] = useState('')
  const [meaning, setMeaning] = useState('')

  const entries = Object.entries(codeWords)

  function saveEntry() {
    if (!word.trim() || !meaning.trim()) return
    onSave({ ...codeWords, [word.trim()]: meaning.trim() })
    setWord(''); setMeaning(''); setShowForm(false)
  }

  return (
    <div className="space-y-3">
      {entries.length === 0 && !showForm && (
        <AppEmptyState icon="lock" title="No code words configured" />
      )}
      {entries.map(([w, m]) => (
        <AppCard key={w} className="!py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-forest-300">"{w}"</span>
              <span className="text-xs text-gray-400">= {m}</span>
            </div>
            {canEdit && (
              <AppButton
                variant="icon"
                icon="close"
                iconSize={16}
                className="hover:!text-red-400"
                onClick={() => {
                  const updated = { ...codeWords }
                  delete updated[w]
                  onSave(updated)
                }}
                aria-label="Delete code word"
              />
            )}
          </div>
        </AppCard>
      ))}

      {canEdit && !showForm && (
        <button className="w-full py-2.5 rounded-xl border border-dashed border-forest-800 text-forest-500 text-sm hover:border-forest-600" onClick={() => setShowForm(true)}>
          + Add Code Word
        </button>
      )}

      {showForm && (
        <AppCard className="space-y-2">
          <AppField label="Code Word">
            <AppInput type="text" placeholder="Eagle" value={word} onChange={e => setWord(e.target.value)} />
          </AppField>
          <AppField label="Meaning">
            <AppInput type="text" placeholder="All clear" value={meaning} onChange={e => setMeaning(e.target.value)} />
          </AppField>
          <div className="flex gap-2">
            <AppButton className="flex-1 text-sm" onClick={saveEntry} disabled={saving || !word.trim() || !meaning.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </AppButton>
            <AppButton variant="secondary" className="flex-1 text-sm" onClick={() => setShowForm(false)}>Cancel</AppButton>
          </div>
        </AppCard>
      )}
    </div>
  )
}
