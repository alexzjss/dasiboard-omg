import { useEffect, useRef } from 'react'

// ── HypE Particles — digitando "hype" na busca global (tema hypado) ──────────
function HypeParticlesScreen({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    interface Particle {
      x: number; y: number; vx: number; vy: number
      size: number; color: string; char: string; alpha: number; life: number
    }
    const CHARS = 'HYPE01データ∇λ∑∞ΔΩαβγπ'
    const COLORS = ['#ff44ff','#44ffff','#ff8800','#aaff00','#ff0088','#00ffcc']
    const particles: Particle[] = []

    // Spawn 200 particles
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 6
      particles.push({
        x: canvas.width / 2, y: canvas.height / 2,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3,
        size: 10 + Math.random() * 20,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        alpha: 1, life: 80 + Math.random() * 80,
      })
    }

    let raf = 0
    const draw = () => {
      ctx.fillStyle = 'rgba(10,0,20,0.18)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      let alive = 0
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        p.vy += 0.06
        p.alpha -= 1 / p.life
        if (p.alpha <= 0) return
        alive++
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.alpha)
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 12
        ctx.font = `bold ${p.size}px "Syne", sans-serif`
        ctx.fillText(p.char, p.x, p.y)
        ctx.restore()
      })

      if (alive > 0) raf = requestAnimationFrame(draw)
      else onClose()
    }
    draw()
    const t = setTimeout(onClose, 5000)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[999]" onClick={onClose}
         style={{ cursor: 'pointer', background: '#0a0014' }}
         role="dialog" aria-label="Easter egg HypE">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p style={{
          fontFamily: '"Syne", sans-serif', fontSize: 52, fontWeight: 900,
          color: '#ff44ff', letterSpacing: 12, lineHeight: 1,
          textShadow: '0 0 30px #ff44ff, 0 0 80px #ff44ff',
        }}>HypE</p>
        <p style={{ fontFamily: '"Syne", sans-serif', fontSize: 13, color: 'rgba(255,68,255,0.5)',
                    letterSpacing: 6, marginTop: 12 }}>
          HUB DE PESQUISA · EACH · USP
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 24, letterSpacing: 3 }}>
          clique para fechar
        </p>
      </div>
    </div>
  )
}

export default HypeParticlesScreen
