import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { entidadesData, entidadeSlug, findEntidadeBySlug } from './data'
import { InstagramEmbed } from './InstagramEmbed'
import { useNebulaAccent } from './useNebulaAccent'

export function EntidadesPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const selected = findEntidadeBySlug(slug) ?? null

  useNebulaAccent(selected ? selected.accentColor : null)

  if (slug && !selected) return <Navigate to="/entidades" replace />

  if (selected) {
    return (
      <main className="app-shell ent-shell" style={{ '--ent-accent': selected.accentColor, '--ent-bg': selected.bgColor } as React.CSSProperties}>
        <div className="ent-detail-content">
          <button className="ent-back-btn" onClick={() => navigate('/entidades')} aria-label="Voltar para entidades">
            <Icon name="arrow" />
            <span>Entidades</span>
          </button>
          <div className="ent-detail-hero">
            <div className="ent-detail-logo-wrap">
              <img src={selected.logo} alt={`Logo ${selected.name}`} className="ent-detail-logo" />
            </div>
            <div>
              <p className="section-label ent-eyebrow">{selected.type}</p>
              <h1 className="ent-detail-title">{selected.name}</h1>
              <p className="ent-detail-full">{selected.fullName}</p>
            </div>
          </div>

          <div className="ent-ig-section">
            <h2 className="section-label">No Instagram</h2>
            <InstagramEmbed url={selected.instagram} name={selected.name} />
          </div>
        </div>
      </main>
    )
  }

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
              <div className="ent-card-arrow">
                <Icon name="arrow" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
