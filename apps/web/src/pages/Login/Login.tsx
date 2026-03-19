import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'E-mail ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="auth-page">
        <div className="bg-orbs" aria-hidden="true">
          <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
        </div>
        <div className="auth-card">
          <div className="auth-logo">
            <img src="/assets/logo-dasi.jpg" alt="DaSI" width={48} height={48} style={{ borderRadius: 12, objectFit: 'cover' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>DaSIboard</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SI-USP / EACH</div>
            </div>
          </div>

          <h1 className="auth-title">Entrar na conta</h1>

          {error && (
            <div className="auth-error">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">E-mail</label>
              <input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input" placeholder="seu@email.com"
                required autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password" className="form-label">Senha</label>
              <input
                id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input" placeholder="••••••••"
                required autoComplete="current-password"
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="auth-link-text">
            Não tem conta?{' '}
            <Link to="/signup" className="auth-link">Criar conta</Link>
          </p>
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh; display: flex; align-items: center;
          justify-content: center; padding: 24px; position: relative;
        }
        .auth-card {
          background: var(--bg2); border: 1px solid var(--glass-border);
          border-radius: 20px; padding: 36px 32px; width: 100%; max-width: 400px;
          position: relative; z-index: 1;
          backdrop-filter: blur(12px);
        }
        .auth-logo {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 28px;
        }
        .auth-title {
          font-size: 20px; font-weight: 700; color: var(--text);
          margin-bottom: 20px;
        }
        .auth-error {
          background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.3);
          color: var(--danger); border-radius: 8px; padding: 10px 14px;
          font-size: 13px; margin-bottom: 16px;
        }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 13px; font-weight: 500; color: var(--text-muted); }
        .form-input {
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 8px; padding: 10px 14px; color: var(--text);
          font-size: 14px; width: 100%;
          transition: border-color 0.15s;
        }
        .form-input:focus { outline: none; border-color: var(--primary); }
        .form-input::placeholder { color: var(--text-dim); }
        .auth-btn {
          background: var(--primary); color: white; border: none;
          border-radius: 8px; padding: 11px; font-size: 14px; font-weight: 600;
          cursor: pointer; width: 100%; margin-top: 4px; transition: filter 0.15s;
        }
        .auth-btn:not(:disabled):hover { filter: brightness(1.15); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-link-text {
          text-align: center; font-size: 13px; color: var(--text-muted);
          margin-top: 20px;
        }
        .auth-link { color: var(--primary); text-decoration: none; font-weight: 500; }
        .auth-link:hover { text-decoration: underline; }
      `}</style>
    </>
  )
}
