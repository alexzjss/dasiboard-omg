// ── Typed localStorage abstraction — prevents key typos and provides type safety ──
// All dasiboard-* keys centralized here. Use storage.get/set instead of raw localStorage.

export const STORAGE_KEYS = {
  theme:            'dasiboard-theme',
  achievements:     'dasiboard-achievements',
  area:             'dasiboard-area',
  lang:             'dasiboard-lang',
  fluxogram:        'dasiboard-fluxogram',
  notes:            'dasiboard-notes',
  studyStats:       'dasiboard-study-stats',
  studyGoals:       'study-goals-v2',
  settings:         'dasiboard-settings',
  cardEntity:       'dasiboard-card-entity',
  starter:          'dasiboard-starter',
  easterFound:      'dasiboard-easter-found',
  evaSynced:        'dasiboard-eva-100',
  subjectSchedules: 'dasiboard-subject-schedules',
  entityReactions:  'dasiboard-event-reactions',
  notifications:    'dasiboard-notifications',
  pwaDismissed:     'dasiboard-pwa-dismissed',
  noteShared:       'dasiboard-note-shared',
  lastXp:           'dasiboard-last-xp',
  alertedDeadlines: 'dasiboard-alerted-deadlines',
  entityCount:      'dasiboard-entity-count',
  roomCreated:      'dasiboard-room-created',
  colorBlind:       'dasiboard-colorblind',
  focusMode:        'dasiboard-focus-mode',
  liteMode:         'dasiboard-lite-mode',
  materials:        'dasiboard-materials-v1',
  materialsStarred: 'dasiboard-materials-starred',
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

const storage = {
  get<T>(key: StorageKey, fallback: T): T {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },

  getString(key: StorageKey, fallback = ''): string {
    return localStorage.getItem(key) ?? fallback
  },

  set<T>(key: StorageKey, value: T): void {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  },

  setString(key: StorageKey, value: string): void {
    try { localStorage.setItem(key, value) } catch {}
  },

  remove(key: StorageKey): void {
    localStorage.removeItem(key)
  },

  has(key: StorageKey): boolean {
    return localStorage.getItem(key) !== null
  },
}

export default storage
