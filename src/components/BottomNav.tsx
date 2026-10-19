import { useEffect, useRef, useState } from 'react'
import { isIOS } from '../lib/platform'
import { Icon, type IconName } from './Icon'
import { NavOrbit } from './NavOrbit'

export function BottomNav({ activeTab, onSelectTab, className = '', items = [['Início', 'home'], ['Disciplinas', 'book'], ['Docentes', 'people'], ['Entidades', 'building']] as [string, IconName][] }: {
  activeTab: string
  onSelectTab: (tab: string) => void
  className?: string
  items?: [string, IconName][]
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
      {items.map(([label, icon]) => (
        <button key={label} type="button" className={activeTab === label ? 'active' : ''} aria-current={activeTab === label ? 'page' : undefined} onClick={() => onSelectTab(label)}>
          <span className="nav-icon">
            <Icon name={icon} />
            {activeTab === label && <NavOrbit />}
          </span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
