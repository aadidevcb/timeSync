import { useState } from 'react'
import { Download, FileSpreadsheet, CalendarCheck, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import AuthButton from './AuthButton'
import BASE_URL from '../api.js'

const API_URL = BASE_URL

function ExportCard({ icon: Icon, title, description, action, disabled }) {
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm">{title}</h4>
          <p className="text-white/40 text-xs mt-0.5">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

export default function ExportPanel({
  events,
  semesterStart,
  semesterEnd,
  recurrenceType,
  accessToken,
  userEmail,
  onAuth,
  onLogout,
  onDone,
}) {
  const [icsLoading, setIcsLoading] = useState(false)
  const [icsError, setIcsError] = useState(null)
  const [gcalLoading, setGcalLoading] = useState(false)
  const [gcalError, setGcalError] = useState(null)
  const [gcalResult, setGcalResult] = useState(null)

  // ── ICS export ───────────────────────────────────────────────────────────
  const handleIcsDownload = async () => {
    setIcsLoading(true)
    setIcsError(null)
    try {
      const res = await fetch(`${API_URL}/api/export/ics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, semester_start: semesterStart, semester_end: semesterEnd, recurrence_type: recurrenceType }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || `Error ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'timetable.ics'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setIcsError(e.message)
    } finally {
      setIcsLoading(false)
    }
  }

  // ── CSV export (client-side) ─────────────────────────────────────────────
  const handleCsvDownload = () => {
    const rows = [
      ['subject', 'day', 'start_time', 'end_time', 'type', 'location'],
      ...events.map((e) => [
        e.subject, e.day, e.start_time, e.end_time, e.type, e.location,
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'timetable.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── GCal sync ────────────────────────────────────────────────────────────
  const handleGcalSync = async () => {
    if (!accessToken) return
    setGcalLoading(true)
    setGcalError(null)
    try {
      const res = await fetch(`${API_URL}/api/sync/gcal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ events, semester_start: semesterStart, semester_end: semesterEnd, recurrence_type: recurrenceType }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || `Error ${res.status}`)
      const data = await res.json()
      setGcalResult(data)
      onDone?.()
    } catch (e) {
      setGcalError(e.message)
    } finally {
      setGcalLoading(false)
    }
  }

  const missingDates = !semesterStart || !semesterEnd

  const EXPORT_OPTIONS = [
    {
      icon: Download,
      title: 'Download .ics',
      description: 'Import into any calendar app — Apple, Outlook, Google',
      action: (
        <div>
          <button
            onClick={handleIcsDownload}
            disabled={icsLoading || missingDates}
            className="accent-btn w-full flex items-center justify-center gap-2 text-sm"
          >
            {icsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {icsLoading ? 'Generating...' : 'Download .ics'}
          </button>
          {missingDates && <p className="text-white/30 text-xs mt-2 text-center">Set semester dates first</p>}
          {icsError && (
            <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {icsError}
            </p>
          )}
        </div>
      ),
    },
    {
      icon: FileSpreadsheet,
      title: 'Download CSV',
      description: 'Spreadsheet-friendly format, no account needed',
      action: (
        <button
          onClick={handleCsvDownload}
          className="ghost-btn w-full flex items-center justify-center gap-2 text-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Download CSV
        </button>
      ),
    },
    {
      icon: CalendarCheck,
      title: 'Sync to Google Calendar',
      description: 'Creates a "My Timetable" calendar with recurring events',
      action: (
        <div className="flex flex-col gap-3">
          {!accessToken ? (
            <AuthButton accessToken={accessToken} userEmail={userEmail} onAuth={onAuth} onLogout={onLogout} />
          ) : (
            <div className="space-y-2">
              <AuthButton accessToken={accessToken} userEmail={userEmail} onAuth={onAuth} onLogout={onLogout} />
              <button
                onClick={handleGcalSync}
                disabled={gcalLoading || missingDates}
                className="accent-btn w-full flex items-center justify-center gap-2 text-sm"
              >
                {gcalLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Syncing...</>
                ) : (
                  <><CalendarCheck className="w-4 h-4" /> Sync Now</>
                )}
              </button>
            </div>
          )}
          {missingDates && accessToken && (
            <p className="text-white/30 text-xs text-center">Set semester dates first</p>
          )}
          {gcalError && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {gcalError}
            </p>
          )}
          {gcalResult && (
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              {gcalResult.created} events synced!
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="animate-slide-up">
      <h3 className="text-base font-bold text-white mb-4">Export</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {EXPORT_OPTIONS.map((opt) => (
          <ExportCard key={opt.title} {...opt} />
        ))}
      </div>
    </div>
  )
}
