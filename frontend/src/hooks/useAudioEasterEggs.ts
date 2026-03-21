// ── Web Audio API Easter Egg Sounds ───────────────────────────────────────────
// Konami code → 8-bit jingle
// Matrix theme → modem noise

let ctx: AudioContext | null = null
function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function playTone(
  ac: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'square',
  gain = 0.18
) {
  const osc = ac.createOscillator()
  const g   = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  g.gain.setValueAtTime(gain, startTime)
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.01)
}

// 8-bit fanfare — Konami jingle
export function playKonamiJingle() {
  try {
    const ac = getCtx()
    const t  = ac.currentTime
    // Simple victory fanfare melody
    const notes = [
      [659, 0.00, 0.12], [659, 0.13, 0.12], [659, 0.26, 0.18],
      [523, 0.44, 0.12], [659, 0.57, 0.18], [784, 0.76, 0.36],
      [392, 1.13, 0.36],
      // Second phrase
      [523, 1.60, 0.18], [392, 1.79, 0.12], [330, 1.92, 0.18],
      [440, 2.11, 0.18], [494, 2.30, 0.18], [466, 2.49, 0.09],
      [440, 2.59, 0.18], [392, 2.78, 0.12], [659, 2.91, 0.12],
      [784, 3.04, 0.12], [880, 3.17, 0.24],
      [698, 3.42, 0.18], [784, 3.61, 0.18],
      [659, 3.80, 0.24],
      [523, 4.05, 0.12], [587, 4.18, 0.12], [494, 4.31, 0.36],
    ] as [number, number, number][]

    notes.forEach(([freq, delay, dur]) => {
      playTone(ac, freq, t + delay, dur, 'square', 0.15)
      // harmonics for richness
      playTone(ac, freq * 2, t + delay, dur, 'square', 0.04)
    })

    // Percussion simulation (noise burst)
    const beats = [0.00, 0.26, 0.76, 1.13, 1.60, 1.92, 2.30, 2.78, 3.17, 3.80]
    beats.forEach(delay => {
      const buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.08
      const src2 = ac.createBufferSource()
      const gNoise = ac.createGain()
      src2.buffer = buf
      gNoise.gain.setValueAtTime(0.08, t + delay)
      gNoise.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.05)
      src2.connect(gNoise)
      gNoise.connect(ac.destination)
      src2.start(t + delay)
    })
  } catch (e) { console.warn('Audio error', e) }
}

// Modem dial-up noise — Matrix theme
export function playModemNoise() {
  try {
    const ac = getCtx()
    const t  = ac.currentTime

    // Classic 56k modem dial sequence simulation
    const handshake: [number, number, number, OscillatorType][] = [
      [440,  0.00, 0.30, 'sine'],
      [2100, 0.30, 0.20, 'sine'],
      [1200, 0.50, 0.15, 'square'],
      [2400, 0.65, 0.15, 'square'],
      [1200, 0.80, 0.08, 'sawtooth'],
      [2400, 0.88, 0.08, 'sawtooth'],
      [1800, 0.96, 0.05, 'sawtooth'],
      [3400, 1.01, 0.05, 'sawtooth'],
    ]

    handshake.forEach(([freq, delay, dur, type]) => {
      playTone(ac, freq, t + delay, dur, type, 0.12)
    })

    // Data burst: rapid alternating tones
    let cursor = 1.10
    for (let i = 0; i < 40; i++) {
      const freq = i % 2 === 0 ? 1200 + Math.random() * 400 : 2400 + Math.random() * 600
      const dur  = 0.018 + Math.random() * 0.012
      playTone(ac, freq, t + cursor, dur, 'sawtooth', 0.06)
      cursor += dur + 0.004
    }

    // Final "connected" beep
    playTone(ac, 1000, t + cursor + 0.05, 0.15, 'sine', 0.18)
    playTone(ac, 1500, t + cursor + 0.22, 0.10, 'sine', 0.12)
  } catch (e) { console.warn('Audio error', e) }
}

// ── Chrono Trigger portal sound — plays on era change ─────────────────────────
export function playChronoPortal() {
  try {
    const ac = getCtx()
    const t  = ac.currentTime

    // Sweeping arpeggio + reverb-like tail = portal whoosh
    const portalNotes = [
      [523.25, 0.00, 0.18, 'sine'],    // C5
      [659.25, 0.12, 0.18, 'sine'],    // E5
      [783.99, 0.24, 0.18, 'sine'],    // G5
      [1046.5, 0.36, 0.28, 'sine'],    // C6
      [1318.5, 0.52, 0.22, 'sine'],    // E6
      [1567.9, 0.64, 0.36, 'triangle'],// G6 — shimmer
    ] as [number, number, number, OscillatorType][]

    portalNotes.forEach(([freq, delay, dur, type]) => {
      playTone(ac, freq, t + delay, dur, type, 0.10)
      // Octave below for depth
      playTone(ac, freq * 0.5, t + delay + 0.02, dur * 0.8, 'sine', 0.05)
    })

    // Whoosh noise burst
    const buf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      const env = i < data.length * 0.3
        ? i / (data.length * 0.3)
        : 1 - (i - data.length * 0.3) / (data.length * 0.7)
      data[i] = (Math.random() * 2 - 1) * env * 0.06
    }
    const src = ac.createBufferSource()
    const bandpass = ac.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.setValueAtTime(800, t)
    bandpass.frequency.exponentialRampToValueAtTime(4000, t + 0.6)
    bandpass.Q.value = 1.5
    const gn = ac.createGain()
    gn.gain.setValueAtTime(0.12, t)
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    src.buffer = buf
    src.connect(bandpass); bandpass.connect(gn); gn.connect(ac.destination)
    src.start(t)
  } catch (e) { console.warn('Audio error', e) }
}
