import { useEffect, useState } from 'react'

// ── Xbox dashboard loading screen (720 theme) ────────────────────────────────
function XboxScreen({ onClose }: { onClose: () => void }) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(t); setTimeout(onClose, 500); return 100 } return p + 2 }), 40)
    return () => clearInterval(t)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
         style={{ background: 'radial-gradient(ellipse at center, #0f2200 0%, #050a00 100%)' }}
         onClick={onClose}
         role="dialog">
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
           style={{ background: 'radial-gradient(circle at 38% 32%, rgba(200,255,120,0.8) 0%, rgba(111,190,0,1) 30%, rgba(50,100,0,1) 100%)', boxShadow: '0 0 40px rgba(111,190,0,0.8), 0 0 80px rgba(111,190,0,0.4)' }}>
        <span style={{ fontSize: 42 }}>✕</span>
      </div>
      <p style={{ fontFamily: '"Rajdhani", sans-serif', fontSize: 28, fontWeight: 700, color: '#c8f07a', letterSpacing: 6, textShadow: '0 0 20px rgba(111,190,0,0.6)' }}>
        XBOX 360
      </p>
      <div className="mt-8 w-64 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(111,190,0,0.2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6fbe00, #aaee44)', boxShadow: '0 0 8px rgba(111,190,0,0.8)' }} />
      </div>
      <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(111,190,0,0.4)', marginTop: 12, letterSpacing: 2 }}>
        CARREGANDO...
      </p>
    </div>
  )
}

export default XboxScreen
