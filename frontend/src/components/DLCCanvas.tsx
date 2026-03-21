// ── DLC Theme — Laser Beams via CSS animation only (no z-index conflict) ──────
// The canvas approach causes blank screen due to stacking context conflicts.
// We use CSS-only laser beams via globals.css body::before/after animations.
// This file only exports the Lofi audio player widget.

import { useEffect, useCallback, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { Music, Volume2, VolumeX, SkipForward } from 'lucide-react'

// ── Generative Lo-fi via Web Audio API ───────────────────────────────────────
class LofiEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private running = false
  private stopTimer: ReturnType<typeof setTimeout> | null = null

  start() {
    if (this.running) return
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.15
      this.masterGain.connect(this.ctx.destination)
      this.running = true
      this.loop()
    } catch (e) {
      console.warn('LofiEngine: AudioContext not available', e)
    }
  }

  stop() {
    this.running = false
    if (this.stopTimer) clearTimeout(this.stopTimer)
    try { this.ctx?.close() } catch {}
    this.ctx = null
    this.masterGain = null
  }

  setVolume(v: number) {
    if (this.masterGain) this.masterGain.gain.value = v * 0.18
  }

  private loop() {
    if (!this.running || !this.ctx || !this.masterGain) return
    const ac = this.ctx
    const mg = this.masterGain
    const now = ac.currentTime

    // Cm7 → Fm7 → G7 → Cm lo-fi chord progression
    const chords: number[][] = [
      [130.81, 155.56, 185.00, 220.00],
      [174.61, 207.65, 246.94, 293.66],
      [196.00, 246.94, 293.66, 349.23],
      [130.81, 155.56, 185.00, 233.08],
    ]
    const bpm = 76
    const beat = 60 / bpm
    const bar = beat * 4

    chords.forEach((chord, ci) => {
      const t = now + ci * bar
      chord.forEach((freq, fi) => {
        const osc = ac.createOscillator()
        const g = ac.createGain()
        osc.type = fi === 0 ? 'sine' : 'triangle'
        osc.frequency.value = freq
        osc.detune.value = (Math.random() - 0.5) * 10
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(fi === 0 ? 0.18 : 0.08, t + 0.06)
        g.gain.setValueAtTime(fi === 0 ? 0.18 : 0.08, t + bar - 0.12)
        g.gain.linearRampToValueAtTime(0, t + bar)
        osc.connect(g); g.connect(mg)
        osc.start(t); osc.stop(t + bar + 0.1)
      })

      // Kick drum on beat 1 of each bar
      const kick = ac.createOscillator()
      const kg = ac.createGain()
      kick.frequency.setValueAtTime(120, t)
      kick.frequency.exponentialRampToValueAtTime(40, t + 0.08)
      kg.gain.setValueAtTime(0.5, t)
      kg.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      kick.connect(kg); kg.connect(mg)
      kick.start(t); kick.stop(t + 0.15)

      // Hi-hats every half-beat
      for (let i = 0; i < 8; i++) {
        const ht = t + i * beat * 0.5
        const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.025), ac.sampleRate)
        const d = buf.getChannelData(0)
        for (let j = 0; j < d.length; j++) d[j] = Math.random() * 2 - 1
        const src = ac.createBufferSource()
        const hg = ac.createGain()
        const hf = ac.createBiquadFilter()
        hf.type = 'highpass'; hf.frequency.value = 8000
        src.buffer = buf
        const vel = i % 4 === 0 ? 0.06 : 0.025
        hg.gain.setValueAtTime(vel, ht)
        hg.gain.exponentialRampToValueAtTime(0.001, ht + 0.025)
        src.connect(hf); hf.connect(hg); hg.connect(mg)
        src.start(ht)
      }
    })

    const loopMs = bar * 4 * 1000
    this.stopTimer = setTimeout(() => { if (this.running) this.loop() }, loopMs - 150)
  }
}

const lofiEngine = new LofiEngine()

export function DLCLofiPlayer() {
  const { theme } = useTheme()
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)

  const toggle = useCallback(() => {
    if (playing) { lofiEngine.stop(); setPlaying(false) }
    else { lofiEngine.start(); setPlaying(true) }
  }, [playing])

  const toggleMute = useCallback(() => {
    const next = !muted
    setMuted(next)
    lofiEngine.setVolume(next ? 0 : 1)
  }, [muted])

  useEffect(() => {
    if (theme.id !== 'dark-dlc' && playing) { lofiEngine.stop(); setPlaying(false) }
  }, [theme.id, playing])

  if (theme.id !== 'dark-dlc') return null

  return (
    <div className="px-3 pb-2">
      <div className="rounded-xl px-3 py-2 flex items-center gap-2"
           style={{ background: 'rgba(136,0,255,0.12)', border: '1px solid rgba(136,0,255,0.3)' }}>
        <button type="button" onClick={toggle}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-90"
                style={{
                  background: playing ? 'rgba(255,0,128,0.2)' : 'rgba(136,0,255,0.2)',
                  border: `1px solid ${playing ? 'rgba(255,0,128,0.5)' : 'rgba(136,0,255,0.4)'}`,
                  color: playing ? '#ff0080' : '#aa44ff',
                  cursor: 'pointer',
                }}
                title={playing ? 'Pausar lo-fi' : 'Tocar lo-fi'}>
          <Music size={12} />
        </button>
        <p className="flex-1 text-[9px] font-semibold truncate"
           style={{ color: playing ? '#ff0080' : 'rgba(255,255,255,0.35)', fontFamily: '"Orbitron", monospace', letterSpacing: '0.05em' }}>
          {playing ? '▶ lo-fi beats' : 'lo-fi off'}
        </p>
        {playing && (
          <button type="button" onClick={toggleMute}
                  className="w-5 h-5 flex items-center justify-center"
                  style={{ color: muted ? 'rgba(255,255,255,0.2)' : 'rgba(0,238,255,0.7)', cursor: 'pointer' }}>
            {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
          </button>
        )}
      </div>
    </div>
  )
}

// Default export: null component — visuals are 100% CSS-driven in globals.css
export default function DLCCanvas() { return null }
