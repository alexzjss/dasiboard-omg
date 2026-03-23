// ── Lo-fi beats player — shared across Pixel, 720, Portátil, DLC themes ───────
import { useEffect, useCallback, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { Music, Volume2, VolumeX } from 'lucide-react'

// Themes that get the lofi player
const LOFI_THEMES = new Set(['dark-dlc'])

// Theme-specific styles for the player
const PLAYER_STYLES: Record<string, { bg: string; border: string; activeColor: string; font?: string }> = {
  'dark-dlc':      { bg: 'rgba(136,0,255,0.12)',  border: 'rgba(136,0,255,0.3)',   activeColor: '#ff0080' },
}

// ── Generative Lo-fi Engine (singleton) ──────────────────────────────────────
class LofiEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private running = false
  private loopTimer: ReturnType<typeof setTimeout> | null = null

  get isRunning() { return this.running }

  start() {
    if (this.running) return
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.14
      this.masterGain.connect(this.ctx.destination)
      this.running = true
      this.loop()
    } catch (e) { console.warn('LofiEngine:', e) }
  }

  stop() {
    this.running = false
    if (this.loopTimer) clearTimeout(this.loopTimer)
    try { this.ctx?.close() } catch {}
    this.ctx = null; this.masterGain = null
  }

  setVolume(v: number) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v)) * 0.16
  }

  private loop() {
    if (!this.running || !this.ctx || !this.masterGain) return
    const ac = this.ctx, mg = this.masterGain, now = ac.currentTime
    const bpm = 76, beat = 60 / bpm, bar = beat * 4

    // Cm7 → Fm7 → G7 → Cm progression
    const chords: number[][] = [
      [130.81, 155.56, 185.00, 220.00],
      [174.61, 207.65, 246.94, 293.66],
      [196.00, 246.94, 293.66, 349.23],
      [130.81, 155.56, 185.00, 233.08],
    ]

    chords.forEach((chord, ci) => {
      const t = now + ci * bar
      // Chords
      chord.forEach((freq, fi) => {
        const osc = ac.createOscillator(), g = ac.createGain()
        osc.type = fi === 0 ? 'sine' : 'triangle'
        osc.frequency.value = freq
        osc.detune.value = (Math.random() - 0.5) * 10
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(fi === 0 ? 0.16 : 0.07, t + 0.06)
        g.gain.setValueAtTime(fi === 0 ? 0.16 : 0.07, t + bar - 0.12)
        g.gain.linearRampToValueAtTime(0, t + bar)
        osc.connect(g); g.connect(mg); osc.start(t); osc.stop(t + bar + 0.1)
      })
      // Kick on beat 1
      const kick = ac.createOscillator(), kg = ac.createGain()
      kick.frequency.setValueAtTime(110, t); kick.frequency.exponentialRampToValueAtTime(40, t + 0.08)
      kg.gain.setValueAtTime(0.45, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      kick.connect(kg); kg.connect(mg); kick.start(t); kick.stop(t + 0.15)
      // Snare on beat 3
      const snareBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate)
      const sd = snareBuf.getChannelData(0)
      for (let j = 0; j < sd.length; j++) sd[j] = Math.random() * 2 - 1
      const snare = ac.createBufferSource(), sg = ac.createGain()
      const sf = ac.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 2000; sf.Q.value = 0.5
      sg.gain.setValueAtTime(0.15, t + beat * 2); sg.gain.exponentialRampToValueAtTime(0.001, t + beat * 2 + 0.05)
      snare.buffer = snareBuf; snare.connect(sf); sf.connect(sg); sg.connect(mg); snare.start(t + beat * 2)
      // Hi-hats
      for (let i = 0; i < 8; i++) {
        const ht = t + i * beat * 0.5
        const hBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.02), ac.sampleRate)
        const hd = hBuf.getChannelData(0); for (let j = 0; j < hd.length; j++) hd[j] = Math.random() * 2 - 1
        const hsrc = ac.createBufferSource(), hg = ac.createGain(), hf = ac.createBiquadFilter()
        hf.type = 'highpass'; hf.frequency.value = 8000
        hg.gain.setValueAtTime(i % 4 === 0 ? 0.055 : 0.02, ht); hg.gain.exponentialRampToValueAtTime(0.001, ht + 0.02)
        hsrc.buffer = hBuf; hsrc.connect(hf); hf.connect(hg); hg.connect(mg); hsrc.start(ht)
      }
    })

    this.loopTimer = setTimeout(() => { if (this.running) this.loop() }, bar * 4 * 1000 - 100)
  }
}

export const sharedLofiEngine = new LofiEngine()

// ── Lofi Player Widget ────────────────────────────────────────────────────────
export function LofiPlayer() {
  const { theme } = useTheme()
  const [playing, setPlaying] = useState(false)
  const [muted,   setMuted]   = useState(false)

  const isApplicable = LOFI_THEMES.has(theme.id)
  const style = PLAYER_STYLES[theme.id] ?? PLAYER_STYLES['dark-dlc']

  const toggle = useCallback(() => {
    if (playing) { sharedLofiEngine.stop(); setPlaying(false) }
    else { sharedLofiEngine.start(); setPlaying(true) }
  }, [playing])

  const toggleMute = useCallback(() => {
    const next = !muted; setMuted(next)
    sharedLofiEngine.setVolume(next ? 0 : 1)
  }, [muted])

  // Stop when switching away from a lofi-capable theme
  useEffect(() => {
    if (!isApplicable && playing) { sharedLofiEngine.stop(); setPlaying(false) }
  }, [isApplicable, playing])

  if (!isApplicable) return null

  const isPixelStyle = false
  return (
    <div className="px-3 pb-2">
      <div className="rounded-xl px-3 py-2 flex items-center gap-2"
           style={{ background: style.bg, border: `1px solid ${style.border}` }}>
        <button type="button" onClick={toggle}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-90"
                style={{
                  background: playing ? style.activeColor + '33' : style.bg,
                  border: `1px solid ${playing ? style.activeColor : style.border}`,
                  color: playing ? style.activeColor : style.border,
                  borderRadius: isPixelStyle ? 2 : undefined,
                  cursor: 'pointer',
                }}
                title={playing ? 'Pausar lo-fi' : 'Tocar lo-fi'}>
          <Music size={11} />
        </button>

        <p className="flex-1 text-[9px] font-semibold truncate"
           style={{
             color: playing ? style.activeColor : style.border,
             fontFamily: style.font ?? 'var(--font-mono)',
             letterSpacing: '0.05em',
             opacity: playing ? 1 : 0.6,
           }}>
          {playing ? '♪ lo-fi beats' : 'lo-fi off'}
        </p>

        {playing && (
          <button type="button" onClick={toggleMute}
                  className="w-5 h-5 flex items-center justify-center shrink-0"
                  style={{ color: muted ? style.border : style.activeColor, cursor: 'pointer', opacity: muted ? 0.4 : 1 }}
                  aria-label={muted ? 'Ativar som' : 'Mutar'}>
            {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
          </button>
        )}
      </div>
    </div>
  )
}
