import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Mail, Lock, User, Hash, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/utils/api'

export default function RegisterPage() {
  const [form, setForm]       = useState({ email: '', password: '', full_name: '', nusp: '' })
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate              = useNavigate()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.email.endsWith('@usp.br')) {
      toast.error('Use seu e-mail institucional @usp.br')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success('Conta criada! Faça login.')
      navigate('/login')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d.msg).join(', ')
        : detail ?? 'Erro ao criar conta'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="w-full max-w-sm animate-in">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <GraduationCap size={15} className="text-white" />
          </div>
          <span className="font-display font-bold text-white">DaSIboard</span>
        </div>

        <h2 className="font-display text-2xl font-bold text-white mb-1">Criar conta</h2>
        <p className="text-slate-400 text-sm mb-8">Apenas alunos com e-mail @usp.br</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" className="input pl-10" placeholder="Seu nome" value={form.full_name} onChange={set('full_name')} required />
            </div>
          </div>

          <div>
            <label className="label">E-mail USP</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="email" className="input pl-10" placeholder="seunome@usp.br" value={form.email} onChange={set('email')} required />
            </div>
          </div>

          <div>
            <label className="label">Nº USP <span className="normal-case text-slate-600">(opcional)</span></label>
            <div className="relative">
              <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" className="input pl-10" placeholder="12345678" value={form.nusp} onChange={set('nusp')} />
            </div>
          </div>

          <div>
            <label className="label">Senha</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={show ? 'text' : 'password'}
                className="input pl-10 pr-10"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={set('password')}
                required
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full justify-center py-3 mt-2" disabled={loading}>
            {loading ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <p className="text-slate-500 text-sm text-center mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
