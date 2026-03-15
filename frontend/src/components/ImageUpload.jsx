import { useState, useCallback } from 'react'
import { UploadCloud, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react'
import BASE_URL from '../api.js'

const API_URL = BASE_URL

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function ImageUpload({ onParsed }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = useCallback((f) => {
    if (!f) return
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Unsupported file type. Please upload a PNG, JPEG, or WEBP image.')
      return
    }
    setError(null)
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    handleFile(f)
  }, [handleFile])

  const onInputChange = (e) => handleFile(e.target.files?.[0])

  const handleParse = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_URL}/api/parse-image`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }
      const data = await res.json()
      onParsed(data.events)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-slide-up w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-5">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse-slow" />
          Powered by Gemini 2.5 Flash Vision
        </div>
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          Upload your <span className="text-amber-400">timetable</span>
        </h1>
        <p className="text-white/50 text-lg max-w-md mx-auto">
          Snap a photo of your college schedule and we'll turn it into recurring Google Calendar events.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input').click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-12
          flex flex-col items-center justify-center gap-4 min-h-[260px]
          ${dragging
            ? 'border-amber-500/70 bg-amber-500/8 scale-[1.01]'
            : preview
              ? 'border-white/20 bg-navy-900/40'
              : 'border-white/15 bg-navy-900/30 hover:border-amber-500/40 hover:bg-amber-500/5'
          }
        `}
      >
        <input
          id="file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onInputChange}
        />

        {preview ? (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-48">
              <img
                src={preview}
                alt="Timetable preview"
                className="max-h-48 object-contain w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent" />
            </div>
            <p className="text-white/60 text-sm">
              <span className="text-white font-medium">{file.name}</span>
              {' · '}
              {(file.size / 1024).toFixed(0)} KB
            </p>
            <p className="text-amber-400/70 text-xs">Click or drag to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-navy-800/80 border border-white/10 flex items-center justify-center">
              <UploadCloud className="w-8 h-8 text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Drop your timetable photo here</p>
              <p className="text-white/40 text-sm mt-1">or click to browse · PNG, JPEG, WEBP</p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-red-400 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Parse button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleParse}
          disabled={!file || loading}
          className="accent-btn flex items-center gap-2.5 px-8 py-3 text-base"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              Parse Timetable
            </>
          )}
        </button>
      </div>

      {/* Tips */}
      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        {[
          { icon: '🔆', tip: 'Good lighting' },
          { icon: '📐', tip: 'Straight angle' },
          { icon: '🔍', tip: 'Clear text' },
        ].map(({ icon, tip }) => (
          <div key={tip} className="glass-card px-3 py-3 text-sm text-white/50">
            <span>{icon}</span>
            <p className="mt-1">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
