import { useEffect, useState } from 'react'

// ── Konami Code screen (Pixel theme) ─────────────────────────────────────────
function KonamiScreen({ onClose }: { onClose: () => void }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setFrame(f => f + 1), 100)
    return () => clearInterval(t)
  }, [])

  const lines = [
    '★ CHEAT ACTIVATED! ★',
    '',
    '↑↑↓↓←→←→BA',
    '',
    '+30 VIDAS',
    '+99 CRÉDITOS',
    '+∞ CAFÉ',
    '',
    'PRESS ANY KEY TO CONTINUE',
  ]

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center"
         style={{ background: '#000000', cursor: 'pointer', imageRendering: 'pixelated' }}
         onClick={onClose}
         onKeyDown={onClose}
         tabIndex={0}
         role="dialog"
         aria-label="Easter egg ativado">
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)' }} />
      <div className="text-center" style={{ fontFamily: '"Press Start 2P", monospace', imageRendering: 'pixelated' }}>
        {lines.map((line, i) => (
          <p key={i} style={{
            color: i === 0 ? '#ffcc00' : i === 4 ? '#ff4444' : i === 5 ? '#44ff44' : i === 6 ? '#4488ff' : '#f8f8f8',
            fontSize: i === 0 ? 14 : i === 8 ? 9 : 11,
            lineHeight: 2.4,
            opacity: i === 8 ? (frame % 10 < 5 ? 1 : 0) : 1,
            textShadow: i === 0 ? '0 0 20px #ffcc00' : 'none',
          }}>
            {line || ' '}
          </p>
        ))}
        <div className="mt-6 flex justify-center gap-3">
          {['🎮', '⭐', '🕹️', '⭐', '🎮'].map((e, i) => (
            <span key={i} style={{ fontSize: 24, opacity: frame % 20 < 10 ? (i % 2 === 0 ? 1 : 0.3) : (i % 2 === 0 ? 0.3 : 1) }}>
              {e}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default KonamiScreen
