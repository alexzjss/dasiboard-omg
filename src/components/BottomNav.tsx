import { useEffect, useRef, useState } from 'react'
import { Icon, type IconName } from './Icon'

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
    const handleScroll = () => {
      if (frameRef.current !== null) return

      frameRef.current = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY
        const scrollingDown = currentScrollY > lastScrollY.current
        const shouldBeVisible = currentScrollY <= 0 || !scrollingDown

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
            {activeTab === label && (
              <svg className="nav-orbit" viewBox="0 0 36 36" aria-hidden="true">
                <circle className="nav-orbit-ring" cx="18" cy="18" r="16" />
                <circle className="nav-orbit-dot" cx="18" cy="2" r="2.6" />
              </svg>
            )}
          </span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
