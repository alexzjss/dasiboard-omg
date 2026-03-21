import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'

// ── Sequence detector ─────────────────────────────────────────────────────────
function useSequence(
  sequence: string[],
  onMatch: () => void,
  timeoutMs = 2000
) {
  const progress = useRef<number>(0)
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

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
          onMatch()
        }
      } else {
        // partial reset — try from start of got
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
         tabIndex={0}>
      {/* Scanlines */}
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

// ── Vaporwave ARIA (Hypado theme) — ↑↑↑ triggers purple rain ─────────────────
function VaporScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
         style={{ background: 'linear-gradient(180deg, #1a0030 0%, #3d0080 40%, #0066cc 100%)' }}
         onClick={onClose}>
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
    <div className="fixed inset-0 z-[999]" onClick={onClose} style={{ cursor: 'pointer' }}>
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

// ── Silent Hill foghorn (Colina theme) — typo "SILENT" ───────────────────────
function SilentHillScreen({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center"
         style={{ background: '#181818' }}
         onClick={onClose}>
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
         onClick={onClose}>
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
         onClick={onClose}>
      {/* Glitch stripes */}
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
         onClick={onClose}>
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
         onClick={onClose}>
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
         onClick={onClose}>
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

// ── Main Easter Egg hook ──────────────────────────────────────────────────────
// Each theme has its own sequence
const THEME_SEQUENCES: Record<string, { seq: string[]; name: string }> = {
  'dark-pixel':      { seq: ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'], name: 'konami' },
  'dark-hypado':     { seq: ['ArrowUp','ArrowUp','ArrowUp'], name: 'vapor' },
  'dark-shell':      { seq: ['m','a','t','r','i','x'], name: 'matrix' },
  'dark-colina':     { seq: ['s','i','l','e','n','t'], name: 'silent' },
  'light-720':       { seq: ['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','ArrowUp'], name: 'xbox' },
  'dark-dlc':        { seq: ['r','g','b'], name: 'rgb' },
  'light-blueprint': { seq: ['b','l','u','e'], name: 'blueprint' },
  'light-ilha':      { seq: ['i','l','h','a'], name: 'ilha' },
  'light-vidro':     { seq: ['v','i','d','r','o'], name: 'vidro' },
}

export type EasterEggId = 'konami'|'vapor'|'matrix'|'silent'|'xbox'|'rgb'|'blueprint'|'ilha'|'vidro'|null

export function useEasterEggs() {
  const [active, setActive] = useState<EasterEggId>(null)
  const { theme } = useTheme()
  const close = useCallback(() => setActive(null), [])

  // Build current theme sequence
  const themeData = THEME_SEQUENCES[theme.id]

  const trigger = useCallback(() => {
    if (!themeData) return
    setActive(themeData.name as EasterEggId)
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
    default:          return null
  }
}
