import { useEffect, useState } from 'react'

// ── DLC / Conway — RGB glitch screen ─────────────────────────────────────────
function RGBGlitchScreen({ onClose }: { onClose: () => void }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 80)
    return () => clearInterval(t)
  }, [])

  const colors = ['#ff0080','#ff6600','#ffff00','#00ff88','#00eeff','#8800ff']
  const c = colors[tick % colors.length]

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
         style={{ background: '#08020f' }}
         onClick={onClose}
         role="dialog">
      {Array.from({length: 8}).map((_, i) => (
        <div key={i} className="absolute" style={{
          top: `${(i * 13 + tick * 3) % 100}%`,
          left: 0, right: 0,
          height: Math.random() * 4 + 1,
          background: colors[(tick + i) % colors.length],
          opacity: 0.3,
        }} />
      ))}
      <div className="text-center relative z-10">
        <p style={{ fontSize: 48, fontWeight: 900, color: c, textShadow: `0 0 30px ${c}, 0 0 60px ${c}`, fontFamily: '"Orbitron", sans-serif', lineHeight: 1, letterSpacing: 4, transition: 'color 0.08s, text-shadow 0.08s' }}>
          DLC
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 12, letterSpacing: 8, fontFamily: '"Orbitron", sans-serif' }}>
          UNLOCKED
        </p>
        <div className="flex justify-center gap-2 mt-6">
          {colors.map((col, i) => (
            <div key={i} className="w-3 h-3 rounded-full" style={{ background: col, boxShadow: `0 0 8px ${col}`, opacity: tick % 6 === i ? 1 : 0.3 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default RGBGlitchScreen
