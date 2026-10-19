import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { BottomNav } from '../components/BottomNav'
import { OnboardingFlow } from '../components/Onboarding'
import { Sidebar } from '../components/Sidebar'
import { PageTransition } from '../components/PageTransition'
import { SpaceCanvas } from '../components/SpaceCanvas'
import { UserMenu } from '../components/UserMenu'
import { findEntidadeBySlug } from '../features/entidades/data'
import { isOnboardingDone, loadSidebarCollapsed, saveSidebarCollapsed } from '../lib/storage'
import { LayoutContext } from './layoutContext'
import { NAV_ITEMS, SECTION_LABEL, SECTION_SPACE_THEME, sectionFromPath } from './navItems'

export function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [collapsed, setCollapsed] = useState(loadSidebarCollapsed)
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone())

  const section = sectionFromPath(location.pathname)
  const entidade = section === 'entidades' ? findEntidadeBySlug(location.pathname.split('/')[2]) : undefined

  const openUserMenu = useCallback((trigger?: HTMLElement | null) => { setMenuAnchor(trigger ?? null); setUserMenuOpen(true) }, [])
  const toggleSidebar = useCallback(() => setCollapsed((c) => !c), [])
  useEffect(() => { saveSidebarCollapsed(collapsed) }, [collapsed])
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), [])
  const layoutValue = useMemo(() => ({ openUserMenu }), [openUserMenu])

  function selectTab(label: string) {
    const item = NAV_ITEMS.find((i) => i.label === label)
    if (item) navigate(item.path)
  }

  const accentStyle = (entidade ? { '--ent-accent': entidade.accentColor, '--ent-bg': entidade.bgColor } : {}) as React.CSSProperties
  const navStyle = { position: 'relative', zIndex: 1, ...accentStyle } as React.CSSProperties

  return (
    <div className="dashboard-root" data-area={section} data-sidebar={collapsed ? 'collapsed' : 'expanded'}>
      <SpaceCanvas theme={SECTION_SPACE_THEME[section]} liveAccent={entidade?.accentColor} />
      {user && (
        <Sidebar
          user={user}
          activeTab={SECTION_LABEL[section]}
          items={NAV_ITEMS.map((i) => [i.label, i.icon])}
          collapsed={collapsed}
          menuOpen={userMenuOpen}
          style={accentStyle}
          onToggle={toggleSidebar}
          onSelectTab={selectTab}
          onOpenUserMenu={openUserMenu}
        />
      )}
      <div className="app-main">
        <LayoutContext value={layoutValue}>
          <PageTransition pageKey={section}>{outlet}</PageTransition>
        </LayoutContext>
      </div>
      {section !== 'perfil' && (
        <div className="bottom-nav-host" style={navStyle}>
          <BottomNav
            activeTab={SECTION_LABEL[section]}
            onSelectTab={selectTab}
            items={NAV_ITEMS.map((i) => [i.label, i.icon])}
            className={section === 'entidades' ? 'ent-nav' : ''}
            profileAction={openUserMenu}
            profileAvatar={user?.picture}
            profileName={user?.name}
          />
        </div>
      )}
      {userMenuOpen && user && (
        <UserMenu
          user={user}
          anchor={menuAnchor}
          onLogout={() => void logout()}
          onClose={closeUserMenu}
          onOpenProfile={() => navigate('/perfil')}
        />
      )}
      {showOnboarding && <OnboardingFlow onDone={() => setShowOnboarding(false)} />}
    </div>
  )
}
