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
        <button key={label} className={activeTab === label ? 'active' : ''} onClick={() => onSelectTab(label)}>
          <Icon name={icon} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
