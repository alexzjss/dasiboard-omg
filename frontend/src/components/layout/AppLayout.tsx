import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, KanbanSquare, BookOpen,
  CalendarDays, User, LogOut, GraduationCap, Sun, Moon,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/context/ThemeContext'
import clsx from 'clsx'

const nav = [
  { to: '/',         label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/kanban',   label: 'Kanban',     icon: KanbanSquare },
  { to: '/grades',   label: 'Notas',      icon: BookOpen },
  { to: '/calendar', label: 'Calendário', icon: CalendarDays },
  { to: '/profile',  label: 'Perfil',     icon: User },
]

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = user?.full_name
    ?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="w-[var(--sidebar-w)] flex flex-col sidebar-bg shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 2px 12px rgba(124,58,237,0.4)' }}>
            <GraduationCap size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm leading-none" style={{ color: 'var(--text-primary)' }}>DaSIboard</p>
            <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>SI · EACH · USP</p>
          </div>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>

        {/* Gradient accent line */}
        <div className="h-px mx-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)' }} />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive ? 'nav-active' : 'nav-inactive'
                )
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl transition-colors"
               style={{ cursor: 'default' }}
               onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border)')}
               onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                 style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
              <span className="text-xs font-bold text-white font-display">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="transition-colors" title="Sair"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-base)' }}>
        <Outlet />
      </main>
    </div>
  )
}
