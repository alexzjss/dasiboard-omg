import { useState } from 'react'
import { ALL_COURSES, DOC_PAGE_SIZE, docentesData } from './data'

export function DocentesPage() {
  const [query, setQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(DOC_PAGE_SIZE)

  const filtered = docentesData.filter((d) => {
    const matchName = d.nome.toLowerCase().includes(query.toLowerCase())
    const matchCourse = selectedCourse === '' || d.curso === selectedCourse
    return matchName && matchCourse
  })

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  function handleFilterChange(newQuery: string, newCourse: string) {
    setQuery(newQuery); setSelectedCourse(newCourse)
    setExpandedRow(null); setVisibleCount(DOC_PAGE_SIZE)
  }


  return <main className="app-shell doc-shell">
    <div className="doc-content">
      <section className="doc-heading">
        <h1>Docentes</h1>
        <p className="doc-caption">Docentes da EACH em ordem alfabética. Toca num nome pra ver contato, sala e linha de pesquisa.</p>
      </section>

      <div className="doc-controls">
        <div className="doc-search-wrap">
          <svg className="doc-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>
          <input
            className="doc-search"
            type="search"
            placeholder="Pesquisar por nome…"
            value={query}
            onChange={(e) => handleFilterChange(e.target.value, selectedCourse)}
            aria-label="Pesquisar docente por nome"
          />
        </div>
        <select
          className="doc-select"
          value={selectedCourse}
          onChange={(e) => handleFilterChange(query, e.target.value)}
          aria-label="Filtrar por curso"
        >
          <option value="">Todos os cursos</option>
          {ALL_COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <p className="doc-count" aria-live="polite">
        {filtered.length} docente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        {hasMore && <span className="doc-count-showing"> · mostrando {visibleCount}</span>}
      </p>

      <div className="doc-list" role="list">
        {visible.length === 0
          ? <p className="doc-empty">Ninguém por aqui com esses filtros. Tenta outro nome ou curso.</p>
          : visible.map((d) => {
              const isOpen = expandedRow === d.nome
              return <article key={d.nome} className={`doc-card${isOpen ? ' open' : ''}`} role="listitem">
                <button
                  className="doc-card-trigger"
                  onClick={() => setExpandedRow(isOpen ? null : d.nome)}
                  aria-expanded={isOpen}
                  aria-controls={`doc-detail-${d.nome.replace(/\s+/g, '-')}`}
                >
                  <div className="doc-avatar" aria-hidden="true">{d.nome.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}</div>
                  <div className="doc-card-info">
                    <strong className="doc-name">{d.nome}</strong>
                    <span className="doc-course">{d.curso}</span>
                  </div>
                  <svg className="doc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {isOpen && <div className="doc-detail" id={`doc-detail-${d.nome.replace(/\s+/g, '-')}`} role="region" aria-label={`Detalhes de ${d.nome}`}>
                  <dl className="doc-detail-grid">
                    {d.email && <><dt>E-mail</dt><dd><a href={`mailto:${d.email}`} className="doc-link">{d.email}</a></dd></>}
                    {d.sala && <><dt>Sala</dt><dd className="mono">{d.sala}</dd></>}
                    {d.telefone && <><dt>Telefone</dt><dd className="mono">{d.telefone}</dd></>}
                    {d.pesquisa && <><dt>Linha de Pesquisa</dt><dd className="doc-pesquisa">{d.pesquisa}</dd></>}
                  </dl>
                  <div className="doc-detail-links">
                    <a href={d.lattes} className="doc-badge-link" target="_blank" rel="noopener noreferrer">Currículo Lattes ↗</a>
                  </div>
                </div>}
              </article>
            })
        }
      </div>

      {hasMore && (
        <button className="doc-load-more" onClick={() => setVisibleCount(c => c + DOC_PAGE_SIZE)}>
          Ver mais {Math.min(DOC_PAGE_SIZE, filtered.length - visibleCount)} docentes
        </button>
      )}
    </div>
  </main>
}


