import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Plus, PenLine, AlertTriangle } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TYPES = ['Lecture', 'Lab', 'Tutorial', 'Break']
const START_HOUR = 8     // 08:00
const END_HOUR = 19      // 19:00
const TOTAL_HOURS = END_HOUR - START_HOUR
const DAY_LABEL_W = 64   // px for the left day-label column
const DAY_HEIGHT = 86    // px height for each day row
const SNAP_MINUTES = 5   // snap granularity

// Palette of (bg, border accent, text) triplets - Light Mode
const PALETTE = [
  { bg: 'rgba(231,234,254,0.9)', border: '#6366F1', text: '#3730A3' },
  { bg: 'rgba(244,233,255,0.9)', border: '#8B5CF6', text: '#6D28D9' },
  { bg: 'rgba(225,249,233,0.9)', border: '#22C55E', text: '#15803D' },
  { bg: 'rgba(255,228,228,0.9)', border: '#EF4444', text: '#B91C1C' },
  { bg: 'rgba(253,243,220,0.9)', border: '#F59E0B', text: '#B45309' },
  { bg: 'rgba(214,247,239,0.9)', border: '#06B6D4', text: '#0E7490' },
  { bg: 'rgba(255,228,244,0.9)', border: '#EC4899', text: '#9D174D' },
  { bg: 'rgba(239,250,209,0.9)', border: '#84CC16', text: '#4D7C0F' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeToMin(t) {
  if (!t || !t.includes(':')) return START_HOUR * 60
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function minToPct(min) {
  return ((min - START_HOUR * 60) / (TOTAL_HOURS * 60)) * 100
}

function snap(min) {
  return Math.round(min / SNAP_MINUTES) * SNAP_MINUTES
}

function clamp(val, lo, hi) {
  return Math.max(lo, Math.min(hi, val))
}

function subjectColor(subject, map) {
  if (!map[subject]) {
    const idx = Object.keys(map).length % PALETTE.length
    map[subject] = PALETTE[idx]
  }
  return map[subject]
}

const EMPTY_EVENT = {
  subject: 'New Class',
  day: 'Monday',
  start_time: '09:00',
  end_time: '09:50',
  type: 'Lecture',
  location: '',
  _flagged: false,
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TimetableEditor({ events, onEventsChange }) {
  const colorMapRef = useRef({})
  useEffect(() => {
    const existing = colorMapRef.current
    events.forEach(ev => subjectColor(ev.subject, existing))
  })

  const [editingIdx, setEditingIdx] = useState(null)
  const drag = useRef(null)
  const [preview, setPreview] = useState(null)
  const gridRef = useRef(null)

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  const startDrag = useCallback((e, idx, kind /* 'move' | 'resize' */) => {
    if (editingIdx !== null) return
    e.preventDefault()
    e.stopPropagation()
    const ev = events[idx]
    drag.current = {
      idx,
      kind,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origStartMin: timeToMin(ev.start_time),
      origEndMin:   timeToMin(ev.end_time),
      origDayIdx:   DAYS.indexOf(ev.day),
      moved: false,
    }
  }, [events, editingIdx])

  const onMouseMove = useCallback((e) => {
    if (!drag.current) return
    const d = drag.current
    const dX = e.clientX - d.startClientX
    const dY = e.clientY - d.startClientY
    if (Math.abs(dX) > 3 || Math.abs(dY) > 3) d.moved = true

    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return

    // Determine row (day) from mouse Y
    const relY = e.clientY - rect.top
    const newDayIdx = clamp(Math.floor(relY / DAY_HEIGHT), 0, 4)

    // Determine time change from mouse X dynamically based on rendered width
    const timeGridContainer = gridRef.current.querySelector('.time-grid-container')
    const containerWidth = timeGridContainer ? timeGridContainer.clientWidth : 800
    const dMin = (dX / containerWidth) * (TOTAL_HOURS * 60)
    const duration = d.origEndMin - d.origStartMin

    if (d.kind === 'move') {
      let s = snap(d.origStartMin + dMin)
      let en = s + duration
      if (s  < START_HOUR * 60)  { s  = START_HOUR * 60;  en = s + duration }
      if (en > END_HOUR   * 60)  { en = END_HOUR   * 60;  s  = en - duration }
      setPreview({ dayIdx: newDayIdx, startMin: s, endMin: en })
    } else {
      const newEnd = clamp(snap(d.origEndMin + dMin), d.origStartMin + SNAP_MINUTES, END_HOUR * 60)
      setPreview({ dayIdx: d.origDayIdx, startMin: d.origStartMin, endMin: newEnd })
    }
  }, [])

  const onMouseUp = useCallback(() => {
    if (!drag.current) return
    const d = drag.current

    if (d.moved && preview) {
      const updated = events.map((ev, i) => {
        if (i !== d.idx) return ev
        if (d.kind === 'move') {
          return {
            ...ev,
            day:        DAYS[preview.dayIdx],
            start_time: minToTime(preview.startMin),
            end_time:   minToTime(preview.endMin),
          }
        } else {
          return { ...ev, end_time: minToTime(preview.endMin) }
        }
      })
      onEventsChange(updated)
    } else if (!d.moved) {
      setEditingIdx(d.idx)
    }

    drag.current = null
    setPreview(null)
  }, [preview, events, onEventsChange])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  // ── Event CRUD ──────────────────────────────────────────────────────────────
  const updateEvent = (idx, patch) =>
    onEventsChange(events.map((ev, i) => i === idx ? { ...ev, ...patch, _flagged: false } : ev))

  const deleteEvent = (idx) => {
    if (editingIdx === idx) setEditingIdx(null)
    onEventsChange(events.filter((_, i) => i !== idx))
  }

  const addEvent = () => {
    onEventsChange([...events, { ...EMPTY_EVENT }])
    setEditingIdx(events.length)
  }

  // ── Render helpers ──────────────────────────────────────────────────────────
  const flaggedCount = events.filter(e => e._flagged).length
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)
  const isDragging = drag.current !== null

  return (
    <div className="animate-fade-up w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-display font-extrabold flex items-center gap-2" style={{ fontSize: 19, color: 'var(--text)' }}>
            <PenLine className="w-5 h-5" style={{ color: 'var(--gold)' }} />
            Weekly Timetable
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {events.length} event{events.length !== 1 ? 's' : ''}
            <span className="ml-2" style={{ color: 'var(--subtle)' }}>· Drag to move / resize · Click to edit</span>
          </p>
        </div>
        <button onClick={addEvent} className="btn-ghost">
          <Plus className="w-4 h-4" />
          Add Class
        </button>
      </div>

      {flaggedCount > 0 && (
        <div style={{
          background: 'var(--gold-bg)', border: '1px solid var(--gold-border)',
          borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--gold)',
          display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16
        }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {flaggedCount} event{flaggedCount > 1 ? 's were' : ' was'} flagged — verify the highlighted blocks.
        </div>
      )}

      {/* Calendar grid wrapper (horizontal scrolling if too squished) */}
      <div className="rounded-2xl overflow-x-auto no-scrollbar w-full" style={{ background: '#FFFFFF', border: '1px solid #EAE8E3', boxShadow: 'var(--shadow)' }}>
        {/* We use flex layout allowing it to stretch but guaranteeing a minimum width for usability */}
        <div style={{ minWidth: 700, width: '100%' }}>
          
          {/* Time header row */}
          <div className="flex border-b" style={{ borderColor: '#EAE8E3', background: '#FAFAF9', height: 44 }}>
            <div className="flex-shrink-0 sticky left-0 z-30" style={{ width: DAY_LABEL_W, background: '#FAFAF9' }} />
            <div className="relative flex-1" style={{ width: '100%' }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute text-[11px] font-semibold tracking-widest bottom-2 font-mono"
                  style={{ left: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%`, transform: 'translateX(-50%)', color: '#9A968D' }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Day rows */}
          <div
            ref={gridRef}
            className="relative flex flex-col"
            style={{
              cursor: isDragging ? 'grabbing' : 'default',
              userSelect: 'none',
            }}
          >
            {DAYS.map((day, dayIdx) => {
              const rowEvents = events
                .map((ev, idx) => ({ ev, idx }))
                .filter(({ ev }) => ev.day === day)

              // Is a dragged-move preview landing in this row?
              const previewHere =
                drag.current &&
                drag.current.kind === 'move' &&
                preview?.dayIdx === dayIdx &&
                preview.dayIdx !== drag.current.origDayIdx

              return (
                <div
                  key={day}
                  className="flex relative border-b group"
                  style={{ height: DAY_HEIGHT, borderColor: '#EAE8E3' }}
                >
                  {/* Day label (sticky on the left) */}
                  <div 
                    className="sticky left-0 z-20 flex-shrink-0 flex items-center justify-center border-r" 
                    style={{ width: DAY_LABEL_W, background: '#FAFAF9', borderColor: '#EAE8E3' }}
                  >
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#9A968D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {day.slice(0, 3)}
                    </span>
                  </div>

                  {/* Scrollable time area for this row */}
                  <div className="relative flex-1 time-grid-container" style={{ width: '100%' }}>
                    {/* Hour grid lines */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute top-0 bottom-0 border-l"
                        style={{ left: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%`, borderColor: 'rgba(28,27,26,0.06)' }}
                      />
                    ))}
                    {/* Half-hour lines */}
                    {hours.slice(0, -1).map((h) => (
                      <div
                        key={`${h}h`}
                        className="absolute top-0 bottom-0 border-l"
                        style={{ left: `${(((h - START_HOUR) + 0.5) / TOTAL_HOURS) * 100}%`, borderColor: 'rgba(28,27,26,0.03)' }}
                      />
                    ))}

                    {/* Render events in this row */}
                    {rowEvents.map(({ ev, idx }) => {
                      const isDraggingThis = drag.current?.idx === idx
                      const color = subjectColor(ev.subject, colorMapRef.current)

                      let blockLeft, blockW, ghost = false

                      if (isDraggingThis && preview) {
                        if (drag.current.kind === 'resize') {
                          blockLeft = minToPct(preview.startMin)
                          blockW    = Math.max(minToPct(preview.endMin) - blockLeft, 0.5)
                        } else if (preview.dayIdx === dayIdx) {
                          // Moving within or into this same row
                          blockLeft = minToPct(preview.startMin)
                          blockW    = Math.max(minToPct(preview.endMin) - blockLeft, 0.5)
                        } else {
                          // Moving to a different row — show ghost here
                          const s = timeToMin(ev.start_time)
                          const en = timeToMin(ev.end_time)
                          blockLeft = minToPct(s)
                          blockW    = Math.max(minToPct(en) - blockLeft, 0.5)
                          ghost     = true
                        }
                      } else {
                        const s  = timeToMin(ev.start_time)
                        const en = timeToMin(ev.end_time)
                        blockLeft = minToPct(s)
                        blockW    = Math.max(minToPct(en) - blockLeft, 0.5)
                      }

                      return (
                        <EventBlock
                          key={idx}
                          event={ev}
                          idx={idx}
                          left={blockLeft}
                          width={blockW}
                          color={color}
                          ghost={ghost}
                          dragging={isDraggingThis && !ghost}
                          editing={editingIdx === idx}
                          onMoveMouseDown={(e) => startDrag(e, idx, 'move')}
                          onResizeMouseDown={(e) => { e.stopPropagation(); startDrag(e, idx, 'resize') }}
                          onEdit={(patch) => updateEvent(idx, patch)}
                          onDelete={() => deleteEvent(idx)}
                          onCloseEdit={() => setEditingIdx(null)}
                        />
                      )
                    })}

                    {/* Cross-row drag preview */}
                    {previewHere && drag.current && (
                      <CrossRowPreview
                        startMin={preview.startMin}
                        endMin={preview.endMin}
                        event={events[drag.current.idx]}
                        color={subjectColor(events[drag.current.idx]?.subject, colorMapRef.current)}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── EventBlock ───────────────────────────────────────────────────────────────
function EventBlock({
  event, idx, left, width, color,
  ghost, dragging, editing,
  onMoveMouseDown, onResizeMouseDown,
  onEdit, onDelete, onCloseEdit,
}) {
  const popRef = useRef(null)

  useEffect(() => {
    if (!editing) return
    const handler = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) onCloseEdit()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [editing, onCloseEdit])

  const flagged = event._flagged

  return (
    <div
      className="absolute rounded-lg overflow-visible"
      style={{
        left:   `${left}%`,
        width:  `${width}%`,
        top:    '4px',
        bottom: '4px',
        backgroundColor: color.bg,
        borderLeft:  `3px solid ${flagged ? 'var(--gold)' : color.border}`,
        border:       flagged
          ? `1.5px solid var(--gold-border)`
          : `1px solid ${color.border}`,
        opacity:    ghost ? 0.4 : 1,
        cursor:     dragging ? 'grabbing' : 'grab',
        transition: dragging ? 'none' : 'box-shadow 0.15s, opacity 0.15s',
        boxShadow:  dragging ? `0 8px 32px rgba(28,27,26,0.15), 0 0 0 2px ${color.border}` : 'none',
        zIndex:     editing ? 50 : dragging ? 40 : 10,
        willChange: 'left, width',
      }}
      onMouseDown={onMoveMouseDown}
    >
      {/* Content */}
      <div className="px-2 py-1.5 h-full flex flex-col justify-center overflow-hidden pointer-events-none select-none">
        <p
          className="text-xs font-semibold leading-tight truncate"
          style={{ color: color.text }}
        >
          {event.subject}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] leading-tight truncate font-medium" style={{ color: color.text, opacity: 0.75 }}>
            {event.location || event.type}
          </span>
          <span className="text-[9px] font-mono whitespace-nowrap" style={{ color: color.text, opacity: 0.50 }}>
            • {event.start_time}–{event.end_time}
          </span>
        </div>
      </div>

      {/* Flagged icon */}
      {flagged && (
        <div className="absolute top-1.5 left-1.5 pointer-events-none">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
        </div>
      )}

      {/* Delete ×  */}
      <button
        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-100 pointer-events-auto z-20"
        style={{ color: color.text, opacity: 0.6 }}
        onMouseOver={e => { e.currentTarget.style.backgroundColor = '#EF4444'; e.currentTarget.style.color = 'white'; e.currentTarget.style.opacity = '1' }}
        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = color.text; e.currentTarget.style.opacity = '0.6' }}
        onMouseDown={(e) => { e.stopPropagation(); onDelete() }}
        title="Delete"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Resize handle (Right edge) */}
      <div
        className="absolute top-0 bottom-0 right-0 flex items-center justify-center pointer-events-auto"
        style={{ width: 12, cursor: 'e-resize' }}
        onMouseDown={onResizeMouseDown}
      >
        <div className="h-5 w-[2px] rounded-full" style={{ background: 'rgba(28,27,26,0.2)' }} />
      </div>

      {/* Edit popover */}
      {editing && (
        <div
          ref={popRef}
          className="absolute z-50 w-64 rounded-xl pointer-events-auto"
          style={{
            top: 'calc(100% + 8px)',
            left: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-4 space-y-3">
            <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Edit Event</p>

            <label className="block">
              <span style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>Subject</span>
              <input
                className="input-field py-1.5"
                value={event.subject}
                onChange={(e) => onEdit({ subject: e.target.value })}
                autoFocus
              />
            </label>

            <label className="block">
              <span style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>Location</span>
              <input
                className="input-field py-1.5"
                value={event.location || ''}
                placeholder="Room / Building"
                onChange={(e) => onEdit({ location: e.target.value })}
              />
            </label>

            <label className="block">
              <span style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>Type</span>
              <select
                className="input-field py-1.5"
                value={event.type}
                onChange={(e) => onEdit({ type: e.target.value })}
              >
                {['Lecture','Lab','Tutorial','Break','Elective'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>Start</span>
                <input
                  type="time"
                  className="input-field py-1.5 font-mono text-sm"
                  value={event.start_time}
                  onChange={(e) => onEdit({ start_time: e.target.value })}
                />
              </label>
              <label className="block">
                <span style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'block', fontWeight: 500 }}>End</span>
                <input
                  type="time"
                  className="input-field py-1.5 font-mono text-sm"
                  value={event.end_time}
                  onChange={(e) => onEdit({ end_time: e.target.value })}
                />
              </label>
            </div>

            <button
              className="btn-primary w-full justify-center py-2.5 mt-2"
              onClick={onCloseEdit}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Cross-row drag preview ───────────────────────────────────────────────────
function CrossRowPreview({ startMin, endMin, color, event }) {
  const left  = minToPct(startMin)
  const width = Math.max(minToPct(endMin) - left, 0.5)

  return (
    <div
      className="absolute rounded-lg pointer-events-none"
      style={{
        left:   `${left}%`,
        width:  `${width}%`,
        top:    '4px',
        bottom: '4px',
        backgroundColor: color.bg,
        border: `2px dashed ${color.border}`,
        opacity: 0.6,
        zIndex: 35,
      }}
    >
      <div className="px-2 py-1.5 h-full flex items-center overflow-hidden">
        <p className="text-xs font-semibold truncate" style={{ color: color.text }}>
          {event?.subject}
        </p>
      </div>
    </div>
  )
}
