import { useState, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function ImageUpload({ onParsed }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Please upload a clear image (PNG, JPEG, or WEBP) of your timetable.');
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }, [handleFile]);

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const resp = await fetch('/api/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64 }),
      });
      if (!resp.ok) throw new Error("We couldn't read this timetable. Try a clearer photo!");
      const data = await resp.json();
      onParsed(data.events);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && document.getElementById('ts-file-input').click()}
        style={{
          background: dragging ? 'rgba(99,102,241,0.03)' : '#FFFFFF',
          border: `2px dashed ${dragging ? '#6366F1' : '#DCD8CF'}`,
          borderRadius: 24,
          padding: '64px 32px',
          textAlign: 'center',
          boxShadow: 'var(--shadow)',
          cursor: loading ? 'default' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <input id="ts-file-input" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => handleFile(e.target.files?.[0])} disabled={loading} />

        {preview ? (
          <div className="flex flex-col items-center gap-4">
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', maxHeight: 220, boxShadow: 'var(--shadow)' }}>
              <img src={preview} alt="Timetable preview" style={{ maxHeight: 220, width: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{file.name}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--accent1)' }}>Click or drag to replace</p>
            </div>
          </div>
        ) : (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: 16, margin: '0 auto 22px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(139,92,246,0.12))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent1)',
            }}>
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="font-display font-extrabold mb-1.5" style={{ fontSize: 20, color: 'var(--text)' }}>Drop your photo here</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Supports PNG, JPEG, WEBP</p>
            <p style={{ color: 'var(--subtle)', fontSize: 12.5, marginTop: 14 }}>Your photo stays private — nothing is stored after your calendar is built.</p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 mt-4 px-4 py-3 rounded-2xl text-sm"
          style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CTA */}
      <div className="mt-7 flex justify-center">
        <button
          onClick={handleParse}
          disabled={!file || loading}
          className="btn-primary"
          style={{ opacity: !file ? 0.45 : 1 }}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Magic in progress…</>
          ) : (
            <><ImageIcon className="w-5 h-5" /> Read my Timetable</>
          )}
        </button>
      </div>
    </div>
  );
}
