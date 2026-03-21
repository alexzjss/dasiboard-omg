import { useState, useEffect } from 'react'

import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, KanbanSquare, BookOpen,
  CalendarDays, User, GraduationCap, Sun, Moon, Users,
  Palette, X, LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTheme, THEMES, ThemeId } from '@/context/ThemeContext'
import clsx from 'clsx'

const nav = [
  { to: '/',         label: 'Início',      icon: LayoutDashboard, end: true  },
  { to: '/kanban',   label: 'Kanban',      icon: KanbanSquare,    end: false },
  { to: '/grades',   label: 'Disciplinas', icon: BookOpen,        end: false },
  { to: '/calendar', label: 'Calendário',  icon: CalendarDays,    end: false },
  { to: '/entities', label: 'Entidades',   icon: Users,           end: false },
  { to: '/profile',  label: 'Perfil',      icon: User,            end: false },
]

const DARK_THEMES  = THEMES.filter(t => t.dark)
const LIGHT_THEMES = THEMES.filter(t => !t.dark)

// ── Theme Picker (shared) ──────────────────────────────────────────────────────
function ThemePicker({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme()
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl animate-in overflow-hidden"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90dvh', overflowY: 'auto' }}>
        {/* Handle bar (mobile sheet) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>
        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>Tema</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="px-4 pb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>Escuros</p>
          <div className="space-y-1 mb-4">
            {DARK_THEMES.map(t => (
              <button key={t.id} onClick={() => { setTheme(t.id as ThemeId); onClose() }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all text-left active:scale-[0.98]"
                      style={{
                        background: theme.id === t.id ? 'var(--accent-soft)' : 'transparent',
                        border: `1px solid ${theme.id === t.id ? 'var(--accent-1)' : 'transparent'}`,
                      }}>
                <span className="text-lg w-7 text-center">{t.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm leading-none" style={{ color: theme.id === t.id ? 'var(--accent-3)' : 'var(--text-primary)' }}>{t.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.description}</p>
                </div>
                {theme.id === t.id && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-1)' }} />}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>Claros</p>
          <div className="space-y-1">
            {LIGHT_THEMES.map(t => (
              <button key={t.id} onClick={() => { setTheme(t.id as ThemeId); onClose() }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all text-left active:scale-[0.98]"
                      style={{
                        background: theme.id === t.id ? 'var(--accent-soft)' : 'transparent',
                        border: `1px solid ${theme.id === t.id ? 'var(--accent-1)' : 'transparent'}`,
                      }}>
                <span className="text-lg w-7 text-center">{t.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm leading-none" style={{ color: theme.id === t.id ? 'var(--accent-3)' : 'var(--text-primary)' }}>{t.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.description}</p>
                </div>
                {theme.id === t.id && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-1)' }} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sidebar inner (desktop only) ──────────────────────────────────────────────
function SidebarContent({ onOpenPicker }: { onOpenPicker: () => void }) {
  const { user, logout } = useAuthStore()
  const { theme, isDark, toggleDarkLight } = useTheme()
  const navigate = useNavigate()
  const initials = user?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'

  return (
    <>
      <div className="accent-orb" style={{ width: 120, height: 120, top: -40, left: -40 }} />

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 relative z-10" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
             style={{ background: 'var(--gradient-btn)', boxShadow: '0 2px 12px var(--accent-glow)' }}>
          <GraduationCap size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm leading-none" style={{ color: 'var(--text-primary)' }}>DaSIboard</p>
          <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>SI · EACH · USP</p>
        </div>
        <button onClick={toggleDarkLight} title={isDark ? 'Modo claro' : 'Modo escuro'}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
        </button>
      </div>

      {/* Theme btn */}
      <div className="px-3 pt-3 relative z-10">
        <button onClick={onOpenPicker}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02]"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)', color: 'var(--accent-3)' }}>
          <span className="flex items-center gap-2"><span>{theme.emoji}</span><span>{theme.name}</span></span>
          <Palette size={11} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div className="h-px mx-4 mt-3" style={{ background: 'linear-gradient(90deg, transparent, var(--accent-1), transparent)', opacity: 0.4 }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 relative z-10">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
                   className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all', isActive ? 'nav-active' : 'nav-inactive')}>
            <Icon size={17} />{label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 relative z-10" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl transition-all cursor-default"
             onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border)')}
             onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--gradient-btn)' }}>
            <span className="text-xs font-bold text-white font-display">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} title="Sair"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  )
}

// ── App Layout ────────────────────────────────────────────────────────────────
export default function AppLayout() {
  const location = useLocation()
  const { theme, isDark, toggleDarkLight } = useTheme()
  const [showPicker, setShowPicker] = useState(false)

  // Restore scroll to top on route change (mobile)
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  const currentNav = nav.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>

      {/* Theme picker */}
      {showPicker && <ThemePicker onClose={() => setShowPicker(false)} />}

      {/* ─────────────── DESKTOP sidebar (lg+) ─────────────── */}
      <aside className="hidden lg:flex w-[var(--sidebar-w)] flex-col sidebar-bg shrink-0" style={{ zIndex: 10 }}>
        <SidebarContent onOpenPicker={() => setShowPicker(true)} />
      </aside>

      {/* ─────────────── MOBILE layout (< lg) ──────────────── */}
      {/* Top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4"
           style={{ height: 52, backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: 'var(--gradient-btn)', boxShadow: '0 2px 8px var(--accent-glow)' }}>
            <GraduationCap size={14} className="text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>DaSIboard</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleDarkLight}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={() => setShowPicker(true)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-base">
            <span>{theme.emoji}</span>
          </button>
        </div>
      </div>

      {/* ─────────────── Main scrollable content ─────────────── */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-base)' }}>
        {/* Top spacer for mobile topbar */}
        <div className="lg:hidden" style={{ height: 52 }} />
        <Outlet />
        {/* Bottom spacer for mobile nav bar */}
        <div className="lg:hidden" style={{ height: 72 }} />
      </main>

      {/* ─────────────── MOBILE bottom nav bar ──────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch"
           style={{
             backgroundColor: 'var(--bg-surface)',
             borderTop: '1px solid var(--border)',
             height: 60,
             paddingBottom: 'env(safe-area-inset-bottom)',
           }}>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
                   className={({ isActive }) => clsx(
                     'flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95',
                     isActive ? 'nav-bottom-active' : 'nav-bottom-inactive'
                   )}>
            {({ isActive }) => (
              <>
                <div className={clsx('flex items-center justify-center rounded-xl transition-all', isActive ? 'w-10 h-6' : 'w-6 h-6')}
                     style={{ background: isActive ? 'var(--accent-soft)' : 'transparent' }}>
                  <Icon size={isActive ? 16 : 18} style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-muted)' }} />
                </div>
                <span className="text-[9px] font-medium leading-none"
                      style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-muted)' }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
