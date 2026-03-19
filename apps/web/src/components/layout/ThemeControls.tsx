import { useThemeStore } from '../../stores/themeStore'

export default function ThemeControls() {
  const { mode, themeLabel, themeIndex, liteMode, setMode, cycleTheme, toggleLiteMode } = useThemeStore()

  return (
    <>
      <div className="theme-ctrl">
        <button
          className="theme-mode-btn"
          onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
          title="Alternar claro/escuro"
        >
          <span className="theme-knob">{mode === 'dark' ? '🌙' : '☀️'}</span>
          <span className="theme-mode-label">{themeLabel}</span>
        </button>
        <button className="theme-cycle-btn" onClick={cycleTheme} title="Próximo tema">
          <span className="theme-idx">{themeIndex}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <button
        className={`lite-btn ${liteMode ? 'lite-btn--on' : ''}`}
        onClick={toggleLiteMode}
        title="Modo leve — desativa animações para dispositivos lentos"
      >
        <span>⚡</span>
        <span>Modo Leve</span>
        <span className="lite-status">{liteMode ? 'on' : 'off'}</span>
      </button>

      <style>{`
        .theme-ctrl {
          display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
        }
        .theme-mode-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 8px; padding: 6px 10px; cursor: pointer;
          color: var(--text-muted); font-size: 12px; flex: 1;
          transition: all 0.15s;
        }
        .theme-mode-btn:hover { color: var(--text); background: var(--glass-border); }
        .theme-knob { font-size: 13px; }
        .theme-mode-label { flex: 1; text-align: left; }
        .theme-cycle-btn {
          display: flex; align-items: center; gap: 4px;
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 8px; padding: 6px 8px; cursor: pointer;
          color: var(--text-muted); font-size: 11px; transition: all 0.15s;
        }
        .theme-cycle-btn:hover { color: var(--text); background: var(--glass-border); }
        .theme-idx { white-space: nowrap; }
        .lite-btn {
          display: flex; align-items: center; gap: 6px; width: 100%;
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 8px; padding: 6px 10px; cursor: pointer;
          color: var(--text-muted); font-size: 12px; transition: all 0.15s;
        }
        .lite-btn:hover { color: var(--text); }
        .lite-btn--on { color: var(--warning); border-color: rgba(245,158,11,.3); }
        .lite-status { margin-left: auto; font-size: 10px; opacity: 0.6; }
      `}</style>
    </>
  )
}
