export const BADGE_ICONS = ['star', 'trophy', 'bolt', 'heart', 'code', 'mic', 'book', 'flag', 'rocket', 'shield', 'camera', 'users'] as const
export const BADGE_COLORS = ['#e24a2b', '#f29a4a', '#e8b021', '#1f7a52', '#2f9e8f', '#2f5bd8', '#6b3fd4', '#c2408f', '#1d1d1f'] as const

export type BadgeIcon = (typeof BADGE_ICONS)[number]
export type BadgeColor = (typeof BADGE_COLORS)[number]

export const isBadgeIcon = (x: unknown): x is BadgeIcon => typeof x === 'string' && (BADGE_ICONS as readonly string[]).includes(x)
export const isBadgeColor = (x: unknown): x is BadgeColor => typeof x === 'string' && (BADGE_COLORS as readonly string[]).includes(x)
