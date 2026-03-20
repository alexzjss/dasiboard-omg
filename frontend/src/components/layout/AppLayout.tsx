import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, KanbanSquare, BookOpen,
  CalendarDays, User, LogOut, GraduationCap, Sun, Moon, Users,
  Palette, X, Menu,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTheme, THEMES, ThemeId } from '@/context/ThemeContext'
import clsx from 'clsx'

const nav = [
  { to: '/',         label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/kanban',   label: 'Kanban',      icon: KanbanSquare },
  { to: '/grades',   label: 'Disciplinas', icon: BookOpen },
  { to: '/calendar', label: 'Calendário',  icon: CalendarDays },
  { to: '/entities', label: 'Entidades',   icon: Users },
  { to: '/profile',  label: 'Perfil',      icon: User },
]

const DARK_THEMES  = THEMES.filter(t => t.dark)
const LIGHT_THEMES = THEMES.filter(t => !t.dark)

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const { theme, isDark, toggleDarkLight, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPicker, setShowPicker] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const handleLogout = () => { logout(); navigate('/login') }
  const initials = user?.full_name
    ?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'

  // Shared sidebar inner content (used by both desktop sidebar and mobile drawer)
  const SidebarInner = () => (
    <>
      <div className="accent-orb" style={{ width: 120, height: 120, top: -40, left: -40 }} />

      {/* Logo row */}
      <div className="flex items-center gap-2.5 px-5 py-5 relative z-10"
           style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
             style={{ background: 'var(--gradient-btn)', boxShadow: '0 2px 12px var(--accent-glow)' }}>
          <GraduationCap size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm leading-none" style={{ color: 'var(--text-primary)' }}>
            DaSIboard
          </p>
          <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
            SI · EACH · USP
          </p>
        </div>
        {/* dark/light toggle — desktop only (mobile has it in topbar) */}
        <button onClick={toggleDarkLight}
                title={isDark ? 'Modo claro' : 'Modo escuro'}
                className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center transition-all hover:scale-110 shrink-0"
                style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
        </button>
        {/* Close button — mobile drawer only */}
        <button onClick={() => setMobileOpen(false)}
                className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
          <X size={14} />
        </button>
      </div>

      {/* Theme selector */}
      <div className="px-3 pt-3 relative z-10">
        <button onClick={() => setShowPicker(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'var(--accent-soft)',
                  border: '1px solid var(--accent-1)',
                  color: 'var(--accent-3)',
                }}>
          <span className="flex items-center gap-2">
            <span>{theme.emoji}</span>
            <span>{theme.name}</span>
          </span>
          <Palette size={11} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Accent line */}
      <div className="h-px mx-4 mt-3"
           style={{ background: 'linear-gradient(90deg, transparent, var(--accent-1), transparent)', opacity: 0.4 }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 relative z-10">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
                   className={({ isActive }) =>
                     clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                           isActive ? 'nav-active' : 'nav-inactive')
                   }>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 relative z-10" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl transition-all cursor-default"
             style={{ color: 'var(--text-primary)' }}
             onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border)')}
             onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
               style={{ background: 'var(--gradient-btn)' }}>
            <span className="text-xs font-bold text-white font-display">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.full_name}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
              {user?.email}
            </p>
          </div>
          <button onClick={handleLogout} title="Sair"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>

      {/* ── Theme picker overlay ─────────────────────── */}
      {showPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
             onClick={(e) => { if (e.target === e.currentTarget) setShowPicker(false) }}>
          <div className="rounded-2xl p-6 w-full max-w-sm animate-in"
               style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                Escolher tema
              </h3>
              <button onClick={() => setShowPicker(false)}
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
                <X size={18} />
              </button>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Escuros</p>
            <div className="space-y-1 mb-4">
              {DARK_THEMES.map(t => (
                <button key={t.id} onClick={() => { setTheme(t.id as ThemeId); setShowPicker(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                        style={{
                          background: theme.id === t.id ? 'var(--accent-soft)' : 'transparent',
                          border: `1px solid ${theme.id === t.id ? 'var(--accent-1)' : 'transparent'}`,
                          color: theme.id === t.id ? 'var(--accent-3)' : 'var(--text-secondary)',
                        }}
                        onMouseEnter={(e) => { if (theme.id !== t.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--border)' }}
                        onMouseLeave={(e) => { if (theme.id !== t.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                  <span className="text-base">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-none">{t.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.description}</p>
                  </div>
                  {theme.id === t.id && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--accent-1)' }} />}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Claros</p>
            <div className="space-y-1">
              {LIGHT_THEMES.map(t => (
                <button key={t.id} onClick={() => { setTheme(t.id as ThemeId); setShowPicker(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                        style={{
                          background: theme.id === t.id ? 'var(--accent-soft)' : 'transparent',
                          border: `1px solid ${theme.id === t.id ? 'var(--accent-1)' : 'transparent'}`,
                          color: theme.id === t.id ? 'var(--accent-3)' : 'var(--text-secondary)',
                        }}
                        onMouseEnter={(e) => { if (theme.id !== t.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--border)' }}
                        onMouseLeave={(e) => { if (theme.id !== t.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                  <span className="text-base">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-none">{t.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.description}</p>
                  </div>
                  {theme.id === t.id && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--accent-1)' }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          DESKTOP sidebar — unchanged from original
          Only change: added "hidden lg:flex"
      ══════════════════════════════════════════ */}
      <aside className="hidden lg:flex w-[var(--sidebar-w)] flex-col sidebar-bg shrink-0" style={{ zIndex: 10 }}>
        <SidebarInner />
      </aside>

      {/* ══════════════════════════════════════════
          MOBILE — topbar + overlay + drawer
          All inside lg:hidden, invisible on desktop
      ══════════════════════════════════════════ */}

      {/* Mobile topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4"
           style={{
             height: '56px',
             backgroundColor: 'var(--bg-surface)',
             borderBottom: '1px solid var(--border)',
           }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: 'var(--gradient-btn)', boxShadow: '0 2px 8px var(--accent-glow)' }}>
            <GraduationCap size={14} className="text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-sm leading-none" style={{ color: 'var(--text-primary)' }}>DaSIboard</p>
            <p className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>SI · EACH · USP</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleDarkLight}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={() => setMobileOpen(true)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            <Menu size={16} />
          </button>
        </div>
      </div>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40"
             style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
             onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer — slides in from left */}
      <aside
        className={clsx(
          'lg:hidden fixed top-0 left-0 bottom-0 z-50 flex flex-col sidebar-bg transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ width: '280px' }}
      >
        <SidebarInner />
      </aside>

      {/* ── Main content ────────────────────────────── */}
      {/* Desktop: normal. Mobile: top padding for the topbar */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="lg:hidden" style={{ height: '56px' }} aria-hidden="true" />
        <Outlet />
      </main>
    </div>
  )
}
