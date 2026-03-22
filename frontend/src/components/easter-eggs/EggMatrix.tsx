import { useEffect, useRef } from 'react'

// ── Shell Matrix rain ─────────────────────────────────────────────────────────
function MatrixScreen({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ'
    const cols = Math.floor(canvas.width / 14)
    const drops = Array(cols).fill(1)

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#00ff41'
      ctx.font = '14px monospace'
      drops.forEach((y, i) => {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, y * 14)
        if (y * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      })
    }

    const interval = setInterval(draw, 33)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-[999]" onClick={onClose} style={{ cursor: 'pointer' }} role="dialog">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ fontFamily: 'monospace', textAlign: 'center' }}>
          <p style={{ color: '#00ff41', fontSize: 28, textShadow: '0 0 20px #00ff41', fontWeight: 'bold' }}>
            ACESSO CONCEDIDO
          </p>
          <p style={{ color: 'rgba(0,255,65,0.5)', fontSize: 11, marginTop: 8 }}>
            // clique para sair da Matrix
          </p>
        </div>
      </div>
    </div>
  )
}

export default MatrixScreen
