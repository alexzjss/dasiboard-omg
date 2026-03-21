// ── DLC Theme — Laser Beams Canvas Background (Conway-inspired) ───────────────
import { useEffect, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'

interface Beam {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  width: number
  length: number
  angle: number
  speed: number
  hue: number
}

const COLORS = ['#ff0080', '#ff6600', '#ffff00', '#00ff88', '#00eeff', '#8800ff']

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

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Init beams
    const N = 4
    beamsRef.current = Array.from({ length: N }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      color: COLORS[i % COLORS.length],
      width: 1.5,
      length: 120 + Math.random() * 80,
      angle: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 0.6,
      hue: i * 60,
    }))

    let frame = 0
    const draw = () => {
      frame++
      ctx.fillStyle = 'rgba(8,2,15,0.12)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const b of beamsRef.current) {
        // Rotate hue slowly
        b.hue = (b.hue + 0.3) % 360
        b.color = `hsl(${b.hue}, 100%, 60%)`

        // Move
        b.x += b.vx
        b.y += b.vy
        b.angle += 0.008

        // Bounce off edges
        if (b.x < 0 || b.x > canvas.width)  b.vx *= -1
        if (b.y < 0 || b.y > canvas.height) b.vy *= -1

        // Draw laser beam
        const endX = b.x + Math.cos(b.angle) * b.length
        const endY = b.y + Math.sin(b.angle) * b.length

        const grad = ctx.createLinearGradient(b.x, b.y, endX, endY)
        grad.addColorStop(0, b.color + 'dd')
        grad.addColorStop(0.5, b.color)
        grad.addColorStop(1, b.color + '00')

        ctx.beginPath()
        ctx.moveTo(b.x, b.y)
        ctx.lineTo(endX, endY)
        ctx.strokeStyle = grad
        ctx.lineWidth = b.width
        ctx.shadowColor = b.color
        ctx.shadowBlur = 8
        ctx.stroke()
        ctx.shadowBlur = 0

        // Small bright dot at origin
        ctx.beginPath()
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = b.color
        ctx.shadowColor = b.color
        ctx.shadowBlur = 12
        ctx.fill()
        ctx.shadowBlur = 0
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [isDLC])

  if (!isDLC) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.55,
      }}
    />
  )
}
