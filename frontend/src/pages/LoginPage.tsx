import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Mail, Lock, Eye, EyeOff } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 p-12 border-r border-brand-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-white">DaSIboard</p>
            <p className="text-[11px] text-brand-400 font-mono">Sistemas de Informação · EACH · USP</p>
          </div>
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Seu dashboard<br />acadêmico.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Organize suas disciplinas, notas, tarefas e eventos em um só lugar.
            Feito por e para alunos de SI da EACH.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3">
            {['Kanban', 'Notas', 'Calendário', 'Perfil'].map((f) => (
              <div key={f} className="bg-brand-800/30 border border-brand-700/30 rounded-xl px-4 py-3 text-sm text-brand-300 font-medium">
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-xs font-mono">© {new Date().getFullYear()} DaSIboard</p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-in">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <GraduationCap size={15} className="text-white" />
            </div>
            <span className="font-display font-bold text-white">DaSIboard</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-white mb-1">Bem-vindo(a) de volta</h2>
          <p className="text-slate-400 text-sm mb-8">Entre com seu e-mail @usp.br</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail USP</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="seunome@usp.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={show ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3 mt-2" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-slate-500 text-sm text-center mt-6">
            Não tem conta?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
