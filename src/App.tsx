import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import './App.css'

type User = { name: string; email: string; picture?: string }
type ScheduleEntry = { weekday: number; startsAt: string; endsAt: string; title: string; code: string; room: string; building: string }
type IconName = 'home' | 'calendar' | 'book' | 'more' | 'bell' | 'arrow' | 'clock' | 'check' | 'shield' | 'trash'

const developmentHomePath = '/dev/home'
const developmentUser: User = { name: 'Estudante Local', email: 'estudante@usp.br' }

const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

const STORAGE_USER_KEY = 'orbe_user'
const STORAGE_SCHEDULE_PREFIX = 'orbe_schedule_'

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch { return null }
}

function saveStoredUser(user: User | null) {
  try {
    if (user) localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_USER_KEY)
  } catch { /* storage unavailable */ }
}

function scheduleKey(email: string) { return `${STORAGE_SCHEDULE_PREFIX}${email}` }

function loadStoredSchedule(email: string): ScheduleEntry[] | null {
  try {
    const raw = localStorage.getItem(scheduleKey(email))
    if (!raw) return null
    return JSON.parse(raw) as ScheduleEntry[]
  } catch { return null }
}

function saveStoredSchedule(email: string, entries: ScheduleEntry[]) {
  try { localStorage.setItem(scheduleKey(email), JSON.stringify(entries)) }
  catch { /* storage unavailable */ }
}

function clearStoredSchedule(email: string) {
  try { localStorage.removeItem(scheduleKey(email)) }
  catch { /* storage unavailable */ }
}

function getCurrentWeekDays() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return weekdayLabels.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return { label, date: String(date.getDate()).padStart(2, '0') }
  })
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9v10h13V9M9 19v-5h6v5', calendar: 'M5 4h14a2 2 0 0 1 2 2v13H3V6a2 2 0 0 1 2-2ZM8 2v4M16 2v4M3 9h18',
    book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 5.5v16M8 7h8M8 11h8', more: 'M5 12h.01M12 12h.01M19 12h.01',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4', arrow: 'M5 12h14M13 6l6 6-6 6', clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    check: 'm5 12 4 4L19 6', shield: 'M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z',
    trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  }
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>
}

function LoginScreen({ onLogin }: { onLogin: (credential: string) => Promise<void> }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLElement>(null)

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (window.matchMedia('(pointer: coarse)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5
    panelRef.current?.style.setProperty('--panel-x', `${horizontal * 18}px`)
    panelRef.current?.style.setProperty('--panel-y', `${vertical * 14}px`)
  }

  async function handleSuccess(response: CredentialResponse) {
    if (!response.credential) return setError('Não foi possível concluir o login.')
    try { await onLogin(response.credential) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível concluir o login.') }
  }

  return <main className="login-shell" onPointerMove={handlePointerMove} onPointerLeave={() => { panelRef.current?.style.setProperty('--panel-x', '0px'); panelRef.current?.style.setProperty('--panel-y', '0px') }}>
    <div className="login-space" aria-hidden="true"><span className="space-node node-one"></span><span className="space-node node-two"></span><span className="space-node node-three"></span><span className="space-node node-four"></span><span className="space-node node-five"></span><span className="space-node node-six"></span><span className="space-node node-seven"></span><span className="space-node node-eight"></span><span className="space-node node-nine"></span></div>
    <div className="login-glow login-glow-one"></div><div className="login-glow login-glow-two"></div>
    <section className="login-panel" ref={panelRef}>
      <div className="login-brand"><strong>daSIboard</strong></div>
      <div className="login-copy"><p className="eyebrow">SEU CAMPUS, MAIS PERTO</p><h1>Olá, estudante<span>.</span></h1><p>Entre para acessar sua rotina acadêmica na USP em um só lugar.</p></div>
      <div className="login-action">
        {clientId ? <div className="google-login-wrap"><GoogleLogin onSuccess={handleSuccess} onError={() => setError('O login foi cancelado. Tente novamente.')} useOneTap={false} theme="outline" shape="pill" size="large" text="signin_with" width="320" /></div> : <div className="setup-message"><Icon name="shield" /><span>Configure `VITE_GOOGLE_CLIENT_ID` para ativar o login Google.</span></div>}
        {error && <p className="login-error" role="alert">{error}</p>}
        <p className="login-note"><Icon name="shield" /> Acesso exclusivo para contas <strong>@usp.br</strong></p>
      </div>
      <p className="login-footer">Ao continuar, você concorda com o uso dos dados necessários para personalizar sua experiência acadêmica.</p>
    </section>
    <div className="login-orbit" aria-hidden="true"><div className="login-orbit-ring ring-a"></div><div className="login-orbit-ring ring-b"></div><div className="login-orbit-core">O</div></div>
  </main>
}

// ── Disciplinas data ──────────────────────────────────────────────────────────

type Discipline = { code: string; name: string; credAula: number; credTrab: number; ch: number; ce?: number; cp?: number; atpa?: number; ext?: number; prereqs?: { code: string; name: string; type: string }[] }
type Period = { label: string; disciplines: Discipline[] }

const obrigatoriasData: Period[] = [
  {
    label: '1º Período Ideal',
    disciplines: [
      { code: 'ACH0021', name: 'Tratamento e Análise de Dados / Informações', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0041', name: 'Resolução de Problemas I', credAula: 4, credTrab: 0, ch: 60, ext: 45 },
      { code: 'ACH2001', name: 'Introdução à Programação', credAula: 4, credTrab: 2, ch: 120 },
      { code: 'ACH2011', name: 'Cálculo I', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2014', name: 'Fundamentos de Sistemas de Informação', credAula: 4, credTrab: 2, ch: 120 },
    ],
  },
  {
    label: '2º Período Ideal',
    disciplines: [
      { code: 'ACH2002', name: 'Introdução à Análise de Algoritmos', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2001', name: 'Introdução à Programação', type: 'Requisito fraco' }] },
      { code: 'ACH2012', name: 'Cálculo II', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2011', name: 'Cálculo I', type: 'Requisito' }] },
      { code: 'ACH2013', name: 'Matemática Discreta I', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2002', name: 'Introdução à Análise de Algoritmos', type: 'Indicação de Conjunto' }, { code: 'ACH2001', name: 'Introdução à Programação', type: 'Requisito fraco' }] },
      { code: 'ACH2033', name: 'Matrizes, Vetores e Geometria Analítica', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2011', name: 'Cálculo I', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '3º Período Ideal',
    disciplines: [
      { code: 'ACH2003', name: 'Computação Orientada a Objetos', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2001', name: 'Introdução à Programação', type: 'Requisito fraco' }] },
      { code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', type: 'Requisito fraco' }] },
      { code: 'ACH2034', name: 'Organização e Arquitetura de Computadores I', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2013', name: 'Matemática Discreta I', type: 'Requisito fraco' }] },
      { code: 'ACH2053', name: 'Introdução à Estatística', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH0021', name: 'Tratamento e Análise de Dados / Informações', type: 'Requisito fraco' }, { code: 'ACH2012', name: 'Cálculo II', type: 'Requisito fraco' }] },
      { code: 'ACH2063', name: 'Introdução à Administração e Economia para Computação', credAula: 4, credTrab: 0, ch: 60 },
    ],
  },
  {
    label: '4º Período Ideal',
    disciplines: [
      { code: 'ACH2004', name: 'Bancos de Dados 1', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2003', name: 'Computação Orientada a Objetos', type: 'Requisito fraco' }] },
      { code: 'ACH2026', name: 'Redes de Computadores', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2034', name: 'Organização e Arquitetura de Computadores I', type: 'Requisito fraco' }] },
      { code: 'ACH2036', name: 'Métodos Quantitativos para Análise Multivariada', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2044', name: 'Sistemas Operacionais', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2034', name: 'Organização e Arquitetura de Computadores I', type: 'Requisito fraco' }] },
      { code: 'ACH2055', name: 'Organização e Arquitetura de Computadores II', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2034', name: 'Organização e Arquitetura de Computadores I', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '5º Período Ideal',
    disciplines: [
      { code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2003', name: 'Computação Orientada a Objetos', type: 'Requisito fraco' }] },
      { code: 'ACH2016', name: 'Inteligência Artificial', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2025', name: 'Bancos de Dados 2', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }] },
      { code: 'ACH2043', name: 'Introdução à Teoria da Computação', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2013', name: 'Matemática Discreta I', type: 'Requisito fraco' }] },
      { code: 'ACH2147', name: 'Desenvolvimento de Sistemas de Informação Distribuídos', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }, { code: 'ACH2044', name: 'Sistemas Operacionais', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '6º Período Ideal',
    disciplines: [
      { code: 'ACH0042', name: 'Resolução de Problemas II', credAula: 4, credTrab: 0, ch: 60, ext: 45, prereqs: [{ code: 'ACH2003', name: 'Computação Orientada a Objetos', type: 'Requisito fraco' }] },
      { code: 'ACH2006', name: 'Engenharia de Sistemas de Informação I', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }] },
      { code: 'ACH2008', name: 'Empreendedorismo em Informática', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2003', name: 'Computação Orientada a Objetos', type: 'Requisito fraco' }] },
      { code: 'ACH2027', name: 'Gestão de Projetos de Tecnologia da Informação', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '7º Período Ideal',
    disciplines: [
      { code: 'ACH2017', name: 'Projeto Supervisionado ou de Graduação I', credAula: 0, credTrab: 8, ch: 240, ce: 240, ext: 72, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '8º Período Ideal',
    disciplines: [
      { code: 'ACH2018', name: 'Projeto Supervisionado ou de Graduação II', credAula: 0, credTrab: 8, ch: 240, ce: 240, ext: 72, prereqs: [{ code: 'ACH2017', name: 'Projeto Supervisionado ou de Graduação I', type: 'Requisito fraco' }] },
    ],
  },
]

const optativasData: Period[] = [
  {
    label: '1º Período Ideal',
    disciplines: [
      { code: 'ACH0141', name: 'Sociedade, Multiculturalismo e Direitos – Estado e Sociedade', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0151', name: 'Sociedade, Multiculturalismo e Direitos - Cultura Digital', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0161', name: 'Sociedade, Multiculturalismo e Direitos – Direitos Humanos e Multiculturalismo', credAula: 2, credTrab: 0, ch: 30 },
    ],
  },
  {
    label: '3º Período Ideal',
    disciplines: [
      { code: 'ACH2107', name: 'Desafios de Programação I', credAula: 4, credTrab: 2, ch: 120, ext: 60, prereqs: [{ code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '6º Período Ideal',
    disciplines: [
      { code: 'ACH0102', name: 'Psicologia, Educação e Temas Contemporâneos', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0112', name: 'Psicologia, Educação e Temas Contemporâneos - Uma Visão Psicanalítica', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0122', name: 'Psicologia, Educação e Temas Contemporâneos – Processos Sociais de Formação dos Indivíduos', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0132', name: 'Psicologia, Educação e Temas Contemporâneos - Uma Abordagem Crítica', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0162', name: 'Arte, Literatura e Cultura', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0172', name: 'Arte, Literatura e Cultura - Arte Contemporânea', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0182', name: 'Arte, Literatura e Cultura – Fantasia e Ficção Científica na Cultura Pop', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0192', name: 'Arte, Literatura e Cultura - Literatura Contemporânea', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'MAC0216', name: 'Técnicas de Programação I', credAula: 4, credTrab: 2, ch: 120 },
    ],
  },
  {
    label: '7º Período Ideal',
    disciplines: [
      { code: 'ACH0101', name: 'Ciências da Natureza - Ciências da Terra', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0111', name: 'Ciências da Natureza - Ciências da Vida', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0121', name: 'Ciências da Natureza - Ciências do Universo', credAula: 2, credTrab: 0, ch: 30, cp: 20 },
      { code: 'ACH0131', name: 'Ciências da Natureza - Ciência, Cultura e Sociedade', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH2007', name: 'Engenharia de Sistemas de Informação II', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2006', name: 'Engenharia de Sistemas de Informação I', type: 'Requisito fraco' }] },
      { code: 'ACH2015', name: 'Contabilidade para Computação', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2066', name: 'Tópicos Especiais em Bancos de Dados', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2025', name: 'Bancos de Dados 2', type: 'Requisito fraco' }] },
      { code: 'ACH2067', name: 'Gestão de Processos de Negócio', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2014', name: 'Fundamentos de Sistemas de Informação', type: 'Requisito fraco' }, { code: 'ACH2027', name: 'Gestão de Projetos de Tecnologia da Informação', type: 'Requisito fraco' }] },
      { code: 'ACH2076', name: 'Segurança da Informação', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2034', name: 'Organização e Arquitetura de Computadores I', type: 'Requisito fraco' }] },
      { code: 'ACH2077', name: 'Soluções Web Baseadas em Software Livre', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }] },
      { code: 'ACH2087', name: 'Construção de Compiladores', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }, { code: 'ACH2043', name: 'Introdução à Teoria da Computação', type: 'Requisito fraco' }] },
      { code: 'ACH2117', name: 'Computação Gráfica', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', type: 'Requisito fraco' }, { code: 'ACH2033', name: 'Matrizes, Vetores e Geometria Analítica', type: 'Requisito fraco' }] },
      { code: 'ACH2127', name: 'Governança de Tecnologia da Informação', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2014', name: 'Fundamentos de Sistemas de Informação', type: 'Requisito fraco' }, { code: 'ACH2027', name: 'Gestão de Projetos de Tecnologia da Informação', type: 'Requisito fraco' }] },
      { code: 'ACH2137', name: 'Tópicos em Planejamento em Inteligência Artificial', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2157', name: 'Computação Física e Aplicações', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2167', name: 'Computação Sônica', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', type: 'Requisito fraco' }] },
      { code: 'ACH2177', name: 'Introdução à Ciência de Dados', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }, { code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2187', name: 'Mineração de Dados', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2016', name: 'Inteligência Artificial', type: 'Requisito fraco' }, { code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2197', name: 'Análise de Redes Sociais', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2207', name: 'Computação Sonora e Musical', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2011', name: 'Cálculo I', type: 'Requisito fraco' }, { code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', type: 'Requisito fraco' }] },
      { code: 'ACH2217', name: 'Sistemas de Informação na Área Financeira', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2063', name: 'Introdução à Administração e Economia para Computação', type: 'Requisito fraco' }] },
      { code: 'ACH2221', name: 'Estudos Avançados em Sistemas de Informação 1', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2222', name: 'Estudos Avançados em Sistemas de Informação 2', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2223', name: 'Estudos Avançados em Sistemas de Informação 3', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH3778', name: 'Governo Aberto', credAula: 4, credTrab: 2, ch: 120 },
      { code: 'MAC0471', name: 'Desenvolvimento para Web', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2001', name: 'Introdução à Programação', type: 'Requisito' }] },
      { code: 'MAC0475', name: 'Laboratório de Sistemas Computacionais Complexos', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2006', name: 'Engenharia de Sistemas de Informação I', type: 'Requisito' }] },
      { code: 'MAC0546', name: 'Fundamentos da Internet das Coisas', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'MAC0216', name: 'Técnicas de Programação I', type: 'Requisito' }] },
    ],
  },
  {
    label: '8º Período Ideal',
    disciplines: [
      { code: 'ACH0142', name: 'Sociedade, Meio Ambiente e Cidadania – Desenvolvimento e Meio Ambiente', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0152', name: 'Sociedade, Meio Ambiente e Cidadania - Sociedade, Ambiente e Cidadania', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0636', name: 'Realidade virtual, e-sports e inteligência artificial', credAula: 4, credTrab: 1, ch: 90 },
      { code: 'ACH2028', name: 'Qualidade de Software', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }, { code: 'ACH2006', name: 'Engenharia de Sistemas de Informação I', type: 'Requisito fraco' }] },
      { code: 'ACH2037', name: 'Métodos Quantitativos Aplicados à Sistemas de Informação', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2036', name: 'Métodos Quantitativos para Análise Multivariada', type: 'Requisito fraco' }] },
      { code: 'ACH2038', name: 'Laboratório de Redes de Computadores', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2026', name: 'Redes de Computadores', type: 'Requisito fraco' }] },
      { code: 'ACH2048', name: 'Redes de Alto Desempenho', credAula: 4, credTrab: 1, ch: 90, prereqs: [{ code: 'ACH2026', name: 'Redes de Computadores', type: 'Requisito fraco' }] },
      { code: 'ACH2068', name: 'Avaliação de Desempenho de Sistemas Computacionais', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }, { code: 'ACH2006', name: 'Engenharia de Sistemas de Informação I', type: 'Requisito fraco' }] },
      { code: 'ACH2078', name: 'Gestão Empresarial', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2086', name: 'Fundamentos de Sistemas Hipermídia e Web', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }] },
      { code: 'ACH2096', name: 'Laboratório de Sistemas Operacionais', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }, { code: 'ACH2044', name: 'Sistemas Operacionais', type: 'Requisito fraco' }] },
      { code: 'ACH2098', name: 'Web Semântica', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }, { code: 'ACH2013', name: 'Matemática Discreta I', type: 'Requisito fraco' }] },
      { code: 'ACH2106', name: 'Projeto Integrado de Sistemas de Informação', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2003', name: 'Computação Orientada a Objetos', type: 'Requisito fraco' }, { code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }] },
      { code: 'ACH2108', name: 'Desafios de Programação II', credAula: 4, credTrab: 2, ch: 120, ext: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2118', name: 'Introdução ao Processamento de Língua Natural', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2016', name: 'Inteligência Artificial', type: 'Requisito fraco' }] },
      { code: 'ACH2128', name: 'Introdução às Redes Complexas', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }, { code: 'ACH2033', name: 'Matrizes, Vetores e Geometria Analítica', type: 'Requisito fraco' }, { code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2138', name: 'Modelagem de Sistemas Complexos', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2148', name: 'Laboratório de Otimização Combinatória', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2158', name: 'Simulação de Sistemas Complexos', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2001', name: 'Introdução à Programação', type: 'Requisito fraco' }, { code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2178', name: 'Tópicos em Privacidade Usável', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2188', name: 'Introdução à Pesquisa Operacional', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2198', name: 'Laboratório de Projetos de Software Livre/Aberto', credAula: 0, credTrab: 0, ch: 0, ext: 120 },
      { code: 'ACH2224', name: 'Estudos Avançados em Sistemas de Informação 4', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2225', name: 'Estudos Avançados em Sistemas de Informação 5', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2226', name: 'Estudos Avançados em Sistemas de Informação 6', credAula: 4, credTrab: 0, ch: 60 },
    ],
  },
]

// ── Graph coloring ────────────────────────────────────────────────────────────
// Each "chain" is defined by a root discipline code and a colour palette.
// Colors propagate downstream through the prereq graph.
const GRAPH_CHAINS: { root: string; color: string; label: string }[] = [
  { root: 'ACH2001', color: '#7c5ce8', label: 'Programação' },        // purple
  { root: 'ACH2011', color: '#0ea5a0', label: 'Cálculo' },            // teal
  { root: 'ACH2013', color: '#e86c5c', label: 'Matemática Discreta' },// red-orange
  { root: 'ACH2014', color: '#d97c2e', label: 'Fund. SI' },           // amber
  { root: 'ACH0021', color: '#5b9bd5', label: 'Dados' },              // blue
  { root: 'ACH2063', color: '#7cad58', label: 'Adm/Econ' },           // green
]
const CHAIN_NEUTRAL = '#525a6e'

function computeNodeColors(periods: Period[]): Map<string, string> {
  // Build flat discipline map
  const discMap = new Map<string, Discipline>()
  for (const p of periods) for (const d of p.disciplines) discMap.set(d.code, d)

  // BFS propagation: assign color of the first chain that reaches each node
  const colors = new Map<string, string>()

  // Seed roots
  for (const chain of GRAPH_CHAINS) {
    if (discMap.has(chain.root)) colors.set(chain.root, chain.color)
  }

  // Multiple passes to propagate (max depth = 8 semesters)
  let changed = true
  while (changed) {
    changed = false
    for (const p of periods) {
      for (const d of p.disciplines) {
        if (colors.has(d.code)) continue
        if (!d.prereqs) continue
        // Find the first prereq that already has a color
        for (const req of d.prereqs) {
          if (colors.has(req.code)) {
            colors.set(d.code, colors.get(req.code)!)
            changed = true
            break
          }
        }
      }
    }
  }

  // Remaining uncolored nodes
  for (const p of periods) {
    for (const d of p.disciplines) {
      if (!colors.has(d.code)) colors.set(d.code, CHAIN_NEUTRAL)
    }
  }
  return colors
}

// ── Graph view component ──────────────────────────────────────────────────────
type EdgeInfo = { fromCode: string; toCode: string; color: string }
type NodeRect = { code: string; x: number; y: number; w: number; h: number }

function DisciplinasGraph({ periods }: { periods: Period[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState<EdgeInfo[]>([])
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 })
  const colors = useRef(computeNodeColors(periods)).current

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const rects = new Map<string, NodeRect>()

    container.querySelectorAll<HTMLElement>('[data-code]').forEach((el) => {
      const code = el.dataset.code!
      const r = el.getBoundingClientRect()
      rects.set(code, {
        code,
        x: r.left - containerRect.left,
        y: r.top - containerRect.top,
        w: r.width,
        h: r.height,
      })
    })

    const newEdges: EdgeInfo[] = []
    for (const p of periods) {
      for (const d of p.disciplines) {
        if (!d.prereqs) continue
        for (const req of d.prereqs) {
          if (rects.has(req.code) && rects.has(d.code)) {
            newEdges.push({ fromCode: req.code, toCode: d.code, color: colors.get(req.code) ?? CHAIN_NEUTRAL })
          }
        }
      }
    }

    setSvgSize({ w: container.scrollWidth, h: container.scrollHeight })
    setEdges(newEdges)
  }, [periods, colors])

  function buildPath(edge: EdgeInfo) {
    const container = containerRef.current
    if (!container) return ''
    const containerRect = container.getBoundingClientRect()
    const fromEl = container.querySelector<HTMLElement>(`[data-code="${edge.fromCode}"]`)
    const toEl = container.querySelector<HTMLElement>(`[data-code="${edge.toCode}"]`)
    if (!fromEl || !toEl) return ''
    const fr = fromEl.getBoundingClientRect()
    const tr = toEl.getBoundingClientRect()
    // Offset by container's viewport position AND add scroll to get content-space coords
    const ox = containerRect.left - container.scrollLeft
    const oy = containerRect.top - container.scrollTop

    const x1 = fr.right - ox
    const y1 = fr.top - oy + fr.height / 2
    const x2 = tr.left - ox
    const y2 = tr.top - oy + tr.height / 2
    const cx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
  }

  return (
    <div className="disc-graph-wrap" ref={containerRef}>
      <svg
        className="disc-graph-svg"
        width={svgSize.w}
        height={svgSize.h}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        {edges.map((e) => {
          const d = buildPath(e)
          if (!d) return null
          return (
            <path
              key={`${e.fromCode}-${e.toCode}`}
              d={d}
              stroke={e.color}
              strokeWidth="1.5"
              strokeOpacity="0.55"
              fill="none"
              strokeDasharray="none"
            />
          )
        })}
      </svg>

      <div className="disc-graph-grid">
        {periods.map((period, pIdx) => (
          <div key={period.label} className="disc-graph-col">
            <div className="disc-graph-col-header">
              <span className="disc-graph-sem-num">{pIdx + 1}º</span>
              <span className="disc-graph-sem-label">sem.</span>
            </div>
            <div className="disc-graph-col-nodes">
              {period.disciplines.map((disc) => {
                const color = colors.get(disc.code) ?? CHAIN_NEUTRAL
                return (
                  <div
                    key={disc.code}
                    data-code={disc.code}
                    className="disc-graph-node"
                    style={{ '--node-color': color } as React.CSSProperties}
                    title={`${disc.code} — ${disc.name}\n${disc.credAula}A ${disc.credTrab}T · ${disc.ch}h`}
                  >
                    <span className="disc-graph-node-code">{disc.code}</span>
                    <span className="disc-graph-node-name">{disc.name}</span>
                    {(disc.ce != null && disc.ce > 0 || disc.ext != null && disc.ext! > 0) && (
                      <span className="disc-graph-node-ext">
                        {disc.ce && disc.ce > 0 ? `CE ${disc.ce}h` : ''}
                        {disc.ext && disc.ext > 0 ? ` EXT ${disc.ext}h` : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="disc-graph-legend">
        {GRAPH_CHAINS.map((chain) => (
          <span key={chain.root} className="disc-graph-legend-item">
            <span className="disc-graph-legend-dot" style={{ background: chain.color }} />
            {chain.label}
          </span>
        ))}
        <span className="disc-graph-legend-item">
          <span className="disc-graph-legend-dot" style={{ background: CHAIN_NEUTRAL }} />
          Isoladas
        </span>
      </div>
    </div>
  )
}

function DisciplinasView({ activeTab, onSelectTab }: { activeTab: string; onSelectTab: (tab: string) => void }) {
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
                  {period.disciplines.map((disc) => (
                    <article key={disc.code} className="disc-card">
                      <div className="disc-card-main">
                        <span className="disc-code">{disc.code}</span>
                        <span className="disc-name">{disc.name}</span>
                        <div className="disc-badges">
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
                  ))}
                </div>
              </section>
            ))}
          </div>
      }
    </div>
    <nav className="bottom-nav" aria-label="Navegação principal">{[['Início', 'home'], ['Disciplinas', 'book'], ['Mais', 'more']].map(([label, icon]) => <button key={label} className={activeTab === label ? 'active' : ''} onClick={() => onSelectTab(label)}><Icon name={icon as IconName} /><span>{label}</span></button>)}</nav>
  </main>
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const todayIndex = (new Date().getDay() + 6) % 7
  const days = getCurrentWeekDays()
  const [activeTab, setActiveTab] = useState('Início')
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(() => loadStoredSchedule(user.email) ?? [])
  const [hasStoredSchedule, setHasStoredSchedule] = useState(() => loadStoredSchedule(user.email) !== null)
  const [importError, setImportError] = useState('')
  const [jupiterData, setJupiterData] = useState({ codpes: '', password: '', codpgm: '1' })
  const [isConsultingJupiter, setIsConsultingJupiter] = useState(false)
  const todayLabelText = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase()
  const initials = user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  useEffect(() => {
    if (hasStoredSchedule) return
    fetch('/api/schedule', { credentials: 'include' }).then(async (response) => {
      if (response.ok) {
        const data = await response.json() as { entries: ScheduleEntry[] }
        if (data.entries.length > 0) {
          setSchedule(data.entries)
          saveStoredSchedule(user.email, data.entries)
          setHasStoredSchedule(true)
        }
      }
    }).catch(() => { /* server unavailable, use cached data */ })
  }, [hasStoredSchedule, user.email])

  async function consultJupiter(event: React.FormEvent) {
    event.preventDefault(); setImportError(''); setIsConsultingJupiter(true)
    try {
      const response = await fetch('/api/schedule/jupiter', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jupiterData) })
      const data = await response.json() as { entries?: ScheduleEntry[]; error?: string }
      if (!response.ok || !data.entries) throw new Error(data.error || 'Não foi possível consultar o JupiterWeb.')
      setSchedule(data.entries)
      saveStoredSchedule(user.email, data.entries)
      setHasStoredSchedule(true)
      setJupiterData((current) => ({ ...current, password: '' }))
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Não foi possível consultar o JupiterWeb.') }
    finally { setIsConsultingJupiter(false) }
  }

  function clearSchedule() {
    clearStoredSchedule(user.email)
    setSchedule([])
    setHasStoredSchedule(false)
    setImportError('')
  }

  if (activeTab === 'Disciplinas') return <DisciplinasView activeTab={activeTab} onSelectTab={setActiveTab} />

  return <main className="app-shell home-shell">
    <header className="topbar"><div></div><div className="topbar-actions"><button className="icon-button notification" aria-label="Notificações"><Icon name="bell" /><span></span></button><div className="user-summary"><div><strong>{user.name}</strong></div><button className="avatar" aria-label="Sair da conta" onClick={onLogout}>{user.picture ? <img src={user.picture} alt={`Foto de ${user.name}`} /> : initials}</button></div></div></header>
    <div className="content">
      <section className="welcome-row">
        <div><p className="eyebrow">{todayLabelText}</p><h1>Bom dia, {user.name.split(' ')[0]}<span>.</span></h1></div>
        <button className="date-button" aria-label="Ir para hoje"><Icon name="calendar" /><span>{days[todayIndex]?.date} {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date()).replace('.', '')}</span></button>
      </section>

      <section className="section-block schedule-section">
        <div className="section-heading">
          <div><p className="eyebrow">SUA SEMANA</p><h2>Grade horária<span className="grade-dot">.</span></h2></div>
          {hasStoredSchedule
            ? <button type="button" className="clear-schedule-button" onClick={clearSchedule}><Icon name="trash" /><span>Atualizar grade</span></button>
            : null}
        </div>
        {!hasStoredSchedule && <form className="jupiter-form" onSubmit={consultJupiter}><input aria-label="Número USP" placeholder="Número USP" inputMode="numeric" value={jupiterData.codpes} onChange={(event) => setJupiterData({ ...jupiterData, codpes: event.target.value })} required /><input aria-label="Senha do JupiterWeb" placeholder="Senha do JupiterWeb" type="password" value={jupiterData.password} onChange={(event) => setJupiterData({ ...jupiterData, password: event.target.value })} required /><input aria-label="Código do programa" placeholder="Programa" value={jupiterData.codpgm} onChange={(event) => setJupiterData({ ...jupiterData, codpgm: event.target.value })} required /><button className="import-button" type="submit" disabled={isConsultingJupiter}>{isConsultingJupiter ? 'Buscando...' : 'Buscar no JupiterWeb'}</button></form>}
        {importError && <p className="schedule-error" role="alert">{importError}</p>}
        <div className="calendar-board home-calendar-board" aria-label="Grade horária semanal">
          {days.map((day, dayIndex) => (
            <article className={`calendar-day${dayIndex === todayIndex ? ' today' : ''}`} key={day.label}>
              <header>
                <div><strong>{day.label}</strong><span>{day.date}</span></div>
                <small>{schedule.filter((e) => e.weekday === dayIndex).length} aulas</small>
              </header>
              <div className="calendar-day-list">
                {schedule.filter((e) => e.weekday === dayIndex).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((entry) => (
                  <div className="calendar-event" key={`${day.label}-${entry.code}-${entry.startsAt}`}>
                    <span className="calendar-event-time">{entry.startsAt}</span>
                    <div><strong>{entry.title}</strong><small>{entry.endsAt}{entry.room ? ` · ${entry.room}` : ''}</small></div>
                  </div>
                ))}
                {!schedule.some((e) => e.weekday === dayIndex) && <p className="calendar-empty">Livre</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
    <nav className="bottom-nav" aria-label="Navegação principal">{[['Início', 'home'], ['Disciplinas', 'book'], ['Mais', 'more']].map(([label, icon]) => <button key={label} className={activeTab === label ? 'active' : ''} onClick={() => setActiveTab(label)}><Icon name={icon as IconName} /><span>{label}</span></button>)}</nav>
  </main>
}

function App() {
  const developmentHome = import.meta.env.DEV && window.location.pathname === developmentHomePath
  const cachedUser = developmentHome ? developmentUser : loadStoredUser()
  const [user, setUser] = useState<User | null>(cachedUser)
  const [authReady, setAuthReady] = useState(developmentHome || cachedUser !== null)

  useEffect(() => {
    if (developmentHome) return
    fetch('/api/auth/me', { credentials: 'include' }).then(async (response) => {
      if (response.ok) {
        const data = await response.json() as { user: User }
        setUser(data.user)
        saveStoredUser(data.user)
      } else {
        setUser(null)
        saveStoredUser(null)
      }
    }).catch(() => {
      // Server unreachable — keep using cached user if available
    }).finally(() => setAuthReady(true))
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
    saveStoredUser(data.user)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    saveStoredUser(null)
    setUser(null)
  }

  if (!authReady) return <main className="auth-loading" aria-label="Carregando autenticação"></main>
  return user ? <Dashboard user={user} onLogout={logout} /> : <LoginScreen onLogin={login} />
}

export default App
