import { useState } from 'react'
import { DRIVE_URLS, obrigatoriasData, optativasData } from './data'
import { DisciplinasGraph } from './DisciplinasGraph'

export function DisciplinasPage() {
  const [section, setSection] = useState<'obrigatorias' | 'optativas'>('obrigatorias')
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list')
  const periods = section === 'obrigatorias' ? obrigatoriasData : optativasData

  return <main className="app-shell disc-shell">
    <div className="disc-content">
      <section className="disc-heading">
        <div><p className="eyebrow">SISTEMAS DE INFORMAÇÃO · EACH/USP</p><h1>Disciplinas<span>.</span></h1><p className="disc-caption">Grade curricular do curso.</p></div>
      </section>
      <div className="disc-controls">
        <div className="disc-tabs">
          <button className={`disc-tab${section === 'obrigatorias' ? ' active' : ''}`} onClick={() => setSection('obrigatorias')}>Obrigatórias</button>
          <button className={`disc-tab${section === 'optativas' ? ' active' : ''}`} onClick={() => setSection('optativas')}>Optativas Eletivas</button>
        </div>
        <div className="disc-view-toggle">
          <button className={`disc-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="Visualização em lista">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>
            Lista
          </button>
          <button
            className={`disc-view-btn${viewMode === 'graph' ? ' active' : ''}`}
            onClick={() => setViewMode('graph')}
            title="Visualização em grafo"
            disabled={section === 'optativas'}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="3" cy="8" r="1.8"/><circle cx="13" cy="4" r="1.8"/><circle cx="13" cy="12" r="1.8"/><line x1="4.8" y1="7.1" x2="11.2" y2="4.9"/><line x1="4.8" y1="8.9" x2="11.2" y2="11.1"/></svg>
            Grafo
          </button>
        </div>
      </div>

      {viewMode === 'graph' && section === 'obrigatorias'
        ? <DisciplinasGraph periods={periods} />
        : <div className="disc-periods">
            {periods.map((period) => (
              <section key={period.label} className="disc-period">
                <h2 className="disc-period-label">{period.label}</h2>
                <div className="disc-list">
                  {period.disciplines.map((disc) => {
                    const driveUrl = DRIVE_URLS[disc.code]
                    return (
                    <article
                      key={disc.code}
                      className={`disc-card${driveUrl ? ' disc-card-linked' : ''}`}
                      onClick={driveUrl ? () => window.open(driveUrl, '_blank', 'noopener') : undefined}
                      role={driveUrl ? 'link' : undefined}
                      tabIndex={driveUrl ? 0 : undefined}
                      onKeyDown={driveUrl ? (e) => e.key === 'Enter' && window.open(driveUrl, '_blank', 'noopener') : undefined}
                      title={driveUrl ? `Abrir ${disc.name} no DriveEACH` : undefined}
                    >
                      <div className="disc-card-main">
                        <span className="disc-code">{disc.code}</span>
                        <span className="disc-name">{disc.name}</span>
                        <div className="disc-badges">
                          {driveUrl && (
                            <span className="disc-badge disc-badge-drive" title="Material disponível no DriveEACH">
                              <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7M7 1h4v4M11 1 5.5 6.5"/></svg>
                              Drive
                            </span>
                          )}
                          <span className="disc-badge disc-badge-aula" title="Créditos Aula">{disc.credAula}A</span>
                          <span className="disc-badge disc-badge-trab" title="Créditos Trabalho">{disc.credTrab}T</span>
                          <span className="disc-badge disc-badge-ch" title="Carga horária">{disc.ch}h</span>
                          {disc.ce != null && disc.ce > 0 && <span className="disc-badge disc-badge-ce" title="Carga horária de Estágio">CE {disc.ce}h</span>}
                          {disc.cp != null && disc.cp > 0 && <span className="disc-badge disc-badge-cp" title="Práticas como Componentes Curriculares">CP {disc.cp}h</span>}
                          {disc.ext != null && disc.ext > 0 && <span className="disc-badge disc-badge-ext" title="Atividades Extensionistas">EXT {disc.ext}h</span>}
                        </div>
                      </div>
                      {disc.prereqs && disc.prereqs.length > 0 && (
                        <div className="disc-prereqs">
                          {disc.prereqs.map((req) => (
                            <span key={req.code} className={`disc-prereq${req.type === 'Requisito' ? ' strong' : ''}`}>
                              {req.code} — {req.name} <em>{req.type}</em>
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
      }
    </div>
  </main>
}
