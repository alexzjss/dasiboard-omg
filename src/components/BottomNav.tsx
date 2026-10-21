import { useEffect, useRef, useState } from 'react'
import { isIOS } from '../lib/platform'
import { Icon, type IconName } from './Icon'
import { NavOrbit } from './NavOrbit'
import { getInitials } from '../lib/user'
import { CountBadge } from './CountBadge'
import { pendingRequestsSuffix } from './badgeText'

export function BottomNav({ activeTab, onSelectTab, className = '', items = [['Início', 'home'], ['Calendário', 'calendar'], ['Comunidade', 'people'], ['Entidades', 'building']] as [string, IconName][], badges = {}, profileAction, profileAvatar, profileName, profileBadge = 0 }: {
  activeTab: string
  onSelectTab: (tab: string) => void
  className?: string
  items?: [string, IconName][]
  /** Contador por rótulo do item (ex.: { Comunidade: 3 }). */
  badges?: Record<string, number>
  profileAction?: (trigger: HTMLElement) => void
  profileAvatar?: string
  profileName?: string
  /** Contador exibido no botão de perfil (pedidos de conexão). */
  profileBadge?: number
}) {
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const ios = isIOS()
    const handleScroll = () => {
      if (frameRef.current !== null) return

      frameRef.current = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY
        const scrollingDown = currentScrollY > lastScrollY.current
        // No iOS a barra nao esconde ao rolar: o Safari ja mexe na propria barra.
        const shouldBeVisible = ios || currentScrollY <= 0 || !scrollingDown

        setIsVisible((prev) => (prev === shouldBeVisible ? prev : shouldBeVisible))
        lastScrollY.current = currentScrollY
        frameRef.current = null
      })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <nav className={`bottom-nav ${className} ${isVisible ? 'is-visible' : 'is-hidden'}`.trim()} aria-label="Navegação principal">
      {items.map(([label, icon]) => {
        const count = badges[label] ?? 0
        return (
          <button key={label} type="button" className={activeTab === label ? 'active' : ''} aria-current={activeTab === label ? 'page' : undefined} aria-label={`${label}${pendingRequestsSuffix(count)}`} onClick={() => onSelectTab(label)}>
            <span className="nav-icon">
              <Icon name={icon} />
              {activeTab === label && <NavOrbit />}
              <CountBadge count={count} />
            </span>
            <span className="nav-label">{label}</span>
          </button>
        )
      })}
      {profileAction && (
        <button type="button" className="bottom-nav-profile" onClick={(event) => profileAction(event.currentTarget)} aria-label={`Abrir menu do usuário${pendingRequestsSuffix(profileBadge)}`}>
          <span className="nav-icon">
            {profileAvatar ? <img src={profileAvatar} alt="" /> : <span className="bottom-nav-profile-badge mono" aria-hidden="true">{getInitials({ name: profileName ?? 'Usuário', email: '' })}</span>}
            <CountBadge count={profileBadge} />
          </span>
          <span className="nav-label">Perfil</span>
        </button>
      )}
    </nav>
  )
}
