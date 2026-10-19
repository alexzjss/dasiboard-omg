import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { entidadesData, entidadeSlug, findEntidadeBySlug } from './data'
import { EntidadeDetail } from './EntidadeDetail'
import { useNebulaAccent } from './useNebulaAccent'

export function EntidadesPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const selected = findEntidadeBySlug(slug) ?? null

  useNebulaAccent(selected ? selected.accentColor : null)

  if (slug && !selected) return <Navigate to="/entidades" replace />

  return (
    <main className="app-shell ent-shell">
      <div className="ent-content">
        <section className="ent-heading">
          <h1>Entidades</h1>
          <p className="ent-caption">Grupos, coletivos e empresas juniores que movimentam SI. Escolhe um pra ver as novidades.</p>
        </section>
        <div className="ent-grid">
          {entidadesData.map((e) => (
            <button
              key={e.id}
              id={`ent-card-${entidadeSlug(e)}`}
              className="ent-card"
              style={{ '--ent-accent': e.accentColor, '--ent-bg': e.bgColor } as React.CSSProperties}
              onClick={() => navigate(`/entidades/${entidadeSlug(e)}`)}
              aria-label={`Ver detalhes de ${e.name}`}
            >
              <img src={e.logo} alt={`Logo ${e.name}`} className="ent-card-logo" />
              <div className="ent-card-info">
                <strong className="ent-card-name">{e.name}</strong>
                <span className="ent-card-type">{e.type}</span>
                <span className="ent-card-full">{e.fullName}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      {selected && <EntidadeDetail key={selected.id} entidade={selected} onClose={() => navigate('/entidades')} />}
    </main>
  )
}
