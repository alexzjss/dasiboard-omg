import type { CSSProperties } from 'react'
import type { User } from '../auth/types'
import { THEME_OPTIONS, setThemePref, useThemePref, type ThemePref } from '../lib/theme'
import { getInitials } from '../lib/user'
import { CountBadge } from './CountBadge'
import { pendingRequestsSuffix } from './badgeText'
import { Icon, type IconName } from './Icon'
import { NotificationBell } from './NotificationBell'
import { NavOrbit } from './NavOrbit'
import { ThemeSelector } from './ThemeSelector'

const THEME_ICON: Record<ThemePref, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' }

type Props = {
  user: User
  activeTab: string
  items: [string, IconName][]
  /** Contador por rótulo do item (ex.: { Comunidade: 3 }). */
  badges?: Record<string, number>
  /** Notificações não lidas (sino). */
  unread?: number
  collapsed: boolean
  menuOpen: boolean
  style?: CSSProperties
  onToggle: () => void
  onSelectTab: (tab: string) => void
  onOpenUserMenu: (trigger: HTMLElement) => void
}

/** Sidebar do desktop (>= 1024px): 240px, ou 72px só com ícones. */
export function Sidebar({ user, activeTab, items, badges = {}, unread = 0, collapsed, menuOpen, style, onToggle, onSelectTab, onOpenUserMenu }: Props) {
  const pref = useThemePref()
  const nextTheme = THEME_OPTIONS[(THEME_OPTIONS.findIndex((o) => o.value === pref) + 1) % THEME_OPTIONS.length]
  const currentLabel = THEME_OPTIONS.find((o) => o.value === pref)?.label ?? 'Sistema'

  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`} style={style} aria-label="Barra lateral">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="" className="sidebar-logo" />
        <span className="sidebar-wordmark">daSIboard</span>
      </div>

      <nav className="sidebar-nav" aria-label="Navegação principal">
        {items.map(([label, icon]) => {
          const active = activeTab === label
          const count = badges[label] ?? 0
          return (
            <button
              key={label}
              type="button"
              className={`sidebar-item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={`${label}${pendingRequestsSuffix(count)}`}
              data-tip={label}
              onClick={() => onSelectTab(label)}
            >
              <span className="nav-icon">
                <Icon name={icon} />
                {active && <NavOrbit />}
                <CountBadge count={count} />
              </span>
              <span className="sidebar-label">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-foot">
        {collapsed ? (
          <button
            type="button"
            className="sidebar-item sidebar-theme-cycle"
            aria-label={`Tema: ${currentLabel}. Trocar para ${nextTheme.label}`}
            data-tip={`Tema: ${currentLabel}`}
            onClick={() => setThemePref(nextTheme.value)}
          >
            <span className="nav-icon"><Icon name={THEME_ICON[pref]} /></span>
          </button>
        ) : (
          <ThemeSelector ariaLabel="Tema" />
        )}

        <NotificationBell count={unread} className="sidebar-bell" />

        <button
          type="button"
          className="sidebar-profile"
          aria-label={`Menu do usuário: ${user.name}`}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          data-tip={user.name}
          onClick={(e) => onOpenUserMenu(e.currentTarget)}
        >
          <span className="avatar">{user.picture ? <img src={user.picture} alt="" /> : getInitials(user)}</span>
          <span className="sidebar-profile-name">{user.name}</span>
        </button>

        <button
          type="button"
          className="sidebar-item sidebar-collapse"
          aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          aria-expanded={!collapsed}
          data-tip={collapsed ? 'Expandir' : undefined}
          onClick={onToggle}
        >
          <span className="nav-icon"><span className="sidebar-chevron"><Icon name="arrow" /></span></span>
          <span className="sidebar-label">Recolher</span>
        </button>
      </div>
    </aside>
  )
}
