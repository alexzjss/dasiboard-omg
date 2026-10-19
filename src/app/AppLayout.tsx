import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { BottomNav } from '../components/BottomNav'
import { OnboardingFlow } from '../components/Onboarding'
import { PageTransition } from '../components/PageTransition'
import { SpaceCanvas } from '../components/SpaceCanvas'
import { UserMenu } from '../components/UserMenu'
import { findEntidadeBySlug } from '../features/entidades/data'
import { isOnboardingDone } from '../lib/storage'
import { LayoutContext } from './layoutContext'
import { NAV_ITEMS, SECTION_LABEL, SECTION_NAV_SHELL, SECTION_SPACE_THEME, sectionFromPath } from './navItems'

export function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone())

  const section = sectionFromPath(location.pathname)
  const entidade = section === 'entidades' ? findEntidadeBySlug(location.pathname.split('/')[2]) : undefined

  const openUserMenu = useCallback(() => setUserMenuOpen(true), [])
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), [])
  const layoutValue = useMemo(() => ({ openUserMenu }), [openUserMenu])

  function selectTab(label: string) {
    const item = NAV_ITEMS.find((i) => i.label === label)
    if (item) navigate(item.path)
  }

  const navShell = SECTION_NAV_SHELL[section]
  const navStyle = {
    position: 'relative' as const,
    zIndex: 1,
    ...(entidade ? { '--ent-accent': entidade.accentColor, '--ent-bg': entidade.bgColor } : {}),
  } as React.CSSProperties

  return (
    <div className="dashboard-root">
      <SpaceCanvas theme={SECTION_SPACE_THEME[section]} liveAccent={entidade?.accentColor} />
      <LayoutContext value={layoutValue}>
        <PageTransition pageKey={section}>{outlet}</PageTransition>
      </LayoutContext>
      {section !== 'perfil' && (
        <div className={navShell} style={navStyle}>
          <BottomNav
            activeTab={SECTION_LABEL[section]}
            onSelectTab={selectTab}
            items={NAV_ITEMS.map((i) => [i.label, i.icon])}
            className={section === 'entidades' ? 'ent-nav' : ''}
          />
        </div>
      )}
      {userMenuOpen && user && (
        <UserMenu
          user={user}
          onLogout={() => void logout()}
          onClose={closeUserMenu}
          onOpenProfile={() => navigate('/perfil')}
        />
      )}
      {showOnboarding && <OnboardingFlow onDone={() => setShowOnboarding(false)} />}
    </div>
  )
}
