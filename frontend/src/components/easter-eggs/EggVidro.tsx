import { useEffect } from 'react'

// ── Vidro — broken glass ──────────────────────────────────────────────────────
function VidroScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
         style={{ background: 'rgba(200,225,255,0.15)', backdropFilter: 'blur(40px) saturate(2)' }}
         onClick={onClose}
         role="dialog">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 20% 30%, rgba(120,180,255,0.6) 0%, transparent 60%), radial-gradient(ellipse 50% 45% at 80% 70%, rgba(170,90,255,0.5) 0%, transparent 60%)',
      }} />
      <div className="text-center relative z-10">
        <p style={{ fontSize: 80, lineHeight: 1 }}>🔮</p>
        <p style={{ fontSize: 28, fontWeight: 300, color: 'rgba(10,26,64,0.8)', marginTop: 12, letterSpacing: 8, fontFamily: '"Syne", sans-serif' }}>
          LIQUID GLASS
        </p>
        <p style={{ fontSize: 10, color: 'rgba(10,26,64,0.35)', marginTop: 8, letterSpacing: 4 }}>
          transparência · reflexo · pureza
        </p>
      </div>
    </div>
  )
}

export default VidroScreen
