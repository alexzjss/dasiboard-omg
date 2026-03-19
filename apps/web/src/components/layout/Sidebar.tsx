import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import ThemeControls from './ThemeControls'

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
  onSearchOpen: () => void
}

const NAV = [
  {
    label: 'Principal',
    items: [
      { to: '/',          label: 'Home',       exact: true, emoji: '🏠' },
      { to: '/calendar',  label: 'Calendário',              emoji: '📅' },
      { to: '/schedule',  label: 'Horários',                emoji: '🗓️' },
      { to: '/kanban',    label: 'Kanban',     badge: 'Novo', badgeClass: 'badge-new', emoji: '📋' },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { to: '/newsletter', label: 'Newsletter',                          emoji: '📧' },
      { to: '/docentes',   label: 'Docentes',                           emoji: '👩‍🏫' },
      { to: '/estudos',    label: 'Estudos',                            emoji: '📚' },
      { to: '/entidades',  label: 'Entidades', badge: 'Novo', badgeClass: 'badge-new', emoji: '🏛️' },
    ],
  },
  {
    label: 'Ferramentas',
    items: [
      { to: '/notas-gpa',   label: 'Notas & GPA', badge: 'Novo', badgeClass: 'badge-new', emoji: '📈' },
      { to: '/faltas',      label: 'Faltas',       badge: 'Novo', badgeClass: 'badge-danger', emoji: '📋' },
      { to: '/ferramentas', label: 'Ferramentas',                 emoji: '🛠️' },
      { to: '/desafios',    label: 'Desafios',     badge: 'Beta', badgeClass: 'badge-info', emoji: '💻' },
    ],
  },
]

export default function Sidebar({ mobileOpen, onClose, onSearchOpen }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  function handleProfileClick() {
    navigate(user ? '/profile' : '/login')
    onClose()
  }

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <a
            className="sidebar-brand"
            href="/"
            onClick={(e) => { e.preventDefault(); navigate('/'); onClose() }}
          >
            <img src="/assets/logo-dasi.jpg" alt="DaSI" className="sidebar-logo" />
            <div className="sidebar-brand-text">
              <span className="sidebar-title">DaSIboard</span>
              <span className="sidebar-subtitle">SI-USP / EACH</span>
            </div>
          </a>

          <button
            className="sidebar-profile-btn"
            onClick={handleProfileClick}
            title={user ? (user.displayName ?? user.email) : 'Fazer login'}
          >
            {user ? (
              <span className="profile-initial">
                {(user.displayName ?? user.email)[0]?.toUpperCase()}
              </span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </button>
        </div>

        {/* Search button */}
        <button className="sidebar-search-btn" onClick={() => { onSearchOpen(); onClose() }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="sidebar-search-placeholder">Buscar...</span>
          <kbd className="sidebar-search-kbd">⌘K</kbd>
        </button>

        {/* Nav */}
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {NAV.map((section) => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
                  }
                  onClick={onClose}
                >
                  <span className="sidebar-link-emoji" aria-hidden="true">{item.emoji}</span>
                  <span className="sidebar-link-label">{item.label}</span>
                  {item.badge && (
                    <span className={`sidebar-badge ${item.badgeClass ?? ''}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <ThemeControls />
          <div className="sidebar-time" aria-label="Hora atual">{time}</div>
        </div>
      </aside>

      <style>{`
        .sidebar {
          position:fixed; top:0; left:0; bottom:0;
          width:var(--sidebar-w,240px);
          background:var(--bg2);
          border-right:1px solid var(--glass-border);
          display:flex; flex-direction:column;
          z-index:40; overflow:hidden;
          transition:transform 0.25s ease;
        }

        /* Header */
        .sidebar-header {
          display:flex; align-items:center; justify-content:space-between;
          padding:16px 14px 12px;
          border-bottom:1px solid var(--glass-border);
          flex-shrink:0;
        }
        .sidebar-brand {
          display:flex; align-items:center; gap:10px;
          text-decoration:none; color:inherit; flex:1; min-width:0;
        }
        .sidebar-logo { width:32px; height:32px; border-radius:8px; object-fit:cover; flex-shrink:0; }
        .sidebar-brand-text { display:flex; flex-direction:column; min-width:0; }
        .sidebar-title { font-size:14px; font-weight:700; color:var(--text); line-height:1.2; }
        .sidebar-subtitle { font-size:10px; color:var(--text-muted); }
        .sidebar-profile-btn {
          width:32px; height:32px; border-radius:50%;
          border:1px solid var(--border); background:var(--glass);
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          color:var(--text-muted); transition:all 0.15s; flex-shrink:0;
        }
        .sidebar-profile-btn:hover { background:var(--glass-border); color:var(--text); }
        .profile-initial { font-size:13px; font-weight:700; color:var(--primary); }

        /* Search */
        .sidebar-search-btn {
          display:flex; align-items:center; gap:8px;
          margin:10px 12px 4px;
          background:var(--glass); border:1px solid var(--glass-border);
          border-radius:8px; padding:7px 10px; cursor:pointer;
          color:var(--text-dim); font-size:12px; text-align:left;
          transition:all .15s; width:calc(100% - 24px);
        }
        .sidebar-search-btn:hover { border-color:var(--border); color:var(--text-muted); }
        .sidebar-search-placeholder { flex:1; }
        .sidebar-search-kbd {
          font-size:10px; padding:1px 5px; border-radius:4px;
          border:1px solid var(--glass-border); background:var(--bg3);
          color:var(--text-dim); font-family:monospace;
        }

        /* Nav */
        .sidebar-nav {
          flex:1; overflow-y:auto; padding:8px;
          display:flex; flex-direction:column; gap:1px;
        }
        .sidebar-section-label {
          font-size:10px; font-weight:600; letter-spacing:.08em;
          text-transform:uppercase; color:var(--text-dim);
          padding:10px 8px 4px;
        }
        .sidebar-link {
          display:flex; align-items:center; gap:9px;
          padding:7px 10px; border-radius:8px;
          font-size:13px; color:var(--text-muted);
          text-decoration:none; cursor:pointer;
          transition:all 0.12s; border:none; background:none; width:100%;
        }
        .sidebar-link:hover { background:var(--glass); color:var(--text); }
        .sidebar-link--active { background:rgba(124,58,237,.12); color:var(--primary); font-weight:500; }
        .sidebar-link-emoji { font-size:14px; flex-shrink:0; width:18px; text-align:center; }
        .sidebar-link-label { flex:1; }
        .sidebar-badge {
          font-size:9px; font-weight:600; padding:2px 5px;
          border-radius:4px; letter-spacing:.02em;
        }
        .badge-new     { background:rgba(124,58,237,.18); color:var(--primary); }
        .badge-info    { background:rgba(56,189,248,.15); color:var(--info); }
        .badge-danger  { background:rgba(239,68,68,.15);  color:var(--danger); }

        /* Footer */
        .sidebar-footer {
          padding:10px 10px 14px;
          border-top:1px solid var(--glass-border);
          flex-shrink:0;
        }
        .sidebar-time {
          text-align:center; font-size:11px; color:var(--text-dim);
          margin-top:8px; font-variant-numeric:tabular-nums;
        }

        /* Mobile */
        @media (max-width:768px) {
          .sidebar { transform:translateX(-100%); }
          .sidebar--open { transform:translateX(0); box-shadow:4px 0 24px rgba(0,0,0,.4); }
        }
      `}</style>
    </>
  )
}
