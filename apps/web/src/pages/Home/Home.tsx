import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useEvents, useKanbanBoard, useGPA, useNewsletter } from '../../api/hooks'
import { PageHeader, Card, Spinner, EmptyState } from '../../components/ui/index'
import { greeting, formatDate, todayISO } from '../../utils/index'

const QUICK_NAV = [
  { to: '/calendar', label: 'Calendário', emoji: '📅' },
  { to: '/schedule', label: 'Horários', emoji: '🗓️' },
  { to: '/kanban', label: 'Kanban', emoji: '📋' },
  { to: '/estudos', label: 'Estudos', emoji: '📚' },
  { to: '/notas-gpa', label: 'GPA', emoji: '📈' },
  { to: '/ferramentas', label: 'Ferramentas', emoji: '🛠️' },
]

const EVENT_COLORS: Record<string, string> = {
  prova: 'var(--danger)', entrega: 'var(--warning)',
  evento: 'var(--success)', deadline: '#fb923c', apresentacao: 'var(--info)',
}

export default function Home() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const { data: events, isLoading: eventsLoading } = useEvents()
  const { data: board } = useKanbanBoard()
  const { data: gpaData } = useGPA()
  const { data: newsletters } = useNewsletter()

  const todayIso = todayISO()
  const upcoming = (events ?? [])
    .filter((e) => e.date.slice(0, 10) >= todayIso)
    .slice(0, 5)

  const pendingCount = board ? board.todo.length + board.doing.length : null
  const latestNewsletter = newsletters?.[0]

  const heroDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div>
      {/* Hero */}
      <div className="home-hero anim-fade-up stagger-1">
        <div className="hero-eyebrow">
          <span className="hero-greeting">{greeting()}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}</span>
          <span className="hero-dot">·</span>
          <span className="hero-date">{heroDate}</span>
        </div>
        <h2 className="hero-title">Seu espaço <span style={{ color: 'var(--primary)' }}>acadêmico</span></h2>
        <p className="hero-desc">Calendário, horários, Kanban, materiais e ferramentas em um só lugar.</p>
      </div>

      {/* Quick nav */}
      <div className="quick-nav anim-fade-up stagger-2">
        {QUICK_NAV.map((item) => (
          <button key={item.to} className="quick-btn" onClick={() => navigate(item.to)}>
            <span className="quick-emoji">{item.emoji}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="stat-grid anim-fade-up stagger-2">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{upcoming.length}</div>
          <div className="stat-label">Próximos eventos</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-value">8</div>
          <div className="stat-label">Semestres do curso</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{pendingCount ?? '—'}</div>
          <div className="stat-label">Tarefas pendentes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-value">{gpaData?.gpa != null ? gpaData.gpa.toFixed(1) : '—'}</div>
          <div className="stat-label">Média geral (GPA)</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="home-grid anim-fade-up stagger-3">
        {/* Upcoming events */}
        <div className="home-col-main">
          <div className="section-title">📅 Próximos eventos</div>
          {eventsLoading ? (
            <Spinner text="Carregando eventos..." />
          ) : upcoming.length === 0 ? (
            <EmptyState icon="🗓️" title="Nenhum evento próximo" />
          ) : (
            <div className="event-list">
              {upcoming.map((ev) => (
                <div key={ev.id} className="event-item">
                  <div className="event-dot" style={{ background: EVENT_COLORS[ev.type] ?? 'var(--text-dim)' }} />
                  <div className="event-info">
                    <div className="event-title">{ev.title}</div>
                    {ev.description && <div className="event-desc">{ev.description}</div>}
                  </div>
                  <div className="event-date">{formatDate(ev.date)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Kanban peek */}
          {board && (board.todo.length + board.doing.length) > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 28 }}>📋 Tarefas pendentes</div>
              <div className="kanban-peek">
                {[...board.todo, ...board.doing].slice(0, 4).map((card) => (
                  <div key={card.id} className="peek-card">
                    <div className="peek-col" style={{
                      background: card.column === 'todo' ? 'rgba(248,113,113,.15)' : 'rgba(251,191,36,.15)',
                      color: card.column === 'todo' ? 'var(--danger)' : 'var(--warning)',
                    }}>
                      {card.column === 'todo' ? 'A fazer' : 'Em andamento'}
                    </div>
                    <span className="peek-title">{card.title}</span>
                  </div>
                ))}
              </div>
              <button className="btn-link" onClick={() => navigate('/kanban')}>
                Ver quadro completo →
              </button>
            </>
          )}
        </div>

        {/* Side column */}
        <div className="home-col-side">
          {latestNewsletter && (
            <>
              <div className="section-title">📧 Última newsletter</div>
              <Card>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
                  {formatDate(latestNewsletter.publishedAt)}
                  {latestNewsletter.entidade && ` · ${latestNewsletter.entidade.emoji} ${latestNewsletter.entidade.name}`}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>
                  {latestNewsletter.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {latestNewsletter.summary}
                </div>
                <button
                  className="btn-link"
                  style={{ marginTop: 12 }}
                  onClick={() => navigate('/newsletter')}
                >
                  Ler newsletter →
                </button>
              </Card>
            </>
          )}

          {!user && (
            <>
              <div className="section-title" style={{ marginTop: 20 }}>👤 Conta</div>
              <Card>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                  Faça login para sincronizar seu Kanban, notas e faltas em qualquer dispositivo.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="auth-btn-sm" onClick={() => navigate('/login')}>Entrar</button>
                  <button className="auth-btn-sm auth-btn-sm--ghost" onClick={() => navigate('/signup')}>Criar conta</button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      <style>{`
        .home-hero { margin-bottom: 24px; }
        .hero-eyebrow {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: var(--text-muted); margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .hero-greeting { color: var(--primary); font-weight: 500; }
        .hero-dot { color: var(--text-dim); }
        .hero-title { font-size: 32px; font-weight: 800; color: var(--text); line-height: 1.2; margin-bottom: 8px; }
        .hero-desc { font-size: 15px; color: var(--text-muted); }

        .quick-nav {
          display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px;
        }
        .quick-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 10px; padding: 8px 14px; cursor: pointer;
          color: var(--text-muted); font-size: 13px; transition: all 0.15s;
        }
        .quick-btn:hover { color: var(--text); background: var(--glass-border); }
        .quick-emoji { font-size: 15px; }

        .stat-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 12px; margin-bottom: 28px;
        }
        .stat-card {
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 12px; padding: 16px; text-align: center;
        }
        .stat-icon { font-size: 22px; margin-bottom: 6px; }
        .stat-value { font-size: 24px; font-weight: 700; color: var(--text); }
        .stat-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

        .home-grid {
          display: grid; grid-template-columns: 1fr 340px; gap: 24px;
        }
        .section-title {
          font-size: 12px; font-weight: 600; color: var(--text-muted);
          margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
        }
        .event-list { display: flex; flex-direction: column; gap: 8px; }
        .event-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px; background: var(--glass);
          border: 1px solid var(--glass-border); border-radius: 10px;
        }
        .event-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .event-info { flex: 1; min-width: 0; }
        .event-title { font-size: 13px; font-weight: 500; color: var(--text); }
        .event-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .event-date { font-size: 11px; color: var(--text-dim); white-space: nowrap; flex-shrink: 0; }

        .kanban-peek { display: flex; flex-direction: column; gap: 6px; }
        .peek-card {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; background: var(--glass);
          border: 1px solid var(--glass-border); border-radius: 8px;
        }
        .peek-col {
          font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; flex-shrink: 0;
        }
        .peek-title { font-size: 13px; color: var(--text); }
        .btn-link {
          background: none; border: none; color: var(--primary); font-size: 13px;
          cursor: pointer; padding: 6px 0; display: block;
        }
        .btn-link:hover { text-decoration: underline; }
        .auth-btn-sm {
          background: var(--primary); color: white; border: none;
          border-radius: 8px; padding: 8px 16px; font-size: 13px;
          font-weight: 600; cursor: pointer; transition: filter 0.15s;
        }
        .auth-btn-sm:hover { filter: brightness(1.15); }
        .auth-btn-sm--ghost {
          background: var(--glass); color: var(--text-muted);
          border: 1px solid var(--glass-border);
        }
        .auth-btn-sm--ghost:hover { color: var(--text); background: var(--glass-border); filter: none; }

        @media (max-width: 900px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .home-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .hero-title { font-size: 24px; }
        }
      `}</style>
    </div>
  )
}
