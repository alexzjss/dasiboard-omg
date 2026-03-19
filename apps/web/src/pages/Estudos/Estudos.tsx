import { useState } from 'react'
import { useEstudos, StudyMaterial } from '../../api/hooks'
import { PageHeader, Spinner, EmptyState, Badge } from '../../components/ui/index'
import { useDebounce } from '../../hooks/index'

const TYPE_ICONS: Record<string, string> = {
  livro:'📗', artigo:'📄', video:'🎬', curso:'🎓', link:'🔗', pdf:'📕',
}

export default function Estudos() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [area, setArea] = useState('')
  const debouncedQ = useDebounce(q, 300)
  const { data: materials = [], isLoading } = useEstudos({
    q: debouncedQ || undefined,
    type: type || undefined,
    area: area || undefined,
  })

  const areas = [...new Set(materials.map((m) => m.area).filter(Boolean))] as string[]
  const types = ['livro','artigo','video','curso','link','pdf']

  return (
    <div>
      <PageHeader eyebrow="Materiais & Recursos" title="Estudos" description="Documentos, links e cursos organizados por área e disciplina" />

      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }} className="anim-fade-up stagger-2">
        <input className="s-input" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Buscar por título, área, disciplina..." style={{ flex:1, minWidth:200 }} />
        <select className="s-input" value={type} onChange={(e)=>setType(e.target.value)} style={{ width:140 }}>
          <option value="">Todos os tipos</option>
          {types.map((t)=><option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
        <select className="s-input" value={area} onChange={(e)=>setArea(e.target.value)} style={{ width:180 }}>
          <option value="">Todas as áreas</option>
          {areas.map((a)=><option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {isLoading ? <Spinner text="Carregando materiais..." /> :
       materials.length === 0 ? <EmptyState icon="📚" title="Nenhum material encontrado" /> : (
        <div className="estudos-grid anim-fade-up stagger-3">
          {materials.map((m)=><MaterialCard key={m.id} m={m} />)}
        </div>
      )}

      <style>{`
        .s-input { background:var(--glass); border:1px solid var(--glass-border); border-radius:8px; padding:9px 12px; color:var(--text); font-size:13px; }
        .s-input:focus { outline:none; border-color:var(--primary); }
        .s-input::placeholder { color:var(--text-dim); }
        .estudos-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
      `}</style>
    </div>
  )
}

function MaterialCard({ m }: { m: StudyMaterial }) {
  return (
    <div style={{ background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:12, padding:16 }}>
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <span style={{ fontSize:24 }}>{TYPE_ICONS[m.type] ?? '📄'}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', lineHeight:1.3 }}>{m.title}</div>
          {m.author && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{m.author}</div>}
        </div>
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
        {m.area && <Badge color="primary">{m.area}</Badge>}
        {m.discipline && <Badge color="default">{m.discipline}</Badge>}
        {m.tags.slice(0,3).map((t)=><Badge key={t} color="default">{t}</Badge>)}
      </div>
      {(m.url || m.fileUrl) && (
        <a href={m.fileUrl ?? m.url!} target="_blank" rel="noopener noreferrer"
          style={{ fontSize:12, color:'var(--primary)', textDecoration:'none', fontWeight:500 }}>
          {m.fileUrl ? 'Baixar PDF ↗' : 'Acessar ↗'}
        </a>
      )}
    </div>
  )
}
