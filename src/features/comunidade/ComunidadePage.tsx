import { useRef, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DocentesPage } from '../docentes/DocentesPage'
import { AlunosTab } from './components/AlunosTab'
import { FeedStrip } from './components/FeedStrip'

const TABS = [
  { id: 'alunos', label: 'Alunos' },
  { id: 'docentes', label: 'Docentes' },
] as const
type TabId = (typeof TABS)[number]['id']

export function ComunidadePage() {
  const [params, setParams] = useSearchParams()
  const tab: TabId = params.get('aba') === 'docentes' ? 'docentes' : 'alunos'
  const refs = useRef<Record<TabId, HTMLButtonElement | null>>({ alunos: null, docentes: null })

  function select(id: TabId) {
    // Trocar de aba descarta os filtros da outra, mantendo a URL limpa.
    setParams(id === 'alunos' ? {} : { aba: id })
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = TABS.findIndex((t) => t.id === tab)
    let next = i
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    else return
    e.preventDefault()
    select(TABS[next].id)
    refs.current[TABS[next].id]?.focus()
  }

  return (
    <div className="app-shell com-shell">
      <div className="com-content">
        <header className="com-heading">
          <h1>Comunidade</h1>
          <p className="subtle">Colegas, docentes e o que está rolando entre eles.</p>
        </header>

        <FeedStrip />

        <div className="com-tabs" role="tablist" aria-label="Seções da Comunidade" onKeyDown={onKeyDown}>
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" id={`com-tab-${t.id}`} aria-selected={tab === t.id}
              aria-controls={`com-panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1}
              ref={(el) => { refs.current[t.id] = el }} className="com-tab" onClick={() => select(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`com-panel-${tab}`} aria-labelledby={`com-tab-${tab}`}>
          {tab === 'alunos' ? <AlunosTab /> : <DocentesPage embedded />}
        </div>
      </div>
    </div>
  )
}
