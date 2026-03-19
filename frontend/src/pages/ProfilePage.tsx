import { useAuthStore } from '@/store/authStore'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { User, Mail, Hash, Calendar, GraduationCap, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="font-display text-2xl font-bold text-white mb-8 flex items-center gap-2">
        <User size={22} className="text-brand-400" /> Perfil
      </h1>

      {/* Avatar */}
      <div className="card flex items-center gap-5 mb-6 animate-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <span className="font-display font-bold text-2xl text-white">{initials}</span>
          )}
        </div>
        <div>
          <h2 className="font-display font-bold text-white text-lg">{user.full_name}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`badge text-[10px] ${user.is_verified ? 'bg-emerald-900/40 text-emerald-400' : 'bg-amber-900/40 text-amber-400'}`}>
              {user.is_verified ? '✓ Verificado' : '⏳ Não verificado'}
            </span>
            <span className="badge bg-brand-900/40 text-brand-400 text-[10px]">SI · EACH · USP</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="card mb-6 space-y-4 animate-in" style={{ animationDelay: '60ms' }}>
        <h3 className="font-display font-semibold text-slate-300 text-sm">Informações</h3>

        {[
          { icon: Mail,          label: 'E-mail',     value: user.email },
          { icon: Hash,          label: 'Nº USP',     value: user.nusp ?? 'Não informado' },
          { icon: GraduationCap, label: 'Curso',      value: 'Sistemas de Informação' },
          { icon: Calendar,      label: 'Membro desde', value: format(new Date(user.created_at ?? Date.now()), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
              <Icon size={14} className="text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</p>
              <p className="text-sm text-slate-300">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* About */}
      <div className="card mb-6 animate-in" style={{ animationDelay: '120ms' }}>
        <h3 className="font-display font-semibold text-slate-300 text-sm mb-3">Sobre o DaSIboard</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          DaSIboard é o dashboard acadêmico dos alunos de Sistemas de Informação da EACH USP.
          Desenvolvido para centralizar organização de tarefas, notas e eventos em um só lugar.
        </p>
        <div className="flex gap-2 mt-4">
          <span className="badge bg-slate-800 text-slate-500 text-[10px]">v1.0.0</span>
          <span className="badge bg-slate-800 text-slate-500 text-[10px]">FastAPI + React</span>
          <span className="badge bg-slate-800 text-slate-500 text-[10px]">PostgreSQL</span>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="btn-danger w-full justify-center animate-in"
        style={{ animationDelay: '180ms' }}
      >
        <LogOut size={15} /> Sair da conta
      </button>
    </div>
  )
}
