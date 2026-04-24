import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEasterEggs, useExternalEasterEgg, type EasterEggId } from '@/hooks/useEasterEggs'
import { useGlobalSearch } from '@/components/GlobalSearch'
import { usePresentationMode } from '@/components/PresentationMode'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import { useSwipeNavigation, useKeyboardShortcuts } from '@/hooks/useInteractions'

type UseAppLayoutChromeArgs = {
  pathname: string
  cycleTheme: () => void
  setShowPicker: Dispatch<SetStateAction<boolean>>
}

export function useAppLayoutChrome({ pathname, cycleTheme, setShowPicker }: UseAppLayoutChromeArgs) {
  const navigate = useNavigate()
  useScrollRestoration()
  useSwipeNavigation()

  const { active: easterActive, close: closeEaster } = useEasterEggs()
  const [externalEgg, setExternalEgg] = useState<EasterEggId>(null)
  useExternalEasterEgg(setExternalEgg)
  const activeEgg = externalEgg ?? easterActive
  const closeAnyEgg = useCallback(() => {
    setExternalEgg(null)
    closeEaster()
  }, [closeEaster])

  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch()
  const presentation = usePresentationMode()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    const handler = () => setSearchOpen(true)
    const pHandler = () => presentation.toggle()
    document.addEventListener('global-search:open', handler)
    document.addEventListener('presentation:toggle', pHandler)
    return () => {
      document.removeEventListener('global-search:open', handler)
      document.removeEventListener('presentation:toggle', pHandler)
    }
  }, [presentation, setSearchOpen])

  useEffect(() => {
    const checkLava = () => {
      const now = new Date()
      if (now.getDay() !== 5) return
      if (now.getHours() !== 13 || now.getMinutes() !== 37) return
      const key = 'dasiboard-lava-' + now.toISOString().slice(0, 10)
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
      if (Notification.permission === 'granted') {
        new Notification('🌋 O chão é lava!', {
          body: 'Você tem 30 segundos para abrir o Kanban!', icon: '/logo192.png',
        })
      }
    }
    checkLava()
    const timer = setInterval(checkLava, 30000)
    return () => clearInterval(timer)
  }, [])

  const shortcuts = useMemo(() => ([
    { key: 'g', ctrl: true, shift: true, description: 'Ir para Disciplinas', group: 'Navegação', action: () => navigate('/grades') },
    { key: 'k', ctrl: true, shift: true, description: 'Ir para Kanban', group: 'Navegação', action: () => navigate('/kanban') },
    { key: 'c', ctrl: true, shift: true, description: 'Ir para Calendário', group: 'Navegação', action: () => navigate('/calendar') },
    { key: 'e', ctrl: true, shift: true, description: 'Ir para Entidades', group: 'Navegação', action: () => navigate('/entities') },
    { key: 'd', ctrl: true, shift: true, description: 'Ir para Docentes', group: 'Navegação', action: () => navigate('/docentes') },
    { key: 'p', ctrl: true, shift: true, description: 'Ir para Perfil', group: 'Navegação', action: () => navigate('/profile') },
    { key: 'h', ctrl: true, shift: true, description: 'Ir para Início', group: 'Navegação', action: () => navigate('/') },
    { key: 's', ctrl: true, shift: true, description: 'Ir para Configurações', group: 'Navegação', action: () => navigate('/settings') },
    { key: 'y', ctrl: true, shift: true, description: 'Abrir Study Room', group: 'Navegação', action: () => navigate('/study') },
    { key: 't', ctrl: true, description: 'Abrir seletor de temas', group: 'Interface', action: () => setShowPicker((value) => !value) },
    { key: 'Escape', description: 'Fechar modais', group: 'Interface', action: () => setShowPicker(false) },
    { key: 'ArrowRight', alt: true, description: 'Próximo tema', group: 'Temas', action: () => cycleTheme() },
    { key: 'ArrowLeft', alt: true, description: 'Tema anterior', group: 'Temas', action: () => cycleTheme() },
    { key: 'n', ctrl: true, description: 'Novo card Kanban (em /kanban)', group: 'Ações', action: () => { if (pathname === '/kanban') document.dispatchEvent(new CustomEvent('kanban:new-card')) } },
    { key: 'r', ctrl: true, description: 'Recarregar dados da página', group: 'Ações', action: () => document.dispatchEvent(new CustomEvent('app:refresh')) },
    { key: 'k', ctrl: true, description: 'Busca global (Spotlight)', group: 'Ações', action: () => setSearchOpen((value) => !value) },
    { key: 'p', ctrl: true, shift: true, description: 'Modo apresentação', group: 'Interface', action: () => presentation.toggle() },
    { key: 'f', ctrl: true, description: 'Focar busca na página', group: 'Ações', action: () => { const el = document.querySelector('input[type="text"][placeholder*="uscar"]') as HTMLInputElement; el?.focus() } },
    { key: 'ArrowRight', ctrl: true, description: 'Próxima página', group: 'Navegação rápida', action: () => {
      const routes = ['/', '/kanban', '/grades', '/calendar', '/entities', '/docentes', '/profile', '/settings']
      const index = routes.indexOf(pathname)
      if (index < routes.length - 1) navigate(routes[index + 1])
    }},
    { key: 'ArrowLeft', ctrl: true, description: 'Página anterior', group: 'Navegação rápida', action: () => {
      const routes = ['/', '/kanban', '/grades', '/calendar', '/entities', '/docentes', '/profile', '/settings']
      const index = routes.indexOf(pathname)
      if (index > 0) navigate(routes[index - 1])
    }},
  ]), [cycleTheme, navigate, pathname, presentation, setSearchOpen, setShowPicker])

  useKeyboardShortcuts(shortcuts)

  return {
    activeEgg,
    closeAnyEgg,
    searchOpen,
    setSearchOpen,
    presentation,
  }
}