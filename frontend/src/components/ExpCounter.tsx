// ── EXP Counter — Pixel / 720 / Portátil themes ───────────────────────────────
// Gains EXP for: page visits, kanban cards, grades added, events viewed
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useLocation } from 'react-router-dom'

const EXP_KEY = 'dasiboard-exp'
const EXP_THEMES = new Set(['dark-pixel', 'light-720', 'light-portatil'])

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2500, 4000, 6000, 9999]

function getLevel(exp: number) {
  let level = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (exp >= LEVEL_THRESHOLDS[i]) level = i + 1
    else break
  }
  return Math.min(level, 10)
}

function getExpToNext(exp: number) {
  const lvl = getLevel(exp)
  if (lvl >= 10) return { current: exp, next: exp, pct: 100 }
  const current = LEVEL_THRESHOLDS[lvl - 1]
  const next = LEVEL_THRESHOLDS[lvl]
  const pct = Math.round(((exp - current) / (next - current)) * 100)
  return { current: exp - current, next: next - current, pct }
}

// EXP rewards per action
export const EXP_REWARDS = {
  pageVisit:      5,
  kanbanCard:     20,
  gradeAdded:     15,
  eventCreated:   25,
  loginBonus:     50,
  easterEgg:      100,
}

let _expListeners: Array<(exp: number) => void> = []

export function addExp(amount: number) {
  const current = parseInt(localStorage.getItem(EXP_KEY) ?? '0', 10)
  const next = current + amount
  localStorage.setItem(EXP_KEY, String(next))
  _expListeners.forEach(fn => fn(next))
  return next
}

export function useExpCounter() {
  const [exp, setExp] = useState(() => parseInt(localStorage.getItem(EXP_KEY) ?? '0', 10))
  const { theme } = useTheme()
  const location = useLocation()
  const isApplicable = EXP_THEMES.has(theme.id)

  // Listen to external updates (e.g. from kanban)
  useEffect(() => {
    const fn = (v: number) => setExp(v)
    _expListeners.push(fn)
    return () => { _expListeners = _expListeners.filter(f => f !== fn) }
  }, [])

  // EXP for page visits
  const visitedRef = { current: '' }
  useEffect(() => {
    if (!isApplicable) return
    if (visitedRef.current === location.pathname) return
    visitedRef.current = location.pathname
    const newExp = addExp(EXP_REWARDS.pageVisit)
    setExp(newExp)
  }, [location.pathname, isApplicable])

  return { exp, level: getLevel(exp), progress: getExpToNext(exp), isApplicable }
}

// ── EXP Bar widget shown in sidebar user section ─────────────────────────────
export function ExpBar() {
  const { exp, level, progress, isApplicable } = useExpCounter()
  const { theme } = useTheme()
  const [showPopup, setShowPopup] = useState(false)
  const [prevLevel, setPrevLevel] = useState(level)

  // Level-up popup
  useEffect(() => {
    if (level > prevLevel) {
      setShowPopup(true)
      setTimeout(() => setShowPopup(false), 2500)
    }
    setPrevLevel(level)
  }, [level, prevLevel])

  if (!isApplicable) return null

  const isPixel = theme.id === 'dark-pixel' || theme.id === 'light-portatil'
  const barColor = theme.id === 'light-720'
    ? '#6fbe00'
    : theme.id === 'light-portatil'
    ? '#0f380f'
    : '#ffcc00'
  const bgColor = theme.id === 'light-portatil' ? '#306230' : 'rgba(255,255,255,0.1)'

  return (
    <div className="px-3 pb-1">
      {/* Level-up popup */}
      {showPopup && (
        <div
          className="mb-2 text-center py-1.5 rounded animate-in"
          style={{
            background: barColor + '22',
            border: `2px solid ${barColor}`,
            borderRadius: isPixel ? 2 : 8,
            fontFamily: isPixel ? '"Press Start 2P", monospace' : '"Rajdhani", sans-serif',
            fontSize: isPixel ? 7 : 10,
            color: barColor,
            letterSpacing: isPixel ? '0.05em' : '0.1em',
            textShadow: `0 0 8px ${barColor}`,
          }}
        >
          ★ LEVEL UP! LV.{level} ★
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <span style={{
          fontFamily: isPixel ? '"Press Start 2P", monospace' : '"Rajdhani", sans-serif',
          fontSize: isPixel ? 7 : 9,
          color: barColor,
          letterSpacing: isPixel ? '0.05em' : '0.08em',
          fontWeight: 700,
        }}>
          LV.{level}
        </span>
        <span style={{
          fontFamily: isPixel ? '"Press Start 2P", monospace' : '"Rajdhani", sans-serif',
          fontSize: isPixel ? 6 : 8,
          color: barColor,
          opacity: 0.6,
        }}>
          {progress.current}/{progress.next} EXP
        </span>
      </div>

      {/* EXP progress bar */}
      <div style={{
        height: isPixel ? 6 : 5,
        background: bgColor,
        borderRadius: isPixel ? 0 : 3,
        border: isPixel ? `1px solid ${barColor}44` : 'none',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress.pct}%`,
          background: barColor,
          borderRadius: isPixel ? 0 : 3,
          transition: 'width 0.4s ease',
          boxShadow: isPixel ? 'none' : `0 0 6px ${barColor}88`,
        }} />
      </div>
    </div>
  )
}
