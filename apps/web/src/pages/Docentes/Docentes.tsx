import { useState } from 'react'
import { useDocentes, Docente } from '../../api/hooks'
import { PageHeader, Spinner, EmptyState } from '../../components/ui/index'
import { useDebounce } from '../../hooks/index'
import { initials } from '../../utils/index'

export default function Docentes() {
  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 300)
  const { data: docentes = [], isLoading } = useDocentes(debouncedQ || undefined)

  return (
    <div>
      <PageHeader eyebrow="Corpo docente" title="Docentes" description="Professores do Bacharelado em Sistemas de Informação — USP/EACH" />

      <div className="search-wrap anim-fade-up stagger-2">
        <span className="search-icon">🔍</span>
        <input
          className="search-input" value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, área ou e-mail..."
        />
      </div>

      {isLoading ? <Spinner text="Carregando docentes..." /> :
       docentes.length === 0 ? <EmptyState icon="👩‍🏫" title="Nenhum docente encontrado" /> : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
            {docentes.length} {docentes.length === 1 ? 'docente' : 'docentes'}
          </div>
          <div className="docentes-grid anim-fade-up stagger-3">
            {docentes.map((d) => <DocenteCard key={d.id} d={d} />)}
          </div>
        </>
      )}

      <style>{`
        .search-wrap { position:relative; margin-bottom:24px; }
        .search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:14px; }
        .search-input { width:100%; background:var(--glass); border:1px solid var(--glass-border); border-radius:10px; padding:10px 14px 10px 36px; color:var(--text); font-size:14px; }
        .search-input:focus { outline:none; border-color:var(--primary); }
        .search-input::placeholder { color:var(--text-dim); }
        .docentes-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px; }
      `}</style>
    </div>
  )
}

function DocenteCard({ d }: { d: Docente }) {
  const abbr = initials(d.name)
  return (
    <div className="doc-card">
      <div className="doc-avatar">
        {d.photoUrl
          ? <img src={d.photoUrl} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span>{abbr}</span>}
      </div>
      <div className="doc-info">
        <div className="doc-name">{d.name}</div>
        {d.title && <div className="doc-title">{d.title}</div>}
        {d.area && <div className="doc-area">{d.area}</div>}
        <div className="doc-links">
          {d.email && <a href={`mailto:${d.email}`} className="doc-link">✉️ {d.email}</a>}
          {d.lattes && <a href={d.lattes} target="_blank" rel="noopener noreferrer" className="doc-link">📄 Lattes</a>}
          {d.site && <a href={d.site} target="_blank" rel="noopener noreferrer" className="doc-link">🌐 Site</a>}
        </div>
      </div>
      <style>{`
        .doc-card { display:flex; gap:14px; padding:16px; background:var(--glass); border:1px solid var(--glass-border); border-radius:12px; transition:border-color .15s; }
        .doc-card:hover { border-color:var(--border); }
        .doc-avatar { width:52px; height:52px; border-radius:50%; background:linear-gradient(135deg,var(--primary),var(--accent)); display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:white; flex-shrink:0; overflow:hidden; }
        .doc-info { flex:1; min-width:0; }
        .doc-name { font-size:14px; font-weight:600; color:var(--text); }
        .doc-title { font-size:12px; color:var(--text-muted); margin-top:1px; }
        .doc-area { font-size:12px; color:var(--primary); margin-top:2px; }
        .doc-links { display:flex; flex-direction:column; gap:2px; margin-top:6px; }
        .doc-link { font-size:11px; color:var(--text-muted); text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .doc-link:hover { color:var(--primary); }
      `}</style>
    </div>
  )
}
