import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useEvents } from '../hooks/useEvents'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { createEvent, updateEvent, deleteEvent, cancelEvent } from '../lib/events'
import { fetchTribeMeta } from '../lib/tribes'
import {
  EVENT_TYPE_META, ALL_EVENT_TYPES,
  expandOccurrences, formatTime,
  dayBounds, weekBounds, monthBounds,
  canCreateEvent, canCreateAnyEvent, canEditEvent,
  AUTHORITY_META, getAuthority,
} from '@plus-ultra/core'
import type { EventType, ScheduledEvent, RecurrenceFrequency, Tribe } from '@plus-ultra/core'

type ViewMode = 'day' | 'week' | 'month'

export default function ScheduleScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/schedule' })
  const { identity } = useIdentity()
  const events = useEvents(tribeId)
  const { members, skills } = useSurvivabilityScore(tribeId)
  const [tribe, setTribe] = useState<Tribe | null>(null)

  // Load tribe metadata for permission checks
  useState(() => { fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) }) })

  // Find current member for permission checks
  const me = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = me && tribe ? getAuthority(me, tribe) : 'member'
  const skillsList = skills.map(s => ({ memberId: s.memberId, role: s.role }))
  const showCreateBtn = me && tribe ? canCreateAnyEvent(me, tribe, skillsList) : false

  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [viewDate, setViewDate] = useState(new Date())
  const [filterType, setFilterType] = useState<EventType | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null)

  // Form state (shared between create and edit)
  const [newType, setNewType] = useState<EventType>('duty')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDate, setNewDate] = useState(todayStr())
  const [newTime, setNewTime] = useState('08:00')
  const [newDuration, setNewDuration] = useState(60)
  const [newFreq, setNewFreq] = useState<RecurrenceFrequency>('once')
  const [newLocation, setNewLocation] = useState('')

  const filteredEvents = filterType === 'all'
    ? events.filter(e => !e.cancelled)
    : events.filter(e => !e.cancelled && e.type === filterType)

  // Compute window based on view mode
  const bounds = viewMode === 'day' ? dayBounds(viewDate)
    : viewMode === 'week' ? weekBounds(viewDate)
    : monthBounds(viewDate)

  // Expand all occurrences in the window
  const occurrences: { event: ScheduledEvent; startAt: number; endAt: number }[] = []
  for (const event of filteredEvents) {
    const occ = expandOccurrences(event, bounds.start, bounds.end)
    for (const o of occ) {
      occurrences.push({ event, startAt: o.startAt, endAt: o.endAt })
    }
  }
  occurrences.sort((a, b) => a.startAt - b.startAt)

  // Navigation
  function navigate(dir: -1 | 1) {
    const d = new Date(viewDate)
    if (viewMode === 'day') d.setDate(d.getDate() + dir)
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setViewDate(d)
  }

  function resetForm() {
    setNewType('duty')
    setNewTitle('')
    setNewDesc('')
    setNewDate(todayStr())
    setNewTime('08:00')
    setNewDuration(60)
    setNewFreq('once')
    setNewLocation('')
  }

  function startEdit(event: ScheduledEvent) {
    setEditingEvent(event)
    setShowCreate(false)
    setNewType(event.type)
    setNewTitle(event.title)
    setNewDesc(event.description)
    const d = new Date(event.startAt)
    setNewDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    setNewTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    setNewDuration(event.durationMin)
    setNewFreq(event.recurrence.frequency)
    setNewLocation(event.location)
  }

  function cancelEdit() {
    setEditingEvent(null)
    resetForm()
  }

  async function handleCreate() {
    if (!identity || !newTitle.trim()) return
    const [y, m, d] = newDate.split('-').map(Number)
    const [hh, mm] = newTime.split(':').map(Number)
    const startAt = new Date(y, m - 1, d, hh, mm).getTime()

    await createEvent(tribeId, identity.pub, {
      type: newType,
      title: newTitle.trim(),
      description: newDesc.trim(),
      startAt,
      durationMin: newDuration,
      recurrence: { frequency: newFreq },
      assignedTo: [],
      location: newLocation.trim(),
    })

    setShowCreate(false)
    resetForm()
  }

  async function handleUpdate() {
    if (!editingEvent || !newTitle.trim()) return
    const [y, m, d] = newDate.split('-').map(Number)
    const [hh, mm] = newTime.split(':').map(Number)
    const startAt = new Date(y, m - 1, d, hh, mm).getTime()

    await updateEvent(tribeId, editingEvent.id, {
      type: newType,
      title: newTitle.trim(),
      description: newDesc.trim(),
      startAt,
      durationMin: newDuration,
      recurrence: { frequency: newFreq },
      location: newLocation.trim(),
    })

    cancelEdit()
  }

  async function handleDelete(eventId: string) {
    await deleteEvent(tribeId, eventId)
    if (editingEvent?.id === eventId) cancelEdit()
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Back to Dashboard
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-100">Schedule</h2>
        <div className="flex items-center gap-2">
          {me && tribe && (
            <span className="text-xs text-gray-500">
              {AUTHORITY_META[myAuth].icon} {AUTHORITY_META[myAuth].label}
            </span>
          )}
          {showCreateBtn && (
            <button
              className="btn-primary text-sm px-3 py-1.5"
              onClick={() => {
                if (editingEvent) cancelEdit()
                else setShowCreate(prev => !prev)
              }}
            >
              {showCreate || editingEvent ? 'Cancel' : '+ Event'}
            </button>
          )}
        </div>
      </div>

      {/* Create / Edit form */}
      {(showCreate || editingEvent) && (
        <div className={`card mb-4 space-y-3 ${editingEvent ? 'border-warning-600' : 'border-forest-600'}`}>
          {editingEvent && (
            <div className="text-xs text-warning-400 font-semibold">✏️ Editing: {editingEvent.title}</div>
          )}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_EVENT_TYPES.filter(t => me && tribe ? canCreateEvent(me, t, tribe, skillsList) : false).map(t => {
                const meta = EVENT_TYPE_META[t]
                return (
                  <button
                    key={t}
                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 border ${
                      newType === t
                        ? 'border-forest-500 bg-forest-900/50 text-forest-300'
                        : 'border-forest-800 text-gray-400 hover:border-forest-600'
                    }`}
                    onClick={() => {
                      setNewType(t)
                      if (!newTitle) setNewTitle(meta.label)
                      setNewDuration(meta.defaultDurationMin)
                    }}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Title</label>
            <input
              className="w-full bg-forest-950 border border-forest-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-forest-500 outline-none"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date</label>
              <input
                type="date"
                className="w-full bg-forest-950 border border-forest-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-forest-500 outline-none"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Time</label>
              <input
                type="time"
                className="w-full bg-forest-950 border border-forest-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-forest-500 outline-none"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Duration (min)</label>
              <input
                type="number"
                className="w-full bg-forest-950 border border-forest-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-forest-500 outline-none"
                value={newDuration}
                onChange={e => setNewDuration(Number(e.target.value) || 60)}
                min={5}
                step={5}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Recurrence</label>
              <select
                className="w-full bg-forest-950 border border-forest-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-forest-500 outline-none"
                value={newFreq}
                onChange={e => setNewFreq(e.target.value as RecurrenceFrequency)}
              >
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Location (optional)</label>
            <input
              className="w-full bg-forest-950 border border-forest-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-forest-500 outline-none"
              value={newLocation}
              onChange={e => setNewLocation(e.target.value)}
              placeholder="e.g. mess hall, guard post"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Description (optional)</label>
            <textarea
              className="w-full bg-forest-950 border border-forest-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-forest-500 outline-none resize-none"
              rows={2}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Notes about the event"
            />
          </div>

          {editingEvent ? (
            <div className="flex gap-2">
              <button
                className="btn-primary flex-1"
                onClick={handleUpdate}
                disabled={!newTitle.trim()}
              >
                Save Changes
              </button>
              <button
                className="flex-1 border border-danger-600 text-danger-400 hover:bg-danger-900/30 rounded-lg py-2 text-sm font-medium"
                onClick={() => handleDelete(editingEvent.id)}
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              className="btn-primary w-full"
              onClick={handleCreate}
              disabled={!newTitle.trim()}
            >
              Create Event
            </button>
          )}
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex items-center gap-1 mb-3">
        {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
              viewMode === mode
                ? 'border-forest-500 bg-forest-900/50 text-forest-300'
                : 'border-forest-800 text-gray-500 hover:border-forest-600'
            }`}
            onClick={() => setViewMode(mode)}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-3">
        <button className="text-forest-400 text-sm px-2" onClick={() => navigate(-1)}>← Prev</button>
        <button
          className="text-sm text-gray-200 font-medium"
          onClick={() => setViewDate(new Date())}
        >
          {viewMode === 'day' && viewDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          {viewMode === 'week' && `Week of ${new Date(bounds.start).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
          {viewMode === 'month' && viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </button>
        <button className="text-forest-400 text-sm px-2" onClick={() => navigate(1)}>Next →</button>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          className={`px-2 py-1 rounded text-xs border ${
            filterType === 'all'
              ? 'border-forest-500 bg-forest-900/50 text-forest-300'
              : 'border-forest-800 text-gray-500 hover:border-forest-600'
          }`}
          onClick={() => setFilterType('all')}
        >
          All
        </button>
        {ALL_EVENT_TYPES.map(t => {
          const meta = EVENT_TYPE_META[t]
          return (
            <button
              key={t}
              className={`px-2 py-1 rounded text-xs border flex items-center gap-1 ${
                filterType === t
                  ? 'border-forest-500 bg-forest-900/50 text-forest-300'
                  : 'border-forest-800 text-gray-500 hover:border-forest-600'
              }`}
              onClick={() => setFilterType(filterType === t ? 'all' : t)}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </button>
          )
        })}
      </div>

      {/* Event list */}
      {occurrences.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500 text-sm">No events in this {viewMode}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {occurrences.map((occ, i) => {
            const meta = EVENT_TYPE_META[occ.event.type]
            const now = Date.now()
            const isActive = occ.startAt <= now && occ.endAt > now
            const isPast = occ.endAt <= now
            const canCancel = me && tribe ? canEditEvent(me, occ.event, tribe, skillsList) : false

            return (
              <div
                key={`${occ.event.id}-${occ.startAt}-${i}`}
                className={`card flex items-start gap-3 ${
                  isActive ? 'border-forest-500 bg-forest-900/20' :
                  isPast ? 'opacity-50' : ''
                }`}
              >
                <span className="text-xl mt-0.5">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-100 truncate">
                      {occ.event.title}
                    </span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-forest-400 animate-pulse flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatTime(occ.startAt)} – {formatTime(occ.endAt)}
                    {occ.event.location && <span> · {occ.event.location}</span>}
                  </div>
                  {occ.event.description && (
                    <div className="text-xs text-gray-600 mt-1 truncate">{occ.event.description}</div>
                  )}
                  {occ.event.recurrence.frequency !== 'once' && (
                    <div className="text-xs text-forest-600 mt-0.5">
                      ↻ {occ.event.recurrence.frequency}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 mt-0.5">
                  <span className="text-xs text-gray-600">{occ.event.durationMin}m</span>
                  {canCancel && !isPast && (
                    <button
                      className="text-xs text-forest-400 hover:text-forest-300"
                      onClick={() => startEdit(occ.event)}
                    >
                      Edit
                    </button>
                  )}
                  {canCancel && !isPast && (
                    <button
                      className="text-xs text-danger-400 hover:text-danger-300"
                      onClick={() => cancelEvent(tribeId, occ.event.id)}
                    >
                      Cancel
                    </button>
                  )}
                  {canCancel && (
                    <button
                      className="text-xs text-gray-600 hover:text-danger-400"
                      onClick={() => handleDelete(occ.event.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
