import { useState } from 'react'
import { useNewsletter, useNewsletterIssue, NewsletterIssue } from '../../api/hooks'
import { PageHeader, Spinner, Modal, EmptyState } from '../../components/ui/index'

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function Newsletter() {
  const { data: issues = [], isLoading } = useNewsletter()
  const [selectedId, setSelectedId] = useState<string>('')
  const { data: fullIssue } = useNewsletterIssue(selectedId)

  const featured = issues[0]
  const archive  = issues.slice(1)

  return (
    <div>
      <PageHeader eyebrow="Informações & Atualizações" title="Newsletter" description="Últimas notícias do curso, eventos e oportunidades" />

      {isLoading ? <Spinner text="Carregando..." /> : issues.length === 0 ? (
        <EmptyState icon="📭" title="Nenhuma newsletter ainda" />
      ) : (
        <>
          {/* Featured */}
          {featured && (
            <div className="nl-featured anim-fade-up stagger-2">
              {featured.entidade && (
                <div className="nl-from">{featured.entidade.emoji} {featured.entidade.name}</div>
              )}
              <div className="nl-date">{fmt(featured.publishedAt)}</div>
              <h2 className="nl-title">{featured.title}</h2>
              <p className="nl-summary">{featured.summary}</p>
              <button className="nl-read-btn" onClick={() => setSelectedId(featured.id)}>
                Ler artigo completo →
              </button>
            </div>
          )}

          {/* Archive */}
          {archive.length > 0 && (
            <>
              <div className="section-label anim-fade-up stagger-3">Arquivo</div>
              <div className="nl-list anim-fade-up stagger-3">
                {archive.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} onRead={() => setSelectedId(issue.id)} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Modal */}
      <Modal open={!!selectedId} onClose={() => setSelectedId('')} maxWidth={640}>
        {fullIssue ? (
          <div style={{ padding: 4 }}>
            {fullIssue.entidade && <div className="nl-from">{fullIssue.entidade.emoji} {fullIssue.entidade.name}</div>}
            <div className="nl-date" style={{ marginBottom: 8 }}>{fmt(fullIssue.publishedAt)}</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>{fullIssue.title}</h2>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{fullIssue.content}</div>
          </div>
        ) : <Spinner />}
      </Modal>

      <style>{`
        .nl-featured { background:var(--glass); border:1px solid var(--glass-border); border-radius:16px; padding:28px; margin-bottom:32px; }
        .nl-from { font-size:12px; font-weight:600; color:var(--primary); margin-bottom:6px; }
        .nl-date { font-size:12px; color:var(--text-dim); margin-bottom:8px; }
        .nl-title { font-size:22px; font-weight:700; color:var(--text); margin-bottom:10px; line-height:1.3; }
        .nl-summary { font-size:14px; color:var(--text-muted); line-height:1.6; margin-bottom:16px; }
        .nl-read-btn { background:var(--primary); color:white; border:none; border-radius:8px; padding:9px 18px; font-size:13px; font-weight:600; cursor:pointer; transition:filter .15s; }
        .nl-read-btn:hover { filter:brightness(1.15); }
        .section-label { font-size:11px; font-weight:600; color:var(--text-dim); text-transform:uppercase; letter-spacing:.08em; margin-bottom:12px; }
        .nl-list { display:flex; flex-direction:column; gap:8px; }
      `}</style>
    </div>
  )
}

function IssueRow({ issue, onRead }: { issue: NewsletterIssue; onRead: () => void }) {
  return (
    <button className="nl-row" onClick={onRead}>
      <div style={{ flex: 1, textAlign: 'left' }}>
        {issue.entidade && <div style={{ fontSize: 11, color: 'var(--primary)', marginBottom: 2 }}>{issue.entidade.emoji} {issue.entidade.name}</div>}
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{issue.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{issue.summary}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>{new Date(issue.publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</div>
      <style>{`.nl-row { display:flex; align-items:flex-start; gap:16px; padding:14px 16px; background:var(--glass); border:1px solid var(--glass-border); border-radius:10px; cursor:pointer; width:100%; transition:border-color .15s; } .nl-row:hover { border-color:var(--border); }`}</style>
    </button>
  )
}
