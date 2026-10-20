import { awardBadge, getAchievementStats, getBadges, revokeBadge, type AchievementStats } from './db.js'
import type { BadgeColor, BadgeIcon } from './badgeCatalog.js'

// Automatic badges: achievements (never taken back) and cohorts (year/course, follow the profile).
// Pure rules live here; reads and writes go through db.ts.

export type { AchievementStats }

type AutoBadge = { kind: 'achievement' | 'cohort'; sourceId: string; label: string; icon: BadgeIcon; color: BadgeColor }

export const ACHIEVEMENTS: { id: string; label: string; icon: BadgeIcon; color: BadgeColor; earned: (s: AchievementStats) => boolean }[] = [
  { id: 'profile-complete', label: 'Perfil completo', icon: 'star', color: '#e8b021', earned: (s) => s.profileComplete },
  { id: 'connections-10', label: '10 conexões', icon: 'users', color: '#2f9e8f', earned: (s) => s.connections >= 10 },
  { id: 'connections-50', label: '50 conexões', icon: 'users', color: '#6b3fd4', earned: (s) => s.connections >= 50 },
  { id: 'schedule-imported', label: 'Grade importada', icon: 'book', color: '#2f5bd8', earned: (s) => s.scheduleImported },
  { id: 'collector-10', label: 'Colecionador', icon: 'trophy', color: '#f29a4a', earned: (s) => s.collected >= 10 },
  { id: 'collector-50', label: 'Colecionador lendário', icon: 'trophy', color: '#e24a2b', earned: (s) => s.collected >= 50 },
]

const slug = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export function computeAutoBadges(stats: AchievementStats): AutoBadge[] {
  const badges: AutoBadge[] = ACHIEVEMENTS.filter((a) => a.earned(stats)).map((a) => ({ kind: 'achievement', sourceId: a.id, label: a.label, icon: a.icon, color: a.color }))
  if (stats.entryYear !== null) badges.push({ kind: 'cohort', sourceId: `year-${stats.entryYear}`, label: `Turma ${stats.entryYear}`, icon: 'flag', color: '#1f7a52' })
  const courseSlug = slug(stats.course)
  if (courseSlug) badges.push({ kind: 'cohort', sourceId: `course-${courseSlug}`, label: stats.course.trim(), icon: 'code', color: '#2f5bd8' })
  return badges
}

// Grants what is due and revokes cohorts that no longer apply. Returns the sourceIds newly awarded.
export async function syncAutoBadges(userId: string): Promise<{ awarded: string[] }> {
  const wanted = computeAutoBadges(await getAchievementStats(userId))
  const awarded: string[] = []
  for (const badge of wanted) {
    if ((await awardBadge(userId, badge)) === 'awarded') awarded.push(badge.sourceId)
  }
  const keep = new Set(wanted.map((b) => `${b.kind}:${b.sourceId}`))
  const current = (await getBadges([userId])).get(userId) ?? []
  for (const badge of current) {
    if (badge.kind === 'cohort' && !keep.has(`cohort:${badge.sourceId}`)) await revokeBadge(userId, 'cohort', badge.sourceId)
  }
  return { awarded }
}
