import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, KanbanSquare, BookOpen,
  CalendarDays, User, GraduationCap, Sun, Moon, Users, X,
  LogOut, Palette, Search, BookMarked, ChevronDown, Monitor,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import StudyMode from '@/components/study/StudyMode'
import { useEasterEggs, EasterEggRenderer } from '@/hooks/useEasterEggs'
import { usePresentationMode, PresentationControls, PresentationButton } from '@/components/PresentationMode'
import { GlobalSearch, useGlobalSearch } from '@/components/GlobalSearch'
import Onboarding, { useOnboarding } from '@/components/onboarding/Onboarding'
import { NotificationBanner } from '@/hooks/usePushNotifications'
import { useSwipeNavigation, useKeyboardShortcuts, KeyboardHelpModal, KeyboardHelpButton } from '@/hooks/useInteractions'
import { useTheme, THEMES, DARK_THEMES, LIGHT_THEMES, THEME_GROUPS, ThemeId, CHRONO_ERA_LABELS, CHRONO_ERA_EMOJI } from '@/context/ThemeContext'
import { ThemeCursorStyle, GlowCursor } from '@/components/ThemeCursor'
import DLCCanvas, { DLCLofiPlayer } from '@/components/DLCCanvas'
import { LofiPlayer } from '@/components/LofiPlayer'
import { useFocusMode, FocusModeBar } from '@/components/FocusMode'
import { ColorBlindFilters, ColorBlindToggle, useColorBlindMode } from '@/components/ColorBlindMode'
import { ExpBar } from '@/components/ExpCounter'
import { OfflineBanner } from '@/components/OfflineBanner'
import { useChronoPortalSound } from '@/hooks/useChronoPortal'
import { BlueprintRuler } from '@/components/BlueprintRuler'
import clsx from 'clsx'

const nav = [
  { to: '/',          label: 'Início',      icon: LayoutDashboard, end: true  },
  { to: '/kanban',    label: 'Kanban',      icon: KanbanSquare,    end: false },
  { to: '/grades',    label: 'Disciplinas', icon: BookOpen,        end: false },
  { to: '/calendar',  label: 'Calendário',  icon: CalendarDays,    end: false },
  { to: '/entities',  label: 'Entidades',   icon: Users,           end: false },
  { to: '/docentes',  label: 'Docentes',    icon: BookMarked,      end: false },
  { to: '/profile',   label: 'Perfil',      icon: User,            end: false },
]

// ── Theme preview colors for visual picker ───────────────────────────────────
const THEME_PREVIEWS: Record<string, { bg: string; accent: string; card: string }> = {
  // Escuros base
  'dark-roxo':        { bg: '#0d0a1a', accent: '#a855f7', card: '#1a1430' },
  'dark-hypado':      { bg: '#0a0510', accent: '#ff6600', card: '#1f1028' },
  'dark-minas':       { bg: '#060c0a', accent: '#22c55e', card: '#122018' },
  'dark-dlc':         { bg: '#08020f', accent: '#ff0080', card: '#160625' },
  'dark-shell':       { bg: '#000000', accent: '#00ff41', card: '#060606' },
  'dark-colina':      { bg: '#181818', accent: '#8a7060', card: '#2a2a2c' },
  'dark-pixel':       { bg: '#000000', accent: '#ffcc00', card: '#181818' },
  'light-720':        { bg: '#0d1a00', accent: '#6fbe00', card: '#163000' },
  'light-blueprint':  { bg: '#0a2540', accent: '#4499ff', card: '#123d6a' },
  // Escuros novos
  'dark-holo':        { bg: '#0a0812', accent: '#a855f7', card: '#1a1430' },
  'dark-vinganca':    { bg: '#050506', accent: '#8b0000', card: '#111114' },
  'dark-eva':         { bg: '#0d0010', accent: '#aaff00', card: '#1e0028' },
  // Claros base
  'light-roxo':       { bg: '#f8f6ff', accent: '#a855f7', card: '#ffffff' },
  'light-aranha':     { bg: '#f5f0e8', accent: '#e60000', card: '#ffffff' },
  'light-sintetizado':{ bg: '#f0f7ff', accent: '#3b82f6', card: '#ffffff' },
  'light-grace':      { bg: '#fdf6ee', accent: '#dc2626', card: '#fffdf9' },
  'light-lab':        { bg: '#ff69b4', accent: '#aaff00', card: '#ffffff' },
  'light-ilha':       { bg: '#0077cc', accent: '#ffcc33', card: '#ffffff' },
  'light-vidro':      { bg: '#b8d8f8', accent: '#3b82f6', card: 'rgba(255,255,255,0.45)' },
  'light-vanilla':    { bg: '#faf7f2', accent: '#c8a060', card: '#ffffff' },
  'light-lite':       { bg: '#f8f9fa', accent: '#4444ff', card: '#ffffff' },
  // Claros novos
  'light-punkrock':   { bg: '#1a1f8f', accent: '#e60000', card: '#ffffff' },
  'light-memento':    { bg: '#f2f4f8', accent: '#0a3080', card: '#ffffff' },
  'light-portatil':   { bg: '#9bbc0f', accent: '#306230', card: '#8bac0f' },
  'dark-aqua':        { bg: '#0a1a3a', accent: '#00aaff', card: '#0d2050' },
  // Chrono Trigger (usa preview base escuro)
  'dark-chrono':      { bg: '#0a0c10', accent: '#ffcc44', card: '#1c2430' },
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
function SidebarContent({ onOpenPicker, onToggleFocus, focusActive, colorBlind }: {
  onOpenPicker: () => void
  onToggleFocus: () => void
  focusActive: boolean
  colorBlind: ReturnType<typeof useColorBlindMode>
}) {
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

      {/* Search + Presentation shortcuts */}
      <div className="px-3 pt-2 space-y-1">
        <button onClick={() => document.dispatchEvent(new CustomEvent('global-search:open'))}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <Search size={13} />
          <span className="flex-1 text-left">Buscar...</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>⌘K</span>
        </button>
        <button onClick={() => document.dispatchEvent(new CustomEvent('presentation:toggle'))}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                title="Oculta sidebar/nav, fontes maiores (Ctrl+Shift+P)">
          <Monitor size={13} />
          <span className="flex-1 text-left">Apresentação</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>⇧P</span>
        </button>
      </div>

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

      {/* Study Mode widget + Focus Mode + Lofi + Accessibility — grouped */}
      <div className="relative z-10" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Focus Mode + Daltonismo — compact row */}
        <div className="px-3 pt-2 pb-1 space-y-1">
          <button
            onClick={onToggleFocus}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: focusActive ? 'var(--accent-soft)' : 'var(--bg-elevated)',
              border: `1px solid ${focusActive ? 'var(--accent-1)' : 'var(--border)'}`,
              color: focusActive ? 'var(--accent-3)' : 'var(--text-muted)',
            }}
            title="Modo Foco — oculta sidebar e nav (Ctrl+Shift+F)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            <span className="flex-1 text-left">{focusActive ? 'Sair do foco' : 'Modo Foco'}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>⇧F</span>
          </button>
          <ColorBlindToggle mode={colorBlind.mode} apply={colorBlind.apply} />
        </div>
        {/* Lo-fi player — shown for DLC, Pixel, 720, Portátil */}
        <LofiPlayer />
        {/* Pomodoro / Study mode */}
        <StudyMode />
      </div>

      {/* User + EXP bar */}
      <div className="p-3 relative z-10" style={{ borderTop: '1px solid var(--border)' }}>
        {/* EXP bar — Pixel / 720 / Portátil themes only */}
        <ExpBar />
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
  const navigate = useNavigate()
  const { theme, isDark, toggleDarkLight, cycleTheme, setTheme, chronoEra } = useTheme()
  const [showPicker,      setShowPicker]   = useState(false)
  const [showPokeball,    setShowPokeball] = useState(false)
  const [showKeyHelp,     setShowKeyHelp]  = useState(false)
  const [starter,         setStarter]      = useState<string>(() => localStorage.getItem('dasiboard-starter') ?? '')
  const { show: showOnboarding, markDone: doneOnboarding } = useOnboarding()

  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  useSwipeNavigation()
  const { active: easterActive, close: closeEaster } = useEasterEggs()
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch()
  const presentation = usePresentationMode()

  // Listen for global search open event (from sidebar button)
  useEffect(() => {
    const handler = () => setSearchOpen(true)
    const pHandler = () => presentation.toggle()
    document.addEventListener('global-search:open', handler)
    document.addEventListener('presentation:toggle', pHandler)
    return () => {
      document.removeEventListener('global-search:open', handler)
      document.removeEventListener('presentation:toggle', pHandler)
    }
  }, [setSearchOpen, presentation])

  // ── Keyboard shortcuts ────────────────────────────────
  const shortcuts = [
    // Navegação de páginas
    { key: 'g', description: 'Ir para Disciplinas',      group: 'Navegação', action: () => navigate('/grades') },
    { key: 'k', description: 'Ir para Kanban',           group: 'Navegação', action: () => navigate('/kanban') },
    { key: 'c', description: 'Ir para Calendário',       group: 'Navegação', action: () => navigate('/calendar') },
    { key: 'e', description: 'Ir para Entidades',        group: 'Navegação', action: () => navigate('/entities') },
    { key: 'd', description: 'Ir para Docentes',         group: 'Navegação', action: () => navigate('/docentes') },
    { key: 'p', description: 'Ir para Perfil',           group: 'Navegação', action: () => navigate('/profile') },
    { key: 'h', description: 'Ir para Início',           group: 'Navegação', action: () => navigate('/') },
    // Interface — NOTE: 'b' removed to avoid breaking Konami code (↑↑↓↓←→←→BA)
    { key: 't', ctrl: true, description: 'Abrir seletor de temas',  group: 'Interface', action: () => setShowPicker(p => !p) },
    { key: '?',             description: 'Mostrar atalhos',          group: 'Interface', action: () => setShowKeyHelp(k => !k) },
    { key: 'Escape',        description: 'Fechar modais',            group: 'Interface', action: () => { setShowPicker(false); setShowKeyHelp(false) } },
    // Claro/escuro via Alt+B para não conflitar com Konami 'b'
    { key: 'b', alt: true,  description: 'Alternar claro/escuro',    group: 'Interface', action: () => toggleDarkLight() },
    // Temas — ciclar com Alt+← / Alt+→
    { key: 'ArrowRight', alt: true, description: 'Próximo tema',    group: 'Temas', action: () => cycleTheme() },
    { key: 'ArrowLeft',  alt: true, description: 'Tema anterior',   group: 'Temas', action: () => {
      const pool = isDark ? DARK_THEMES : LIGHT_THEMES
      const idx  = pool.findIndex(t => t.id === theme.id)
      setTheme(pool[(idx - 1 + pool.length) % pool.length].id as ThemeId)
    }},
    // Ações rápidas
    { key: 'n', ctrl: true, description: 'Novo card Kanban (em /kanban)',   group: 'Ações', action: () => { if (location.pathname === '/kanban') document.dispatchEvent(new CustomEvent('kanban:new-card')) } },
    { key: 'r', ctrl: true, description: 'Recarregar dados da página',      group: 'Ações', action: () => document.dispatchEvent(new CustomEvent('app:refresh')) },
    { key: 'k', ctrl: true, description: 'Busca global (Spotlight)',        group: 'Ações', action: () => setSearchOpen(v => !v) },
    { key: 'p', ctrl: true, shift: true, description: 'Modo apresentação', group: 'Interface', action: () => presentation.toggle() },
    { key: 'f', ctrl: true, shift: true, description: 'Modo Foco (oculta sidebar/nav)', group: 'Interface', action: () => focusMode.toggle() },
    { key: 'f', ctrl: true, description: 'Focar busca na página',           group: 'Ações', action: () => { const el = document.querySelector('input[type="text"][placeholder*="uscar"]') as HTMLInputElement; el?.focus() } },
    // Por página
    { key: 'ArrowRight', description: 'Próxima página (navegação)',  group: 'Navegação rápida', action: () => {
      const routes = ['/', '/kanban', '/grades', '/calendar', '/entities', '/docentes', '/profile']
      const idx = routes.indexOf(location.pathname); if (idx < routes.length - 1) navigate(routes[idx + 1])
    }},
    { key: 'ArrowLeft',  description: 'Página anterior (navegação)', group: 'Navegação rápida', action: () => {
      const routes = ['/', '/kanban', '/grades', '/calendar', '/entities', '/docentes', '/profile']
      const idx = routes.indexOf(location.pathname); if (idx > 0) navigate(routes[idx - 1])
    }},
  ]

  useKeyboardShortcuts(shortcuts)

  const isPixel  = theme.id === 'dark-pixel'
  const isChrono = theme.id === 'dark-chrono'
  const saveStarter = (id: string) => { localStorage.setItem('dasiboard-starter', id); setStarter(id) }
  const focusMode = useFocusMode()
  const colorBlind = useColorBlindMode()
  useChronoPortalSound()

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>

      {/* Theme system — cursor & canvas effects */}
      <ThemeCursorStyle />
      <GlowCursor />
      <DLCCanvas />

      {showOnboarding && <Onboarding onClose={doneOnboarding} />}
      {showPicker && <ThemePicker onClose={() => setShowPicker(false)} />}
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
      <EasterEggRenderer active={easterActive} onClose={closeEaster} />
      {presentation.active && <PresentationControls fontSize={presentation.fontSize} setFontSize={presentation.setFontSize} onExit={presentation.exit} />}
      {showKeyHelp && <KeyboardHelpModal shortcuts={shortcuts} onClose={() => setShowKeyHelp(false)} />}
      {showPokeball && <StarterPicker onClose={() => setShowPokeball(false)} onSelect={saveStarter} current={starter} />}
      <NotificationBanner />

      {/* Floating keyboard help button — keyboard users only */}
      <KeyboardHelpButton onClick={() => setShowKeyHelp(k => !k)} />

      {/* Global: color blind SVG filters, offline banner */}
      <ColorBlindFilters />
      <OfflineBanner />
      <BlueprintRuler />
      {focusMode.active && <FocusModeBar onExit={focusMode.exit} />}
      {isPixel && <PokeballButton onClick={() => setShowPokeball(true)} />}

      {/* Chrono era badge — floating, only in Chrono theme */}
      {isChrono && chronoEra && (
        <div className="lg:hidden fixed top-14 left-1/2 z-20 -translate-x-1/2 pointer-events-none"
             style={{ animation: 'animate-in 0.4s ease both' }}>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap"
               style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)', color: 'var(--accent-3)', backdropFilter: 'blur(8px)' }}>
            <span>{CHRONO_ERA_EMOJI[chronoEra]}</span>
            <span>{CHRONO_ERA_LABELS[chronoEra]}</span>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[var(--sidebar-w)] flex-col sidebar-bg shrink-0" style={{ zIndex: 10 }}>
        <SidebarContent onOpenPicker={() => setShowPicker(true)} onToggleFocus={focusMode.toggle} focusActive={focusMode.active} colorBlind={colorBlind} />
        {/* Chrono era badge on desktop sidebar */}
        {isChrono && chronoEra && (
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                 style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)', color: 'var(--accent-3)' }}>
              <span style={{ fontSize: 16 }}>{CHRONO_ERA_EMOJI[chronoEra]}</span>
              <div className="min-w-0">
                <p className="text-[9px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>Era atual</p>
                <p className="text-[10px] font-bold truncate">{CHRONO_ERA_LABELS[chronoEra]}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between mobile-topbar"
           style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
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
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button onClick={() => setSearchOpen(true)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}
                  title="Busca global (Ctrl+K)">
            <Search size={15} />
          </button>
          <button onClick={() => setShowPicker(true)}
                  className="h-10 px-3 rounded-xl flex items-center gap-1.5 text-xs transition-all active:scale-90"
                  style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)', color: 'var(--accent-3)' }}>
            <Palette size={13} />
            <span className="font-medium">{theme.emoji}</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden page-mobile" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="lg:hidden main-mobile-pad-top" />
        <Outlet />
        <div className="lg:hidden main-mobile-pad-bottom" />
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch mobile-bottomnav"
           style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
                   className={({ isActive }) => clsx(
                     'flex-1 flex flex-col items-center justify-center gap-0.5 transition-all',
                     'active:scale-90 select-none',
                     isActive ? 'nav-bottom-active' : 'nav-bottom-inactive'
                   )}>
            {({ isActive }) => (
              <>
                <div className="relative flex items-center justify-center" style={{ width: 44, height: 26 }}>
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl transition-all"
                         style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }} />
                  )}
                  <Icon size={isActive ? 16 : 19} className="relative z-10 transition-all"
                        style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-muted)' }} />
                </div>
                <span className="text-[9px] font-medium leading-none transition-all"
                      style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-muted)', opacity: isActive ? 1 : 0.65 }}>
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
