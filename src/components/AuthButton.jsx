import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'

export default function AuthButton({ accessToken, userEmail, onAuth, onLogout }) {
  const [loading, setLoading] = useState(false)

  const handleSignIn = () => {
    setLoading(true)
    const width = 500, height = 620
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    const popup = window.open('/api/auth/google', 'google-oauth', `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`)
    const onMessage = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'OAUTH_TOKEN') {
        onAuth(e.data.token)
        setLoading(false)
        window.removeEventListener('message', onMessage)
      }
    }
    window.addEventListener('message', onMessage)
    const timer = setInterval(() => {
      if (popup?.closed) { clearInterval(timer); setLoading(false); window.removeEventListener('message', onMessage) }
    }, 500)
  }

  if (accessToken && userEmail) {
    return (
      <div className="flex items-center gap-2">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px 6px 6px', borderRadius: 999,
          border: '1px solid var(--border)', background: 'var(--bg)',
          fontSize: 13.5, color: 'var(--muted)', fontWeight: 500,
          fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
            color: '#fff', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {userEmail[0]?.toUpperCase()}
          </div>
          <span className="hidden sm:inline">{userEmail}</span>
        </div>
        <button onClick={onLogout} className="btn-ghost text-sm py-2">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    )
  }

  return (
    <button onClick={handleSignIn} disabled={loading} className="btn-ghost">
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      Sign in with Google
    </button>
  )
}
