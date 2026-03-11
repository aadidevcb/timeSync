import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Plus, PenLine, AlertTriangle } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TYPES = ['Lecture', 'Lab', 'Tutorial', 'Break']
const START_HOUR = 8     // 08:00
const END_HOUR = 19      // 19:00
const HOUR_HEIGHT = 80   // px per hour  →  1 min = 80/60 px
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT
const TIME_LABEL_W = 64  // px for the left time-label column
const SNAP_MINUTES = 5   // snap granularity

// Paletteof (bg, border accent, text) triplets - dark enough for white text overlay
const PALETTE = [
  { bg: 'rgba(37,56,120,0.85)',  border: '#4076d8', text: '#93c5fd' },
  { bg: 'rgba(80,34,110,0.85)',  border: '#9b5de5', text: '#d8b4fe' },
  { bg: 'rgba(22,80,60,0.85)',   border: '#22c55e', text: '#86efac' },
  { bg: 'rgba(110,40,40,0.85)',  border: '#ef4444', text: '#fca5a5' },
  { bg: 'rgba(100,70,15,0.85)',  border: '#f59e0b', text: '#fde68a' },
  { bg: 'rgba(20,80,100,0.85)',  border: '#06b6d4', text: '#67e8f9' },
  { bg: 'rgba(110,35,75,0.85)',  border: '#ec4899', text: '#f9a8d4' },
  { bg: 'rgba(60,80,20,0.85)',   border: '#84cc16', text: '#bef264' },
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

function minToY(min) {
  return ((min - START_HOUR * 60) / 60) * HOUR_HEIGHT
}

function yToMin(y) {
  return (y / HOUR_HEIGHT) * 60 + START_HOUR * 60
}

function snap(min) {
  return Math.round(min / SNAP_MINUTES) * SNAP_MINUTES
}

function clamp(val, lo, hi) {
  return Math.max(lo, Math.min(hi, val))
}

// Deterministic color from subject string
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
  // colorMap is derived — reset when subject set changes
  const colorMapRef = useRef({})
  useEffect(() => {
    const existing = colorMapRef.current
    events.forEach(ev => subjectColor(ev.subject, existing))
  })

  const [editingIdx, setEditingIdx] = useState(null)

  // Drag state kept in a ref (doesn't need re-render mid-drag)
  const drag = useRef(null)
  // Visual override during drag: { dayIdx, startMin, endMin } or null
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
    const dY = e.clientY - d.startClientY
    const dX = e.clientX - d.startClientX
    if (Math.abs(dY) > 3 || Math.abs(dX) > 3) d.moved = true

    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return

    const colW = (rect.width - TIME_LABEL_W) / 5
    const relX  = e.clientX - rect.left - TIME_LABEL_W
    const newDayIdx = clamp(Math.floor(relX / colW), 0, 4)

    const dMin = (dY / HOUR_HEIGHT) * 60
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
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
  const isDragging = drag.current !== null

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PenLine className="w-5 h-5 text-amber-400" />
            Weekly Timetable
          </h2>
          <p className="text-white/40 text-sm mt-0.5">
            {events.length} event{events.length !== 1 ? 's' : ''}
            {flaggedCount > 0 && (
              <span className="ml-2 text-amber-400 font-medium">
                · {flaggedCount} flagged
              </span>
            )}
            <span className="ml-2 text-white/25">· Drag to move / resize · Click to edit</span>
          </p>
        </div>
        <button onClick={addEvent} className="ghost-btn flex items-center gap-2 text-sm py-2">
          <Plus className="w-4 h-4" />
          Add Class
        </button>
      </div>

      {flaggedCount > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 text-amber-300 text-sm animate-fade-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {flaggedCount} event{flaggedCount > 1 ? 's were' : ' was'} flagged — verify the amber-bordered blocks.
        </div>
      )}

      {/* Calendar grid */}
      <div className="glass-card overflow-hidden">
        {/* Day header row */}
        <div className="flex border-b border-white/10 bg-navy-900/50">
          <div className="flex-shrink-0" style={{ width: TIME_LABEL_W }} />
          {DAYS.map((day) => (
            <div
              key={day}
              className="flex-1 text-center py-3 text-xs font-semibold text-white/50 uppercase tracking-widest border-l border-white/8"
            >
              {day.slice(0, 3)}
            </div>
          ))}
        </div>

        {/* Scrollable time grid */}
        <div
          ref={gridRef}
          className="relative flex overflow-y-auto"
          style={{
            maxHeight: 520,
            cursor: isDragging ? 'grabbing' : 'default',
            userSelect: 'none',
          }}
        >
          {/* Time label column */}
          <div className="flex-shrink-0 relative" style={{ width: TIME_LABEL_W, height: TOTAL_HEIGHT }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-3 text-[10px] text-white/25 font-mono tabular-nums"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 7 }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((day, dayIdx) => {
            const colEvents = events
              .map((ev, idx) => ({ ev, idx }))
              .filter(({ ev }) => ev.day === day)

            // Is a dragged-move preview landing in this column?
            const previewHere =
              drag.current &&
              drag.current.kind === 'move' &&
              preview?.dayIdx === dayIdx &&
              preview.dayIdx !== drag.current.origDayIdx

            return (
              <div
                key={day}
                className="flex-1 relative border-l border-white/8"
                style={{ height: TOTAL_HEIGHT }}
              >
                {/* Hour grid lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-white/[0.07]"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}
                {/* Half-hour lines */}
                {hours.slice(0, -1).map((h) => (
                  <div
                    key={`${h}h`}
                    className="absolute left-0 right-0 border-t border-white/[0.03]"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  />
                ))}

                {/* Render events in this column */}
                {colEvents.map(({ ev, idx }) => {
                  const isDraggingThis = drag.current?.idx === idx
                  const color = subjectColor(ev.subject, colorMapRef.current)

                  // Work out where to render this block
                  let blockTop, blockH, ghost = false

                  if (isDraggingThis && preview) {
                    if (drag.current.kind === 'resize') {
                      blockTop = minToY(preview.startMin)
                      blockH   = Math.max(minToY(preview.endMin) - blockTop, 18)
                    } else if (preview.dayIdx === dayIdx) {
                      // Moving within or into this same column
                      blockTop = minToY(preview.startMin)
                      blockH   = Math.max(minToY(preview.endMin) - blockTop, 18)
                    } else {
                      // Moving to a different column — show ghost here
                      const s = timeToMin(ev.start_time)
                      const en = timeToMin(ev.end_time)
                      blockTop = minToY(s)
                      blockH   = Math.max(minToY(en) - blockTop, 18)
                      ghost    = true
                    }
                  } else {
                    const s  = timeToMin(ev.start_time)
                    const en = timeToMin(ev.end_time)
                    blockTop = minToY(s)
                    blockH   = Math.max(minToY(en) - blockTop, 18)
                  }

                  return (
                    <EventBlock
                      key={idx}
                      event={ev}
                      idx={idx}
                      top={blockTop}
                      height={blockH}
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

                {/* Cross-column drag preview */}
                {previewHere && drag.current && (
                  <CrossColPreview
                    startMin={preview.startMin}
                    endMin={preview.endMin}
                    event={events[drag.current.idx]}
                    color={subjectColor(events[drag.current.idx]?.subject, colorMapRef.current)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── EventBlock ───────────────────────────────────────────────────────────────
function EventBlock({
  event, idx, top, height, color,
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
    // Small delay so the mousedown that opened the popover doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [editing, onCloseEdit])

  const flagged = event._flagged

  return (
    <div
      className="absolute rounded-lg overflow-visible"
      style={{
        top:    `${top}px`,
        height: `${height}px`,
        left:   '3px',
        right:  '3px',
        backgroundColor: color.bg,
        borderLeft:  `3px solid ${flagged ? '#f59e0b' : color.border}`,
        border:       flagged
          ? `1.5px solid #f59e0b`
          : `1px solid ${color.border}`,
        opacity:    ghost ? 0.28 : 1,
        cursor:     dragging ? 'grabbing' : 'grab',
        transition: dragging ? 'none' : 'box-shadow 0.15s, opacity 0.15s',
        boxShadow:  dragging ? `0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px ${color.border}` : 'none',
        zIndex:     editing ? 50 : dragging ? 40 : 10,
        willChange: 'top, height',
      }}
      onMouseDown={onMoveMouseDown}
    >
      {/* Content */}
      <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden pointer-events-none select-none">
        <p
          className="text-[11px] font-semibold leading-tight truncate"
          style={{ color: color.text }}
        >
          {event.subject}
        </p>
        {height > 34 && (
          <p className="text-[10px] leading-tight truncate mt-0.5" style={{ color: color.text, opacity: 0.65 }}>
            {event.location || event.type}
          </p>
        )}
        {height > 54 && (
          <p className="text-[9px] font-mono mt-auto" style={{ color: color.text, opacity: 0.40 }}>
            {event.start_time}–{event.end_time}
          </p>
        )}
      </div>

      {/* Flagged icon */}
      {flagged && (
        <div className="absolute top-1 left-1.5 pointer-events-none">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
        </div>
      )}

      {/* Delete ×  */}
      <button
        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center
                   bg-black/0 hover:bg-red-500 transition-colors duration-100 pointer-events-auto z-20"
        onMouseDown={(e) => { e.stopPropagation(); onDelete() }}
        title="Delete"
      >
        <X className="w-2.5 h-2.5 text-white/60 hover:text-white" />
      </button>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center pointer-events-auto"
        style={{ height: 10, cursor: 's-resize' }}
        onMouseDown={onResizeMouseDown}
      >
        <div className="w-6 h-[2px] rounded-full bg-white/20" />
      </div>

      {/* Edit popover */}
      {editing && (
        <div
          ref={popRef}
          className="absolute left-0 z-50 w-56 rounded-xl shadow-2xl pointer-events-auto"
          style={{
            top: height + 6,
            background: '#161d50',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-3 space-y-2.5">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Edit Event</p>

            <label className="block">
              <span className="text-[10px] text-white/40 mb-1 block">Subject</span>
              <input
                className="input-field text-sm py-1.5"
                value={event.subject}
                onChange={(e) => onEdit({ subject: e.target.value })}
                autoFocus
              />
            </label>

            <label className="block">
              <span className="text-[10px] text-white/40 mb-1 block">Location</span>
              <input
                className="input-field text-sm py-1.5"
                value={event.location || ''}
                placeholder="Room / Building"
                onChange={(e) => onEdit({ location: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-[10px] text-white/40 mb-1 block">Type</span>
              <select
                className="input-field text-sm py-1.5"
                value={event.type}
                onChange={(e) => onEdit({ type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t} className="bg-navy-950">{t}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] text-white/40 mb-1 block">Start</span>
                <input
                  type="time"
                  className="input-field text-sm py-1.5 font-mono"
                  value={event.start_time}
                  onChange={(e) => onEdit({ start_time: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-white/40 mb-1 block">End</span>
                <input
                  type="time"
                  className="input-field text-sm py-1.5 font-mono"
                  value={event.end_time}
                  onChange={(e) => onEdit({ end_time: e.target.value })}
                />
              </label>
            </div>

            <button
              className="accent-btn w-full text-xs py-1.5"
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

// ─── Cross-column drag preview ────────────────────────────────────────────────
function CrossColPreview({ startMin, endMin, color, event }) {
  const top    = minToY(startMin)
  const height = Math.max(minToY(endMin) - top, 18)

  return (
    <div
      className="absolute rounded-lg pointer-events-none"
      style={{
        top:    `${top}px`,
        height: `${height}px`,
        left:   '3px',
        right:  '3px',
        backgroundColor: color.bg,
        border: `2px dashed ${color.border}`,
        opacity: 0.7,
        zIndex: 35,
      }}
    >
      <p
        className="px-2 py-1 text-[11px] font-semibold truncate"
        style={{ color: color.text }}
      >
        {event?.subject}
      </p>
    </div>
  )
}
