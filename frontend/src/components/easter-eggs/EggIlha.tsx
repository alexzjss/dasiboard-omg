import { useEffect } from 'react'

// ── Ilha — treasure found ─────────────────────────────────────────────────────
function IlhaScreen({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
         style={{ background: 'linear-gradient(180deg, #0044aa 0%, #00aaee 40%, #ccf5ff 70%, #ffe8a0 100%)' }}
         onClick={onClose}
         role="dialog">
      <div className="text-center" style={{ fontFamily: '"Syne", sans-serif' }}>
        <p style={{ fontSize: 80, lineHeight: 1 }}>🏝️</p>
        <p style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', textShadow: '0 2px 16px rgba(0,80,180,0.5)', marginTop: 16 }}>
          Destinos Insulares
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, letterSpacing: 3 }}>
          ✦ onde tudo começou ✦
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 20, letterSpacing: 2 }}>
          Deixa ir…
        </p>
      </div>
    </div>
  )
}

export default IlhaScreen
