import { useEffect, useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import './App.css'

type User = { name: string; email: string; picture?: string }
type ScheduleEntry = { weekday: number; startsAt: string; endsAt: string; title: string; code: string; room: string; building: string }
type IconName = 'home' | 'calendar' | 'book' | 'more' | 'bell' | 'arrow' | 'clock' | 'check' | 'shield'

const developmentHomePath = '/dev/home'
const developmentUser: User = { name: 'Estudante Local', email: 'estudante@usp.br' }

const days = [
  { label: 'Seg', date: '16' }, { label: 'Ter', date: '17' }, { label: 'Qua', date: '18' },
  { label: 'Qui', date: '19' }, { label: 'Sex', date: '20' },
]

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9v10h13V9M9 19v-5h6v5', calendar: 'M5 4h14a2 2 0 0 1 2 2v13H3V6a2 2 0 0 1 2-2ZM8 2v4M16 2v4M3 9h18',
    book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 5.5v16M8 7h8M8 11h8', more: 'M5 12h.01M12 12h.01M19 12h.01',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4', arrow: 'M5 12h14M13 6l6 6-6 6', clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    check: 'm5 12 4 4L19 6', shield: 'M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z',
  }
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>
}

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 40 40" role="presentation">
      <path className="brand-feather" d="M12 12 8 6l8 3M28 12l4-6-8 3" />
      <path className="brand-eye" d="M5 20c4.3-6.4 9.3-9.5 15-9.5S30.7 13.6 35 20c-4.3 6.4-9.3 9.5-15 9.5S9.3 26.4 5 20Z" />
      <circle className="brand-iris" cx="20" cy="20" r="5.5" />
      <circle className="brand-pupil" cx="20" cy="20" r="2.2" />
    </svg>
  </div>
}

function LoginScreen({ onLogin }: { onLogin: (credential: string) => Promise<void> }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [error, setError] = useState('')

  async function handleSuccess(response: CredentialResponse) {
    if (!response.credential) return setError('Não foi possível concluir o login.')
    try { await onLogin(response.credential) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível concluir o login.') }
  }

  return <main className="login-shell">
    <div className="login-glow login-glow-one"></div><div className="login-glow login-glow-two"></div>
    <section className="login-panel">
      <div className="login-brand"><BrandMark /><strong>daSIboard</strong></div>
      <div className="login-copy"><p className="eyebrow">SEU CAMPUS, MAIS PERTO</p><h1>Olá, estudante<span>.</span></h1><p>Entre para acessar sua rotina acadêmica na USP em um só lugar.</p></div>
      <div className="login-action">
        {clientId ? <GoogleLogin onSuccess={handleSuccess} onError={() => setError('O login foi cancelado. Tente novamente.')} useOneTap={false} theme="outline" shape="pill" size="large" text="signin_with" width="320" /> : <div className="setup-message"><Icon name="shield" /><span>Configure `VITE_GOOGLE_CLIENT_ID` para ativar o login Google.</span></div>}
        {error && <p className="login-error" role="alert">{error}</p>}
        <p className="login-note"><Icon name="shield" /> Acesso exclusivo para contas <strong>@usp.br</strong></p>
      </div>
      <p className="login-footer">Ao continuar, você concorda com o uso dos dados necessários para personalizar sua experiência acadêmica.</p>
    </section>
    <div className="login-orbit" aria-hidden="true"><div className="login-orbit-ring ring-a"></div><div className="login-orbit-ring ring-b"></div><div className="login-orbit-core">O</div></div>
  </main>
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [selectedDay, setSelectedDay] = useState('Ter')
  const [activeTab, setActiveTab] = useState('Início')
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [importError, setImportError] = useState('')
  const isImporting = false
  const [jupiterData, setJupiterData] = useState({ codpes: '', password: '', codpgm: '1' })
  const [isConsultingJupiter, setIsConsultingJupiter] = useState(false)
  const selectedDayIndex = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].indexOf(selectedDay)
  const initials = user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  useEffect(() => {
    fetch('/api/schedule', { credentials: 'include' }).then(async (response) => { if (response.ok) setSchedule((await response.json() as { entries: ScheduleEntry[] }).entries) })
  }, [])
  function importSchedule() { return undefined }
  async function consultJupiter(event: React.FormEvent) {
    event.preventDefault(); setImportError(''); setIsConsultingJupiter(true)
    try {
      const response = await fetch('/api/schedule/jupiter', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jupiterData) })
      const data = await response.json() as { entries?: ScheduleEntry[]; error?: string }
      if (!response.ok || !data.entries) throw new Error(data.error || 'Não foi possível consultar o JupiterWeb.')
      setSchedule(data.entries); setJupiterData((current) => ({ ...current, password: '' }))
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Não foi possível consultar o JupiterWeb.') }
    finally { setIsConsultingJupiter(false) }
  }
  const visibleClasses = schedule.filter((entry) => entry.weekday === selectedDayIndex).map((entry, index) => ({ ...entry, time: entry.startsAt, end: entry.endsAt, kind: index === 0 ? 'main' : index % 2 ? 'lavender' : 'peach', status: index === 0 ? 'Agora' : index === 1 ? 'Próxima' : 'Depois', room: [entry.room, entry.building].filter(Boolean).join(' · ') }))
  return <main className="app-shell">
    <header className="topbar"><BrandMark /><div className="topbar-actions"><button className="icon-button notification" aria-label="Notificações"><Icon name="bell" /><span></span></button><div className="user-summary"><div><strong>{user.name}</strong><small>{user.email}</small></div><button className="avatar" aria-label="Sair da conta" onClick={onLogout}>{user.picture ? <img src={user.picture} alt={`Foto de ${user.name}`} /> : initials}</button></div></div></header>
    <div className="content"><section className="welcome-row"><div><p className="eyebrow">TERÇA-FEIRA, 17 DE JUNHO</p><h1>Bom dia, {user.name.split(' ')[0]}<span>.</span></h1><p className="subtle">Aqui está um resumo do seu dia na USP.</p></div><button className="date-button" aria-label="Abrir calendário"><Icon name="calendar" /><span>17 Jun</span></button></section>
      <section className="hero-card"><div className="hero-copy"><div className="live-label"><span className="live-dot"></span> ACONTECENDO AGORA</div><h2>Engenharia de<br />Software II</h2><p className="hero-meta"><Icon name="clock" /> 08:00 — 10:00 <span>·</span> Sala 4, Bloco B</p><button className="primary-button">Ver detalhes <Icon name="arrow" /></button></div><div className="hero-orbit" aria-hidden="true"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="orbit-core">ES<br /><small>II</small></div></div></section>
      <section className="section-block schedule-section"><div className="section-heading"><div><p className="eyebrow">SUA SEMANA</p><h2>Grade horária</h2></div><label className="import-button">Importar arquivo<input type="file" accept=".csv,.json,text/csv,application/json" onChange={importSchedule} disabled={isImporting} /></label></div><form className="jupiter-form" onSubmit={consultJupiter}><input aria-label="Número USP" placeholder="Número USP" inputMode="numeric" value={jupiterData.codpes} onChange={(event) => setJupiterData({ ...jupiterData, codpes: event.target.value })} required /><input aria-label="Senha do JupiterWeb" placeholder="Senha do JupiterWeb" type="password" value={jupiterData.password} onChange={(event) => setJupiterData({ ...jupiterData, password: event.target.value })} required /><input aria-label="Código do programa" placeholder="Programa" value={jupiterData.codpgm} onChange={(event) => setJupiterData({ ...jupiterData, codpgm: event.target.value })} required /><button className="import-button" type="submit" disabled={isConsultingJupiter}>{isConsultingJupiter ? 'Buscando...' : 'Buscar no JupiterWeb'}</button></form><p className="schedule-source">A senha é usada somente durante a consulta e não é armazenada.</p>{importError && <p className="schedule-error" role="alert">{importError}</p>}<div className="day-picker">{days.map((day) => <button key={day.label} className={`day ${selectedDay === day.label ? 'selected' : ''}`} onClick={() => setSelectedDay(day.label)}><span>{day.label}</span><strong>{day.date}</strong></button>)}</div><div className="class-list">{visibleClasses.length ? visibleClasses.map((item) => <article className={`class-row ${item.kind}`} key={`${item.code}-${item.time}`}><div className="class-time"><strong>{item.time}</strong><span>{item.end}</span></div><div className="class-indicator"></div><div className="class-info"><div className="class-title-line"><h3>{item.title}</h3><span className="class-status">{item.status}</span></div><p>{item.code} <span>·</span> {item.room}</p></div><button className="row-arrow" aria-label={`Abrir ${item.title}`}><Icon name="arrow" /></button></article>) : <p className="empty-schedule">Nenhuma aula neste dia.</p>}</div></section>
      <section className="section-block quick-section"><div className="section-heading"><div><p className="eyebrow">ACESSO RÁPIDO</p><h2>Para você</h2></div></div><div className="quick-grid"><button className="quick-card"><span className="quick-icon lilac"><Icon name="book" /></span><span><strong>Disciplinas</strong><small>6 ativas</small></span><Icon name="arrow" /></button><button className="quick-card"><span className="quick-icon mint"><Icon name="check" /></span><span><strong>Atividades</strong><small>2 pendentes</small></span><Icon name="arrow" /></button></div></section>
    </div><nav className="bottom-nav" aria-label="Navegação principal">{[['Início', 'home'], ['Grade', 'calendar'], ['Disciplinas', 'book'], ['Mais', 'more']].map(([label, icon]) => <button key={label} className={activeTab === label ? 'active' : ''} onClick={() => setActiveTab(label)}><Icon name={icon as IconName} /><span>{label}</span></button>)}</nav>
  </main>
}

function App() {
  const developmentHome = import.meta.env.DEV && window.location.pathname === developmentHomePath
  const [user, setUser] = useState<User | null>(developmentHome ? developmentUser : null)
  const [authReady, setAuthReady] = useState(developmentHome)
  useEffect(() => {
    if (developmentHome) return
    fetch('/api/auth/me', { credentials: 'include' }).then(async (response) => { if (response.ok) { const data = await response.json() as { user: User }; setUser(data.user) } }).finally(() => setAuthReady(true))
  }, [developmentHome])
  useEffect(() => { document.title = user ? 'daSIboard · Seu campus' : 'daSIboard · Entrar' }, [user])
  async function login(credential: string) {
    let response: Response
    try {
      response = await fetch('/api/auth/google', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) })
    } catch {
      throw new Error('Servidor de autenticação indisponível. Inicie `npm run dev:server` e tente novamente.')
    }
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null
      throw new Error(data?.error || `Falha no servidor de autenticação (${response.status}).`)
    }
    const data = await response.json() as { user: User }
    setUser(data.user)
  }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); setUser(null) }
  if (!authReady) return <main className="auth-loading" aria-label="Carregando autenticação"></main>
  return user ? <Dashboard user={user} onLogout={logout} /> : <LoginScreen onLogin={login} />
}

export default App
