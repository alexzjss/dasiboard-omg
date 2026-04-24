import React from 'react'
import { NavLink } from 'react-router-dom'
import { Monitor, Palette, Search, User, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/context/ThemeContext'
import StudyMode from '@/components/study/StudyMode'
import { LofiPlayer } from '@/components/LofiPlayer'
import { LiteModeButton } from '@/components/LiteMode'
import { ExpBar } from '@/components/ExpCounter'
import { EvaSyncBar } from '@/components/EvaSync'
import DasiLogo from '@/components/DasiLogo'
import { NAV_PRIMARY, NAV_SECONDARY } from './navigation'

const THEME_PREVIEWS: Record<string, { bg: string; accent: string; card: string }> = {
  'custom-dark': { bg: '#0c0c1a', accent: '#7c3aed', card: '#13133a' },
  'custom-light': { bg: '#f5f6fb', accent: '#7c3aed', card: '#ffffff' },
  'dark-roxo': { bg: '#0d0a1a', accent: '#a855f7', card: '#1a1430' },
  'dark-hypado': { bg: '#0a0510', accent: '#ff6600', card: '#1f1028' },
  'dark-minas': { bg: '#060c0a', accent: '#22c55e', card: '#122018' },
  'dark-dlc': { bg: '#08020f', accent: '#ff0080', card: '#160625' },
  'dark-shell': { bg: '#000000', accent: '#00ff41', card: '#060606' },
  'dark-colina': { bg: '#181818', accent: '#8a7060', card: '#2a2a2c' },
  'light-blueprint': { bg: '#0a2540', accent: '#4499ff', card: '#123d6a' },
  'dark-holo': { bg: '#0a0812', accent: '#a855f7', card: '#1a1430' },
  'dark-vinganca': { bg: '#050506', accent: '#8b0000', card: '#111114' },
  'dark-eva': { bg: '#0d0010', accent: '#aaff00', card: '#1e0028' },
  'light-roxo': { bg: '#f8f6ff', accent: '#a855f7', card: '#ffffff' },
  'light-aranha': { bg: '#f5f0e8', accent: '#e60000', card: '#ffffff' },
  'light-sintetizado': { bg: '#f0f7ff', accent: '#3b82f6', card: '#ffffff' },
  'light-grace': { bg: '#fdf6ee', accent: '#dc2626', card: '#fffdf9' },
  'light-lab': { bg: '#ff69b4', accent: '#aaff00', card: '#ffffff' },
  'light-ilha': { bg: '#0077cc', accent: '#ffcc33', card: '#ffffff' },
  'light-vidro': { bg: '#b8d8f8', accent: '#3b82f6', card: 'rgba(255,255,255,0.45)' },
  'light-vanilla': { bg: '#faf7f2', accent: '#c8a060', card: '#ffffff' },
  'light-memento': { bg: '#f2f4f8', accent: '#0a3080', card: '#ffffff' },
  'dark-aqua': { bg: '#0a1a3a', accent: '#00aaff', card: '#0d2050' },
  'light-papiro': { bg: '#fafaf5', accent: '#0050a0', card: '#f5f5ee' },
  'dark-chrono': { bg: '#0a0c10', accent: '#ffcc44', card: '#1c2430' },
  'light-usp': { bg: '#f4f7fb', accent: '#004A8F', card: '#ffffff' },
  'light-stardew': { bg: '#e8d5a3', accent: '#4a7c59', card: '#fdf0cc' },
  'dark-2077': { bg: '#000000', accent: '#f5e642', card: '#0a0a0a' },
  'light-sakura': { bg: '#fef5f7', accent: '#e8758a', card: '#ffffff' },
  'dark-matrix': { bg: '#000800', accent: '#00ff41', card: '#010a01' },
  'dark-crt': { bg: '#0a0500', accent: '#ff8800', card: '#120800' },
}

export default function Sidebar({ onOpenPicker, liteMode, onLogoEgg }: {
  onOpenPicker: () => void
  onLogoEgg: () => void
  liteMode: { active: boolean; toggle: () => void }
}) {
  const { user } = useAuthStore()
  const { theme } = useTheme()
  const initials = user?.full_name?.split(' ').map((name: string) => name[0]).slice(0, 2).join('').toUpperCase() ?? 'U'

  return (
    <>
      <div className="accent-orb" style={{ width: 160, height: 160, top: -60, left: -60 }} />

      <div className="flex items-center gap-3 px-4 py-4 relative z-10" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={onLogoEgg} className="shrink-0 rounded-2xl transition-transform active:scale-95" aria-label="Abrir easter egg do logo">
          <DasiLogo size={32} className="shrink-0" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>DaSIboard</p>
          <p className="text-[10px] font-mono opacity-50 leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>SI · EACH · USP</p>
        </div>
      </div>

      <div className="px-3 pt-3 relative z-10">
        <button onClick={onOpenPicker}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)', color: 'var(--accent-3)' }}>
          <div className="flex gap-0.5 shrink-0">
            {[THEME_PREVIEWS[theme.id]?.bg ?? '#111', THEME_PREVIEWS[theme.id]?.accent ?? '#888', THEME_PREVIEWS[theme.id]?.card ?? '#222'].map((color, index) => (
              <div key={index} className="w-3 h-3 rounded-sm" style={{ background: color, border: '1px solid rgba(255,255,255,0.15)' }} />
            ))}
          </div>
          <span className="flex items-center gap-1.5 flex-1 min-w-0">
            <span>{theme.emoji}</span>
            <span className="truncate">{theme.name}</span>
          </span>
          <Palette size={11} style={{ opacity: 0.6 }} />
        </button>
      </div>

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

      <div className="px-3 pt-3 pb-1 relative z-10">
        <NavLink
          to="/perfil"
          className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold transition-all', isActive ? 'nav-active' : 'nav-inactive')}
          style={{ background: 'linear-gradient(135deg, var(--accent-soft), rgba(0,0,0,0.06))', border: '1px solid var(--accent-1)', boxShadow: '0 6px 18px rgba(0,0,0,0.22)' }}
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold" style={{ background: 'var(--gradient-btn)', color: '#fff' }}>
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

      <nav className="flex-1 px-3 py-3 space-y-0.5 relative z-10 overflow-y-auto">
        {NAV_PRIMARY.map(({ to, label, icon: Icon, end }) => {
          const subs = NAV_SECONDARY.filter((item) => item.parent === to)
          return (
            <React.Fragment key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150', isActive ? 'nav-active' : 'nav-inactive')}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} style={{ strokeWidth: isActive ? 2.5 : 2 }} />
                    <span className="flex-1">{label}</span>
                    {subs.length > 0 && <ChevronRight size={12} style={{ opacity: 0.4 }} />}
                  </>
                )}
              </NavLink>
              {subs.length > 0 && subs.map(({ to: subTo, label: subLabel, icon: SubIcon }) => (
                <NavLink
                  key={subTo}
                  to={subTo}
                  className={({ isActive }) => clsx('flex items-center gap-3 pl-9 pr-3 py-2 rounded-xl text-xs font-medium transition-all duration-150', isActive ? 'nav-active' : 'nav-inactive')}
                >
                  {({ isActive }) => (
                    <>
                      <SubIcon size={13} style={{ strokeWidth: isActive ? 2.5 : 2 }} />
                      <span>{subLabel}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </React.Fragment>
          )
        })}
      </nav>

      <div className="relative z-10 px-3 pb-2" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[9px] font-bold uppercase tracking-widest mt-2 mb-1.5 px-0.5" style={{ color: 'var(--text-muted)', opacity: 0.55 }}>Ferramentas</p>
        <div className="grid grid-cols-2 gap-1 mb-1">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('presentation:toggle'))}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-medium transition-all hover:scale-[1.04] active:scale-[0.97]"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            title="Modo Apresentação (Ctrl+Shift+P)"
          >
            <Monitor size={13} />
            <span>Apresentar</span>
          </button>
          <LiteModeButton active={liteMode.active} onToggle={liteMode.toggle} />
        </div>
        <LofiPlayer />
        <EvaSyncBar />
        <div className="mt-1">
          <StudyMode />
        </div>
      </div>

      <div className="px-3 pb-3 pt-2 relative z-10" style={{ borderTop: '1px solid var(--border)' }}>
        <ExpBar />
      </div>
    </>
  )
}