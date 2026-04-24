import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { NAV_PRIMARY } from './navigation'

export default function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 flex items-stretch mobile-bottomnav"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 'var(--z-nav, 30)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Navegação principal"
    >
      {NAV_PRIMARY.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={label}
          className={({ isActive }) => clsx(
            'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200 active:scale-90 select-none min-h-[48px]',
            isActive ? 'nav-bottom-active' : 'nav-bottom-inactive'
          )}
        >
          {({ isActive }) => (
            <>
              <div className="relative flex items-center justify-center" style={{ width: 40, height: 28 }}>
                {isActive && (
                  <div className="absolute inset-0 rounded-xl transition-all duration-200" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }} />
                )}
                <Icon
                  size={18}
                  className="relative z-10 transition-all duration-200"
                  style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-muted)', strokeWidth: isActive ? 2.5 : 1.8 }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-[10px] font-medium leading-none" style={{ color: isActive ? 'var(--accent-3)' : 'var(--text-muted)' }}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}