import { useEffect, useState } from 'react'

// ── DASI Flip card ────────────────────────────────────────────────────────────
function DasiFlipScreen({ onClose }: { onClose: () => void }) {
  const [flipped, setFlipped] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 400)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
         onClick={onClose}>
      <div style={{ perspective: 1200, width: 280, height: 380 }}>
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.8s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            borderRadius: 20, background: 'linear-gradient(135deg,#4c1d95,#7c3aed)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: 32,
            boxShadow: '0 24px 64px rgba(124,58,237,0.5)',
          }}>
            <div style={{ fontSize: 80 }}>🦅</div>
            <p style={{ color: 'white', fontSize: 14, fontWeight: 700, marginTop: 16, letterSpacing: 4,
                        fontFamily: '"Syne", sans-serif', textTransform: 'uppercase', opacity: 0.6 }}>
              DaSIboard
            </p>
          </div>
          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            borderRadius: 20, background: 'linear-gradient(135deg,#1e1b4b,#312e81)',
            transform: 'rotateY(180deg)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: 32, textAlign: 'center',
            boxShadow: '0 24px 64px rgba(49,46,129,0.6)',
            border: '2px solid rgba(167,139,250,0.4)',
          }}>
            <div style={{ fontSize: 48 }}>🥚</div>
            <p style={{ color: '#c4b5fd', fontSize: 18, fontWeight: 800, marginTop: 16,
                        fontFamily: '"Syne", sans-serif' }}>
              Easter Egg #1
            </p>
            <p style={{ color: 'rgba(196,181,253,0.7)', fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
              Você encontrou o ovo escondido da Águia 🦅
            </p>
            <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: 10, marginTop: 20, letterSpacing: 3 }}>
              CLIQUE PARA FECHAR
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DasiFlipScreen
