import { useEffect } from 'react'

// ── Blueprint — blueprint reveal ─────────────────────────────────────────────
function BlueprintScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center"
         style={{ background: '#0a2540', cursor: 'pointer' }}
         onClick={onClose}
         role="dialog">
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(68,153,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(68,153,255,0.15) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div className="text-center relative z-10" style={{ fontFamily: '"Orbitron", monospace' }}>
        <div style={{ fontSize: 80, lineHeight: 1 }}>📐</div>
        <p style={{ color: '#88ddff', fontSize: 22, fontWeight: 500, marginTop: 16, letterSpacing: 6, textTransform: 'uppercase' }}>
          DASIBOARD
        </p>
        <div style={{ color: 'rgba(68,153,255,0.4)', fontSize: 9, marginTop: 8, letterSpacing: 4, fontFamily: '"JetBrains Mono", monospace' }}>
          REV. 1.0 — CONFIDENCIAL — SI · EACH · USP
        </div>
        <div style={{ marginTop: 24, border: '1px solid rgba(68,153,255,0.3)', padding: '8px 20px', display: 'inline-block' }}>
          <span style={{ color: 'rgba(68,153,255,0.6)', fontSize: 9, fontFamily: 'monospace', letterSpacing: 2 }}>
            ESCALA 1:1 — APROVADO PARA CONSTRUÇÃO
          </span>
        </div>
      </div>
    </div>
  )
}

export default BlueprintScreen
