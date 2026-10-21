import type { User } from '../auth/types'
import type { CalendarFilters } from '../features/calendario/filters'
import type { ScheduleEntry } from '../features/home/types'

const STORAGE_USER_KEY = 'orbe_user'
const STORAGE_SCHEDULE_PREFIX = 'orbe_schedule_'
const ONBOARDING_KEY = 'orbe_onboarding_done'

export function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch { return null }
}

export function saveStoredUser(user: User | null) {
  try {
    if (user) localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_USER_KEY)
  } catch { /* storage unavailable */ }
}

function scheduleKey(email: string) { return `${STORAGE_SCHEDULE_PREFIX}${email}` }

export function loadStoredSchedule(email: string): ScheduleEntry[] | null {
  try {
    const raw = localStorage.getItem(scheduleKey(email))
    if (!raw) return null
    return JSON.parse(raw) as ScheduleEntry[]
  } catch { return null }
}

export function saveStoredSchedule(email: string, entries: ScheduleEntry[]) {
  try { localStorage.setItem(scheduleKey(email), JSON.stringify(entries)) }
  catch { /* storage unavailable */ }
}

export function clearStoredSchedule(email: string) {
  try { localStorage.removeItem(scheduleKey(email)) }
  catch { /* storage unavailable */ }
}

export function isOnboardingDone(): boolean {
  try { return localStorage.getItem(ONBOARDING_KEY) !== null } catch { return true }
}

export function markOnboardingDone() {
  try { localStorage.setItem(ONBOARDING_KEY, '1') }
  catch { /* storage unavailable */ }
}

const THEME_KEY = 'orbe_theme'

export function loadThemePref(): 'system' | 'light' | 'dark' | null {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return raw === 'system' || raw === 'light' || raw === 'dark' ? raw : null
  } catch { return null }
}

export function saveThemePref(pref: 'system' | 'light' | 'dark') {
  try { localStorage.setItem(THEME_KEY, pref) }
  catch { /* storage unavailable */ }
}

const SIDEBAR_KEY = 'orbe_sidebar_collapsed'

export function loadSidebarCollapsed(): boolean {
  try { return localStorage.getItem(SIDEBAR_KEY) === '1' } catch { return false }
}

export function saveSidebarCollapsed(collapsed: boolean) {
  try { localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0') }
  catch { /* storage unavailable */ }
}

const CALENDAR_FILTERS_KEY = 'orbe_calendar_filters'

/** Lê os filtros salvos; devolve só os campos booleanos válidos (o resto fica a cargo de quem chama). */
export function loadCalendarFilters(): Partial<CalendarFilters> | null {
  try {
    const raw = localStorage.getItem(CALENDAR_FILTERS_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const out: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(parsed)) if (typeof value === 'boolean') out[key] = value
    return out as Partial<CalendarFilters>
  } catch { return null }
}

export function saveCalendarFilters(filters: CalendarFilters) {
  try { localStorage.setItem(CALENDAR_FILTERS_KEY, JSON.stringify(filters)) }
  catch { /* storage unavailable */ }
}
