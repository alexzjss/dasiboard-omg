import { useEffect, useState } from 'react'
import { markOnboardingDone } from '../lib/storage'
import { Icon, type IconName } from './Icon'

const ONBOARDING_STEPS: { icon: IconName; title: string; body: string; cta: string }[] = [
  {
    icon: 'home',
    title: 'Bem-vindo ao daSIboard',
    body: 'Feito por e pra quem estuda SI na EACH. Aqui ficam sua grade, as disciplinas, a comunidade de colegas e docentes e as entidades.',
    cta: 'Próximo',
  },
  {
    icon: 'calendar',
    title: 'Sua grade, na órbita',
    body: 'Coloca os códigos das disciplinas, escolhe a turma e a gente puxa os horários do JupiterWeb. Sem senha e sem copiar horário na mão.',
    cta: 'Próximo',
  },
  {
    icon: 'book',
    title: 'O curso em constelação',
    body: 'Cada disciplina é uma estrela e as linhas mostram os pré-requisitos. Quem tem material no DriveEACH abre direto.',
    cta: 'Próximo',
  },
  {
    icon: 'building',
    title: 'Conhece as entidades',
    body: 'DASI, PET-SI, Síntese Jr., Hype USP e mais. Descobre quem faz o quê no curso.',
    cta: 'Bora',
  },
]

export function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)
  const current = ONBOARDING_STEPS[step]
  const isLast = step === ONBOARDING_STEPS.length - 1

  function advance() {
    if (isLast) {
      setExiting(true)
      setTimeout(() => { markOnboardingDone(); onDone() }, 350)
    } else {
      setStep(s => s + 1)
    }
  }

  function skip() {
    setExiting(true)
    setTimeout(() => { markOnboardingDone(); onDone() }, 350)
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') skip()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  return (
    <div className={`onboarding-overlay${exiting ? ' onboarding-exit' : ''}`} role="dialog" aria-modal="true" aria-label="Boas-vindas ao daSIboard">
      <div className="onboarding-panel">
        <div className="onboarding-icon" aria-hidden="true"><Icon name={current.icon} /></div>
        <div className="onboarding-dots" aria-hidden="true">
          {ONBOARDING_STEPS.map((_, i) => <span key={i} className={`onboarding-dot${i === step ? ' active' : ''}`} />)}
        </div>
        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-body">{current.body}</p>
        <button className="onboarding-cta" onClick={advance}>{current.cta}</button>
        {!isLast && <button className="onboarding-skip" onClick={skip}>Pular introdução</button>}
      </div>
    </div>
  )
}
