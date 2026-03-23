// ── EXP Counter — Sistema universal de XP e níveis ───────────────────────────
import { useState, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useLocation } from 'react-router-dom'

const EXP_KEY = 'dasiboard-exp'
// EXP bar visible on retro themes; level shown everywhere in profile
const EXP_THEMES = new Set([])

// Thresholds for levels 1–20
const LEVEL_THRESHOLDS = [
  0, 80, 200, 380, 620, 950, 1400, 2000, 2800, 3800,
  5100, 6700, 8700, 11000, 14000, 17500, 22000, 28000, 35000, 44000,
]

export function getLevel(exp: number): number {
  let level = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (exp >= LEVEL_THRESHOLDS[i]) level = i + 1
    else break
  }
  return Math.min(level, LEVEL_THRESHOLDS.length)
}

export function getExpToNext(exp: number) {
  const lvl = getLevel(exp)
  if (lvl >= LEVEL_THRESHOLDS.length) return { current: exp, next: exp, pct: 100, level: lvl }
  const current = LEVEL_THRESHOLDS[lvl - 1]
  const next    = LEVEL_THRESHOLDS[lvl]
  const pct     = Math.round(((exp - current) / (next - current)) * 100)
  return { current: exp - current, next: next - current, pct, level: lvl }
}

export function getTotalExp(): number {
  return parseInt(localStorage.getItem(EXP_KEY) ?? '0', 10)
}

// EXP rewards per action — exported so other pages can call addExp
export const EXP_REWARDS = {
  pageVisit:         3,
  kanbanCard:        20,
  kanbanCardMoved:   8,
  gradeAdded:        15,
  subjectAdded:      25,
  subjectPassed:     80,
  eventCreated:      20,
  eventGlobal:       40,
  pomodoroSession:   12,
  noteCreated:       10,
  entityJoined:      30,
  avatarSet:         25,
  loginBonus:        50,
  achievementUnlock: 35,
  easterEgg:         150,
  weekStreak:        100,
}

let _expListeners: Array<(exp: number) => void> = []

export function addExp(amount: number, reason?: string): number {
  const current = parseInt(localStorage.getItem(EXP_KEY) ?? '0', 10)
  const next = current + amount
  localStorage.setItem(EXP_KEY, String(next))
  _expListeners.forEach(fn => fn(next))
  if (reason) {
    // Store last XP gain for potential toast
    localStorage.setItem('dasiboard-last-xp', JSON.stringify({ amount, reason, ts: Date.now() }))
  }
  return next
}

export function useExpCounter() {
  const [exp, setExp] = useState(() => getTotalExp())
  const { theme } = useTheme()
  const location  = useLocation()
  const isRetroTheme = EXP_THEMES.has(theme.id)
  const visited = { current: '' }

  useEffect(() => {
    const fn = (v: number) => setExp(v)
    _expListeners.push(fn)
    return () => { _expListeners = _expListeners.filter(f => f !== fn) }
  }, [])

  useEffect(() => {
    if (visited.current === location.pathname) return
    visited.current = location.pathname
    const newExp = addExp(EXP_REWARDS.pageVisit)
    setExp(newExp)
  }, [location.pathname])

  const progress = getExpToNext(exp)
  return { exp, level: progress.level, progress, isRetroTheme }
}

// ── ExpBar — sidebar widget (retro themes only) ────────────────────────────
export function ExpBar() {
  const { exp, level, progress, isRetroTheme } = useExpCounter()
  const { theme } = useTheme()
  const [showPopup, setShowPopup] = useState(false)
  const [prevLevel, setPrevLevel] = useState(level)

  useEffect(() => {
    if (level > prevLevel) {
      setShowPopup(true)
      setTimeout(() => setShowPopup(false), 3000)
    }
    setPrevLevel(level)
  }, [level, prevLevel])

  if (!isRetroTheme) return null

  const isPixel   = false
  const barColor  = '#ffcc00'
  const bgColor   = 'rgba(255,255,255,0.1)'
  const monoFont  = isPixel ? '"Press Start 2P", monospace' : '"Rajdhani", sans-serif'

  return (
    <div className="px-3 pb-1">
      {showPopup && (
        <div className="mb-2 text-center py-1.5 rounded animate-in"
             style={{ background: barColor + '22', border: `2px solid ${barColor}`,
                      borderRadius: isPixel ? 2 : 8, fontFamily: monoFont,
                      fontSize: isPixel ? 7 : 10, color: barColor,
                      letterSpacing: isPixel ? '0.05em' : '0.1em',
                      textShadow: `0 0 8px ${barColor}` }}>
          ★ LEVEL UP! LV.{level} ★
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontFamily: monoFont, fontSize: isPixel ? 7 : 9, color: barColor,
                       letterSpacing: isPixel ? '0.05em' : '0.08em', fontWeight: 700 }}>
          LV.{level}
        </span>
        <span style={{ fontFamily: monoFont, fontSize: isPixel ? 6 : 8, color: barColor, opacity: 0.6 }}>
          {progress.current}/{progress.next} EXP
        </span>
      </div>
      <div style={{ height: isPixel ? 6 : 5, background: bgColor,
                    borderRadius: isPixel ? 0 : 3,
                    border: isPixel ? `1px solid ${barColor}44` : 'none', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress.pct}%`, background: barColor,
                      borderRadius: isPixel ? 0 : 3, transition: 'width 0.5s ease',
                      boxShadow: isPixel ? 'none' : `0 0 6px ${barColor}88` }} />
      </div>
    </div>
  )
}
