import { useEffect } from 'react'

// ── Vaporwave ARIA (Hypado theme) ─────────────────────────────────────────────
function VaporScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
         style={{ background: 'linear-gradient(180deg, #1a0030 0%, #3d0080 40%, #0066cc 100%)' }}
         onClick={onClose}
         role="dialog">
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,0,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,255,0.08) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        transform: 'perspective(400px) rotateX(60deg)',
        transformOrigin: 'bottom',
      }} />
      <div className="relative text-center" style={{ fontFamily: '"Syne", sans-serif', zIndex: 1 }}>
        <p style={{ fontSize: 48, fontWeight: 900, color: '#ff44ff', textShadow: '0 0 30px #ff44ff, 0 0 60px #ff44ff', letterSpacing: 12, lineHeight: 1.2 }}>
          A E S T H E T I C
        </p>
        <p style={{ fontSize: 16, color: '#44ffff', marginTop: 12, letterSpacing: 6, textShadow: '0 0 16px #44ffff' }}>
          ✦ 夢の破片 ✦
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 24, letterSpacing: 3 }}>
          clique para voltar
        </p>
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 90%, rgba(255,0,255,0.25) 0%, transparent 60%)',
      }} />
    </div>
  )
}

export default VaporScreen
