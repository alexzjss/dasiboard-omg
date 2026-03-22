// ── Study Stats — tracks usage across notes, flashcards, pomodoro, streaks ────
import { useState, useEffect, useCallback } from 'react'

const STATS_KEY  = 'dasiboard-study-stats'
const STREAK_KEY = 'dasiboard-streak'

export interface StudyStats {
  notesCreated:    number
  flashcardsAnswered: number
  flashcardsCorrect:  number
  pomodoroMinutes: number  // total minutes completed
  lastStudyDate:   string  // YYYY-MM-DD
  streak:          number  // consecutive study days
  sessionDates:    string[] // last 30 days with study activity
  highScores:      Record<string, number> // subjectId → best % in flashcard session
}

const DEFAULT: StudyStats = {
  notesCreated: 0, flashcardsAnswered: 0, flashcardsCorrect: 0,
  pomodoroMinutes: 0, lastStudyDate: '', streak: 0,
  sessionDates: [], highScores: {},
}

function load(): StudyStats {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}') } }
  catch { return DEFAULT }
}

function save(s: StudyStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s))
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function updateStreak(stats: StudyStats): StudyStats {
  const t = today()
  if (stats.lastStudyDate === t) return stats

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yd = yesterday.toISOString().slice(0, 10)

  const newStreak = stats.lastStudyDate === yd ? stats.streak + 1 : 1
  const dates = [...new Set([...stats.sessionDates.slice(-29), t])]

  return { ...stats, streak: newStreak, lastStudyDate: t, sessionDates: dates }
}

// ── Global event bus ──────────────────────────────────────────────────────────
type StatsEvent =
  | { type: 'note_created' }
  | { type: 'flashcard_answered'; correct: boolean }
  | { type: 'pomodoro_completed'; minutes: number }
  | { type: 'high_score'; subjectId: string; pct: number }

let _listeners: Array<(s: StudyStats) => void> = []

export function recordStudyEvent(event: StatsEvent) {
  const current = load()
  let next = updateStreak(current)

  switch (event.type) {
    case 'note_created':
      next = { ...next, notesCreated: next.notesCreated + 1 }; break
    case 'flashcard_answered':
      next = {
        ...next,
        flashcardsAnswered: next.flashcardsAnswered + 1,
        flashcardsCorrect:  next.flashcardsCorrect + (event.correct ? 1 : 0),
      }; break
    case 'pomodoro_completed':
      next = { ...next, pomodoroMinutes: next.pomodoroMinutes + event.minutes }; break
    case 'high_score': {
      const prev = next.highScores[event.subjectId] ?? 0
      if (event.pct > prev) {
        next = { ...next, highScores: { ...next.highScores, [event.subjectId]: event.pct } }
      }
      break
    }
  }

  save(next)
  _listeners.forEach(fn => fn(next))
}

export function useStudyStats() {
  const [stats, setStats] = useState<StudyStats>(load)

  useEffect(() => {
    const fn = (s: StudyStats) => setStats(s)
    _listeners.push(fn)
    return () => { _listeners = _listeners.filter(f => f !== fn) }
  }, [])

  // Recompute streak on mount
  useEffect(() => {
    const updated = updateStreak(load())
    if (updated.streak !== stats.streak) {
      save(updated); setStats(updated)
    }
  }, [])

  return stats
}
