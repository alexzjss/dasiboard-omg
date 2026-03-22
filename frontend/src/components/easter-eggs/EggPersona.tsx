import { useEffect, useState } from 'react'

// ── Persona / Memento screen ──────────────────────────────────────────────────
function PersonaScreen({ onClose }: { onClose: () => void }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setFrame(f => f + 1), 400)
    const c = setTimeout(onClose, 7000)
    return () => { clearInterval(t); clearTimeout(c) }
  }, [onClose])

  // TV static noise colors
  const noiseColor = frame % 2 === 0 ? 'rgba(10,48,128,0.06)' : 'rgba(10,48,128,0.09)'

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
         style={{ background: '#f2f4f8', cursor: 'pointer' }}
         onClick={onClose}
         role="dialog">
      {/* TV Static noise layer */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
        opacity: frame % 3 === 0 ? 0.6 : 0.3,
        mixBlendMode: 'multiply',
      }} />
      {/* Diagonal menu lines (Persona UI) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute" style={{
            top: `${-20 + i * 22}%`,
            left: '-10%', right: '-10%',
            height: '18%',
            background: i % 2 === 0
              ? 'rgba(10,48,128,0.06)'
              : noiseColor,
            transform: 'rotate(-8deg)',
            transformOrigin: 'center',
          }} />
        ))}
      </div>

      <div className="relative z-10 text-center">
        {/* Persona card */}
        <div className="mx-auto mb-6" style={{
          width: 120, height: 160,
          background: 'linear-gradient(135deg, #0a3080, #082060)',
          borderRadius: 8,
          boxShadow: '4px 4px 0 #000000',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          border: '2px solid #0a3080',
          transform: `rotate(${frame % 2 === 0 ? -3 : 3}deg)`,
          transition: 'transform 0.4s ease',
        }}>
          <div style={{ fontSize: 48 }}>🃏</div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 8, letterSpacing: 3, marginTop: 8, fontFamily: '"JetBrains Mono", monospace' }}>
            WILD CARD
          </p>
        </div>

        <p style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: 36, fontWeight: 800, letterSpacing: -1,
          color: '#0a0e18',
          textTransform: 'uppercase',
        }}>
          {frame % 4 === 0 ? 'PERSONA' : frame % 4 === 1 ? 'ACTIVADA' : frame % 4 === 2 ? 'PERSONA' : 'ACTIVADA'}
        </p>
        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: '#0a3080', letterSpacing: 6, marginTop: 8 }}>
          SI · EACH · USP
        </p>
        <p style={{ fontSize: 9, color: 'rgba(10,48,128,0.4)', marginTop: 20, letterSpacing: 3 }}>
          clique para fechar
        </p>
      </div>
    </div>
  )
}

export default PersonaScreen
