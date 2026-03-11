import { useState, useEffect } from 'react'
import { Calendar, RefreshCw } from 'lucide-react'

const WEEKDAYS = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 }

function firstOccurrence(dayName, semesterStart) {
  const start = new Date(semesterStart)
  const target = WEEKDAYS[dayName] ?? 0
  const dayOfWeek = start.getDay() === 0 ? 6 : start.getDay() - 1  // convert to Mon=0
  const daysAhead = (target - dayOfWeek + 7) % 7
  const result = new Date(start)
  result.setDate(result.getDate() + daysAhead)
  return result
}

function countOccurrences(events, semesterStart, semesterEnd, recurrenceType) {
  if (!semesterStart || !semesterEnd || events.length === 0) return { total: 0, firstDate: null }
  if (recurrenceType === 'onetime') return { total: events.length, firstDate: null }

  const end = new Date(semesterEnd)
  let total = 0
  let firstDate = null

  events.forEach((ev) => {
    const first = firstOccurrence(ev.day, semesterStart)
    if (!firstDate || first < firstDate) firstDate = first
    let current = new Date(first)
    while (current <= end) {
      total++
      current.setDate(current.getDate() + 7)
    }
  })

  return { total, firstDate }
}

export default function DateRangePicker({ semesterStart, semesterEnd, recurrenceType, events, onChange }) {
  const { total, firstDate } = countOccurrences(events, semesterStart, semesterEnd, recurrenceType)

  const fmt = (d) => d?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="glass-card p-6 animate-slide-up">
      <h3 className="text-base font-bold text-white flex items-center gap-2 mb-5">
        <Calendar className="w-4 h-4 text-amber-400" />
        Semester Range
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs text-white/40 font-medium mb-1.5">Semester Start</label>
          <input
            type="date"
            className="input-field font-mono text-sm"
            value={semesterStart}
            onChange={(e) => onChange('semesterStart', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-white/40 font-medium mb-1.5">Semester End</label>
          <input
            type="date"
            className="input-field font-mono text-sm"
            value={semesterEnd}
            onChange={(e) => onChange('semesterEnd', e.target.value)}
          />
        </div>
      </div>

      {/* Recurrence toggle */}
      <div className="flex items-center gap-1 bg-navy-950/60 rounded-xl p-1 mb-5 w-fit">
        {[
          { value: 'weekly',  label: 'Weekly (recurring)' },
          { value: 'onetime', label: 'One time only' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange('recurrenceType', opt.value)}
            className={`
              rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200
              ${recurrenceType === opt.value
                ? 'bg-amber-500 text-navy-950 shadow-md'
                : 'text-white/50 hover:text-white'
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Preview */}
      {semesterStart && semesterEnd && events.length > 0 ? (
        <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 text-sm">
          <RefreshCw className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-amber-100/80">
            This will create{' '}
            <span className="text-amber-400 font-bold">{total} calendar event{total !== 1 ? 's' : ''}</span>
            {recurrenceType === 'weekly' && firstDate && (
              <>, first on <span className="text-amber-400 font-semibold">{fmt(firstDate)}</span></>
            )}
          </p>
        </div>
      ) : (
        <p className="text-white/30 text-sm">Set both dates to preview event count.</p>
      )}
    </div>
  )
}
