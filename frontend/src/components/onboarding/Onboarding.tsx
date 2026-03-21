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
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    emoji: '🎓',
    title: 'Bem-vindo ao DaSIboard!',
    desc: 'Seu dashboard acadêmico feito por e para alunos de Sistemas de Informação da EACH-USP. Vamos te mostrar o que tem aqui.',
    color: 'var(--accent-1)',
    tip: 'Você pode pular o tour a qualquer momento.',
  },
  {
    id: 'kanban',
    emoji: '📋',
    title: 'Kanban',
    desc: 'Organize suas tarefas em quadros com colunas personalizáveis. Arraste os cards entre as colunas e defina prioridades e datas.',
    color: '#f59e0b',
    route: '/kanban',
    tip: 'Dica: crie um quadro para cada disciplina.',
  },
  {
    id: 'grades',
    emoji: '📊',
    title: 'Disciplinas & Fluxograma',
    desc: 'Cadastre suas matérias, notas e frequência. O fluxograma mostra toda a grade do curso com seu progresso em cada disciplina.',
    color: '#a855f7',
    route: '/grades',
    tip: 'O fluxograma mostra pré-requisitos e o que você já passou.',
  },
  {
    id: 'calendar',
    emoji: '📅',
    title: 'Calendário',
    desc: 'Registre provas, deadlines, eventos acadêmicos e pessoais. Eventos globais aparecem para todos os alunos.',
    color: '#3b82f6',
    route: '/calendar',
    tip: 'Você pode filtrar por tipo de evento.',
  },
  {
    id: 'entities',
    emoji: '🏛️',
    title: 'Entidades',
    desc: 'Conheça e entre para as entidades do curso: DASI, HypE, Conway, Lab das Minas e muito mais. Membros têm acesso a eventos exclusivos.',
    color: '#10b981',
    route: '/entities',
  },
  {
    id: 'docentes',
    emoji: '👩‍🏫',
    title: 'Docentes',
    desc: 'Encontre informações sobre os professores do curso: e-mail, sala, áreas de pesquisa e links para o Lattes e sites pessoais.',
    color: '#ec4899',
    route: '/docentes',
    tip: 'Busque por nome, área ou sala.',
  },
  {
    id: 'themes',
    emoji: '🎨',
    title: '23 temas únicos',
    desc: 'O DaSIboard tem 23 temas com personalidades completamente diferentes — de vaporwave a Batman, de evangelion a Chrono Trigger com 5 eras.',
    color: '#8b5cf6',
    tip: 'Use Ctrl+T para abrir o seletor de temas rapidamente.',
  },
  {
    id: 'study',
    emoji: '🧠',
    title: 'Modo Estudo',
    desc: 'Ative o Modo Estudo na barra lateral para acessar o timer Pomodoro e a lista de metas de estudo da sessão.',
    color: '#ef4444',
    tip: 'O Pomodoro avança automaticamente entre foco e pausas.',
  },
  {
    id: 'shortcuts',
    emoji: '⌨️',
    title: 'Atalhos de teclado',
    desc: 'Use atalhos para navegar rapidamente: G abre Disciplinas, K abre Kanban, C abre Calendário. Pressione ? para ver todos.',
    color: '#06b6d4',
    tip: 'No mobile, deslize horizontalmente para mudar de página.',
  },
  {
    id: 'done',
    emoji: '🚀',
    title: 'Tudo pronto!',
    desc: 'Você já sabe tudo. Agora é só usar. Bons estudos e que a média seja com você! 🎓',
    color: '#22c55e',
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
