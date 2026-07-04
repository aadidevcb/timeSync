import { Calendar, RefreshCw } from 'lucide-react'

const WEEKDAYS = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 }

function firstOccurrence(dayName, semesterStart) {
  const start = new Date(semesterStart)
  const target = WEEKDAYS[dayName] ?? 0
  const dayOfWeek = start.getDay() === 0 ? 6 : start.getDay() - 1
  const daysAhead = (target - dayOfWeek + 7) % 7
  const result = new Date(start)
  result.setDate(result.getDate() + daysAhead)
  return result
}

function countOccurrences(events, semesterStart, semesterEnd, recurrenceType) {
  if (!semesterStart || !semesterEnd || events.length === 0) return { total: 0, firstDate: null }
  if (recurrenceType === 'onetime') return { total: events.length, firstDate: null }
  const end = new Date(semesterEnd)
  let total = 0, firstDate = null
  events.forEach((ev) => {
    const first = firstOccurrence(ev.day, semesterStart)
    if (!firstDate || first < firstDate) firstDate = first
    let current = new Date(first)
    while (current <= end) { total++; current.setDate(current.getDate() + 7) }
  })
  return { total, firstDate }
}

export default function DateRangePicker({ semesterStart, semesterEnd, recurrenceType, events, onChange }) {
  const { total, firstDate } = countOccurrences(events, semesterStart, semesterEnd, recurrenceType)
  const fmt = (d) => d?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="card p-6 animate-fade-up">
      <h3 className="font-display font-extrabold flex items-center gap-2 mb-5" style={{ fontSize: 17, color: 'var(--text)' }}>
        <Calendar className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Semester Range
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block mb-1.5" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Semester Start</label>
          <input type="date" className="input-field" value={semesterStart} onChange={(e) => onChange('semesterStart', e.target.value)} />
        </div>
        <div>
          <label className="block mb-1.5" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Semester End</label>
          <input type="date" className="input-field" value={semesterEnd} onChange={(e) => onChange('semesterEnd', e.target.value)} />
        </div>
      </div>

      {/* Recurrence toggle */}
      <div className="flex gap-2 mb-4">
        {[
          { value: 'weekly', label: 'Weekly (Recurring)' },
          { value: 'onetime', label: 'One Time Only' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onChange('recurrenceType', value)}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              border: `1px solid ${recurrenceType === value ? 'var(--gold-border)' : 'var(--border)'}`,
              background: recurrenceType === value ? 'var(--gold-bg)' : 'var(--bg)',
              color: recurrenceType === value ? 'var(--gold)' : 'var(--muted)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Preview */}
      {semesterStart && semesterEnd && events.length > 0 ? (
        <div style={{
          background: 'var(--success-bg)', border: '1px solid var(--success-border)',
          borderRadius: 12, padding: '14px 16px', fontSize: 13,
          color: 'var(--success-text)', display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <RefreshCw className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            This will create <strong>{total} calendar event{total !== 1 ? 's' : ''}</strong>
            {recurrenceType === 'weekly' && firstDate && <>, starting <strong>{fmt(firstDate)}</strong></>}.
          </p>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--subtle)' }}>Set both dates to preview event count.</p>
      )}
    </div>
  )
}
