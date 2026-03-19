import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEntidades, useEntidade } from '../../api/hooks'
import { PageHeader, Spinner, EmptyState } from '../../components/ui/index'

export default function Entidades() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const { data: list = [], isLoading: listLoading } = useEntidades()
  const { data: detail, isLoading: detailLoading } = useEntidade(slug ?? '')

  if (slug) {
    return (
      <div>
        <button onClick={() => navigate('/entidades')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:13, display:'flex', alignItems:'center', gap:6, marginBottom:20 }}>
          ← Voltar às entidades
        </button>
        {detailLoading ? <Spinner /> : !detail ? <EmptyState icon="🔍" title="Entidade não encontrada" /> : (
          <div className="anim-fade-up stagger-1">
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:28 }}>
              <div className="ent-emoji-big" style={{ background: detail.colorPrimary ? `${detail.colorPrimary}22` : 'var(--glass)', borderColor: detail.colorPrimary ?? 'var(--glass-border)' }}>
                {detail.emoji}
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:4 }}>{detail.type}</div>
                <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text)', marginBottom:4 }}>{detail.name}</h1>
                {detail.fullName && <div style={{ fontSize:13, color:'var(--text-muted)' }}>{detail.fullName}</div>}
              </div>
            </div>

            {detail.description && (
              <div style={{ fontSize:14, color:'var(--text-muted)', lineHeight:1.7, marginBottom:24, maxWidth:640 }}>{detail.description}</div>
            )}

            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
              {detail.email && <a href={`mailto:${detail.email}`} className="ent-link">✉️ {detail.email}</a>}
              {detail.links.map((l, i) => <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="ent-link">🔗 {l.label}</a>)}
            </div>

            {(detail.events ?? []).length > 0 && (
              <>
                <div className="section-label">Eventos</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
                  {(detail.events ?? []).map((ev) => (
                    <div key={ev.id} style={{ background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'10px 14px' }}>
                      <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{ev.title}</div>
                      <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>{new Date(ev.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(detail.newsletterIssues ?? []).length > 0 && (
              <>
                <div className="section-label">Newsletter</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {(detail.newsletterIssues ?? []).map((n) => (
                    <div key={n.id} style={{ background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:8, padding:'12px 14px' }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{n.title}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{n.summary}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <style>{`.ent-emoji-big { width:64px; height:64px; border-radius:16px; border:1px solid; display:flex; align-items:center; justify-content:center; font-size:32px; flex-shrink:0; } .ent-link { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--text-muted); text-decoration:none; background:var(--glass); border:1px solid var(--glass-border); border-radius:8px; padding:6px 12px; } .ent-link:hover { color:var(--text); } .section-label { font-size:11px; font-weight:600; color:var(--text-dim); text-transform:uppercase; letter-spacing:.08em; margin-bottom:10px; }`}</style>
      </div>
    )
  }

  // Hub
  return (
    <div>
      <PageHeader eyebrow="Ecossistema acadêmico" title="Entidades" description="Grupos, ligas, empresas júniores e programas do curso de SI — USP/EACH" />
      {listLoading ? <Spinner text="Carregando entidades..." /> :
       list.length === 0 ? <EmptyState icon="🏛️" title="Nenhuma entidade cadastrada" /> : (
        <div className="ent-grid anim-fade-up stagger-2">
          {list.map((e) => (
            <button key={e.id} className="ent-card" onClick={() => navigate(`/entidades/${e.slug}`)}
              style={{ '--ec': e.colorPrimary ?? 'var(--primary)' } as React.CSSProperties}>
              <div className="ent-card-top">
                <span className="ent-card-emoji">{e.emoji}</span>
                <span className="ent-card-type">{e.type}</span>
              </div>
              <div className="ent-card-name">{e.name}</div>
              {e.fullName && <div className="ent-card-full">{e.fullName}</div>}
              {e.description && <div className="ent-card-desc">{e.description.slice(0, 100)}…</div>}
            </button>
          ))}
        </div>
      )}
      <style>{`
        .ent-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px; }
        .ent-card { background:var(--glass); border:1px solid var(--glass-border); border-radius:14px; padding:20px; cursor:pointer; text-align:left; transition:all .2s; display:flex; flex-direction:column; gap:6px; }
        .ent-card:hover { border-color:var(--ec, var(--primary)); background:color-mix(in srgb, var(--ec, var(--primary)) 5%, var(--glass)); }
        .ent-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
        .ent-card-emoji { font-size:28px; }
        .ent-card-type { font-size:10px; font-weight:600; padding:2px 7px; border-radius:4px; background:color-mix(in srgb, var(--ec, var(--primary)) 15%, transparent); color:var(--ec, var(--primary)); }
        .ent-card-name { font-size:15px; font-weight:700; color:var(--text); }
        .ent-card-full { font-size:12px; color:var(--text-muted); }
        .ent-card-desc { font-size:12px; color:var(--text-dim); line-height:1.5; }
      `}</style>
    </div>
  )
}
