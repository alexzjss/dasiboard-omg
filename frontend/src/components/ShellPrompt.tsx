// ── Shell theme: animated typewriter prompt in page title area ───────────────
import { useEffect, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const ROUTE_COMMANDS: Record<string, string> = {
  '/':          'home',
  '/kanban':    'kanban --boards',
  '/grades':    'grades --subjects',
  '/calendar':  'calendar --month',
  '/entities':  'entities --list',
  '/docentes':  'docentes --all',
  '/profile':   'profile --me',
}

export function ShellPrompt() {
  const { theme } = useTheme()
  const location  = useLocation()
  const user      = useAuthStore(s => s.user)
  const [displayed, setDisplayed] = useState('')
  const [cursor, setCursor]       = useState(true)

  const isShell = theme.id === 'dark-shell'
  const cmd     = ROUTE_COMMANDS[location.pathname] ?? 'unknown'
  const username = user?.full_name?.split(' ')[0]?.toLowerCase() ?? 'user'
  const fullLine = `${username}@dasiboard:~$ ${cmd}`

  // Typewriter effect on route change
  useEffect(() => {
    if (!isShell) return
    setDisplayed('')
    let i = 0
    const t = setInterval(() => {
      setDisplayed(fullLine.slice(0, i + 1))
      i++
      if (i >= fullLine.length) clearInterval(t)
    }, 42)
    return () => clearInterval(t)
  }, [isShell, fullLine])

  // Blinking cursor
  useEffect(() => {
    if (!isShell) return
    const t = setInterval(() => setCursor(v => !v), 530)
    return () => clearInterval(t)
  }, [isShell])

  if (!isShell) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 24,
        background: 'rgba(0,0,0,0.95)',
        borderBottom: '1px solid rgba(0,255,65,0.15)',
        display: 'flex', alignItems: 'center',
        paddingLeft: 12,
        zIndex: 9990,
        pointerEvents: 'none',
      }}
    >
      <span style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
        color: 'rgba(0,255,65,0.7)',
        letterSpacing: '0.02em',
      }}>
        {displayed}
        <span style={{ opacity: cursor ? 1 : 0, borderRight: '1.5px solid rgba(0,255,65,0.8)', marginLeft: 1 }}>&nbsp;</span>
      </span>
    </div>
  )
}
