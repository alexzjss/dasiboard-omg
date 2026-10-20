import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, type ConnectionState, type PeopleFilters } from '../../../lib/socialApi'
import { entidadesData } from '../../entidades/data'
import { usePeople } from '../hooks/usePeople'
import { PersonCardView } from './PersonCardView'

const DEBOUNCE_MS = 300
const CURRENT_YEAR = new Date().getFullYear()

function filtersFromParams(p: URLSearchParams): PeopleFilters {
  const f: PeopleFilters = {}
  const q = p.get('q')?.trim(); if (q) f.q = q
  const curso = p.get('curso')?.trim(); if (curso) f.curso = curso
  const ano = Number(p.get('ano')); if (Number.isInteger(ano) && ano > 0) f.ano = ano
  const entidade = p.get('entidade'); if (entidade) f.entidade = entidade
  const materia = p.get('materia')?.trim().toUpperCase(); if (materia) f.materia = materia
  return f
}

function AlunosInner({ onRetry }: { onRetry: () => void }) {
  const [params, setParams] = useSearchParams()
  const filters = filtersFromParams(params)
  const { people, hasMore, loading, loadingMore, error, loadMore } = usePeople(filters)

  // Campos de texto têm rascunho local e só chegam à URL depois de 300ms parados.
  const [draft, setDraft] = useState({ q: params.get('q') ?? '', curso: params.get('curso') ?? '', materia: params.get('materia') ?? '' })
  const [overrides, setOverrides] = useState<Record<string, ConnectionState>>({})
  const filtersKey = JSON.stringify(filters)
  const lastKey = useRef(filtersKey)
  useEffect(() => {
    if (lastKey.current !== filtersKey) { lastKey.current = filtersKey; setOverrides({}) }
  }, [filtersKey])

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        let changed = false
        for (const [k, v] of Object.entries(draft)) {
          const clean = v.trim()
          if ((prev.get(k) ?? '') !== clean) { changed = true; if (clean) next.set(k, clean); else next.delete(k) }
        }
        return changed ? next : prev
      }, { replace: true })
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [draft, setParams])

  function setParam(key: string, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value); else next.delete(key)
      return next
    }, { replace: true })
  }

  const hasFilters = Object.keys(filters).length > 0
  function clearFilters() {
    setDraft({ q: '', curso: '', materia: '' })
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const k of ['q', 'curso', 'ano', 'entidade', 'materia']) next.delete(k)
      return next
    }, { replace: true })
  }

  const errorMessage = error instanceof ApiError ? error.message : 'Não deu pra carregar a lista de alunos.'
  const retry = onRetry

  return (
    <div>
      <form className="com-filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="com-field com-field-wide">
          <span className="com-label">Buscar por nome</span>
          <input type="search" className="com-input" placeholder="Nome do colega" value={draft.q} maxLength={60}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} />
        </label>
        <label className="com-field">
          <span className="com-label">Curso</span>
          <input type="text" className="com-input" placeholder="Ex.: Sistemas de Informação" value={draft.curso} maxLength={80}
            onChange={(e) => setDraft((d) => ({ ...d, curso: e.target.value }))} />
        </label>
        <label className="com-field com-field-narrow">
          <span className="com-label">Ingresso</span>
          <input type="number" inputMode="numeric" className="com-input mono" placeholder="2024" min={1934} max={CURRENT_YEAR}
            value={params.get('ano') ?? ''} onChange={(e) => setParam('ano', e.target.value)} />
        </label>
        <label className="com-field">
          <span className="com-label">Entidade</span>
          <select className="com-input" value={params.get('entidade') ?? ''} onChange={(e) => setParam('entidade', e.target.value)}>
            <option value="">Todas</option>
            {entidadesData.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label className="com-field com-field-narrow">
          <span className="com-label">Matéria</span>
          <input type="text" className="com-input mono" placeholder="ACH2023" value={draft.materia} maxLength={12}
            onChange={(e) => setDraft((d) => ({ ...d, materia: e.target.value.toUpperCase() }))} />
        </label>
        {hasFilters && <button type="button" className="com-linkbtn com-clear" onClick={clearFilters}>Limpar filtros</button>}
      </form>

      <div aria-live="polite" className="com-status">
        {!loading && !error && people.length > 0 && <span className="sr-only">{people.length} alunos na lista</span>}
      </div>

      {loading && (
        <ul className="com-grid" aria-busy="true" aria-label="Carregando alunos">
          {Array.from({ length: 6 }, (_, i) => <li key={i} className="com-card com-skeleton" />)}
        </ul>
      )}

      {!loading && error != null && people.length === 0 && (
        <div className="com-empty" role="alert">
          <p>{errorMessage}</p>
          <button type="button" className="com-btn" onClick={retry}>Tentar de novo</button>
        </div>
      )}

      {!loading && !error && people.length === 0 && (
        <div className="com-empty">
          <p>{hasFilters ? 'Ninguém encontrado com esses filtros.' : 'Ainda não tem outros alunos por aqui.'}</p>
          <p className="com-muted">{hasFilters ? 'Tente outro nome ou limpe os filtros pra ver todo mundo.' : 'Convide colegas pra entrar no daSIboard.'}</p>
          {hasFilters && <button type="button" className="com-btn" onClick={clearFilters}>Limpar filtros</button>}
        </div>
      )}

      {!loading && people.length > 0 && (
        <>
          <ul className="com-grid">
            {people.map((p) => (
              <PersonCardView key={p.handle} person={{ ...p, connection: overrides[p.handle] ?? p.connection }}
                onConnection={(handle, next) => setOverrides((o) => ({ ...o, [handle]: next }))} />
            ))}
          </ul>
          {error != null && <p className="com-muted" role="alert">{errorMessage}</p>}
          {hasMore && (
            <div className="com-more">
              <button type="button" className="com-btn" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? 'Carregando…' : error != null ? 'Tentar de novo' : 'Carregar mais'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** A chave força uma nova busca quando o usuário pede "tentar de novo". */
export function AlunosTab() {
  const [attempt, setAttempt] = useState(0)
  return <AlunosInner key={attempt} onRetry={() => setAttempt((n) => n + 1)} />
}
