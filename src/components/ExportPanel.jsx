"use client";

import { useState, useEffect } from 'react';
import { Download, CalendarCheck, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import AuthButton from './AuthButton';

function OptCard({ icon: Icon, title, description, action, success }) {
  return (
    <div style={{
      background: success ? 'var(--success-bg)' : 'var(--bg-card)',
      border: `1px solid ${success ? 'var(--success-border)' : 'var(--border)'}`,
      borderRadius: 18,
      padding: 22,
      boxShadow: 'var(--shadow)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: success
          ? 'var(--success-bg)'
          : 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(139,92,246,0.12))',
        color: success ? 'var(--success-text)' : 'var(--accent1)',
      }}>
        {success ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
      </div>
      <h4 className="font-display font-extrabold mb-1.5" style={{ fontSize: 16, color: 'var(--text)' }}>{title}</h4>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18, flex: 1, lineHeight: 1.6 }}>{description}</p>
      {action}
    </div>
  );
}

export default function ExportPanel({ events, semesterStart, semesterEnd, recurrenceType, accessToken, userEmail, onAuth, onLogout, onDone }) {
  const [icsLoading, setIcsLoading] = useState(false);
  const [icsError, setIcsError]     = useState(null);
  const [icsSuccess, setIcsSuccess] = useState(false);

  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalError, setGcalError]     = useState(null);
  const [hasSynced, setHasSynced]     = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    if (!accessToken) { setHasSynced(false); return; }
    fetch('/api/sync/gcal', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(d => setHasSynced(d.hasSyncedEvents ?? false))
      .catch(() => {});
  }, [accessToken]);

  const handleDownloadIcs = async () => {
    setIcsLoading(true); setIcsError(null);
    try {
      const res = await fetch('/api/export/ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, semester_start: semesterStart, semester_end: semesterEnd, recurrence_type: recurrenceType }),
      });
      if (!res.ok) throw new Error('Failed to generate file');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'timetable.ics'; a.click();
      window.URL.revokeObjectURL(url);
      setIcsSuccess(true);
    } catch (e) { setIcsError(e.message); }
    finally { setIcsLoading(false); }
  };

  const handleSyncGcal = async () => {
    setGcalLoading(true); setGcalError(null);
    try {
      const res = await fetch('/api/sync/gcal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ events, semester_start: semesterStart, semester_end: semesterEnd, recurrence_type: recurrenceType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      setHasSynced(true); setDeleteSuccess(false); onDone();
    } catch (e) { setGcalError(e.message); }
    finally { setGcalLoading(false); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true); setDeleteError(null);
    try {
      const res = await fetch('/api/sync/gcal', { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setDeleteSuccess(true); setHasSynced(false);
    } catch (e) { setDeleteError(e.message); }
    finally { setDeleteLoading(false); }
  };

  const gcalSynced = hasSynced && !deleteSuccess;

  const btnStyle = (active, disabled) => ({
    padding: '12px', borderRadius: 10, border: active ? 'none' : '1px solid var(--border)',
    fontWeight: 700, fontSize: 13.5, cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    background: active ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'var(--bg)',
    color: active ? '#fff' : 'var(--text)',
    boxShadow: active ? '0 8px 20px rgba(99,102,241,0.28)' : 'none',
    opacity: disabled ? 0.5 : 1,
    fontFamily: 'Inter, sans-serif',
    transition: 'opacity 0.15s',
    width: '100%',
  });

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-extrabold" style={{ fontSize: 20, color: 'var(--text)' }}>Choose where it lands</h2>
        <AuthButton accessToken={accessToken} userEmail={userEmail} onAuth={onAuth} onLogout={onLogout} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Google Calendar */}
        <OptCard
          icon={CalendarCheck}
          title="Google Calendar"
          success={gcalSynced}
          description="Sync directly — your whole semester appears on every device you already use, instantly."
          action={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleSyncGcal}
                disabled={events.length === 0 || gcalLoading || !accessToken}
                style={btnStyle(!gcalSynced && !!accessToken, !accessToken || gcalLoading)}
              >
                {gcalLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Syncing…</>
                  : !accessToken ? 'Sign in to Sync'
                  : gcalSynced ? <><CalendarCheck className="w-4 h-4" />Re-sync</>
                  : <><CalendarCheck className="w-4 h-4" />Sync Now</>}
              </button>

              {gcalSynced && (
                <button onClick={handleDelete} disabled={deleteLoading} className="btn-danger justify-center w-full" style={{ fontSize: 13 }}>
                  {deleteLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting…</> : <><Trash2 className="w-3.5 h-3.5" />Delete from Calendar</>}
                </button>
              )}

              {deleteSuccess && (
                <p style={{ fontSize: 12.5, color: 'var(--success-text)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Events deleted from Google Calendar.
                </p>
              )}
              {(gcalError || deleteError) && (
                <p style={{ fontSize: 12.5, color: 'var(--danger-text)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {gcalError || deleteError}
                </p>
              )}
            </div>
          }
        />

        {/* ICS */}
        <OptCard
          icon={Download}
          title="Apple or Outlook"
          success={icsSuccess}
          description="Prefer another calendar? Download one file and drop it straight in — works everywhere."
          action={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleDownloadIcs}
                disabled={events.length === 0 || icsLoading}
                style={{
                  padding: '12px', borderRadius: 10, border: '1px solid var(--border)',
                  fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  background: icsSuccess ? 'var(--success-bg)' : 'var(--bg)',
                  color: icsSuccess ? 'var(--success-text)' : 'var(--text)',
                  borderColor: icsSuccess ? 'var(--success-border)' : 'var(--border)',
                  opacity: events.length === 0 ? 0.5 : 1,
                  fontFamily: 'Inter, sans-serif',
                  width: '100%',
                }}
              >
                {icsLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                  : icsSuccess ? <><CheckCircle2 className="w-4 h-4" />Downloaded</>
                  : <><Download className="w-4 h-4" />Download File</>}
              </button>
              {icsError && (
                <p style={{ fontSize: 12.5, color: 'var(--danger-text)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {icsError}
                </p>
              )}
            </div>
          }
        />
      </div>

      <p className="text-center mt-6 italic" style={{ fontSize: '13px', color: 'var(--muted)' }}>
        TimeSync never stores your timetable after it&apos;s synced. Your schedule is yours — we&apos;re just the messenger.
      </p>
    </div>
  );
}
