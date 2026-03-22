import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { playKonamiJingle, playModemNoise } from './useAudioEasterEggs'
import { addExp, EXP_REWARDS } from '@/components/ExpCounter'

// ── Sequence detector ─────────────────────────────────────────────────────────
function useSequence(
  sequence: string[],
  onMatch: () => void,
  timeoutMs = 2000
) {
  const progress = useRef<number>(0)
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!sequence.length) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return

      const expected = sequence[progress.current]
      const got = e.key === 'ArrowUp'    ? 'ArrowUp'
                : e.key === 'ArrowDown'  ? 'ArrowDown'
                : e.key === 'ArrowLeft'  ? 'ArrowLeft'
                : e.key === 'ArrowRight' ? 'ArrowRight'
                : e.key.toLowerCase()

      if (got === expected) {
        progress.current++
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => { progress.current = 0 }, timeoutMs)

        if (progress.current === sequence.length) {
          progress.current = 0
          if (timer.current) clearTimeout(timer.current)
          onMatch()
        }
      } else {
        progress.current = got === sequence[0] ? 1 : 0
        if (timer.current) clearTimeout(timer.current)
        if (progress.current > 0) {
          timer.current = setTimeout(() => { progress.current = 0 }, timeoutMs)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sequence, onMatch, timeoutMs])
}

// ── Konami Code screen (Pixel theme) ─────────────────────────────────────────
function KonamiScreen({ onClose }: { onClose: () => void }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setFrame(f => f + 1), 100)
    return () => clearInterval(t)
  }, [])

  const lines = [
    '★ CHEAT ACTIVATED! ★',
    '',
    '↑↑↓↓←→←→BA',
    '',
    '+30 VIDAS',
    '+99 CRÉDITOS',
    '+∞ CAFÉ',
    '',
    'PRESS ANY KEY TO CONTINUE',
  ]

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center"
         style={{ background: '#000000', cursor: 'pointer', imageRendering: 'pixelated' }}
         onClick={onClose}
         onKeyDown={onClose}
         tabIndex={0}
         role="dialog"
         aria-label="Easter egg ativado">
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)' }} />
      <div className="text-center" style={{ fontFamily: '"Press Start 2P", monospace', imageRendering: 'pixelated' }}>
        {lines.map((line, i) => (
          <p key={i} style={{
            color: i === 0 ? '#ffcc00' : i === 4 ? '#ff4444' : i === 5 ? '#44ff44' : i === 6 ? '#4488ff' : '#f8f8f8',
            fontSize: i === 0 ? 14 : i === 8 ? 9 : 11,
            lineHeight: 2.4,
            opacity: i === 8 ? (frame % 10 < 5 ? 1 : 0) : 1,
            textShadow: i === 0 ? '0 0 20px #ffcc00' : 'none',
          }}>
            {line || ' '}
          </p>
        ))}
        <div className="mt-6 flex justify-center gap-3">
          {['🎮', '⭐', '🕹️', '⭐', '🎮'].map((e, i) => (
            <span key={i} style={{ fontSize: 24, opacity: frame % 20 < 10 ? (i % 2 === 0 ? 1 : 0.3) : (i % 2 === 0 ? 0.3 : 1) }}>
              {e}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

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

// ── DLC / Conway — RGB glitch screen ─────────────────────────────────────────
function RGBGlitchScreen({ onClose }: { onClose: () => void }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 80)
    return () => clearInterval(t)
  }, [])

  const colors = ['#ff0080','#ff6600','#ffff00','#00ff88','#00eeff','#8800ff']
  const c = colors[tick % colors.length]

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
         style={{ background: '#08020f' }}
         onClick={onClose}
         role="dialog">
      {Array.from({length: 8}).map((_, i) => (
        <div key={i} className="absolute" style={{
          top: `${(i * 13 + tick * 3) % 100}%`,
          left: 0, right: 0,
          height: Math.random() * 4 + 1,
          background: colors[(tick + i) % colors.length],
          opacity: 0.3,
        }} />
      ))}
      <div className="text-center relative z-10">
        <p style={{ fontSize: 48, fontWeight: 900, color: c, textShadow: `0 0 30px ${c}, 0 0 60px ${c}`, fontFamily: '"Orbitron", sans-serif', lineHeight: 1, letterSpacing: 4, transition: 'color 0.08s, text-shadow 0.08s' }}>
          DLC
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 12, letterSpacing: 8, fontFamily: '"Orbitron", sans-serif' }}>
          UNLOCKED
        </p>
        <div className="flex justify-center gap-2 mt-6">
          {colors.map((col, i) => (
            <div key={i} className="w-3 h-3 rounded-full" style={{ background: col, boxShadow: `0 0 8px ${col}`, opacity: tick % 6 === i ? 1 : 0.3 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

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

// ── NERV Alert screen (Eva theme) ────────────────────────────────────────────
function NervAlertScreen({ onClose }: { onClose: () => void }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 500)
    const close = setTimeout(onClose, 8000)
    return () => { clearInterval(t); clearTimeout(close) }
  }, [onClose])

  const alerts = ['ANGEL DETECTED', 'INITIATING CONTACT', 'UNIT 01 READY', 'NERV HQ ALERT']

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
         style={{ background: '#0d0010' }}
         onClick={onClose}
         role="dialog">
      {/* Hex grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='64'%3E%3Cpolygon points='28,2 54,16 54,48 28,62 2,48 2,16' fill='none' stroke='rgba(139,0,255,0.12)' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: '56px 64px',
      }} />
      {/* Danger stripes top */}
      <div className="absolute top-0 left-0 right-0 h-3 pointer-events-none" style={{
        background: 'repeating-linear-gradient(90deg, #aaff00 0px, #aaff00 16px, #0d0010 16px, #0d0010 32px)',
        opacity: tick % 2 === 0 ? 0.9 : 0.5,
      }} />
      {/* Danger stripes bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-3 pointer-events-none" style={{
        background: 'repeating-linear-gradient(90deg, #aaff00 0px, #aaff00 16px, #0d0010 16px, #0d0010 32px)',
        opacity: tick % 2 === 0 ? 0.5 : 0.9,
      }} />

      <div className="text-center relative z-10" style={{ fontFamily: '"Orbitron", monospace' }}>
        {/* NERV logo */}
        <div className="mx-auto mb-6 flex items-center justify-center" style={{ width: 80, height: 80 }}>
          <svg viewBox="0 0 80 80" width="80" height="80">
            <polygon points="40,4 76,24 76,56 40,76 4,56 4,24" fill="none" stroke="#aaff00" strokeWidth="2"/>
            <polygon points="40,14 66,28 66,52 40,66 14,52 14,28" fill="none" stroke="#8b00ff" strokeWidth="1"/>
            <text x="40" y="45" textAnchor="middle" fill="#aaff00" fontSize="10" fontFamily="Orbitron" letterSpacing="2">NERV</text>
          </svg>
        </div>
        <p style={{
          fontSize: 32, fontWeight: 900, letterSpacing: 6,
          color: tick % 2 === 0 ? '#aaff00' : '#ff4400',
          textShadow: `0 0 20px ${tick % 2 === 0 ? '#aaff00' : '#ff4400'}`,
        }}>
          WARNING
        </p>
        <p style={{ fontSize: 12, color: '#8b00ff', marginTop: 8, letterSpacing: 4 }}>
          {alerts[tick % alerts.length]}
        </p>
        <div className="mt-6 mx-auto" style={{ width: 240 }}>
          {/* Fake progress bar */}
          <div style={{ height: 4, background: 'rgba(139,0,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(tick * 12.5) % 100}%`,
              background: 'linear-gradient(90deg, #8b00ff, #aaff00)',
              transition: 'width 0.4s linear',
            }} />
          </div>
          <p style={{ fontSize: 8, color: 'rgba(170,255,0,0.4)', marginTop: 4, letterSpacing: 3, textAlign: 'right' }}>
            SYNC RATE: {Math.min(99, tick * 13)}%
          </p>
        </div>
        <p style={{ fontSize: 8, color: 'rgba(139,0,255,0.4)', marginTop: 24, letterSpacing: 4 }}>
          CLIQUE PARA DISPENSAR
        </p>
      </div>
    </div>
  )
}


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

// ── Main Easter Egg hook ──────────────────────────────────────────────────────
// ── Theme-specific easter egg sequences ──────────────────────────────────────
// Arrow keys are now free because page nav uses Ctrl+Arrow.
// Konami ↑↑↓↓←→←→BA works because shortcuts require Ctrl for arrows.
const THEME_SEQUENCES: Record<string, { seq: string[]; name: string }> = {
  'dark-pixel':      { seq: ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'], name: 'breakout' },
  'dark-hypado':     { seq: ['ArrowUp','ArrowUp','ArrowUp'], name: 'vapor' },
  'dark-shell':      { seq: ['m','a','t','r','i','x'], name: 'matrix' },
  'dark-colina':     { seq: ['s','i','l','e','n','t'], name: 'silent' },
  'light-720':       { seq: ['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','ArrowUp'], name: 'xbox' },
  'dark-dlc':        { seq: ['r','g','b'], name: 'rgb' },
  'light-blueprint': { seq: ['b','l','u','e'], name: 'blueprint' },
  'light-ilha':      { seq: ['i','l','h','a'], name: 'ilha' },
  'light-vidro':     { seq: ['v','i','d','r','o'], name: 'vidro' },
  'dark-eva':        { seq: ['n','e','r','v'], name: 'nerv' },
  'light-memento':   { seq: ['p','e','r','s','o','n','a'], name: 'persona' },
}


// ── Hacker Terminal screen ────────────────────────────────────────────────────
function HackerScreen({ onClose }: { onClose: () => void }) {
  const [lines, setLines] = useState<string[]>([
    'root@each:~$ whoami',
    'root — Sistemas de Informação EACH-USP',
    'root@each:~$ ls /disciplinas',
    'ACH2001  ACH2002  ACH2003  ACH2004  ACH2005',
    'ACH2006  ACH2007  ACH2008  ACH2009  ACH2010',
    'root@each:~$ cat /etc/motto',
    '"Computação a serviço da sociedade"',
    'root@each:~$ hack usp',
    '[!] Iniciando sequência de infiltração...',
    '[!] Conectando ao mainframe da Reitoria...',
    '[✓] Acesso concedido. Bem-vindo ao sistema.',
    '[✓] Segredo encontrado: você tem +99 créditos.',
    'root@each:~$ _',
  ])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView() }, [lines])

  const handleCmd = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase()
    const responses: Record<string, string[]> = {
      'ls':        ['DaSIboard  kanban  grades  calendar  entities  profile'],
      'whoami':    ['estudante@si.each.usp.br'],
      'pwd':       ['/home/estudante/dasiboard'],
      'date':      [new Date().toString()],
      'clear':     [],
      'exit':      ['Saindo...'],
      'hack usp':  ['[!] Não foi dessa vez. Tente `hack matrix`'],
      'hack matrix':['[✓] Whoa — você encontrou o nível secreto. Parabéns!'],
      'help':      ['ls  whoami  pwd  date  clear  exit  hack <alvo>'],
      'sudo':      ['[sudo] senha para estudante: *** — Permissão negada.'],
    }
    const out = responses[trimmed]
    if (trimmed === 'clear') { setLines(['root@each:~$ _']); return }
    if (trimmed === 'exit') { onClose(); return }
    const newLines = [
      ...lines.slice(0,-1),
      `root@each:~$ ${cmd}`,
      ...(out ?? [`bash: ${cmd}: command not found`]),
      'root@each:~$ _',
    ]
    setLines(newLines)
  }

  return (
    <div className="fixed inset-0 z-[999] flex flex-col"
         style={{ background: '#0a0f0a', fontFamily: '"JetBrains Mono", monospace' }}>
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 shrink-0"
           style={{ background: '#1a241a', borderBottom: '1px solid #00ff4133' }}>
        <div className="flex gap-1.5">
          <button onClick={onClose} className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }}/>
          <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }}/>
          <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }}/>
        </div>
        <p style={{ color: '#00ff41', fontSize: 12, marginLeft: 8, opacity: 0.8 }}>
          Terminal — root@each — 80×24
        </p>
      </div>
      {/* Output */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ color: '#00ff41', fontSize: 13, lineHeight: 2 }}>
        {lines.map((l, i) => (
          <p key={i} style={{ opacity: l.startsWith('[!]') ? 0.7 : l.startsWith('[✓]') ? 1 : 0.85,
            color: l.startsWith('[✓]') ? '#44ff88' : l.startsWith('[!]') ? '#ffcc00' : '#00ff41' }}>
            {l}
          </p>
        ))}
        <div ref={endRef}/>
      </div>
      {/* Input */}
      <div className="flex items-center gap-2 px-5 py-3 shrink-0" style={{ borderTop: '1px solid #00ff4133' }}>
        <span style={{ color: '#00ff41', fontSize: 13 }}>root@each:~$</span>
        <input
          autoFocus
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: '#00ff41', fontFamily: '"JetBrains Mono", monospace', caretColor: '#00ff41' }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { handleCmd(input); setInput('') }
            if (e.key === 'Escape') onClose()
          }}
          placeholder="digite um comando..."
          spellCheck={false}
        />
      </div>
    </div>
  )
}

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

export type EasterEggId = 'konami'|'vapor'|'matrix'|'silent'|'xbox'|'rgb'|'blueprint'|'ilha'|'vidro'|'nerv'|'persona'|'breakout'|'hacker'|'dasi-flip'|'hype-particles'|null

// ── Persona / Memento screen ──────────────────────────────────────────────────
function PersonaScreen({ onClose }: { onClose: () => void }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setFrame(f => f + 1), 400)
    const c = setTimeout(onClose, 7000)
    return () => { clearInterval(t); clearTimeout(c) }
  }, [onClose])

  // TV static noise colors
  const noiseColor = frame % 2 === 0 ? 'rgba(10,48,128,0.06)' : 'rgba(10,48,128,0.09)'

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
         style={{ background: '#f2f4f8', cursor: 'pointer' }}
         onClick={onClose}
         role="dialog">
      {/* TV Static noise layer */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
        opacity: frame % 3 === 0 ? 0.6 : 0.3,
        mixBlendMode: 'multiply',
      }} />
      {/* Diagonal menu lines (Persona UI) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute" style={{
            top: `${-20 + i * 22}%`,
            left: '-10%', right: '-10%',
            height: '18%',
            background: i % 2 === 0
              ? 'rgba(10,48,128,0.06)'
              : noiseColor,
            transform: 'rotate(-8deg)',
            transformOrigin: 'center',
          }} />
        ))}
      </div>

      <div className="relative z-10 text-center">
        {/* Persona card */}
        <div className="mx-auto mb-6" style={{
          width: 120, height: 160,
          background: 'linear-gradient(135deg, #0a3080, #082060)',
          borderRadius: 8,
          boxShadow: '4px 4px 0 #000000',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          border: '2px solid #0a3080',
          transform: `rotate(${frame % 2 === 0 ? -3 : 3}deg)`,
          transition: 'transform 0.4s ease',
        }}>
          <div style={{ fontSize: 48 }}>🃏</div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 8, letterSpacing: 3, marginTop: 8, fontFamily: '"JetBrains Mono", monospace' }}>
            WILD CARD
          </p>
        </div>

        <p style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: 36, fontWeight: 800, letterSpacing: -1,
          color: '#0a0e18',
          textTransform: 'uppercase',
        }}>
          {frame % 4 === 0 ? 'PERSONA' : frame % 4 === 1 ? 'ACTIVADA' : frame % 4 === 2 ? 'PERSONA' : 'ACTIVADA'}
        </p>
        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: '#0a3080', letterSpacing: 6, marginTop: 8 }}>
          SI · EACH · USP
        </p>
        <p style={{ fontSize: 9, color: 'rgba(10,48,128,0.4)', marginTop: 20, letterSpacing: 3 }}>
          clique para fechar
        </p>
      </div>
    </div>
  )
}

export function useEasterEggs() {
  const [active, setActive] = useState<EasterEggId>(null)
  const { theme } = useTheme()
  const close = useCallback(() => setActive(null), [])

  const themeData = THEME_SEQUENCES[theme.id]

  const trigger = useCallback(() => {
    if (!themeData) return
    const eggId = themeData.name as EasterEggId
    setActive(eggId)
    // Audio easter eggs
    if (eggId === 'konami') playKonamiJingle()
    if (eggId === 'matrix') playModemNoise()
    // EXP reward for finding easter eggs
    addExp(EXP_REWARDS.easterEgg)
  }, [themeData])

  useSequence(themeData?.seq ?? [], trigger)

  return { active, close }
}

export function EasterEggRenderer({ active, onClose }: { active: EasterEggId; onClose: () => void }) {
  if (!active) return null
  switch (active) {
    case 'konami':    return <KonamiScreen onClose={onClose} />
    case 'vapor':     return <VaporScreen onClose={onClose} />
    case 'matrix':    return <MatrixScreen onClose={onClose} />
    case 'silent':    return <SilentHillScreen onClose={onClose} />
    case 'xbox':      return <XboxScreen onClose={onClose} />
    case 'rgb':       return <RGBGlitchScreen onClose={onClose} />
    case 'blueprint': return <BlueprintScreen onClose={onClose} />
    case 'ilha':      return <IlhaScreen onClose={onClose} />
    case 'vidro':     return <VidroScreen onClose={onClose} />
    case 'nerv':      return <NervAlertScreen onClose={onClose} />
    case 'persona':   return <PersonaScreen onClose={onClose} />
    case 'breakout':  return <BreakoutGame onClose={onClose} />
    case 'hacker':    return <HackerScreen onClose={onClose} />
    case 'hype-particles': return <HypeParticlesScreen onClose={onClose} />
    case 'dasi-flip': return <DasiFlipScreen onClose={onClose} />
    default:          return null
  }
}

// ── Clock Easter eggs hook — 00:00 midnight + 04:00 sleepy + 03:33 ──────────
export function useClockEasterEggs(triggerNotif: (msg: string) => void) {
  useEffect(() => {
    const check = () => {
      const now  = new Date()
      const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds()
      const key  = `dasiboard-clock-egg-${now.toISOString().slice(0,10)}`
      const seen = JSON.parse(localStorage.getItem(key) ?? '{}')

      if (h === 0 && m === 0 && s < 30 && !seen['midnight']) {
        seen['midnight'] = true; localStorage.setItem(key, JSON.stringify(seen))
        triggerNotif('midnight')
      }
      if (h === 4 && m === 0 && s < 30 && !seen['4am']) {
        seen['4am'] = true; localStorage.setItem(key, JSON.stringify(seen))
        triggerNotif('4am')
      }
      if (h === 3 && m === 33 && s < 30 && !seen['333']) {
        seen['333'] = true; localStorage.setItem(key, JSON.stringify(seen))
        triggerNotif('333')
      }
    }
    check()
    const t = setInterval(check, 10000)
    return () => clearInterval(t)
  }, [])
}

// ── External trigger — called from GlobalSearch, DASI logo click ──────────────
let _eggListeners: Array<(id: EasterEggId) => void> = []
export function triggerEasterEgg(id: EasterEggId) {
  _eggListeners.forEach(fn => fn(id))
}
export function useExternalEasterEgg(onTrigger: (id: EasterEggId) => void) {
  useEffect(() => {
    _eggListeners.push(onTrigger)
    return () => { _eggListeners = _eggListeners.filter(f => f !== onTrigger) }
  }, [onTrigger])
}
