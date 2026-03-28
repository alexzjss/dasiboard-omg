import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Rss, KanbanSquare, BookOpen,
  CalendarDays, User, GraduationCap, Users, X,
  LogOut, Palette, Search, BookMarked, ChevronDown, Monitor, Settings,
  MoreHorizontal, Library,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import StudyMode from '@/components/study/StudyMode'
import { useEasterEggs, SafeEasterEggRenderer as EasterEggRenderer, triggerEasterEgg, useExternalEasterEgg, EasterEggId } from '@/hooks/useEasterEggs'
import { usePresentationMode, PresentationControls, PresentationButton } from '@/components/PresentationMode'
import { GlobalSearch, useGlobalSearch } from '@/components/GlobalSearch'
import Onboarding, { useOnboarding } from '@/components/onboarding/Onboarding'
import { NotificationBanner } from '@/hooks/usePushNotifications'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import { useSwipeNavigation, useKeyboardShortcuts } from '@/hooks/useInteractions'
import { useTheme, THEMES, DARK_THEMES, LIGHT_THEMES, THEME_GROUPS, ThemeId, CHRONO_ERA_LABELS, CHRONO_ERA_EMOJI } from '@/context/ThemeContext'
import { ThemeCursorStyle, GlowCursor } from '@/components/ThemeCursor'
import DLCCanvas, { DLCLofiPlayer } from '@/components/DLCCanvas'
import { LofiPlayer } from '@/components/LofiPlayer'
import { ColorBlindFilters, ColorBlindButton, useColorBlindMode } from '@/components/ColorBlindMode'
import { useLiteMode, LiteModeButton } from '@/components/LiteMode'
import { ExpBar } from '@/components/ExpCounter'
import { OfflineBanner, PWAInstallBanner } from '@/components/OfflineBanner'
import { usePanicMode, PanicBanner, PanicActiveBar } from '@/components/PanicMode'
import { useChronoPortalSound } from '@/hooks/useChronoPortal'
import { BlueprintRuler } from '@/components/BlueprintRuler'
import { ShellPrompt } from '@/components/ShellPrompt'
import { EvaSyncBar } from '@/components/EvaSync'
import { PortatilSaveState } from '@/components/PortatilSaveState'
import { AchievementToast, useAchievementToast, triggerAchievementToast } from '@/components/AchievementToast'
import { useClockEasterEggs } from '@/hooks/useEasterEggs'
import clsx from 'clsx'
import toast from 'react-hot-toast'

// Primary nav — always visible in bottom bar (max 5)
const NAV_PRIMARY = [
  { to: '/',          label: 'Início',        icon: LayoutDashboard, end: true  },
  { to: '/kanban',    label: 'Kanban',        icon: KanbanSquare,    end: false },
  { to: '/grades',    label: 'Disciplinas',   icon: BookOpen,        end: false },
  { to: '/calendar',  label: 'Calendário',    icon: CalendarDays,    end: false },
  { to: '/profile',   label: 'Perfil',        icon: User,            end: false },
]
// Secondary nav — shown in desktop sidebar + overflow menu on mobile
const NAV_SECONDARY = [
  { to: '/entities',  label: 'Entidades',     icon: Users,           end: false },
  { to: '/turma',     label: 'Turma',         icon: GraduationCap,   end: false },
  { to: '/room',      label: 'Salas',         icon: Monitor,         end: false },
  { to: '/feed',      label: 'Feed',          icon: Rss,             end: false },
  { to: '/materials', label: 'Materiais',     icon: Library,         end: false },
  { to: '/docentes',  label: 'Docentes',      icon: BookMarked,      end: false },
  { to: '/settings',  label: 'Configurações', icon: Settings,        end: false },
]
const nav = [...NAV_PRIMARY, ...NAV_SECONDARY]

// ── Theme preview colors for visual picker ───────────────────────────────────
const THEME_PREVIEWS: Record<string, { bg: string; accent: string; card: string }> = {
  // Escuros base
  'dark-roxo':        { bg: '#0d0a1a', accent: '#a855f7', card: '#1a1430' },
  'dark-hypado':      { bg: '#0a0510', accent: '#ff6600', card: '#1f1028' },
  'dark-minas':       { bg: '#060c0a', accent: '#22c55e', card: '#122018' },
  'dark-dlc':         { bg: '#08020f', accent: '#ff0080', card: '#160625' },
  'dark-shell':       { bg: '#000000', accent: '#00ff41', card: '#060606' },
  'dark-colina':      { bg: '#181818', accent: '#8a7060', card: '#2a2a2c' },
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
  // Claros novos
  'light-memento':    { bg: '#f2f4f8', accent: '#0a3080', card: '#ffffff' },
  'dark-aqua':        { bg: '#0a1a3a', accent: '#00aaff', card: '#0d2050' },
  'light-papiro':     { bg: '#fafaf5', accent: '#0050a0', card: '#f5f5ee' },
  // Chrono Trigger (usa preview base escuro)
  'dark-chrono':      { bg: '#0a0c10', accent: '#ffcc44', card: '#1c2430' },
  'light-usp':        { bg: '#f4f7fb', accent: '#004A8F', card: '#ffffff' },
  'light-stardew':    { bg: '#e8d5a3', accent: '#4a7c59', card: '#fdf0cc' },
  'dark-2077':        { bg: '#000000', accent: '#f5e642', card: '#0a0a0a' },
  'light-sakura':     { bg: '#fef5f7', accent: '#e8758a', card: '#ffffff' },
  'dark-matrix':      { bg: '#000800', accent: '#00ff41', card: '#010a01' },
  'dark-crt':         { bg: '#0a0500', accent: '#ff8800', card: '#120800' },
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
      title="Escolher inicial Pokémon" aria-label="Escolher inicial Pokémon"
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
  const [filter, setFilter] = useState<'all'|'dark'|'light'|'games'|'vibes'|'tech'|'neon'|'special'|'anime'|'super'>('all')
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const shown = THEMES.filter(t => {
    const matchFilter =
      filter === 'all'   ? true :
      filter === 'dark'  ? t.dark :
      filter === 'light' ? !t.dark :
      t.group === filter
    const matchSearch = !search.trim() ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const FILTERS = [
    { key: 'all',     label: '✨ Todos',      emoji: '' },
    { key: 'dark',    label: '🌙 Escuros',    emoji: '' },
    { key: 'light',   label: '☀️ Claros',     emoji: '' },
    { key: 'games',   label: '🕹️ Games',      emoji: '' },
    { key: 'vibes',   label: '🎨 Atmosfera',  emoji: '' },
    { key: 'tech',    label: '💻 Tech',        emoji: '' },
    { key: 'neon',    label: '🌆 Neon & CRT', emoji: '' },
    { key: 'special', label: '✨ Especial',   emoji: '' },
    { key: 'anime',   label: '🎌 Anime',      emoji: '' },
    { key: 'super',   label: '🦸 Herói',      emoji: '' },
  ] as const

  // Group by category for grouped display
  const useGrouped = filter === 'all' && !search.trim()
  const GROUP_ORDER = ['base','games','vibes','neon','tech','special','anime','super']
  const GROUP_LABELS: Record<string,string> = {
    base:'Essenciais', games:'Games & Pixel', vibes:'Atmosfera', neon:'Neon & CRT',
    tech:'Tech', special:'Especial', anime:'Anime', super:'Super-heróis',
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col animate-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '92dvh', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
          <h3 className="font-display font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Palette size={16} style={{ color: 'var(--accent-3)' }} />
            Escolher tema
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {THEMES.length} temas
            </span>
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
        <div className="px-5 mb-3 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input ref={searchRef} type="text" placeholder="Buscar por nome ou descrição..." value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="w-full pl-8 pr-3 py-2 rounded-xl text-sm"
                   style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
        </div>

        {/* Filter chips — scrollable row */}
        <div className="px-5 mb-3 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key as any)}
                      className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                      style={{
                        background: filter === f.key ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                        border: `1px solid ${filter === f.key ? 'var(--accent-1)' : 'var(--border)'}`,
                        color: filter === f.key ? 'var(--accent-3)' : 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme grid — grouped or flat */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {shown.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              <Palette size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhum tema encontrado</p>
            </div>
          )}

          {useGrouped ? (
            GROUP_ORDER.map(gkey => {
              const groupThemes = THEMES.filter(t => t.group === gkey)
              if (groupThemes.length === 0) return null
              return (
                <div key={gkey} className="mb-5">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2 px-0.5"
                     style={{ color: 'var(--text-muted)' }}>
                    {GROUP_LABELS[gkey]}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {groupThemes.map(t => <ThemeCard key={t.id} t={t} isActive={theme.id === t.id} onSelect={() => { setTheme(t.id as ThemeId); onClose() }} />)}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1">
              {shown.map(t => <ThemeCard key={t.id} t={t} isActive={theme.id === t.id} onSelect={() => { setTheme(t.id as ThemeId); onClose() }} />)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-2 shrink-0 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {shown.length} de {THEMES.length} temas
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Use <kbd className="px-1 py-0.5 rounded text-[9px]"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>Ctrl+T</kbd> para abrir
          </p>
        </div>
      </div>
    </div>
  )
}

function ThemeCard({ t, isActive, onSelect }: { t: import('@/context/ThemeContext').ThemeMeta; isActive: boolean; onSelect: () => void }) {
  const preview = THEME_PREVIEWS[t.id] ?? { bg: '#111', accent: '#888', card: '#222' }
  const isCRT = t.id === 'dark-matrix' || t.id === 'dark-crt'
  const isNeon = t.id === 'dark-2077'
  return (
    <button onClick={onSelect}
            className="flex flex-col gap-1.5 rounded-2xl p-2 transition-all active:scale-95"
            style={{
              border: `2px solid ${isActive ? 'var(--accent-1)' : 'var(--border)'}`,
              background: isActive ? 'var(--accent-soft)' : 'var(--bg-elevated)',
            }}
            title={t.description}>
      {/* Mini preview */}
      <div className="w-full rounded-lg overflow-hidden relative" style={{ height: 48, background: preview.bg }}>
        {/* Sidebar strip */}
        <div className="absolute left-0 top-0 bottom-0" style={{ width: 10, background: preview.accent + '30', borderRight: `1px solid ${preview.accent}55` }} />
        {/* Card */}
        <div className="absolute rounded" style={{ right: 5, top: 5, width: 22, height: 14, background: preview.card, border: `1px solid ${preview.accent}44` }} />
        {/* Text lines */}
        <div className="absolute rounded-full" style={{ left: 14, top: 6, width: 14, height: 3, background: preview.accent + '99' }} />
        <div className="absolute rounded-full" style={{ left: 14, top: 12, width: 10, height: 2, background: preview.accent + '55' }} />
        <div className="absolute rounded-full" style={{ left: 14, top: 17, width: 18, height: 2, background: preview.accent + '33' }} />
        {/* CRT scanlines */}
        {isCRT && Array.from({length:6}).map((_,i) => (
          <div key={i} className="absolute left-0 right-0" style={{ top: i*8, height: 1, background: preview.accent + '18', pointerEvents: 'none' }} />
        ))}
        {/* Neon glow dot */}
        {isNeon && <div className="absolute bottom-2 right-3 rounded-full" style={{ width: 6, height: 6, background: preview.accent, boxShadow: `0 0 6px ${preview.accent}` }} />}
        {/* Active check */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ background: `${preview.accent}30` }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                 style={{ background: preview.accent, boxShadow: `0 0 8px ${preview.accent}88` }}>✓</div>
          </div>
        )}
      </div>
      {/* Label */}
      <div className="text-center">
        <span style={{ fontSize: 12, display: 'block', lineHeight: 1 }}>{t.emoji}</span>
        <p className="text-[9px] font-bold mt-0.5 truncate leading-tight"
           style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-primary)' }}>
          {t.name}
        </p>
      </div>
    </button>
  )
}

// ── Sidebar inner ─────────────────────────────────────────────────────────────

// ── DASI Logo — 7 rapid clicks triggers easter egg ───────────────────────────
function DasiLogoClickable({ onEgg }: { onEgg: () => void }) {
  const clicksRef = useRef(0)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handle = () => {
    clicksRef.current++
    if (timerRef.current) clearTimeout(timerRef.current)
    if (clicksRef.current >= 7) { clicksRef.current = 0; onEgg(); return }
    timerRef.current = setTimeout(() => { clicksRef.current = 0 }, 1500)
  }
  return (
    <button onClick={handle} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform active:scale-90"
            style={{ background: 'var(--gradient-btn)', boxShadow: '0 2px 12px var(--accent-glow)' }}
            title="DaSIboard" aria-label="DaSIboard">
      <GraduationCap size={16} className="text-white" />
    </button>
  )
}

function SidebarContent({ onOpenPicker, colorBlind, liteMode, onLogoEgg }: {
  onOpenPicker: () => void
  onLogoEgg: () => void
  colorBlind: ReturnType<typeof useColorBlindMode>
  liteMode: { active: boolean; toggle: () => void }
}) {
  const { user, logout } = useAuthStore()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const initials = user?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'

  return (
    <>
      <div className="accent-orb" style={{ width: 160, height: 160, top: -60, left: -60 }} />

      {/* Logo + Brand */}
      <div className="flex items-center gap-3 px-4 py-4 relative z-10" style={{ borderBottom: '1px solid var(--border)' }}>
        <DasiLogoClickable onEgg={onLogoEgg} />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>DaSIboard</p>
          <p className="text-[10px] font-mono opacity-50 leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>SI · EACH · USP</p>
        </div>

      </div>

      {/* Theme picker button */}
      <div className="px-3 pt-3 relative z-10">
        <button onClick={onOpenPicker}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)', color: 'var(--accent-3)' }}>
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
          <Palette size={11} style={{ opacity: 0.6 }} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2 relative z-10">
        <button onClick={() => document.dispatchEvent(new CustomEvent('global-search:open'))}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <Search size={12} />
          <span className="flex-1 text-left">Buscar...</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>⌘K</span>
        </button>
      </div>

      <div className="h-px mx-4 mt-3" style={{ background: 'linear-gradient(90deg, transparent, var(--accent-1), transparent)', opacity: 0.35 }} />

      {/* Profile highlight */}
      <div className="px-3 pt-3 pb-1 relative z-10">
        <NavLink to="/profile"
                 className={({ isActive }) => clsx(
                   'flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold transition-all',
                   isActive ? 'nav-active' : 'nav-inactive'
                 )}
                 style={{
                   background: 'linear-gradient(135deg, var(--accent-soft), rgba(0,0,0,0.06))',
                   border: '1px solid var(--accent-1)',
                   boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
                 }}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name}
                 className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
                 style={{ background: 'var(--gradient-btn)', color: '#fff' }}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
          </div>
          <User size={15} />
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 relative z-10 overflow-y-auto">
        {nav.filter(n => n.to !== '/profile').map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
                   className={({ isActive }) => clsx(
                     'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                     isActive ? 'nav-active' : 'nav-inactive'
                   )}>
            {({ isActive }) => (
              <>
                <Icon size={16} style={{ strokeWidth: isActive ? 2.5 : 2 }} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Tools */}
      <div className="relative z-10 px-3 pb-2" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[9px] font-bold uppercase tracking-widest mt-2 mb-1.5 px-0.5" style={{ color: 'var(--text-muted)', opacity: 0.55 }}>Ferramentas</p>
        <div className="grid grid-cols-3 gap-1 mb-1">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('presentation:toggle'))}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-medium transition-all hover:scale-[1.04] active:scale-[0.97]"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            title="Modo Apresentação (Ctrl+Shift+P)"
          >
            <Monitor size={13} />
            <span>Apresentar</span>
          </button>
          <ColorBlindButton mode={colorBlind.mode} apply={colorBlind.apply} />
          <LiteModeButton active={liteMode.active} onToggle={liteMode.toggle} />
        </div>
        <LofiPlayer />
        <EvaSyncBar />
        <div className="mt-1">
          <StudyMode />
        </div>
      </div>

      {/* User */}
      <div className="px-3 pb-3 pt-2 relative z-10" style={{ borderTop: '1px solid var(--border)' }}>
        <ExpBar />
      </div>
    </>
  )
}

// ── App Layout ────────────────────────────────────────────────────────────────

// ── Mobile Bottom Nav — 5 primary + overflow "..." drawer ─────────────────────
function MobileBottomNav() {
  const location  = useLocation()
  const [showMore, setShowMore] = useState(false)
  const isSecondaryActive = NAV_SECONDARY.some(n => location.pathname.startsWith(n.to))

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 flex items-stretch mobile-bottomnav"
        style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 'var(--z-nav, 30)' }}
        aria-label="Navegação principal"
      >
        {NAV_PRIMARY.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
                   aria-label={label}
                   className={({ isActive }) => clsx(
                     'flex-1 flex items-center justify-center transition-all duration-200 active:scale-75 select-none',
                     isActive ? 'nav-bottom-active' : 'nav-bottom-inactive'
                   )}>
            {({ isActive }) => (
              <div className="relative flex items-center justify-center" style={{ width: 48, height: 40 }}>
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl transition-all duration-200"
                       style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }} />
                )}
                <Icon size={isActive ? 18 : 20} className="relative z-10 transition-all duration-200"
                      style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-muted)', strokeWidth: isActive ? 2.5 : 1.8 }}
                      aria-hidden="true" />
              </div>
            )}
          </NavLink>
        ))}
        {/* More button */}
        <button
          onClick={() => setShowMore(m => !m)}
          aria-label="Mais páginas"
          aria-expanded={showMore}
          className={clsx(
            'flex-1 flex items-center justify-center transition-all duration-200 active:scale-75 select-none',
            (showMore || isSecondaryActive) ? 'nav-bottom-active' : 'nav-bottom-inactive'
          )}
        >
          <div className="relative flex items-center justify-center" style={{ width: 48, height: 40 }}>
            {(showMore || isSecondaryActive) && (
              <div className="absolute inset-0 rounded-2xl"
                   style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }} />
            )}
            <MoreHorizontal size={20} className="relative z-10"
              style={{ color: (showMore || isSecondaryActive) ? 'var(--accent-3)' : 'var(--text-muted)' }}
              aria-hidden="true" />
          </div>
        </button>
      </nav>

      {/* Overflow drawer */}
      {showMore && (
        <>
          <div className="fixed inset-0 z-[var(--z-overlay,90)]" onClick={() => setShowMore(false)} aria-hidden="true" />
          <div
            className="lg:hidden fixed bottom-[60px] inset-x-3 rounded-2xl p-3 animate-in grid grid-cols-3 gap-2"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 -8px 40px rgba(0,0,0,0.3)', zIndex: 'var(--z-overlay, 90)' }}
            role="menu" aria-label="Mais navegação"
          >
            {NAV_SECONDARY.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname.startsWith(to)
              return (
                <NavLink key={to} to={to}
                         role="menuitem"
                         aria-label={label}
                         onClick={() => setShowMore(false)}
                         className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95"
                         style={{ background: isActive ? 'var(--accent-soft)' : 'var(--bg-elevated)', border: `1px solid ${isActive ? 'var(--accent-1)' : 'var(--border)'}` }}>
                  <Icon size={18} style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-muted)' }} aria-hidden="true" />
                  <span className="text-[10px] font-medium leading-none"
                        style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-muted)' }}>
                    {label}
                  </span>
                </NavLink>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, isDark, cycleTheme, setTheme, chronoEra } = useTheme()
  const { exams, active: panicAlert, panicOn, activate: activatePanic, dismiss: dismissPanic, deactivate: deactivatePanic } = usePanicMode()
  const [showPicker,      setShowPicker]   = useState(false)
  const [showPokeball,    setShowPokeball] = useState(false)
  const [starter,         setStarter]      = useState<string>(() => localStorage.getItem(STORAGE_KEYS.starter) ?? '')
  const { show: showOnboarding, markDone: doneOnboarding } = useOnboarding()

  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  useScrollRestoration()
  useSwipeNavigation()
  const { active: easterActive, close: closeEaster } = useEasterEggs()
  const [externalEgg, setExternalEgg] = useState<EasterEggId>(null)
  useExternalEasterEgg(setExternalEgg)
  const activeEgg  = externalEgg ?? easterActive
  const closeAnyEgg = useCallback(() => { setExternalEgg(null); closeEaster() }, [closeEaster])

  // ── Floor is Lava — every Friday at 13:37 ─────────────────────────────
  useEffect(() => {
    const checkLava = () => {
      const now = new Date()
      if (now.getDay() !== 5) return // only Friday
      if (now.getHours() !== 13 || now.getMinutes() !== 37) return
      const key = 'dasiboard-lava-' + now.toISOString().slice(0, 10)
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
      if (Notification.permission === 'granted') {
        new Notification('🌋 O chão é lava!', {
          body: 'Você tem 30 segundos para abrir o Kanban!', icon: '/logo192.png',
        })
      }
      toast('🌋 O chão é lava! Abra o Kanban em 30s para ganhar a conquista!', { duration: 30000, icon: '🌋' })
      setTimeout(() => {
        if (window.location.pathname === '/kanban') {
          localStorage.setItem(STORAGE_KEYS.easterFound, '1')
          triggerAchievementToast({ id:'ninja', emoji:'🥷', label:'Reflexos de Ninja',
            rarity:'legendary', category:'secret', desc:'Abriu o Kanban no chão de lava',
            hint:'???', color:'#ef4444', unlocked:true })
        }
      }, 30000)
    }
    checkLava()
    const t = setInterval(checkLava, 30000)
    return () => clearInterval(t)
  }, [])
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
    // Navegação de páginas — Ctrl+Shift+letra
    { key: 'g', ctrl: true, shift: true, description: 'Ir para Disciplinas',   group: 'Navegação', action: () => navigate('/grades') },
    { key: 'k', ctrl: true, shift: true, description: 'Ir para Kanban',        group: 'Navegação', action: () => navigate('/kanban') },
    { key: 'c', ctrl: true, shift: true, description: 'Ir para Calendário',    group: 'Navegação', action: () => navigate('/calendar') },
    { key: 'e', ctrl: true, shift: true, description: 'Ir para Entidades',     group: 'Navegação', action: () => navigate('/entities') },
    { key: 'd', ctrl: true, shift: true, description: 'Ir para Docentes',      group: 'Navegação', action: () => navigate('/docentes') },
    { key: 'p', ctrl: true, shift: true, description: 'Ir para Perfil',        group: 'Navegação', action: () => navigate('/profile') },
    { key: 'h', ctrl: true, shift: true, description: 'Ir para Início',        group: 'Navegação', action: () => navigate('/') },
    { key: 's', ctrl: true, shift: true, description: 'Ir para Configurações', group: 'Navegação', action: () => navigate('/settings') },
    { key: 'y', ctrl: true, shift: true, description: 'Abrir Study Room',      group: 'Navegação', action: () => navigate('/study') },
    { key: 'm', ctrl: true, shift: true, description: 'Ir para Materiais',     group: 'Navegação', action: () => navigate('/materials') },
    // Interface
    { key: 't', ctrl: true, description: 'Abrir seletor de temas',  group: 'Interface', action: () => setShowPicker(p => !p) },
    { key: 'Escape',        description: 'Fechar modais',            group: 'Interface', action: () => { setShowPicker(false) } },
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
    { key: 'p', ctrl: true, shift: true, description: 'Modo apresentação',  group: 'Interface', action: () => presentation.toggle() },
    { key: 'f', ctrl: true, description: 'Focar busca na página',           group: 'Ações', action: () => { const el = document.querySelector('input[type="text"][placeholder*="uscar"]') as HTMLInputElement; el?.focus() } },
    // Navegação por seta com Ctrl (livre da colisão com konami/swipe)
    { key: 'ArrowRight', ctrl: true, description: 'Próxima página',  group: 'Navegação rápida', action: () => {
      const routes = ['/', '/kanban', '/grades', '/calendar', '/entities', '/docentes', '/profile', '/settings']
      const idx = routes.indexOf(location.pathname); if (idx < routes.length - 1) navigate(routes[idx + 1])
    }},
    { key: 'ArrowLeft',  ctrl: true, description: 'Página anterior', group: 'Navegação rápida', action: () => {
      const routes = ['/', '/kanban', '/grades', '/calendar', '/entities', '/docentes', '/profile', '/settings']
      const idx = routes.indexOf(location.pathname); if (idx > 0) navigate(routes[idx - 1])
    }},
  ]

  useKeyboardShortcuts(shortcuts)

  const isPixel  = false
  const isChrono = theme.id === 'dark-chrono'
  const saveStarter = (id: string) => { localStorage.setItem(STORAGE_KEYS.starter, id); setStarter(id) }
  const colorBlind = useColorBlindMode()
  const liteMode  = useLiteMode()
  useChronoPortalSound()
  const { pending: achPending, dismiss: achDismiss } = useAchievementToast()

  // Holo mouse tracking — dynamically update --holo-x/--holo-y on cards
  useEffect(() => {
    if (theme.id !== 'dark-holo') return
    const handler = (e: MouseEvent) => {
      const cards = document.querySelectorAll<HTMLElement>('[data-theme="dark-holo"] .card')
      cards.forEach(card => {
        const rect = card.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        card.style.setProperty('--holo-x', `${x}%`)
        card.style.setProperty('--holo-y', `${y}%`)
      })
    }
    window.addEventListener('mousemove', handler, { passive: true })
    return () => window.removeEventListener('mousemove', handler)
  }, [theme.id])

  // Minas dino — shows when any pomodoro is running
  const minasRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (theme.id !== 'dark-minas') return
    const handler = (e: CustomEvent) => {
      const sidebar = document.querySelector<HTMLElement>('.sidebar-bg')
      if (sidebar) sidebar.setAttribute('data-dino', e.detail?.running ? '1' : '0')
    }
    document.addEventListener('pomodoro:running' as any, handler)
    return () => document.removeEventListener('pomodoro:running' as any, handler)
  }, [theme.id])

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ paddingTop: (panicAlert || panicOn) ? 40 : 0, backgroundColor: 'var(--bg-base)' }}>

      {/* ── Overlays & portals — display:contents keeps them outside flex flow ── */}
      <div style={{ display: 'contents' }}>
        <ThemeCursorStyle />
        <GlowCursor />
        <DLCCanvas />
        {showOnboarding && <Onboarding onClose={doneOnboarding} />}
        {showPicker && <ThemePicker onClose={() => setShowPicker(false)} />}
        {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
        <EasterEggRenderer active={activeEgg} onClose={closeAnyEgg} />
        {presentation.active && <PresentationControls fontSize={presentation.fontSize} setFontSize={presentation.setFontSize} onExit={presentation.exit} />}
        {showPokeball && <StarterPicker onClose={() => setShowPokeball(false)} onSelect={saveStarter} current={starter} />}
        {panicAlert && <PanicBanner exams={exams} onActivate={activatePanic} onDismiss={dismissPanic} />}
        {panicOn && <PanicActiveBar exams={exams} onDeactivate={deactivatePanic} />}
        <NotificationBanner />
        <ColorBlindFilters />
        <OfflineBanner />
        <PWAInstallBanner />
        <BlueprintRuler />
        <ShellPrompt />
        <PortatilSaveState />
        {achPending && <AchievementToast achievement={achPending} onDismiss={achDismiss} />}
        {isPixel && <PokeballButton onClick={() => setShowPokeball(true)} />}
      </div>

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
        <SidebarContent onOpenPicker={() => setShowPicker(true)} colorBlind={colorBlind} liteMode={liteMode}
                        onLogoEgg={() => { localStorage.setItem(STORAGE_KEYS.easterFound,'1'); setExternalEgg('dasi-flip') }} />
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

      {/* Mobile bottom nav — 5 primary items + overflow drawer */}
      <MobileBottomNav />
    </div>
  )
}
