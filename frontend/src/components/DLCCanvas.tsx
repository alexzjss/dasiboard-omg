// ── DLC Theme — Laser Beams Canvas Background + Lofi Audio Player ─────────────
import { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { Music, Volume2, VolumeX, SkipForward } from 'lucide-react'

interface Beam {
  x: number; y: number; vx: number; vy: number
  hue: number; length: number; angle: number; angleSpeed: number
}

// ── Lofi Audio via Web Audio API (generative, no external files) ─────────────
class LofiEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private running = false
  private nodes: AudioNode[] = []

  start() {
    if (this.running) return
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.18
    this.masterGain.connect(this.ctx.destination)
    this.running = true
    this.scheduleLoop()
  }

  stop() {
    this.running = false
    this.nodes.forEach(n => { try { (n as OscillatorNode).stop?.() } catch {} })
    this.nodes = []
    this.ctx?.close()
    this.ctx = null
  }

  setVolume(v: number) {
    if (this.masterGain) this.masterGain.gain.value = v * 0.25
  }

  private scheduleLoop() {
    if (!this.running || !this.ctx || !this.masterGain) return
    const ac = this.ctx
    const mg = this.masterGain
    const t = ac.currentTime

    // Lo-fi chord progression: ii-V-I in C minor (Cm - G7 - Fm)
    const chords = [
      [130.81, 155.56, 185.00, 220.00], // Cm
      [146.83, 185.00, 220.00, 261.63], // G7
      [174.61, 207.65, 261.63, 329.63], // Fm
      [130.81, 164.81, 196.00, 246.94], // Cm7
    ]
    const bpm = 72
    const beat = 60 / bpm
    const bar = beat * 4

    chords.forEach((chord, ci) => {
      chord.forEach(freq => {
        const osc = ac.createOscillator()
        const g = ac.createGain()
        osc.type = 'triangle'
        osc.frequency.value = freq
        // Detune slightly for warmth
        osc.detune.value = (Math.random() - 0.5) * 8
        g.gain.setValueAtTime(0, t + ci * bar)
        g.gain.linearRampToValueAtTime(0.12, t + ci * bar + 0.05)
        g.gain.setValueAtTime(0.12, t + ci * bar + bar - 0.1)
        g.gain.linearRampToValueAtTime(0, t + ci * bar + bar)
        osc.connect(g); g.connect(mg)
        osc.start(t + ci * bar)
        osc.stop(t + ci * bar + bar + 0.1)
        this.nodes.push(osc)
      })

      // Sub bass note
      const bass = ac.createOscillator()
      const bg = ac.createGain()
      bass.type = 'sine'
      bass.frequency.value = chord[0] * 0.5
      bg.gain.setValueAtTime(0, t + ci * bar)
      bg.gain.linearRampToValueAtTime(0.25, t + ci * bar + 0.02)
      bg.gain.setValueAtTime(0.25, t + ci * bar + bar - 0.05)
      bg.gain.linearRampToValueAtTime(0, t + ci * bar + bar)
      bass.connect(bg); bg.connect(mg)
      bass.start(t + ci * bar); bass.stop(t + ci * bar + bar + 0.1)
      this.nodes.push(bass)
    })

    // Hi-hats
    for (let i = 0; i < 16; i++) {
      const buf = ac.createBuffer(1, ac.sampleRate * 0.03, ac.sampleRate)
      const data = buf.getChannelData(0)
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1)
      const src = ac.createBufferSource()
      const hg = ac.createGain()
      const hipass = ac.createBiquadFilter()
      hipass.type = 'highpass'; hipass.frequency.value = 6000
      src.buffer = buf
      const vel = i % 4 === 0 ? 0.08 : i % 2 === 0 ? 0.04 : 0.02
      hg.gain.setValueAtTime(vel, t + i * beat * 0.5)
      hg.gain.exponentialRampToValueAtTime(0.001, t + i * beat * 0.5 + 0.03)
      src.connect(hipass); hipass.connect(hg); hg.connect(mg)
      src.start(t + i * beat * 0.5)
      this.nodes.push(src)
    }

    // Schedule next loop
    const loopDuration = bar * 4
    setTimeout(() => {
      if (this.running) this.scheduleLoop()
    }, loopDuration * 1000 - 200)
  }
}

const lofiEngine = new LofiEngine()

// ── Lofi toggle button (shown in sidebar via portal-like positioning) ─────────
export function DLCLofiPlayer() {
  const { theme } = useTheme()
  const [playing, setPlaying] = useState(false)
  const [muted,   setMuted]   = useState(false)
  const [track,   setTrack]   = useState(0)

  const trackNames = ['lo-fi beats #1', 'lo-fi beats #2', 'chill wave #3']

  const toggle = useCallback(() => {
    if (playing) { lofiEngine.stop(); setPlaying(false) }
    else { lofiEngine.start(); setPlaying(true) }
  }, [playing])

  const toggleMute = useCallback(() => {
    const next = !muted
    setMuted(next)
    lofiEngine.setVolume(next ? 0 : 1)
  }, [muted])

  const nextTrack = useCallback(() => {
    setTrack(t => (t + 1) % trackNames.length)
    if (playing) { lofiEngine.stop(); setTimeout(() => lofiEngine.start(), 50) }
  }, [playing, trackNames.length])

  // Stop on theme change away from DLC
  useEffect(() => {
    if (theme.id !== 'dark-dlc' && playing) { lofiEngine.stop(); setPlaying(false) }
  }, [theme.id, playing])

  if (theme.id !== 'dark-dlc') return null

  return (
    <div className="px-3 pb-2">
      <div
        className="rounded-xl px-3 py-2 flex items-center gap-2"
        style={{
          background: 'rgba(136,0,255,0.12)',
          border: '1px solid rgba(136,0,255,0.3)',
        }}
      >
        <button
          onClick={toggle}
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-90"
          style={{
            background: playing ? 'rgba(255,0,128,0.2)' : 'rgba(136,0,255,0.2)',
            border: `1px solid ${playing ? 'rgba(255,0,128,0.5)' : 'rgba(136,0,255,0.4)'}`,
            color: playing ? '#ff0080' : '#8800ff',
          }}
          title={playing ? 'Pausar lo-fi' : 'Tocar lo-fi'}
          aria-label={playing ? 'Pausar lo-fi' : 'Tocar lo-fi'}
        >
          <Music size={12} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold truncate"
             style={{ color: playing ? '#ff0080' : 'rgba(255,255,255,0.4)', fontFamily: '"Orbitron", monospace', letterSpacing: '0.05em' }}>
            {playing ? '▶ ' + trackNames[track] : 'lo-fi off'}
          </p>
        </div>

        {playing && (
          <>
            <button onClick={toggleMute} className="w-5 h-5 flex items-center justify-center shrink-0"
                    style={{ color: muted ? 'rgba(255,255,255,0.2)' : 'rgba(0,238,255,0.6)' }}
                    aria-label={muted ? 'Ativar som' : 'Mutar'}>
              {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
            </button>
            <button onClick={nextTrack} className="w-5 h-5 flex items-center justify-center shrink-0"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    aria-label="Próxima faixa">
              <SkipForward size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Canvas laser beams ────────────────────────────────────────────────────────
export default function DLCCanvas() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const beamsRef  = useRef<Beam[]>([])

  const isDLC = theme.id === 'dark-dlc'

  useEffect(() => {
    if (!isDLC) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    beamsRef.current = Array.from({ length: 4 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      hue: i * 60,
      length: 100 + Math.random() * 80,
      angle: Math.random() * Math.PI * 2,
      angleSpeed: (Math.random() - 0.5) * 0.006,
    }))

    const draw = () => {
      ctx.fillStyle = 'rgba(8,2,15,0.10)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const b of beamsRef.current) {
        b.hue = (b.hue + 0.25) % 360
        b.angle += b.angleSpeed
        b.x += b.vx; b.y += b.vy
        if (b.x < 0 || b.x > canvas.width)  b.vx *= -1
        if (b.y < 0 || b.y > canvas.height) b.vy *= -1

        const ex = b.x + Math.cos(b.angle) * b.length
        const ey = b.y + Math.sin(b.angle) * b.length
        const color = `hsl(${b.hue},100%,60%)`

        const g = ctx.createLinearGradient(b.x, b.y, ex, ey)
        g.addColorStop(0, color + 'cc')
        g.addColorStop(0.6, color + '88')
        g.addColorStop(1, color + '00')
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey)
        ctx.strokeStyle = g; ctx.lineWidth = 1.5
        ctx.shadowColor = color; ctx.shadowBlur = 10
        ctx.stroke(); ctx.shadowBlur = 0

        ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 16
        ctx.fill(); ctx.shadowBlur = 0
      }
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize) }
  }, [isDLC])

  if (!isDLC) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: 0.5 }}
    />
  )
}
