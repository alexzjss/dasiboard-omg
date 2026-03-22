// ── Avatar — unified user avatar with fallback to initials ────────────────────
import { useMemo, type CSSProperties } from 'react'

interface AvatarProps {
  name: string
  url?: string | null
  size?: number           // Tailwind size unit (4=16px, 8=32px, 10=40px, 12=48px)
  className?: string
  style?: CSSProperties
  'aria-label'?: string
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

// Hash name to a consistent hue for the avatar background
function nameToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return hash % 360
}

export function Avatar({ name, url, size = 9, className = '', style, 'aria-label': ariaLabel }: AvatarProps) {
  const px    = size * 4   // Tailwind: 1 unit = 4px
  const hue   = useMemo(() => nameToHue(name), [name])
  const inits = useMemo(() => initials(name || '?'), [name])
  const fontSize = Math.max(10, Math.floor(px * 0.38))

  const base: CSSProperties = {
    width: px, height: px,
    borderRadius: px <= 32 ? '10px' : '14px',
    flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    ...style,
  }

  if (url) {
    return (
      <img
        src={url}
        alt={ariaLabel ?? name}
        style={{ ...base, objectFit: 'cover' }}
        className={className}
        loading="lazy"
        onError={e => {
          // Fallback to initials on broken image
          const target = e.currentTarget
          target.style.display = 'none'
          target.nextElementSibling?.removeAttribute('style')
        }}
      />
    )
  }

  return (
    <span
      className={className}
      style={{
        ...base,
        background: `hsl(${hue}, 65%, 35%)`,
        color: `hsl(${hue}, 40%, 92%)`,
        fontSize,
        fontWeight: 700,
        fontFamily: 'inherit',
        userSelect: 'none',
      }}
      aria-label={ariaLabel ?? name}
      title={name}
    >
      {inits}
    </span>
  )
}

export default Avatar
