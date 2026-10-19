import { useState } from 'react'
import { markOnboardingDone } from '../lib/storage'

const ONBOARDING_STEPS = [
  {
    icon: '🌌',
    title: 'Bem-vindo ao daSIboard',
    body: 'Seu painel acadêmico para o curso de Sistemas de Informação da EACH/USP. Tudo em um só lugar, no seu estilo.',
    cta: 'Próximo',
  },
  {
    icon: '📅',
    title: 'Sua grade, sempre à mão',
    body: 'Conecte seu JupiterWeb e veja sua grade horária automaticamente organizada por dia. Sem copiar, sem confusão.',
    cta: 'Próximo',
  },
  {
    icon: '📚',
    title: 'Explore o curso',
    body: 'Veja todas as disciplinas obrigatórias e optativas, pré-requisitos e materiais disponíveis no DriveEACH.',
    cta: 'Próximo',
  },
  {
    icon: '🏛️',
    title: 'Conheça as entidades',
    body: 'DASI, PET-SI, Síntese Jr., Hype USP e muito mais. Acompanhe as publicações e fique por dentro do que acontece.',
    cta: 'Começar',
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

  return (
    <div className={`onboarding-overlay${exiting ? ' onboarding-exit' : ''}`} role="dialog" aria-modal="true" aria-label="Boas-vindas ao daSIboard">
      <div className="onboarding-panel">
        <div className="onboarding-icon" aria-hidden="true">{current.icon}</div>
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
