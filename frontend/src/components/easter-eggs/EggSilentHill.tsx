import { useEffect } from 'react'

// ── Silent Hill foghorn (Colina theme) ───────────────────────────────────────
function SilentHillScreen({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center"
         style={{ background: '#181818' }}
         onClick={onClose}
         role="dialog">
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 120% 60% at 50% 20%, rgba(160,155,150,0.25) 0%, transparent 70%)',
        animation: 'colinaFog 4s ease-in-out infinite',
      }} />
      <div className="text-center relative z-10">
        <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 72, fontWeight: 200, color: 'rgba(200,190,180,0.15)', letterSpacing: 24 }}>
          SILENT
        </p>
        <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 72, fontWeight: 200, color: 'rgba(200,190,180,0.15)', letterSpacing: 24 }}>
          HILL
        </p>
        <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 11, color: 'rgba(180,160,140,0.35)', marginTop: 40, letterSpacing: 4 }}>
          você não deveria estar aqui
        </p>
      </div>
    </div>
  )
}

export default SilentHillScreen
