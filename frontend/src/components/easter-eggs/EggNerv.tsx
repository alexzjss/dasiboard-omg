import { useEffect, useState } from 'react'

// ── NERV Alert screen (Eva theme) ────────────────────────────────────────────
function NervAlertScreen({ onClose }: { onClose: () => void }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 500)
    const close = setTimeout(onClose, 8000)
    return () => { clearInterval(t); clearTimeout(close) }
  }, [onClose])

  const alerts = ['ANGEL DETECTED', 'INITIATING CONTACT', 'UNIT 01 READY', 'NERV HQ ALERT']

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
         style={{ background: '#0d0010' }}
         onClick={onClose}
         role="dialog">
      {/* Hex grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='64'%3E%3Cpolygon points='28,2 54,16 54,48 28,62 2,48 2,16' fill='none' stroke='rgba(139,0,255,0.12)' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: '56px 64px',
      }} />
      {/* Danger stripes top */}
      <div className="absolute top-0 left-0 right-0 h-3 pointer-events-none" style={{
        background: 'repeating-linear-gradient(90deg, #aaff00 0px, #aaff00 16px, #0d0010 16px, #0d0010 32px)',
        opacity: tick % 2 === 0 ? 0.9 : 0.5,
      }} />
      {/* Danger stripes bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-3 pointer-events-none" style={{
        background: 'repeating-linear-gradient(90deg, #aaff00 0px, #aaff00 16px, #0d0010 16px, #0d0010 32px)',
        opacity: tick % 2 === 0 ? 0.5 : 0.9,
      }} />

      <div className="text-center relative z-10" style={{ fontFamily: '"Orbitron", monospace' }}>
        {/* NERV logo */}
        <div className="mx-auto mb-6 flex items-center justify-center" style={{ width: 80, height: 80 }}>
          <svg viewBox="0 0 80 80" width="80" height="80">
            <polygon points="40,4 76,24 76,56 40,76 4,56 4,24" fill="none" stroke="#aaff00" strokeWidth="2"/>
            <polygon points="40,14 66,28 66,52 40,66 14,52 14,28" fill="none" stroke="#8b00ff" strokeWidth="1"/>
            <text x="40" y="45" textAnchor="middle" fill="#aaff00" fontSize="10" fontFamily="Orbitron" letterSpacing="2">NERV</text>
          </svg>
        </div>
        <p style={{
          fontSize: 32, fontWeight: 900, letterSpacing: 6,
          color: tick % 2 === 0 ? '#aaff00' : '#ff4400',
          textShadow: `0 0 20px ${tick % 2 === 0 ? '#aaff00' : '#ff4400'}`,
        }}>
          WARNING
        </p>
        <p style={{ fontSize: 12, color: '#8b00ff', marginTop: 8, letterSpacing: 4 }}>
          {alerts[tick % alerts.length]}
        </p>
        <div className="mt-6 mx-auto" style={{ width: 240 }}>
          {/* Fake progress bar */}
          <div style={{ height: 4, background: 'rgba(139,0,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(tick * 12.5) % 100}%`,
              background: 'linear-gradient(90deg, #8b00ff, #aaff00)',
              transition: 'width 0.4s linear',
            }} />
          </div>
          <p style={{ fontSize: 8, color: 'rgba(170,255,0,0.4)', marginTop: 4, letterSpacing: 3, textAlign: 'right' }}>
            SYNC RATE: {Math.min(99, tick * 13)}%
          </p>
        </div>
        <p style={{ fontSize: 8, color: 'rgba(139,0,255,0.4)', marginTop: 24, letterSpacing: 4 }}>
          CLIQUE PARA DISPENSAR
        </p>
      </div>
    </div>
  )
}

export default NervAlertScreen
