// ── Settings Page — /settings ─────────────────────────────────────────────────
import { useState, useRef } from 'react'
import {
  Settings, Palette, Bell, Shield, Database, Keyboard,
  Globe, Type, LayoutGrid, Download, Upload, Trash2,
  ChevronRight, Check, AlertTriangle, BellOff, BellRing, Moon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import api from '@/utils/api'
import { useSettings } from '@/hooks/useSettings'
import { useNotifications, setDnd, getDndUntil } from '@/hooks/useNotifications'
import { useLocale, Locale } from '@/hooks/useI18n'
import { useTheme } from '@/context/ThemeContext'
import { requestPushPermission } from '@/hooks/usePushNotifications'

// ── Section component ─────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode
}) {
  return (
    <div className="card mb-3 animate-in">
      <h2 className="font-display font-bold text-sm flex items-center gap-2 mb-4 pb-3"
          style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
        <Icon size={15} style={{ color: 'var(--accent-3)' }} />
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 px-1"
         style={{ borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {hint && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className="relative w-10 h-5.5 rounded-full transition-colors"
      style={{
        width: 40, height: 22,
        background: value ? 'var(--accent-1)' : 'var(--border)',
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 20 : 2,
        width: 18, height: 18, borderRadius: '50%',
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'left 0.2s',
        display: 'block',
      }} />
    </button>
  )
}

// ── Data export / import helpers ──────────────────────────────────────────────
async function exportAllData() {
  try {
    const [grades, kanban, events, entities] = await Promise.allSettled([
      api.get('/grades/subjects'),
      api.get('/kanban/boards'),
      api.get('/events/'),
      api.get('/entities/'),
    ])

    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      grades:    grades.status   === 'fulfilled' ? grades.value.data   : [],
      kanban:    kanban.status   === 'fulfilled' ? kanban.value.data   : [],
      events:    events.status   === 'fulfilled' ? events.value.data   : [],
      entities:  entities.status === 'fulfilled' ? entities.value.data : [],
      // Local data
      notes:          JSON.parse(localStorage.getItem('dasiboard-notes') ?? '[]'),
      achievements:   JSON.parse(localStorage.getItem('dasiboard-achievements') ?? '[]'),
      studyStats:     JSON.parse(localStorage.getItem('dasiboard-study-stats') ?? '{}'),
      settings:       JSON.parse(localStorage.getItem('dasiboard-settings') ?? '{}'),
      fluxogram:      JSON.parse(localStorage.getItem('dasiboard-fluxogram') ?? '{}'),
      area:           localStorage.getItem('dasiboard-area') ?? '',
      language:       localStorage.getItem('dasiboard-lang') ?? '',
      theme:          localStorage.getItem('dasiboard-theme') ?? '',
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `dasiboard-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Dados exportados!')
  } catch { toast.error('Erro ao exportar dados') }
}

function importData(file: File, onDone: () => void) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      if (!data.version || !data.exportedAt) throw new Error('Formato inválido')

      // Restore localStorage keys
      if (data.notes)        localStorage.setItem('dasiboard-notes',        JSON.stringify(data.notes))
      if (data.achievements) localStorage.setItem('dasiboard-achievements', JSON.stringify(data.achievements))
      if (data.studyStats)   localStorage.setItem('dasiboard-study-stats',  JSON.stringify(data.studyStats))
      if (data.settings)     localStorage.setItem('dasiboard-settings',     JSON.stringify(data.settings))
      if (data.fluxogram)    localStorage.setItem('dasiboard-fluxogram',    JSON.stringify(data.fluxogram))
      if (data.area)         localStorage.setItem('dasiboard-area',          data.area)
      if (data.language)     localStorage.setItem('dasiboard-lang',          data.language)
      if (data.theme)        localStorage.setItem('dasiboard-theme',          data.theme)

      toast.success(`Backup restaurado! (${new Date(data.exportedAt).toLocaleDateString('pt-BR')})`)
      onDone()
    } catch (err: any) {
      toast.error('Arquivo inválido: ' + (err.message ?? 'formato incorreto'))
    }
  }
  reader.readAsText(file)
}

// ── Main ──────────────────────────────────────────────────────────────────────


// ── Privacy Section — perfil público ─────────────────────────────────────────
function PrivacySection() {
  const { user } = useAuthStore()
  const [ps, setPs] = useState<{
    public_profile: boolean; public_bio: string; entry_year: string
    public_subjects: boolean; public_achievements: boolean
  }>({ public_profile:false, public_bio:'', entry_year:'', public_subjects:false, public_achievements:false })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api.get('/social/profile/settings')
      .then(({ data }) => {
        setPs({
          public_profile:      data.public_profile ?? false,
          public_bio:          data.public_bio ?? '',
          entry_year:          data.entry_year ? String(data.entry_year) : '',
          public_subjects:     data.public_subjects ?? false,
          public_achievements: data.public_achievements ?? false,
        })
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const save = async (patch: Partial<typeof ps>) => {
    const next = { ...ps, ...patch }
    setPs(next)
    try {
      await api.patch('/social/profile/settings', {
        public_profile:      next.public_profile,
        public_bio:          next.public_bio || null,
        entry_year:          next.entry_year ? parseInt(next.entry_year) : null,
        public_subjects:     next.public_subjects,
        public_achievements: next.public_achievements,
      })
      toast.success('Salvo!')
    } catch { toast.error('Erro ao salvar') }
  }

  if (!loaded) return (
    <div className="space-y-3 animate-in">
      {[0,1,2].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
    </div>
  )

  const profileUrl = user?.nusp ? `/u/${user.nusp}` : null

  return (
    <div className="animate-in space-y-4">
      <Section icon={Shield} title="Perfil público">
        <Row label="Exibir perfil público"
             hint={profileUrl ? `Visível em /u/${user?.nusp}` : 'Requer Nº USP cadastrado'}>
          <Toggle value={ps.public_profile} onChange={v => save({ public_profile: v })} />
        </Row>
        {ps.public_profile && (
          <>
            <Row label="Bio pública" hint="Descrição curta (até 300 caracteres)">
              <input className="input text-sm w-52" maxLength={300}
                     placeholder="Ex: Backend dev · 4º sem."
                     value={ps.public_bio}
                     onChange={e => setPs(s => ({ ...s, public_bio: e.target.value }))}
                     onBlur={() => save({ public_bio: ps.public_bio })} />
            </Row>
            <Row label="Turma (ano de entrada)" hint="Para agrupamento em /turma">
              <input className="input text-sm w-24" maxLength={4} placeholder="2023"
                     value={ps.entry_year}
                     onChange={e => setPs(s => ({ ...s, entry_year: e.target.value.replace(/[^0-9]/g,'') }))}
                     onBlur={() => save({ entry_year: ps.entry_year })} />
            </Row>
            <Row label="Exibir disciplinas" hint="Médias ficam visíveis no perfil público">
              <Toggle value={ps.public_subjects} onChange={v => save({ public_subjects: v })} />
            </Row>
            <Row label="Exibir conquistas" hint="Conquistas desbloqueadas ficam visíveis">
              <Toggle value={ps.public_achievements} onChange={v => save({ public_achievements: v })} />
            </Row>
            {profileUrl && (
              <Row label="" hint="">
                <a href={profileUrl} target="_blank" rel="noreferrer"
                   className="text-xs flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                   style={{ color: 'var(--accent-3)' }}>
                  Ver perfil público →
                </a>
              </Row>
            )}
          </>
        )}
      </Section>
      <Section icon={Shield} title="Dados de estudo">
        <Row label="Compartilhar estatísticas anonimamente"
             hint="Ajuda a melhorar o DaSIboard sem identificar você">
          <Toggle value={false} onChange={() => {}} />
        </Row>
      </Section>
    </div>
  )
}


export default function SettingsPage() {
  const { settings, update }   = useSettings()
  const { locale, setLang }    = useLocale()
  const { dndUntil, activateDnd, deactivateDnd, clearAll } = useNotifications()
  const { theme }              = useTheme()
  const importRef              = useRef<HTMLInputElement>(null)
  const [activeSection, setActive] = useState<string>('appearance')
  const [notifPerm, setNotifPerm]  = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [clearConfirm, setClearConfirm] = useState(false)

  const sections = [
    { id: 'appearance',    label: 'Aparência',     icon: Palette   },
    { id: 'notifications', label: 'Notificações',  icon: Bell      },
    { id: 'privacy',       label: 'Privacidade',   icon: Shield    },
    { id: 'data',          label: 'Dados',          icon: Database  },
    { id: 'shortcuts',     label: 'Atalhos',        icon: Keyboard  },
  ]

  const handleRequestPermission = async () => {
    const perm = await requestPushPermission()
    setNotifPerm(perm)
    if (perm === 'granted') toast.success('Notificações ativadas!')
    else toast.error('Permissão negada pelo navegador')
  }

  const handleClearLocal = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('dasiboard-'))
    keys.forEach(k => localStorage.removeItem(k))
    toast.success('Dados locais removidos')
    setClearConfirm(false)
    setTimeout(() => window.location.reload(), 1000)
  }

  const SHORTCUTS = [
    { keys: ['Ctrl','K'],       desc: 'Busca global' },
    { keys: ['Ctrl','T'],       desc: 'Abrir seletor de temas' },
    { keys: ['Ctrl','Shift','F'], desc: 'Modo Foco' },
    { keys: ['Ctrl','Shift','P'], desc: 'Modo Apresentação' },
    { keys: ['Alt','←'],        desc: 'Tema anterior' },
    { keys: ['Alt','→'],        desc: 'Próximo tema' },
    { keys: ['?'],              desc: 'Exibir este painel de atalhos' },
    { keys: ['Ctrl','N'],       desc: 'Novo card (em Kanban)' },
  ]

  return (
    <div className="px-4 py-5 sm:px-6 md:px-10 md:py-8 max-w-4xl mx-auto w-full page-mobile">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-in">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
          <Settings size={18} style={{ color: 'var(--accent-3)' }} />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Configurações
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Personalize sua experiência no DaSIboard</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto scrollbar-hide p-1 rounded-2xl animate-in"
           style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        {sections.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActive(id)}
                  className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: activeSection === id ? 'var(--bg-card)' : 'transparent',
                    color: activeSection === id ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: activeSection === id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                  }}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* ── Aparência ──────────────────────────────────────────────────── */}
      {activeSection === 'appearance' && (
        <div className="animate-in space-y-4">
          <Section icon={Type} title="Tipografia">
            <Row label="Tamanho da fonte" hint={`${settings.fontSize}px`}>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>A</span>
                <input
                  type="range" min={12} max={20} step={1}
                  value={settings.fontSize}
                  onChange={e => update('fontSize', Number(e.target.value))}
                  className="w-28 accent-[var(--accent-3)]"
                />
                <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>A</span>
              </div>
            </Row>
          </Section>

          <Section icon={LayoutGrid} title="Densidade">
            <Row label="Compactação da interface"
                 hint={settings.density === 'compact' ? 'Mais itens por tela' : 'Mais espaço entre elementos'}>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {(['compact','comfortable'] as const).map(d => (
                  <button key={d} onClick={() => update('density', d)}
                          className="px-3 py-1.5 text-xs font-medium transition-all"
                          style={{
                            background: settings.density === d ? 'var(--accent-soft)' : 'transparent',
                            color: settings.density === d ? 'var(--accent-3)' : 'var(--text-muted)',
                          }}>
                    {d === 'compact' ? '⬛ Compacto' : '⬜ Confortável'}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Reduzir animações" hint="Desativa transições e efeitos decorativos">
              <Toggle value={settings.reducedMotion} onChange={v => update('reducedMotion', v)} />
            </Row>
          </Section>

          <Section icon={Globe} title="Idioma">
            <Row label="Idioma da interface" hint="Recarrega a página ao mudar">
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {([['pt-BR', '🇧🇷 Português'], ['en-US', '🇺🇸 English']] as [Locale, string][]).map(([l, label]) => (
                  <button key={l} onClick={() => setLang(l)}
                          className="px-3 py-1.5 text-xs font-medium transition-all"
                          style={{
                            background: locale === l ? 'var(--accent-soft)' : 'transparent',
                            color: locale === l ? 'var(--accent-3)' : 'var(--text-muted)',
                          }}>
                    {label}
                  </button>
                ))}
              </div>
            </Row>
          </Section>
        </div>
      )}

      {/* ── Notificações ───────────────────────────────────────────────── */}
      {activeSection === 'notifications' && (
        <div className="animate-in space-y-4">
          <Section icon={Bell} title="Permissão do navegador">
            <Row label="Notificações do sistema"
                 hint={notifPerm === 'granted' ? 'Ativadas' : notifPerm === 'denied' ? 'Bloqueadas pelo navegador — use as configurações do site' : 'Não solicitado'}>
              {notifPerm === 'granted' ? (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                  <Check size={11} /> Ativas
                </span>
              ) : notifPerm === 'denied' ? (
                <span className="text-xs" style={{ color: '#ef4444' }}>Bloqueadas</span>
              ) : (
                <button onClick={handleRequestPermission} className="btn-primary text-xs py-1.5 px-3 gap-1.5">
                  <Bell size={12} /> Ativar
                </button>
              )}
            </Row>
          </Section>

          <Section icon={BellOff} title="Modo Não Perturbe">
            <Row label="Status atual"
                 hint={dndUntil ? `Silenciado até ${dndUntil.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Notificações ativas'}>
              {dndUntil ? (
                <button onClick={deactivateDnd} className="btn-ghost text-xs py-1.5 px-3 gap-1.5">
                  <BellRing size={12} /> Reativar
                </button>
              ) : (
                <div className="flex gap-1.5">
                  {[1, 4, 8].map(h => (
                    <button key={h} onClick={() => activateDnd(h)}
                            className="btn-ghost text-xs py-1.5 px-2.5">
                      {h}h
                    </button>
                  ))}
                </div>
              )}
            </Row>
            <Row label="Silenciar com Modo Foco" hint="DND é ativado automaticamente ao entrar no Modo Foco">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)' }}>
                Automático
              </span>
            </Row>
          </Section>

          <Section icon={Bell} title="Tipos de notificação">
            {[
              { label: 'Conquistas desbloqueadas',   hint: 'Aparecem como toast e no sino' },
              { label: 'Eventos em breve',            hint: '1 hora antes e na hora' },
              { label: 'Deadlines do Kanban',         hint: '24h e 1h antes do prazo' },
              { label: 'Digest semanal',              hint: 'Resumo toda segunda-feira' },
              { label: 'Menções em eventos',          hint: 'Quando uma entidade marcar sua presença' },
            ].map(({ label, hint }) => (
              <Row key={label} label={label} hint={hint}>
                <Toggle value={true} onChange={() => {}} />
              </Row>
            ))}
          </Section>
        </div>
      )}

      {/* ── Privacidade ─────────────────────────────────────────────────── */}
      {activeSection === 'privacy' && (
        <PrivacySection />
      )}

      {/* ── Dados ───────────────────────────────────────────────────────── */}
      {activeSection === 'data' && (
        <div className="animate-in space-y-4">
          <Section icon={Download} title="Exportar">
            <div className="py-2">
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Baixe todos os seus dados em um arquivo JSON: notas, disciplinas, eventos, kanban e configurações.
              </p>
              <button onClick={exportAllData} className="btn-primary gap-2">
                <Download size={14} /> Exportar meus dados
              </button>
            </div>
          </Section>

          <Section icon={Upload} title="Importar backup">
            <div className="py-2">
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Restaure um backup exportado anteriormente. Dados locais serão substituídos.
              </p>
              <input
                ref={importRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) importData(f, () => {})
                  e.target.value = ''
                }}
              />
              <button onClick={() => importRef.current?.click()} className="btn-ghost gap-2">
                <Upload size={14} /> Importar backup
              </button>
            </div>
          </Section>

          <Section icon={Trash2} title="Limpar dados">
            <div className="py-2">
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Remove todos os dados armazenados localmente (notas, configurações, preferências). Dados no servidor (disciplinas, eventos) permanecem.
              </p>
              {!clearConfirm ? (
                <button onClick={() => setClearConfirm(true)} className="btn-danger gap-2">
                  <Trash2 size={14} /> Limpar dados locais
                </button>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl"
                     style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <p className="text-xs flex-1" style={{ color: '#ef4444' }}>Isso não pode ser desfeito. Confirma?</p>
                  <button onClick={handleClearLocal} className="btn-danger text-xs py-1.5 px-3">Sim, limpar</button>
                  <button onClick={() => setClearConfirm(false)} className="btn-ghost text-xs py-1.5 px-3">Não</button>
                </div>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ── Atalhos ─────────────────────────────────────────────────────── */}
      {activeSection === 'shortcuts' && (
        <div className="animate-in">
          <div className="card">
            <h3 className="font-display font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
              Atalhos de teclado
            </h3>
            <div className="space-y-2">
              {SHORTCUTS.map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between py-2"
                     style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</span>
                  <div className="flex items-center gap-1">
                    {keys.map((k, i) => (
                      <span key={i}>
                        <kbd className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                             style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          {k}
                        </kbd>
                        {i < keys.length - 1 && <span className="text-[10px] mx-0.5" style={{ color: 'var(--text-muted)' }}>+</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
