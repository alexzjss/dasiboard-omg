// ── Blueprint theme — ruler number labels (CSS can't do dynamic counters well) ─
import { useTheme } from '@/context/ThemeContext'
import { useMemo } from 'react'

export function BlueprintRuler() {
  const { theme } = useTheme()
  if (theme.id !== 'light-blueprint') return null

  // Generate tick labels every 40px for top ruler, every 40px for left ruler
  const topTicks = useMemo(() => {
    const ticks = []
    for (let i = 0; i <= 2000; i += 160) ticks.push(i)
    return ticks
  }, [])

  const leftTicks = useMemo(() => {
    const ticks = []
    for (let i = 0; i <= 2000; i += 160) ticks.push(i)
    return ticks
  }, [])

  return (
    <>
      {/* Top ruler numbers */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', top: 3, left: 32, right: 0, height: 14,
          pointerEvents: 'none', zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {topTicks.map(v => (
          <span
            key={v}
            style={{
              position: 'absolute',
              left: v,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 7,
              color: 'rgba(68,153,255,0.55)',
              lineHeight: 1,
              transform: 'translateX(-50%)',
              letterSpacing: '-0.02em',
            }}
          >
            {v}
          </span>
        ))}
      </div>

      {/* Left ruler numbers */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', top: 20, left: 0, width: 32, bottom: 0,
          pointerEvents: 'none', zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {leftTicks.map(v => (
          <span
            key={v}
            style={{
              position: 'absolute',
              top: v,
              left: '50%',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 7,
              color: 'rgba(68,153,255,0.55)',
              lineHeight: 1,
              transform: 'translate(-50%, -50%) rotate(-90deg)',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            {v}
          </span>
        ))}
      </div>
    </>
  )
}
