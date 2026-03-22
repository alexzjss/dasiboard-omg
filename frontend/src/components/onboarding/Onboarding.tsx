import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'

const STORAGE_KEY = 'dasiboard-onboarding-done'

interface Step {
  id: string
  emoji: string
  title: string
  desc: string
  tip?: string
  route?: string
  color: string
  highlight?: string
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    emoji: '🎓',
    title: 'Bem-vindo ao DaSIboard!',
    desc: 'Seu dashboard acadêmico feito por e para alunos de SI da EACH-USP. Este tour rápido vai mostrar tudo que você pode fazer aqui.',
    color: 'var(--accent-1)',
    tip: 'Você pode pular o tour clicando em "Pular" abaixo.',
  },
  {
    id: 'profile',
    emoji: '🃏',
    title: 'Seu cartão único',
    desc: 'Em Perfil, você tem um cartão de identidade gerado por IA com um blob de cor totalmente único baseado no seu ID — igual ao Arc Browser. Baixe como PNG e compartilhe!',
    color: '#ec4899',
    route: '/profile',
    tip: 'Escolha o fundo com a cor da sua entidade e adicione conquistas ao cartão.',
    highlight: 'profile-card',
  },
  {
    id: 'kanban',
    emoji: '📋',
    title: 'Kanban com sub-tarefas',
    desc: 'Organize tarefas em quadros com colunas arrastaveis. Cada card agora suporta sub-tarefas com checklist, data de entrega e assignee.',
    color: '#f59e0b',
    route: '/kanban',
    tip: 'Use Ctrl+N para criar um novo card rapidamente quando estiver na página.',
  },
  {
    id: 'grades',
    emoji: '📊',
    title: 'Disciplinas & Notas rápidas',
    desc: 'Cadastre notas e acompanhe sua frequência. Em cada disciplina você pode criar notas em markdown — e elas viram flashcards automaticamente para revisão!',
    color: '#a855f7',
    route: '/grades',
    tip: 'Use Q: / A: nas notas para gerar flashcards. Clique em "Revisar" para iniciar o Modo Revisão com Pomodoro.',
  },
  {
    id: 'review',
    emoji: '🧠',
    title: 'Modo Revisão com Pomodoro',
    desc: 'Dentro de cada disciplina em Notas, clique em "Revisar" para abrir um modo de estudo com cronômetro Pomodoro 25/5 e flashcards gerados das suas notas.',
    color: '#22c55e',
    tip: 'O Modo Revisão mostra qual flashcard você acertou ou errou e dá um % de aproveitamento.',
  },
  {
    id: 'calendar',
    emoji: '📅',
    title: 'Calendário com lembretes',
    desc: 'Registre provas, deadlines e eventos. Ative as notificações para receber lembretes automáticos 1h antes e na hora de cada evento.',
    color: '#3b82f6',
    route: '/calendar',
    tip: 'Eventos globais aparecem para todos os alunos. Entidades podem criar eventos exclusivos.',
  },
  {
    id: 'entities',
    emoji: '🏛️',
    title: 'Entidades & cartão',
    desc: 'Conheça e entre para DASI, HypE, Conway e outras entidades. Membros podem usar a cor da entidade no fundo do cartão de perfil!',
    color: '#10b981',
    route: '/entities',
    tip: 'Entidades têm eventos exclusivos para membros.',
  },
  {
    id: 'achievements',
    emoji: '🏆',
    title: 'Conquistas',
    desc: 'Desbloqueie conquistas usando o app: notas, flashcards, disciplinas, kanban, entidades e segredos! Adicione até 5 no seu cartão de perfil.',
    color: '#f59e0b',
    tip: 'Existem conquistas secretas que você vai descobrir usando o app. 🥚',
  },
  {
    id: 'themes',
    emoji: '🎨',
    title: '24+ temas únicos',
    desc: 'Vaporwave, Batman, Evangelion, Game Boy, Xbox 360, Blueprint técnico, Chrono Trigger com 5 eras, e muito mais. Cada tema tem Easter Eggs próprios!',
    color: '#8b5cf6',
    tip: 'Use Ctrl+T para abrir o seletor. Alt+→ para próximo tema.',
  },
  {
    id: 'tools',
    emoji: '⚡',
    title: 'Ferramentas',
    desc: 'Na sidebar, use os 4 botões de ferramentas: Modo Apresentação (fontes grandes, sem sidebar), Modo Foco (tela limpa), Simulação de visão (daltonismo) e Modo Lite (sem animações).',
    color: 'var(--accent-1)',
    tip: 'Ctrl+Shift+F = Modo Foco. Ctrl+Shift+P = Apresentação.',
  },
  {
    id: 'done',
    emoji: '🚀',
    title: 'Tudo pronto!',
    desc: 'Você está pronto para usar o DaSIboard ao máximo. Explore, customize, estude e ganhe conquistas. Bons estudos!',
    color: 'var(--accent-1)',
    tip: 'Use ? para ver todos os atalhos de teclado a qualquer momento.',
  },
]

export function useOnboarding() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) {
      // Small delay so the app loads first
      const t = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const markDone = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY)
    setShow(true)
  }

  return { show, markDone, resetOnboarding }
}

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1
  const isFirst = step === 0

  const goNext = () => {
    if (isLast) { onClose(); return }
    const next = STEPS[step + 1]
    if (next.route) navigate(next.route)
    setStep(s => s + 1)
  }
  const goPrev = () => {
    if (isFirst) return
    setStep(s => s - 1)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
         style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full sm:max-w-md animate-in"
           style={{
             background: 'var(--bg-card)', border: '1px solid var(--border)',
             borderRadius: '24px 24px 0 0', boxShadow: '0 -8px 60px rgba(0,0,0,0.5)',
           }}
           // On desktop, proper rounded modal
           >
        {/* Top drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-4 pb-0">
          <div className="flex gap-1 mb-1">
            {STEPS.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-all"
                   style={{ background: i <= step ? current.color : 'var(--border)', opacity: i === step ? 1 : 0.5 }} />
            ))}
          </div>
          <p className="text-[10px] text-right" style={{ color: 'var(--text-muted)' }}>
            {step + 1} / {STEPS.length}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-2xl"
                 style={{ background: current.color + '20', border: `1px solid ${current.color}40`, fontSize: 28 }}>
              {current.emoji}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="font-display font-bold text-lg leading-tight mb-1"
                  style={{ color: 'var(--text-primary)' }}>
                {current.title}
              </h2>
            </div>
            <button onClick={onClose}
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          </div>

          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
            {current.desc}
          </p>

          {current.tip && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl mb-2"
                 style={{ background: current.color + '12', border: `1px solid ${current.color}25` }}>
              <Sparkles size={13} style={{ color: current.color, marginTop: 1, flexShrink: 0 }} />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {current.tip}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button onClick={goPrev} disabled={isFirst}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            <ChevronLeft size={16} />
          </button>

          <button onClick={goNext}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}cc)`, boxShadow: `0 4px 20px ${current.color}44` }}>
            {isLast ? (
              <>Começar! 🚀</>
            ) : (
              <>Próximo <ChevronRight size={15} /></>
            )}
          </button>
        </div>

        {!isLast && (
          <button onClick={onClose}
                  className="w-full text-xs text-center pb-5 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}>
            Pular tour
          </button>
        )}
      </div>
    </div>
  )
}
