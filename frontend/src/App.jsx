import { useState, useEffect } from 'react'
import ImageUpload from './components/ImageUpload'
import TimetableEditor from './components/TimetableEditor'
import DateRangePicker from './components/DateRangePicker'
import ExportPanel from './components/ExportPanel'
import { Loader2, Sparkles, CalendarCheck, ArrowLeft, ExternalLink } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function getEndOfSemester() {
  const d = new Date()
  d.setMonth(d.getMonth() + 4)
  return d.toISOString().split('T')[0]
}

// ── Sub-views ─────────────────────────────────────────────────────────────

function LoadingView() {
  const messages = [
    'Reading your timetable…',
    'Identifying time slots…',
    'Parsing subjects and rooms…',
    'Almost there…',
  ]
  const [msgIdx, setMsgIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx((i) => (i + 1) % messages.length)
    }, 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-[320px] animate-fade-in">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
          <Sparkles className="w-9 h-9 text-amber-400 animate-pulse-slow" />
        </div>
        <div className="absolute -inset-2 rounded-3xl border-2 border-amber-500/20 animate-ping" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-lg">AI is reading your timetable...</p>
        <p className="text-white/40 text-sm mt-1 transition-all duration-500">{messages[msgIdx]}</p>
      </div>
    </div>
  )
}

function DoneView({ onReset, calendarUrl }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-[320px] text-center animate-slide-up">
      <div className="w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
        <CalendarCheck className="w-10 h-10 text-green-400" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white">You're all set! 🎉</h2>
        <p className="text-white/50 mt-2">Your timetable has been synced to Google Calendar.</p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="accent-btn flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open Google Calendar
        </a>
        <button onClick={onReset} className="ghost-btn flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Start over
        </button>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────

export default function App() {
  // State machine: 'upload' | 'loading' | 'editor' | 'done'
  const [view, setView] = useState('upload')

  const [events, setEvents] = useState([])
  const [semesterStart, setSemesterStart] = useState(getToday())
  const [semesterEnd, setSemesterEnd] = useState(getEndOfSemester())
  const [recurrenceType, setRecurrenceType] = useState('weekly')

  // Auth state — token in React state ONLY, never localStorage
  const [accessToken, setAccessToken] = useState(null)
  const [userEmail, setUserEmail] = useState(null)

  // Handle OAuth callback via URL fragment: /#access_token=...
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1))
      const token = params.get('access_token')
      if (token) {
        setAccessToken(token)
        // Try to fetch user email
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((info) => setUserEmail(info.email || 'Signed in'))
          .catch(() => setUserEmail('Signed in'))
        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  const handleParsed = (parsedEvents) => {
    setEvents(parsedEvents)
    setView('editor')
  }

  const handleDateChange = (key, value) => {
    if (key === 'semesterStart') setSemesterStart(value)
    else if (key === 'semesterEnd') setSemesterEnd(value)
    else if (key === 'recurrenceType') setRecurrenceType(value)
  }

  const handleReset = () => {
    setEvents([])
    setView('upload')
  }

  const handleDone = () => setView('done')

  return (
    <div className="relative min-h-screen">
      {/* Orb backgrounds */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Nav */}
        <header className="border-b border-white/8 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">TimeSync</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-white/40">
              {view === 'editor' && (
                <button
                  onClick={handleReset}
                  className="ghost-btn flex items-center gap-1.5 text-sm py-1.5 px-3"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Upload new
                </button>
              )}
              <span>Powered by Gemini</span>
            </div>
          </div>
        </header>

        {/* Steps indicator */}
        {(view === 'upload' || view === 'editor') && (
          <div className="max-w-6xl mx-auto px-6 pt-6 w-full">
            <div className="flex items-center gap-2 text-sm">
              {[
                { id: 'upload', label: '1. Upload' },
                { id: 'editor', label: '2. Review' },
                { id: 'done',   label: '3. Export' },
              ].map((step, i, arr) => (
                <div key={step.id} className="flex items-center gap-2">
                  <span className={`font-medium transition-colors ${
                    view === step.id || (view === 'editor' && step.id === 'done')
                      ? 'text-amber-400'
                      : view === 'editor' && step.id === 'upload'
                        ? 'text-white/60'
                        : 'text-white/25'
                  }`}>
                    {step.label}
                  </span>
                  {i < arr.length - 1 && (
                    <span className="text-white/15">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
          {view === 'upload' && (
            <div className="flex justify-center">
              <ImageUpload
                onParsed={(e) => {
                  setView('loading')
                  // Small artificial delay so loading state renders
                  setTimeout(() => handleParsed(e), 300)
                }}
              />
            </div>
          )}

          {view === 'loading' && <LoadingView />}

          {view === 'editor' && (
            <div className="space-y-6">
              <TimetableEditor events={events} onEventsChange={setEvents} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <DateRangePicker
                    semesterStart={semesterStart}
                    semesterEnd={semesterEnd}
                    recurrenceType={recurrenceType}
                    events={events}
                    onChange={handleDateChange}
                  />
                </div>
                <div className="lg:col-span-2">
                  <ExportPanel
                    events={events}
                    semesterStart={semesterStart}
                    semesterEnd={semesterEnd}
                    recurrenceType={recurrenceType}
                    accessToken={accessToken}
                    userEmail={userEmail}
                    onAuth={setAccessToken}
                    onLogout={() => { setAccessToken(null); setUserEmail(null) }}
                    onDone={handleDone}
                  />
                </div>
              </div>
            </div>
          )}

          {view === 'done' && <DoneView onReset={handleReset} />}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 py-4 text-center text-white/25 text-xs">
          TimeSync · Your timetable, your calendar · No data stored
        </footer>
      </div>
    </div>
  )
}
