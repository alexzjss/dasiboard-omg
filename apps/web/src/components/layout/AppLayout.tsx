import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import SearchOverlay from '../shared/SearchOverlay'
import { useAuthStore } from '../../stores/authStore'

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const fetchMe = useAuthStore((s) => s.fetchMe)

  useEffect(() => {
    setMobileOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (isAuthenticated) fetchMe().catch(() => {})
  }, [isAuthenticated, fetchMe])

  // Ctrl+K / Cmd+K opens search
  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen((v) => !v)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKey)
    return () => document.removeEventListener('keydown', handleGlobalKey)
  }, [handleGlobalKey])

  return (
    <div className="app-shell">
      <div className="bg-orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <a href="#main-content" className="skip-link">Pular para o conteúdo</a>

      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onSearchOpen={() => setSearchOpen(true)}
      />

      <div className="app-body">
        <Topbar
          onMenuClick={() => setMobileOpen((v) => !v)}
          onSearchClick={() => setSearchOpen(true)}
        />
        <main id="main-content" className="main-content">
          <Outlet />
        </main>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <style>{`
        .app-shell { display:flex; min-height:100vh; position:relative; }
        .app-body { flex:1; display:flex; flex-direction:column; min-width:0; margin-left:var(--sidebar-w,240px); }
        .main-content { flex:1; padding:32px 32px 64px; position:relative; z-index:1; max-width:1200px; width:100%; }
        .mobile-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:39; backdrop-filter:blur(2px); }
        @media (max-width:768px) {
          .app-body { margin-left:0; }
          .main-content { padding:80px 16px 32px; }
        }
      `}</style>
    </div>
  )
}
