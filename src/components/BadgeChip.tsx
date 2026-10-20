import type { CSSProperties } from 'react'
import type { Badge } from '../lib/socialApi'

const PATHS: Record<string, string> = {
  star: 'm12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8L12 3Z',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  heart: 'M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20Z',
  code: 'm8 7-5 5 5 5M16 7l5 5-5 5M14 5l-4 14',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5 11a7 7 0 0 0 14 0M12 18v3',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM8 7h8M8 11h8',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  rocket: 'M12 3c3 2 5 5 5 9l-2 4H9l-2-4c0-4 2-7 5-9ZM9 16l-2 4 3-1M15 16l2 4-3-1M12 9v.01',
  shield: 'M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z',
  camera: 'M4 7h3l2-3h6l2 3h3v12H4V7ZM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20c0-3.3 3-5 7-5s7 1.7 7 5M17 4.5a3.5 3.5 0 0 1 0 6.5M18 15c2.5.4 4 1.8 4 5',
}

export function BadgeChip({ badge }: { badge: Badge }) {
  const path = badge.icon ? PATHS[badge.icon] : undefined
  const style = badge.color ? ({ '--badge-color': badge.color } as CSSProperties) : undefined
  return (
    <span className="badge-chip" style={style}>
      {path && <svg className="badge-chip-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={path} /></svg>}
      {badge.label}
    </span>
  )
}
