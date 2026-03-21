import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, KanbanSquare, BookOpen,
  CalendarDays, User, GraduationCap, Sun, Moon, Users, X,
  LogOut, Palette, Search,
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

// ── Theme preview colors for visual picker ───────────────────────────────────
const THEME_PREVIEWS: Record<string, { bg: string; accent: string; card: string }> = {
  'dark-roxo':        { bg: '#0d0a1a', accent: '#a855f7', card: '#1a1430' },
  'dark-hypado':      { bg: '#0a0510', accent: '#ff6600', card: '#1f1028' },
  'dark-minas':       { bg: '#060c0a', accent: '#22c55e', card: '#122018' },
  'dark-dlc':         { bg: '#08020f', accent: '#ff0080', card: '#160625' },
  'dark-shell':       { bg: '#000000', accent: '#00ff41', card: '#060606' },
  'light-720':        { bg: '#0d1a00', accent: '#6fbe00', card: '#163000' },
  'dark-colina':      { bg: '#181818', accent: '#8a7060', card: '#2a2a2c' },
  'dark-pixel':       { bg: '#000000', accent: '#ffcc00', card: '#181818' },
  'light-roxo':       { bg: '#f8f6ff', accent: '#a855f7', card: '#ffffff' },
  'light-aranha':     { bg: '#f5f0e8', accent: '#e60000', card: '#ffffff' },
  'light-sintetizado':{ bg: '#f0f7ff', accent: '#3b82f6', card: '#ffffff' },
  'light-grace':      { bg: '#fdf6ee', accent: '#dc2626', card: '#fffdf9' },
  'light-lab':        { bg: '#ff69b4', accent: '#aaff00', card: '#ffffff' },
  'light-ilha':       { bg: '#0077cc', accent: '#ffcc33', card: '#ffffff' },
  'light-vidro':      { bg: '#b8d8f8', accent: '#3b82f6', card: 'rgba(255,255,255,0.45)' },
  'light-blueprint':  { bg: '#0a2540', accent: '#4499ff', card: '#123d6a' },
  'light-vanilla':    { bg: '#faf7f2', accent: '#c8a060', card: '#ffffff' },
  'light-lite':       { bg: '#f8f9fa', accent: '#4444ff', card: '#ffffff' },
}

// ── Pokéball + Starter picker (Pixel theme only) ─────────────────────────────
const STARTERS = [
  {
    id: 'bulbasaur', name: 'Bulbasaur', type: 'Planta/Veneno', color: '#78c850',
    sprite: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAA`
  },
  {
    id: 'charmander', name: 'Charmander', type: 'Fogo', color: '#f08030',
    sprite: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAA`
  },
  {
    id: 'squirtle', name: 'Squirtle', type: 'Água', color: '#6890f0',
    sprite: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAA`
  },
]

// Pokémon sprite data URIs — actual Gen1 sprites via canvas
function StarterPicker({ onClose, onSelect, current }: {
  onClose: () => void
  onSelect: (id: string) => void
  current: string
}) {
  const starters = [
    { id: 'bulbasaur',  name: 'Bulbasaur',  type: 'Planta',   color: '#48c040', num: '001', emoji: '🌿' },
    { id: 'charmander', name: 'Charmander', type: 'Fogo',     color: '#f06828', num: '004', emoji: '🔥' },
    { id: 'squirtle',   name: 'Squirtle',   type: 'Água',     color: '#6890f0', num: '007', emoji: '💧' },
  ]
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.85)', imageRendering: 'pixelated' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-sm rounded-t-none sm:rounded-none overflow-hidden"
           style={{ background: '#181818', border: '4px solid #ffcc00', boxShadow: '8px 8px 0 #000', imageRendering: 'pixelated', fontFamily: '"Press Start 2P", monospace' }}>
        {/* Title bar */}
        <div className="px-4 py-3 flex items-center justify-between"
             style={{ background: '#0000cc', borderBottom: '2px solid #ffcc00' }}>
          <span style={{ color: '#ffcc00', fontSize: 9, letterSpacing: '0.05em' }}>ESCOLHA SEU INICIAL</span>
          <button onClick={onClose} style={{ color: '#ffffff', fontSize: 10 }}>✕</button>
        </div>
        {/* Starters */}
        <div className="grid grid-cols-3 gap-0">
          {starters.map(s => (
            <button key={s.id} onClick={() => { onSelect(s.id); onClose() }}
                    className="flex flex-col items-center gap-2 py-6 px-2 transition-all"
                    style={{
                      background: current === s.id ? '#0000aa' : '#181818',
                      border: `2px solid ${current === s.id ? '#ffcc00' : '#383838'}`,
                      outline: current === s.id ? '2px solid #0000cc' : 'none',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#0000aa' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = current === s.id ? '#0000aa' : '#181818' }}>
              <span style={{ fontSize: 32, lineHeight: 1 }}>{s.emoji}</span>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: s.color, fontSize: 7, marginBottom: 2 }}>No.{s.num}</p>
                <p style={{ color: '#f8f8f8', fontSize: 6 }}>{s.name}</p>
                <p style={{ color: '#888888', fontSize: 5, marginTop: 2 }}>{s.type}</p>
              </div>
              {current === s.id && (
                <span style={{ color: '#ffcc00', fontSize: 8 }}>▶ SEL</span>
              )}
            </button>
          ))}
        </div>
        <div className="px-4 py-2 text-center" style={{ background: '#000000', borderTop: '2px solid #383838' }}>
          <span style={{ color: '#888888', fontSize: 7 }}>SALVO NO PERFIL</span>
        </div>
      </div>
    </div>
  )
}

// ── Pokéball floating button ─────────────────────────────────────────────────
function PokeballButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Escolher inicial Pokémon"
      className="fixed z-40 transition-all active:scale-90"
      style={{
        bottom: 72, right: 16,
        width: 52, height: 52,
        imageRendering: 'pixelated',
        filter: 'drop-shadow(2px 2px 0 #000)',
      }}>
      <svg viewBox="0 0 32 32" width="52" height="52" style={{ imageRendering: 'pixelated' }}>
        {/* Bottom white half */}
        <path d="M2 16 Q2 30 16 30 Q30 30 30 16 Z" fill="#f0f0f0"/>
        {/* Top red half */}
        <path d="M2 16 Q2 2 16 2 Q30 2 30 16 Z" fill="#cc0000"/>
        {/* Highlights on red */}
        <path d="M6 7 Q10 4 15 4" stroke="#ff4444" strokeWidth="1.5" fill="none"/>
        {/* Black divider line */}
        <rect x="2" y="14.5" width="28" height="3" fill="#222222"/>
        {/* Center circle */}
        <circle cx="16" cy="16" r="4.5" fill="#222222"/>
        <circle cx="16" cy="16" r="3" fill="#f0f0f0"/>
        <circle cx="14.5" cy="14.5" r="1" fill="#ffffff" opacity="0.6"/>
      </svg>
    </button>
  )
}

// ── Visual Theme Picker ───────────────────────────────────────────────────────
function ThemePicker({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme()
  const [group, setGroup] = useState<'all'|'dark'|'light'>('all')
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const allThemes = group === 'dark' ? DARK_THEMES : group === 'light' ? LIGHT_THEMES : THEMES
  const shown = search.trim()
    ? allThemes.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search.toLowerCase()))
    : allThemes

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '92dvh', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <h3 className="font-display font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Palette size={16} style={{ color: 'var(--accent-3)' }} />
            Escolher tema
          </h3>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              <kbd>Esc</kbd> fecha
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 mb-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input ref={searchRef} type="text" placeholder="Buscar tema..." value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="w-full pl-8 pr-3 py-2 rounded-xl text-sm"
                   style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
        </div>

        {/* Dark/Light/All toggle */}
        <div className="px-5 mb-4 flex gap-1.5">
          {(['all', 'dark', 'light'] as const).map(g => (
            <button key={g} onClick={() => setGroup(g)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: group === g ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      border: `1px solid ${group === g ? 'var(--accent-1)' : 'var(--border)'}`,
                      color: group === g ? 'var(--accent-3)' : 'var(--text-muted)',
                    }}>
              {g === 'all' ? '✨ Todos' : g === 'dark' ? '🌙 Escuros' : '☀️ Claros'}
            </button>
          ))}
        </div>

        {/* Theme grid */}
        <div className="px-4 pb-6 grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto" style={{ maxHeight: '48dvh' }}>
          {shown.length === 0 && (
            <div className="col-span-3 sm:col-span-4 text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <p className="text-sm">Nenhum tema encontrado</p>
            </div>
          )}
          {shown.map(t => {
            const preview = THEME_PREVIEWS[t.id] ?? { bg: '#111', accent: '#888', card: '#222' }
            const isActive = theme.id === t.id
            return (
              <button key={t.id}
                      onClick={() => { setTheme(t.id as ThemeId); onClose() }}
                      className="group flex flex-col gap-2 rounded-2xl p-2.5 transition-all active:scale-95"
                      style={{
                        border: `2px solid ${isActive ? 'var(--accent-1)' : 'var(--border)'}`,
                        background: isActive ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      }}>
                {/* Mini preview */}
                <div className="w-full rounded-lg overflow-hidden relative"
                     style={{ height: 52, background: preview.bg }}>
                  <div className="absolute left-0 top-0 bottom-0 w-4"
                       style={{ background: preview.bg, borderRight: `2px solid ${preview.accent}33` }} />
                  <div className="absolute right-2 top-2 rounded"
                       style={{ width: 26, height: 16, background: preview.card, border: `1px solid ${preview.accent}33` }} />
                  <div className="absolute left-5 top-2 rounded"
                       style={{ width: 12, height: 4, background: preview.accent + '88', borderRadius: 2 }} />
                  <div className="absolute left-5 top-8 rounded"
                       style={{ width: 8, height: 4, background: preview.accent + '44', borderRadius: 2 }} />
                  <div className="absolute right-3 bottom-2 rounded-full"
                       style={{ width: 7, height: 7, background: preview.accent }} />
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg"
                         style={{ background: `${preview.accent}22` }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center"
                           style={{ background: preview.accent, fontSize: 10 }}>✓</div>
                    </div>
                  )}
                </div>
                {/* Label */}
                <div className="text-center">
                  <span style={{ fontSize: 13, display: 'block' }}>{t.emoji}</span>
                  <p className="text-[10px] font-semibold mt-0.5 truncate"
                     style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-primary)' }}>
                    {t.name}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="px-5 pb-4 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
            {THEMES.length} temas · Use <kbd className="px-1 py-0.5 rounded text-[9px]"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>Ctrl+T</kbd> para abrir
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Sidebar inner ─────────────────────────────────────────────────────────────
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

      {/* Theme button — visual pill */}
      <div className="px-3 pt-3 relative z-10">
        <button onClick={onOpenPicker}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)', color: 'var(--accent-3)' }}>
          {/* Mini preview swatch */}
          <div className="flex gap-0.5 shrink-0">
            {[THEME_PREVIEWS[theme.id]?.bg ?? '#111',
              THEME_PREVIEWS[theme.id]?.accent ?? '#888',
              THEME_PREVIEWS[theme.id]?.card ?? '#222',
            ].map((c, i) => (
              <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c, border: '1px solid rgba(255,255,255,0.15)' }} />
            ))}
          </div>
          <span className="flex items-center gap-1.5 flex-1 min-w-0">
            <span>{theme.emoji}</span>
            <span className="truncate">{theme.name}</span>
          </span>
          <span style={{ opacity: 0.5, fontSize: 10 }}>▼</span>
        </button>
      </div>

      <div className="h-px mx-4 mt-3" style={{ background: 'linear-gradient(90deg, transparent, var(--accent-1), transparent)', opacity: 0.4 }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 relative z-10">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
                   className={({ isActive }) => clsx(
                     'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                     isActive ? 'nav-active' : 'nav-inactive'
                   )}>
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
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.backgroundColor = '#f8717120' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
            <LogOut size={13} />
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
  const [showPicker,   setShowPicker]   = useState(false)
  const [showPokeball, setShowPokeball] = useState(false)
  const [starter,      setStarter]      = useState<string>(() =>
    localStorage.getItem('dasiboard-starter') ?? ''
  )

  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  // ── Keyboard shortcut Ctrl+T / Cmd+T → theme picker ──────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault()
        setShowPicker(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const isPixel = theme.id === 'dark-pixel'

  const saveStarter = (id: string) => {
    localStorage.setItem('dasiboard-starter', id)
    setStarter(id)
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>

      {showPicker && <ThemePicker onClose={() => setShowPicker(false)} />}
      {showPokeball && <StarterPicker onClose={() => setShowPokeball(false)} onSelect={saveStarter} current={starter} />}

      {/* Pokéball button — only in Pixel theme */}
      {isPixel && <PokeballButton onClick={() => setShowPokeball(true)} />}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[var(--sidebar-w)] flex-col sidebar-bg shrink-0" style={{ zIndex: 10 }}>
        <SidebarContent onOpenPicker={() => setShowPicker(true)} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4"
           style={{ height: 52, backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
               style={{ background: 'var(--gradient-btn)', boxShadow: '0 2px 8px var(--accent-glow)' }}>
            <GraduationCap size={13} className="text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-sm leading-none" style={{ color: 'var(--text-primary)' }}>DaSIboard</p>
            <p className="text-[9px] font-mono leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>SI · EACH · USP</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleDarkLight}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={() => setShowPicker(true)}
                  className="h-8 px-2.5 rounded-xl flex items-center gap-1.5 text-xs transition-all active:scale-90"
                  style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)', color: 'var(--accent-3)' }}>
            <Palette size={12} />
            <span className="hidden xs:inline font-medium">{theme.emoji} {theme.name}</span>
            <span className="xs:hidden">{theme.emoji}</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="lg:hidden" style={{ height: 52 }} />
        <Outlet />
        <div className="lg:hidden" style={{ height: 72 }} />
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch relative"
           style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border)', height: 60, paddingBottom: 'env(safe-area-inset-bottom)', backdropFilter: 'blur(12px)' }}>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
                   className={({ isActive }) => clsx('flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90', isActive ? 'nav-bottom-active' : 'nav-bottom-inactive')}>
            {({ isActive }) => (
              <>
                <div className="relative flex items-center justify-center" style={{ width: 40, height: 24 }}>
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl transition-all"
                         style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }} />
                  )}
                  <Icon size={isActive ? 15 : 18} className="relative z-10 transition-all"
                        style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-muted)' }} />
                </div>
                <span className="text-[9px] font-medium leading-none transition-all"
                      style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-muted)', opacity: isActive ? 1 : 0.7 }}>
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
