import type { User } from '../auth/types'
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
