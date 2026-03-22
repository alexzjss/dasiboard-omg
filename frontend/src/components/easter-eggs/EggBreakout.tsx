import { useEffect, useRef } from 'react'

// ── Breakout mini-game ────────────────────────────────────────────────────────
function BreakoutGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef  = useRef({ x: 0, y: 0, dx: 4, dy: -4, score: 0, lives: 3, paddleX: 0, running: true })

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const W = canvas.width = Math.min(window.innerWidth - 32, 480)
    const H = canvas.height = 360
    const ROWS = 5, COLS = 8
    const BW = W / COLS - 4, BH = 18, PAD_W = 80, PAD_H = 10, BALL_R = 8

    const s = stateRef.current
    s.x = W / 2; s.y = H - 60; s.paddleX = (W - PAD_W) / 2

    // Bricks
    const bricks: Array<{ x: number; y: number; alive: boolean; color: string }> = []
    const cols = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#a855f7']
    for (let r = 0; r < ROWS; r++)
      for (let c2 = 0; c2 < COLS; c2++)
        bricks.push({ x: c2*(BW+4)+2, y: r*(BH+4)+40, alive: true, color: cols[r] })

    const onMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
      s.paddleX = Math.max(0, Math.min(W - PAD_W, (cx - rect.left) - PAD_W/2))
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('touchmove', onMove, { passive: true })

    let raf = 0
    const draw = () => {
      if (!s.running) return
      ctx.clearRect(0, 0, W, H)

      // Background
      ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, W, H)

      // Bricks
      bricks.forEach(b => {
        if (!b.alive) return
        ctx.fillStyle = b.color + 'dd'; ctx.beginPath()
        ctx.roundRect(b.x, b.y, BW, BH, 4); ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke()
      })

      // Paddle
      ctx.fillStyle = 'var(--accent-1, #a855f7)'
      ctx.beginPath(); ctx.roundRect(s.paddleX, H - PAD_H - 8, PAD_W, PAD_H, PAD_H/2); ctx.fill()

      // Ball
      const [hr,hg,hb] = [168, 85, 247] // purple
      ctx.beginPath(); ctx.arc(s.x, s.y, BALL_R, 0, Math.PI*2)
      ctx.fillStyle = '#ffffff'; ctx.fill()

      // UI
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '13px monospace'
      ctx.fillText(`Score: ${s.score}`, 8, 20)
      ctx.fillText(`Lives: ${'♥'.repeat(s.lives)}`, W - 80, 20)

      // Move ball
      s.x += s.dx; s.y += s.dy

      // Wall bounces
      if (s.x - BALL_R <= 0 || s.x + BALL_R >= W) s.dx *= -1
      if (s.y - BALL_R <= 0) s.dy *= -1

      // Paddle
      if (s.y + BALL_R >= H - PAD_H - 8 && s.y + BALL_R <= H - 8 && s.x >= s.paddleX && s.x <= s.paddleX + PAD_W) {
        s.dy = -Math.abs(s.dy)
        s.dx += ((s.x - (s.paddleX + PAD_W/2)) / (PAD_W/2)) * 1.5
        s.dx = Math.max(-6, Math.min(6, s.dx))
      }

      // Bottom = lose life
      if (s.y + BALL_R > H) {
        s.lives--
        if (s.lives <= 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H)
          ctx.fillStyle = '#ef4444'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'
          ctx.fillText('GAME OVER', W/2, H/2 - 20)
          ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '14px monospace'
          ctx.fillText(`Pontos: ${s.score}`, W/2, H/2 + 16)
          ctx.fillText('Clique para fechar', W/2, H/2 + 40)
          ctx.textAlign = 'left'; s.running = false; return
        }
        s.x = W/2; s.y = H - 60; s.dx = 4 * (Math.random() > 0.5 ? 1 : -1); s.dy = -4
      }

      // Brick collision
      bricks.forEach(b => {
        if (!b.alive) return
        if (s.x > b.x && s.x < b.x + BW && s.y > b.y && s.y < b.y + BH + BALL_R) {
          b.alive = false; s.dy *= -1; s.score += 10
        }
      })

      // All bricks cleared
      if (bricks.every(b => !b.alive)) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle = '#22c55e'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText('YOU WIN! 🎉', W/2, H/2 - 20)
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '14px monospace'
        ctx.fillText(`Pontos: ${s.score}`, W/2, H/2 + 16)
        ctx.textAlign = 'left'; s.running = false; return
      }

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf); s.running = false
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('touchmove', onMove)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
         style={{ background: '#050510' }}>
      <div className="flex items-center justify-between w-full px-4 py-2 max-w-[480px]">
        <p style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(168,85,247,0.8)' }}>
          ↑↑↓↓←→←→BA — BREAKOUT
        </p>
        <button onClick={onClose} className="text-white opacity-60 hover:opacity-100">✕</button>
      </div>
      <canvas ref={canvasRef}
              style={{ borderRadius: 12, border: '1px solid rgba(168,85,247,0.3)', touchAction: 'none', cursor: 'none' }}
              onClick={e => {
                const s = stateRef.current
                if (!s.running) onClose()
              }} />
      <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
        Mova o mouse para controlar · clique quando acabar para fechar
      </p>
    </div>
  )
}

export default BreakoutGame
