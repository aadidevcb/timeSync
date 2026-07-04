"use client";

import { useState, useEffect } from 'react';
import ImageUpload from '@/components/ImageUpload';
import TimetableEditor from '@/components/TimetableEditor';
import DateRangePicker from '@/components/DateRangePicker';
import ExportPanel from '@/components/ExportPanel';
import AuthButton from '@/components/AuthButton';
import { Loader2, Sparkles, CalendarCheck, ArrowLeft, ExternalLink, Trash2, AlertTriangle, X, Eye, BookOpen, CheckSquare } from 'lucide-react';

function getToday() { return new Date().toISOString().split('T')[0]; }
function getEndOfSemester() {
  const d = new Date(); d.setMonth(d.getMonth() + 4);
  return d.toISOString().split('T')[0];
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(28,27,26,0.35)' }} onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md card p-8 animate-fade-up">
        <button onClick={onCancel} className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ color: 'var(--muted)' }} onMouseOver={e => e.target.style.background = 'var(--bg)'} onMouseOut={e => e.target.style.background = 'transparent'}>
          <X className="w-4 h-4" />
        </button>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
          <AlertTriangle className="w-7 h-7" style={{ color: 'var(--danger-text)' }} />
        </div>
        <h2 className="font-display font-extrabold text-center mb-2" style={{ fontSize: 20, color: 'var(--text)' }}>
          Delete your timetable?
        </h2>
        <p className="text-center text-sm mb-8 leading-relaxed" style={{ color: 'var(--muted)' }}>
          This will permanently remove all TimeSync events from your Google Calendar. This cannot be undone.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-white transition-all"
            style={{ background: loading ? '#EF4444' : '#DC2626', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, fontFamily: 'Inter, sans-serif' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : <><Trash2 className="w-4 h-4" />Yes, Delete Everything</>}
          </button>
          <button onClick={onCancel} disabled={loading} className="btn-ghost w-full justify-center">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading View ─────────────────────────────────────────────────────────────
function LoadingView() {
  const messages = ['Looking at your schedule…', 'Organising your classes…', 'Setting up your calendar…', 'Almost ready…'];
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-28 animate-fade-up">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--gold-bg)', border: '1px solid var(--gold-border)' }}>
        <Sparkles className="w-9 h-9" style={{ color: 'var(--gold)' }} />
      </div>
      <div className="text-center">
        <p className="font-display font-bold text-lg" style={{ color: 'var(--text)' }}>AI is reading your timetable…</p>
        <p className="text-sm mt-1 transition-all duration-500" style={{ color: 'var(--muted)' }}>{messages[msgIdx]}</p>
      </div>
    </div>
  );
}

// ─── Done View ────────────────────────────────────────────────────────────────
function DoneView({ onReset }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-28 text-center animate-fade-up">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
        <CalendarCheck className="w-10 h-10" style={{ color: 'var(--success-text)' }} />
      </div>
      <div>
        <h2 className="font-display font-extrabold text-2xl mb-2" style={{ color: 'var(--text)' }}>You're all set! 🎉</h2>
        <p style={{ color: 'var(--muted)' }}>Your timetable has been synced to Google Calendar.</p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="btn-primary">
          <ExternalLink className="w-4 h-4" /> Open Google Calendar
        </a>
        <button onClick={onReset} className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Start over</button>
      </div>
    </div>
  );
}

// ─── Step Hero ────────────────────────────────────────────────────────────────
const STEP_META = [
  {
    eyebrow: '✨ Turn photos into calendar events instantly',
    head: ['Upload your ', 'timetable', '.'],
    desc: "Take a photo of your class schedule — that's it. No spreadsheets, no re-typing the same 30 classes every semester. TimeSync reads the photo and builds your week for you.",
  },
  {
    eyebrow: '🗓️ Your week, already organised',
    head: ['Review your ', 'week', '.'],
    desc: "TimeSync has already sorted your classes by day and time. All that's left is a quick check — move anything that looks off, and it's ready to go.",
  },
  {
    eyebrow: '✅ One tap from a synced calendar',
    head: ['Save your ', 'calendar', '.'],
    desc: 'Set how long your semester runs, and TimeSync builds out every class, every week, for the whole term — synced straight to the calendar you already use every day.',
  },
];

function StepHero({ stepIdx }) {
  const m = STEP_META[stepIdx];
  return (
    <div className="max-w-2xl mx-auto text-center px-4 pt-12 pb-2 animate-fade-up">
      <div className="eyebrow mb-5 mx-auto w-fit">{m.eyebrow}</div>
      <h1 className="font-display font-extrabold mb-4 tracking-tight"
        style={{ fontSize: 'clamp(30px,5vw,44px)', lineHeight: 1.08, letterSpacing: '-0.03em', color: 'var(--text)' }}>
        {m.head[0]}<span className="grad-text">{m.head[1]}</span>{m.head[2]}
      </h1>
      <p style={{ fontSize: '16px', color: 'var(--muted)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>{m.desc}</p>
    </div>
  );
}

// ─── Benefit Grids ────────────────────────────────────────────────────────────
const UPLOAD_BENEFITS = [
  { Icon: Eye,          title: 'See your week, instantly.',      desc: 'A photo becomes a colour-coded, day-by-day calendar in seconds.' },
  { Icon: BookOpen,     title: 'Built for real timetables.',     desc: 'Messy handwriting, printed grids, portal screenshots — made for the schedules students actually have.' },
  { Icon: CheckSquare,  title: 'Every class finds its place.',   desc: 'Recurring lectures, one-off labs, breaks — all correctly separated, automatically.' },
];
const REVIEW_BENEFITS = [
  { Icon: ArrowLeft,     title: 'Nothing is locked in.',              desc: 'Drag any class to a new time, resize it, or delete it — your calendar, your rules.' },
  { Icon: AlertTriangle, title: 'Catch mistakes before they matter.', desc: 'One quick look now means no scrambling to fix a wrong class time mid-semester.' },
];

function BenefitGrid({ items, cols = 3 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24, maxWidth: cols === 2 ? 700 : '100%', margin: '56px auto 0' }}>
      {items.map(({ Icon, title, desc }) => (
        <div key={title}>
          <div className="gold-icon mb-4"><Icon className="w-4 h-4" /></div>
          <h4 className="font-display font-extrabold mb-1.5" style={{ fontSize: 15, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</h4>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('upload');
  const [events, setEvents] = useState([]);
  const [semesterStart, setSemesterStart] = useState(getToday());
  const [semesterEnd, setSemesterEnd] = useState(getEndOfSemester());
  const [recurrenceType, setRecurrenceType] = useState('weekly');

  const [accessToken, setAccessToken] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [hasSyncedEvents, setHasSyncedEvents] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const stepIdx = view === 'upload' ? 0 : view === 'editor' ? 1 : 2;

  const [syncCheckError, setSyncCheckError] = useState(null);

  useEffect(() => {
    if (!accessToken) { setHasSyncedEvents(false); setDeleteSuccess(false); setSyncCheckError(null); return; }
    fetch('/api/sync/gcal', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async r => {
        const d = await r.json();
        if (!r.ok || d.error) {
           setSyncCheckError(d.error || d.detail || "Unknown error checking events");
           setHasSyncedEvents(false);
        } else {
           setHasSyncedEvents(d.hasSyncedEvents ?? false);
           setSyncCheckError(null);
        }
      })
      .catch(e => {
         setSyncCheckError(e.message);
      });
  }, [accessToken]);

  const handleAuth = (token) => {
    setAccessToken(token);
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(info => setUserEmail(info.email || 'Signed in'))
      .catch(() => setUserEmail('Signed in'));
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/sync/gcal', { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error((await res.json()).detail);
      setHasSyncedEvents(false); setDeleteSuccess(true); setShowDeleteModal(false);
    } catch (e) { alert(`Delete failed: ${e.message}`); }
    finally { setDeleteLoading(false); }
  };

  const handleParsed = ev => { setEvents(ev); setView('editor'); };
  const handleDateChange = (k, v) => {
    if (k === 'semesterStart') setSemesterStart(v);
    else if (k === 'semesterEnd') setSemesterEnd(v);
    else if (k === 'recurrenceType') setRecurrenceType(v);
  };

  const STEPS = [{ id: 'upload', label: '1. Upload' }, { id: 'editor', label: '2. Review' }, { id: 'done', label: '3. Export' }];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {showDeleteModal && <DeleteModal loading={deleteLoading} onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} />}

      {/* NAV */}
      <nav style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}>
              <CalendarCheck className="w-4 h-4" />
            </div>
            <span className="font-display font-extrabold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text)' }}>TimeSync</span>
          </div>
          <div className="flex items-center gap-3">
            {view === 'editor' && (
              <button onClick={() => { setEvents([]); setView('upload'); }} className="btn-ghost text-sm py-2 px-3">
                <ArrowLeft className="w-3.5 h-3.5" /> Upload new
              </button>
            )}
            <AuthButton accessToken={accessToken} userEmail={userEmail} onAuth={handleAuth} onLogout={() => { setAccessToken(null); setUserEmail(null); }} />
          </div>
        </div>
      </nav>

      {/* BREADCRUMB */}
      {(view === 'upload' || view === 'editor') && (
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 pt-7 flex items-center gap-2.5" style={{ fontSize: 14, fontWeight: 600 }}>
          {STEPS.map((step, i) => {
            const currentIdx = STEPS.findIndex(s => s.id === view);
            const isActive = step.id === view || (view === 'editor' && step.id === 'done');
            const isDone = currentIdx > i;
            return (
              <div key={step.id} className="flex items-center gap-2.5">
                <span style={{
                  color: isActive ? 'transparent' : isDone ? 'var(--muted)' : '#C6C2BA',
                  background: isActive ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : undefined,
                  WebkitBackgroundClip: isActive ? 'text' : undefined,
                  backgroundClip: isActive ? 'text' : undefined,
                }}>{step.label}</span>
                {i < STEPS.length - 1 && <span style={{ color: '#D9D5CC', fontSize: 13 }}>→</span>}
              </div>
            );
          })}
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-6 md:px-10 pb-20">
        {/* UPLOAD */}
        {view === 'upload' && (
          <div className="animate-fade-up">
            <StepHero stepIdx={0} />
            <div className="mt-8">
              <ImageUpload onParsed={(e) => { setView('loading'); setTimeout(() => handleParsed(e), 300); }} />

              {/* Delete banner for signed-in users with synced events */}
              {accessToken && (hasSyncedEvents || deleteSuccess) && (
                <div className="card mx-auto mt-6 px-6 py-4 flex items-center justify-between gap-4"
                  style={{ maxWidth: 560, background: deleteSuccess ? 'var(--success-bg)' : 'var(--bg-card)', borderColor: deleteSuccess ? 'var(--success-border)' : 'var(--border)' }}>
                  <div>
                    {deleteSuccess
                      ? <><p className="font-semibold text-sm" style={{ color: 'var(--success-text)' }}>Timetable deleted ✓</p><p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>All synced events removed from Google Calendar.</p></>
                      : <><p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>You have a synced timetable</p><p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Previously synced events are on your Google Calendar.</p></>
                    }
                  </div>
                  {!deleteSuccess && (
                    <button onClick={() => setShowDeleteModal(true)} className="btn-danger flex-shrink-0 text-sm">
                      <Trash2 className="w-4 h-4" /> Delete timetable
                    </button>
                  )}
                </div>
              )}

              {/* Show any API errors preventing the delete button from showing */}
              {accessToken && syncCheckError && (
                <div className="card mx-auto mt-6 px-6 py-4 flex items-center justify-between gap-4" style={{ maxWidth: 560, background: 'var(--danger-bg)', borderColor: 'var(--danger-border)' }}>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--danger-text)' }}>Error checking synced events</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--danger-text)' }}>{syncCheckError}</p>
                  </div>
                </div>
              )}

              <BenefitGrid items={UPLOAD_BENEFITS} cols={3} />
            </div>
          </div>
        )}

        {view === 'loading' && <LoadingView />}

        {/* EDITOR */}
        {view === 'editor' && (
          <div className="animate-fade-up">
            <StepHero stepIdx={1} />
            <div className="mt-8 space-y-6">
              <TimetableEditor events={events} onEventsChange={setEvents} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <DateRangePicker semesterStart={semesterStart} semesterEnd={semesterEnd} recurrenceType={recurrenceType} events={events} onChange={handleDateChange} />
                </div>
                <div className="lg:col-span-2">
                  <ExportPanel events={events} semesterStart={semesterStart} semesterEnd={semesterEnd} recurrenceType={recurrenceType} accessToken={accessToken} userEmail={userEmail} onAuth={handleAuth} onLogout={() => { setAccessToken(null); setUserEmail(null); }} onDone={() => { setHasSyncedEvents(true); setView('done'); }} />
                </div>
              </div>
              <BenefitGrid items={REVIEW_BENEFITS} cols={2} />
            </div>
          </div>
        )}

        {view === 'done' && <DoneView onReset={() => { setEvents([]); setView('upload'); }} />}
      </main>

      <footer className="text-center py-8" style={{ color: 'var(--subtle)', fontSize: '12.5px', borderTop: '1px solid var(--border)' }}>
        TimeSync · Your timetable, your calendar · No data stored.
      </footer>
    </div>
  );
}
