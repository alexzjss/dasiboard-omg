import { useTheme } from '@/context/ThemeContext'

// Maps each theme to its accent-3 color (matches globals.css)
const THEME_ACCENT: Record<string, string> = {
  'dark-roxo':        '#c084fc',
  'dark-hypado':      '#ffaa33',
  'dark-minas':       '#f472b6',
  'dark-dlc':         '#00ffff',
  'dark-shell':       '#00ff41',
  'light-roxo':       '#a855f7',
  'light-aranha':     '#3b82f6',
  'light-sintetizado':'#60a5fa',
  'light-grace':      '#92400e',
  'light-lab':        '#ec4899',
}

interface DasiLogoProps {
  size?: number
  className?: string
}

export default function DasiLogo({ size = 32, className = '' }: DasiLogoProps) {
  const { theme } = useTheme()
  const accent = THEME_ACCENT[theme.id] ?? '#c084fc'

  // Convert hex to RGB for feFlood
  const hex = accent.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  const filterId = `logo-tint-${theme.id}`

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', width: size, height: size, position: 'relative', flexShrink: 0 }}
    >
      {/* SVG filter definition */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            {/* Replace black pixels with the accent color */}
            <feFlood floodColor={`rgb(${r},${g},${b})`} result="color" />
            <feComposite in="color" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>

      <img
        src="/nova-logo-dasi.png"
        alt="DaSI Logo"
        width={size}
        height={size}
        style={{
          filter: `url(#${filterId})`,
          transition: 'filter 0.3s ease',
          objectFit: 'contain',
        }}
      />
    </span>
  )
}
