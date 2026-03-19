import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface TopbarProps {
  onMenuClick: () => void
  onSearchClick: () => void
}

export default function Topbar({ onMenuClick, onSearchClick }: TopbarProps) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  return (
    <>
      <header className="topbar">
        <button className="hamburger" onClick={onMenuClick} aria-label="Menu">
          <span /><span /><span />
        </button>

        <a className="topbar-brand" href="/" onClick={(e) => { e.preventDefault(); navigate('/') }}>
          <img src="/assets/logo-dasi.jpg" alt="DaSI" className="topbar-logo" />
          <span>DaSIboard</span>
        </a>

        <div className="topbar-actions">
          <button
            className="topbar-search-btn"
            onClick={onSearchClick}
            aria-label="Buscar"
            title="Buscar (Ctrl+K)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <button
            className="topbar-profile-btn"
            onClick={() => navigate(user ? '/profile' : '/login')}
            title={user ? (user.displayName ?? user.email) : 'Fazer login'}
            aria-label="Perfil"
          >
            {user ? (
              <span className="profile-initial-sm">
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
      </header>

      <style>{`
        .topbar {
          display:none;
          position:fixed; top:0; left:0; right:0; z-index:35;
          height:56px; padding:0 16px;
          background:var(--bg2); border-bottom:1px solid var(--glass-border);
          align-items:center; justify-content:space-between; gap:12px;
        }
        .hamburger {
          display:flex; flex-direction:column; justify-content:center; gap:4px;
          width:36px; height:36px; background:none; border:none; cursor:pointer; padding:6px;
        }
        .hamburger span {
          display:block; height:2px; width:100%;
          background:var(--text-muted); border-radius:2px; transition:all 0.2s;
        }
        .topbar-brand {
          display:flex; align-items:center; gap:8px;
          text-decoration:none; color:var(--text); font-size:15px; font-weight:700; flex:1;
        }
        .topbar-logo { width:28px; height:28px; border-radius:6px; object-fit:cover; }
        .topbar-actions { display:flex; align-items:center; gap:8px; }
        .topbar-search-btn {
          width:36px; height:36px; border-radius:8px;
          border:1px solid var(--glass-border); background:var(--glass);
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          color:var(--text-muted); transition:all .15s;
        }
        .topbar-search-btn:hover { color:var(--text); background:var(--glass-border); }
        .topbar-profile-btn {
          width:36px; height:36px; border-radius:50%;
          border:1px solid var(--border); background:var(--glass);
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          color:var(--text-muted); transition:all .15s;
        }
        .topbar-profile-btn:hover { border-color:var(--primary); }
        .profile-initial-sm { font-size:14px; font-weight:700; color:var(--primary); }
        @media (max-width:768px) { .topbar { display:flex; } }
      `}</style>
    </>
  )
}
