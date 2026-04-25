import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import {
  GraduationCap, X, Palette, Search,
} from 'lucide-react'
import { SafeEasterEggRenderer as EasterEggRenderer, triggerEasterEgg } from '@/hooks/useEasterEggs'
import { PresentationControls } from '@/components/PresentationMode'
import { GlobalSearch } from '@/components/GlobalSearch'
import Onboarding, { useOnboarding } from '@/components/onboarding/Onboarding'
import { NotificationBanner } from '@/hooks/usePushNotifications'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import { useTheme, THEMES, CHRONO_ERA_LABELS, CHRONO_ERA_EMOJI } from '@/context/ThemeContext'
import { ThemeCursorStyle, GlowCursor } from '@/components/ThemeCursor'
import DLCCanvas, { DLCLofiPlayer } from '@/components/DLCCanvas'
import { useLiteMode } from '@/components/LiteMode'
import { OfflineBanner, PWAInstallBanner } from '@/components/OfflineBanner'
import { usePanicMode, PanicBanner, PanicActiveBar } from '@/components/PanicMode'
import { useChronoPortalSound } from '@/hooks/useChronoPortal'
import { BlueprintRuler } from '@/components/BlueprintRuler'
import { ShellPrompt } from '@/components/ShellPrompt'
import { PortatilSaveState } from '@/components/PortatilSaveState'
import { AchievementToast, useAchievementToast } from '@/components/AchievementToast'
import BottomNav from '@/components/layout/BottomNav'
import Sidebar from '@/components/layout/Sidebar'
import { useAppLayoutChrome } from '@/components/layout/useAppLayoutChrome'

// ── Theme preview colors for visual picker ───────────────────────────────────
const THEME_PREVIEWS: Record<string, { bg: string; accent: string; card: string }> = {
  'custom-dark':      { bg: '#0c0c1a', accent: '#7c3aed', card: '#13133a' },
  'custom-light':     { bg: '#f5f6fb', accent: '#7c3aed', card: '#ffffff' },
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
  const { theme, setTheme, accentColor, setAccentColor } = useTheme()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const presets = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

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
            Personalizar tema
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

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Modo</p>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: theme.id === t.id ? 'var(--accent-soft)' : 'var(--bg-card)',
                    border: `1px solid ${theme.id === t.id ? 'var(--accent-1)' : 'var(--border)'}`,
                    color: theme.id === t.id ? 'var(--accent-3)' : 'var(--text-secondary)',
                  }}
                >
                  {t.emoji} {t.name}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>Cor de destaque</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer"
                style={{ background: 'transparent', border: '1px solid var(--border)' }}
                title="Selecionar cor de destaque"
              />
              <input
                type="text"
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                className="input text-sm h-10"
                maxLength={7}
              />
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {presets.map(c => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c,
                    border: `2px solid ${accentColor.toLowerCase() === c ? 'var(--text-primary)' : 'var(--bg-card)'}`,
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Use <kbd className="px-1 py-0.5 rounded text-[9px]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>Ctrl+T</kbd> para abrir este painel
          </p>
        </div>
        <div className="px-5 pb-4 pt-2 shrink-0 flex items-center justify-end" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn-primary text-xs py-2 px-4">Concluir</button>
        </div>
      </div>
    </div>
  )
}

// ── App Layout ────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const location = useLocation()
  const { theme, cycleTheme, chronoEra } = useTheme()
  const { exams, active: panicAlert, panicOn, activate: activatePanic, dismiss: dismissPanic, deactivate: deactivatePanic } = usePanicMode()
  const [showPicker, setShowPicker] = useState(false)
  const [showPokeball,    setShowPokeball] = useState(false)
  const [starter,         setStarter]      = useState<string>(() => localStorage.getItem(STORAGE_KEYS.starter) ?? '')
  const { show: showOnboarding, markDone: doneOnboarding } = useOnboarding()
  const { activeEgg, closeAnyEgg, searchOpen, setSearchOpen, presentation } = useAppLayoutChrome({
    pathname: location.pathname,
    cycleTheme,
    setShowPicker,
  })

  const isPixel  = false
  const isChrono = theme.id === 'dark-chrono'
  const saveStarter = (id: string) => { localStorage.setItem(STORAGE_KEYS.starter, id); setStarter(id) }
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
        <Sidebar onOpenPicker={() => setShowPicker(true)} liteMode={liteMode}
                 onLogoEgg={() => { localStorage.setItem(STORAGE_KEYS.easterFound,'1'); triggerEasterEgg('dasi-flip') }} />
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
      <BottomNav />
    </div>
  )
}
