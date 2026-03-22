import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const { setTokens, setUser }  = useAuthStore()
  const navigate                = useNavigate()

  const emailValid = email.length > 3 && email.endsWith('@usp.br')
  const emailTouched = email.length > 0
  const emailError = emailTouched && !emailValid && email.includes('@') && !email.endsWith('@usp.br')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.endsWith('@usp.br')) {
      toast.error('Use seu e-mail @usp.br')
      return
    }
    setLoading(true)
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const { data } = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      setTokens(data.access_token, data.refresh_token)
      const { data: me } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      setUser(me)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: '📋', label: 'Kanban', desc: 'Organize suas tarefas com drag-and-drop' },
    { icon: '📊', label: 'Notas', desc: 'Acompanhe suas médias e frequências' },
    { icon: '📅', label: 'Calendário', desc: 'Provas, deadlines e eventos acadêmicos' },
    { icon: '🎓', label: 'Fluxograma', desc: 'Visualize sua grade curricular completa' },
  ]

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] p-12 relative overflow-hidden"
           style={{
             background: 'var(--gradient-hero)',
             borderRight: '1px solid var(--border)',
           }}>
        {/* decorative orbs */}
        <div className="accent-orb" style={{ width: 320, height: 320, top: -120, right: -100, opacity: 0.2 }} />
        <div className="accent-orb" style={{ width: 200, height: 200, bottom: 40, left: -60, opacity: 0.12, animationDelay: '3s' }} />
        <div className="accent-orb" style={{ width: 100, height: 100, top: '40%', left: '30%', opacity: 0.08, animationDelay: '6s' }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-white text-lg">DaSIboard</p>
            <p className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>Sistemas de Informação · EACH · USP</p>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Seu dashboard<br />acadêmico.
          </h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Organize suas disciplinas, notas, tarefas e eventos em um só lugar.
            Feito por e para alunos de SI da EACH.
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3 rounded-xl px-4 py-3"
                   style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' }}>
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
          © {new Date().getFullYear()} DaSIboard · EACH · USP
        </p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-in">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: 'var(--gradient-btn)' }}>
              <GraduationCap size={15} className="text-white" />
            </div>
            <span className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>DaSIboard</span>
          </div>

          <h2 className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Bem-vindo(a) de volta
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Entre com seu e-mail institucional @usp.br</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="label">E-mail USP</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: emailError ? '#f87171' : emailValid ? '#22c55e' : 'var(--text-muted)' }} />
                <input
                  type="email"
                  id="login-email"
                  autoComplete="email"
                  inputMode="email"
                  className="input pl-10 pr-10"
                  placeholder="seunome@usp.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ borderColor: emailError ? '#f87171' : emailValid ? '#22c55e55' : undefined }}
                  required
                />
                {emailTouched && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {emailValid
                      ? <CheckCircle size={15} style={{ color: '#22c55e' }} />
                      : emailError
                        ? <AlertCircle size={15} style={{ color: '#f87171' }} />
                        : null}
                  </div>
                )}
              </div>
              {emailError && (
                <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#f87171' }}>
                  <AlertCircle size={10} /> Use um e-mail com domínio @usp.br
                </p>
              )}
              {emailValid && (
                <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#22c55e' }}>
                  <CheckCircle size={10} /> E-mail válido
                </p>
              )}
            </div>
            <div>
              <label htmlFor="login-password" className="label">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={show ? 'text' : 'password'}
                  id="login-password"
                  autoComplete="current-password"
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3 mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Entrando…
                </span>
              ) : 'Entrar →'}
            </button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: 'var(--text-muted)' }}>
            Não tem conta?{' '}
            <Link to="/register" className="font-medium transition-colors" style={{ color: 'var(--accent-3)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.75')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}>
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
