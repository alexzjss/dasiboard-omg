import { useAuthStore } from '@/store/authStore'
import { useRef, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  User, Mail, Hash, Calendar, GraduationCap, LogOut,
  Download, RefreshCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ── Seeded PRNG (mulberry32) — deterministic per user ID ─────────────────────
function seededRng(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  let s = h >>> 0
  return () => {
    s += 0x6D2B79F5
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// ── Draw the profile card onto a canvas ──────────────────────────────────────
function drawCard(canvas: HTMLCanvasElement, user: {
  full_name: string; email: string; nusp?: string; created_at?: string; id: string
}) {
  const W = 800, H = 480
  canvas.width = W * 2   // retina
  canvas.height = H * 2
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'

  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)   // retina

  const rng = seededRng(user.id)

  // ── Card background — warm cream ───────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, '#faf8f5')
  bgGrad.addColorStop(1, '#f5f0ea')
  ctx.fillStyle = bgGrad
  roundRect(ctx, 0, 0, W, H, 28)
  ctx.fill()

  // ── Subtle grain texture overlay ───────────────────────
  ctx.save()
  roundRect(ctx, 0, 0, W, H, 28)
  ctx.clip()
  for (let i = 0; i < 1800; i++) {
    const x = rng() * W, y = rng() * H
    ctx.fillStyle = `rgba(120,90,60,${rng() * 0.025})`
    ctx.fillRect(x, y, 1, 1)
  }
  ctx.restore()

  // ── Blob ───────────────────────────────────────────────
  ctx.save()
  roundRect(ctx, 0, 0, W, H, 28)
  ctx.clip()

  // Seeded hue: warm reds/oranges/roses (0–40 or 340–360)
  const hueChoice = rng()
  const hue = hueChoice < 0.5
    ? Math.floor(rng() * 40)           // 0–40  (red → orange)
    : Math.floor(340 + rng() * 20)     // 340–360 (deep rose → red)

  const blobGrad = ctx.createRadialGradient(
    W * (0.1 + rng() * 0.25), H * (rng() * 0.55),
    W * 0.05,
    W * 0.25, H * 0.15,
    W * (0.55 + rng() * 0.2)
  )
  blobGrad.addColorStop(0, `hsla(${hue}, 90%, 62%, 0.92)`)
  blobGrad.addColorStop(0.4, `hsla(${hue + 18}, 85%, 52%, 0.70)`)
  blobGrad.addColorStop(1, `hsla(${hue + 35}, 80%, 45%, 0.0)`)

  ctx.filter = `blur(${28 + rng() * 18}px)`
  drawBlob(ctx, rng, W, H, hue)
  ctx.fillStyle = blobGrad
  ctx.fill()

  // Second smaller accent blob
  const hue2 = hue + 25 + rng() * 20
  const blobGrad2 = ctx.createRadialGradient(
    W * (0.05 + rng() * 0.2), H * (0.05 + rng() * 0.3),
    20,
    W * 0.15, H * 0.1,
    W * 0.3
  )
  blobGrad2.addColorStop(0, `hsla(${hue2}, 95%, 70%, 0.7)`)
  blobGrad2.addColorStop(1, `hsla(${hue2}, 80%, 55%, 0.0)`)
  ctx.filter = `blur(${20 + rng() * 12}px)`
  drawBlob(ctx, rng, W * 0.5, H * 0.5, hue2, W * 0.08, H * 0.03)
  ctx.fillStyle = blobGrad2
  ctx.fill()

  ctx.filter = 'none'
  ctx.restore()

  // ── Frosted left panel ─────────────────────────────────
  const panelW = 280
  ctx.save()
  roundRect(ctx, 24, 24, panelW, H - 48, 20)
  ctx.clip()
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fill()
  // thin border
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 1.5
  roundRect(ctx, 24, 24, panelW, H - 48, 20)
  ctx.stroke()
  ctx.restore()

  // ── Avatar circle ──────────────────────────────────────
  const cx = 24 + panelW / 2, cy = 108
  const r = 46
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  const avatarGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  avatarGrad.addColorStop(0, `hsl(${hue}, 80%, 58%)`)
  avatarGrad.addColorStop(1, `hsl(${hue + 30}, 75%, 42%)`)
  ctx.fillStyle = avatarGrad
  ctx.fill()
  ctx.restore()

  // initials
  const initials = user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `bold 26px 'Syne', 'DM Sans', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, cx, cy + 1)

  // avatar ring
  ctx.beginPath()
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2)
  ctx.strokeStyle = `hsla(${hue}, 60%, 65%, 0.5)`
  ctx.lineWidth = 2
  ctx.stroke()

  // ── Name on left panel ────────────────────────────────
  const firstName = user.full_name.split(' ')[0]
  const lastName  = user.full_name.split(' ').slice(1).join(' ')

  ctx.textAlign = 'center'
  ctx.fillStyle = '#1a1410'
  ctx.font = `700 17px 'Syne', 'DM Sans', sans-serif`
  ctx.fillText(firstName, cx, cy + r + 22)
  ctx.font = `400 14px 'DM Sans', sans-serif`
  ctx.fillStyle = '#6b5a4a'
  ctx.fillText(lastName, cx, cy + r + 40)

  // Course badge
  const badgeY = cy + r + 62
  const bLabel = 'SI · EACH · USP'
  const bW = ctx.measureText(bLabel).width + 20
  ctx.fillStyle = `hsla(${hue}, 70%, 55%, 0.15)`
  roundRect(ctx, cx - bW / 2, badgeY - 10, bW, 22, 11)
  ctx.fill()
  ctx.font = `600 10px 'DM Sans', sans-serif`
  ctx.fillStyle = `hsl(${hue}, 65%, 38%)`
  ctx.fillText(bLabel, cx, badgeY + 1)

  // ── Divider ───────────────────────────────────────────
  ctx.strokeStyle = 'rgba(160,120,80,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx - 70, badgeY + 22)
  ctx.lineTo(cx + 70, badgeY + 22)
  ctx.stroke()

  // ── Left panel footer — card code ─────────────────────
  const cardCode = '#' + user.id.replace(/-/g, '').slice(0, 8).toUpperCase()
  ctx.font = `400 9px 'JetBrains Mono', monospace`
  ctx.fillStyle = 'rgba(100,80,60,0.4)'
  ctx.textAlign = 'center'
  ctx.fillText(cardCode, cx, H - 36)

  // ── Right info section ────────────────────────────────
  const rx = 24 + panelW + 36
  const infoItems = [
    { label: 'NOME COMPLETO', value: user.full_name },
    { label: 'E-MAIL',        value: user.email },
    { label: 'Nº USP',        value: user.nusp || 'Não informado' },
    { label: 'CURSO',         value: 'Sistemas de Informação' },
    { label: 'ESCOLA',        value: 'EACH — Escola de Artes, Ciências e Humanidades' },
    {
      label: 'MEMBRO DESDE',
      value: user.created_at
        ? format(new Date(user.created_at), "MMMM 'de' yyyy", { locale: ptBR })
        : '—',
    },
  ]

  let iy = 56
  for (const item of infoItems) {
    // label
    ctx.textAlign = 'left'
    ctx.font = `600 9px 'DM Sans', sans-serif`
    ctx.fillStyle = `hsl(${hue}, 50%, 48%)`
    ctx.fillText(item.label, rx, iy)
    iy += 14

    // value
    ctx.font = `500 14px 'DM Sans', sans-serif`
    ctx.fillStyle = '#1e1610'
    // truncate long values
    let val = item.value
    while (ctx.measureText(val).width > W - rx - 40 && val.length > 10) {
      val = val.slice(0, -4) + '…'
    }
    ctx.fillText(val, rx, iy)
    iy += 30

    // separator line
    if (item !== infoItems[infoItems.length - 1]) {
      ctx.strokeStyle = 'rgba(180,140,100,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(rx, iy)
      ctx.lineTo(W - 36, iy)
      ctx.stroke()
      iy += 12
    }
  }

  // ── DaSIboard logo/watermark bottom right ─────────────
  ctx.textAlign = 'right'
  ctx.font = `700 13px 'Syne', sans-serif`
  ctx.fillStyle = `hsla(${hue}, 55%, 42%, 0.35)`
  ctx.fillText('DaSIboard', W - 36, H - 34)
  ctx.font = `400 9px 'DM Sans', sans-serif`
  ctx.fillStyle = 'rgba(130,100,70,0.3)'
  ctx.fillText('SI · EACH · USP', W - 36, H - 20)

  // ── Outer card shadow (drawn as border) ───────────────
  ctx.strokeStyle = 'rgba(180,140,100,0.18)'
  ctx.lineWidth = 1.5
  roundRect(ctx, 0.75, 0.75, W - 1.5, H - 1.5, 28)
  ctx.stroke()
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawBlob(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  W: number, H: number,
  _hue: number,
  ox = 0, oy = 0
) {
  const cx = W * (0.12 + rng() * 0.22) + ox
  const cy = H * (0.05 + rng() * 0.45) + oy
  const pts = 7 + Math.floor(rng() * 4)
  const baseR = W * (0.28 + rng() * 0.20)
  ctx.beginPath()
  for (let i = 0; i <= pts; i++) {
    const angle = (i / pts) * Math.PI * 2
    const r = baseR * (0.72 + rng() * 0.56)
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

// ── Profile Page ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    if (!canvasRef.current || !user) return
    drawCard(canvasRef.current, user)
  }, [user])

  useEffect(() => { draw() }, [draw])

  const handleLogout = () => { logout(); navigate('/login') }

  const handleDownload = () => {
    if (!canvasRef.current || !user) return
    const link = document.createElement('a')
    link.download = `dasiboard-${user.full_name.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvasRef.current.toDataURL('image/png', 1.0)
    link.click()
  }

  if (!user) return null

  const initials = user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-8 flex items-center gap-2 animate-in"
          style={{ color: 'var(--text-primary)' }}>
        <User size={22} style={{ color: 'var(--accent-3)' }} /> Perfil
      </h1>

      {/* ── Badge card ─────────────────────────────────── */}
      <div className="mb-3 animate-in">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Cartão de identificação
          </p>
          <div className="flex gap-2">
            <button onClick={draw} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5">
              <RefreshCw size={12} /> Regenerar
            </button>
            <button onClick={handleDownload} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Download size={12} /> Baixar PNG
            </button>
          </div>
        </div>

        {/* Canvas wrapper with shadow */}
        <div className="rounded-3xl overflow-hidden"
             style={{
               boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.15)',
               lineHeight: 0,
             }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', width: '100%', borderRadius: 28, cursor: 'pointer' }}
            onClick={handleDownload}
            title="Clique para baixar"
          />
        </div>
        <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
          Único para sua conta · clique no cartão para baixar
        </p>
      </div>

      {/* ── Info cards ─────────────────────────────────── */}
      <div className="card mb-4 space-y-4 animate-in-delay-2">
        <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
          Informações da conta
        </h3>
        {[
          { icon: Mail,          label: 'E-mail',       value: user.email },
          { icon: Hash,          label: 'Nº USP',       value: user.nusp ?? 'Não informado' },
          { icon: GraduationCap, label: 'Curso',        value: 'Sistemas de Informação' },
          { icon: Calendar,      label: 'Membro desde', value: user.created_at
              ? format(new Date(user.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
              : '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)' }}>
              <Icon size={14} style={{ color: 'var(--accent-3)' }} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── About ──────────────────────────────────────── */}
      <div className="card mb-6 animate-in-delay-3">
        <h3 className="font-display font-semibold text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Sobre o DaSIboard
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          DaSIboard é o dashboard acadêmico dos alunos de Sistemas de Informação da EACH‑USP.
          Centraliza organização de tarefas, notas, frequência, calendário e entidades do curso.
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {['v2.0.0', 'FastAPI', 'React', 'PostgreSQL'].map(t => (
            <span key={t} className="badge text-[10px]"
                  style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── Logout ─────────────────────────────────────── */}
      <button onClick={handleLogout} className="btn-danger w-full justify-center animate-in-delay-4">
        <LogOut size={15} /> Sair da conta
      </button>
    </div>
  )
}
