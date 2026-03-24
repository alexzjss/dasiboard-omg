import { useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Search, Mail, MapPin, ExternalLink, BookOpen, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Docente {
  name: string
  email: string
  room: string | null
  lattes: string | null
  personal: string | null
  areas: string
  past_exams?: { label: string; url: string }[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const DOCENTES_DATA: Docente[] = [
  { name: "Prof. Dr. Alexandre Ferreira Ramos", email: "alex.ramos@usp.br", room: "A1-104B", lattes: "https://lattes.cnpq.br/9681052469456395", personal: "https://each.usp.br/alexramos/", areas: "Classificação da função e dos mecanismos de supressão de flutuações aleatórias em regulação da expressão gênica" },
  { name: "Profa. Dra. Ana Amélia Benedito Silva", email: "aamelia@usp.br", room: "301 G – Prédio I1", lattes: "https://lattes.cnpq.br/0827495526048435", personal: null, areas: "Séries Temporais Biológicas" },
  { name: "Prof. Dr. André Carlos Busanelli de Aquino", email: "aquino@usp.br", room: null, lattes: "https://lattes.cnpq.br/2204782841421432", personal: null, areas: "Rhythm, organizing e agency em organizações do setor público; Ciclo Financeiro de Governos Locais; Resiliência de organizações públicas" },
  { name: "Prof. Dr. Andre Cavalcanti Rocha Martins", email: "amartins@usp.br", room: "319 F – Prédio I1", lattes: "https://lattes.cnpq.br/2318177531681999", personal: null, areas: "Dinâmica Cultural e de Opiniões" },
  { name: "Profa. Dra. Ariane Machado Lima", email: "ariane.machado@usp.br", room: "210-N – Edifício A1", lattes: "https://lattes.cnpq.br/6342311646947853", personal: "https://www.each.usp.br/ariane", areas: "Reconhecimento de Padrões, Gramáticas Estocásticas, Classificadores de Sequências, Bioinformática, RNAs não codificantes" },
  { name: "Prof. Dr. Camilo Rodrigues Neto", email: "camiloneto@usp.br", room: "322-O – Edifício I1", lattes: "https://lattes.cnpq.br/8618151183586924", personal: "https://www.each.usp.br/camiloneto/", areas: "Sistemas Complexos, Modelagem por agentes, Dinâmica Estocástica, Econofísica, Análise e modelagem multifractal de sinais" },
  { name: "Profa. Dra. Cláudia Inés Garcia", email: "claudiag@usp.br", room: "202 G – Prédio I1", lattes: "https://lattes.cnpq.br/4327900264403345", personal: null, areas: "Matemática, com ênfase em Matemática Aplicada",
    past_exams: [
      { label: "Calculo 1", url: "https://github.com/driveeach/drivesi/tree/master/Materias%20Obrigatorias/1%C2%BA%20Semestre/Calc%20I%20-%20Ca%CC%81lculo%20I/Claudia" },
      { label: "Calculo 2", url: "https://github.com/driveeach/drivesi/tree/master/Materias%20Obrigatorias/2%C2%BA%20Semestre/Calc%20II%20-%20Ca%CC%81lculo%20II/Claudia" },
    ]
  },
  { name: "Prof. Dr. Clodoaldo Aparecido de Moraes Lima", email: "c.lima@usp.br", room: "104N – Prédio A1", lattes: "https://lattes.cnpq.br/3017337174053381", personal: null, areas: "Inteligência Artificial, Machine Learning, Métodos de kernel, Análise e Predição de Séries Temporais Financeiras e Biomédicas, Sistemas Biométricos" },
  { name: "Prof. Dr. Daniel de Angelis Cordeiro", email: "daniel.cordeiro@usp.br", room: "352D – Edifício I1", lattes: "https://lattes.cnpq.br/5322325760113475", personal: "https://www.each.usp.br/dc/", areas: "Teoria do Escalonamento, Teoria Algorítmica dos Jogos, Computação de Alto Desempenho, Computação Paralela e Distribuída, Computação em Nuvem" },
  { name: "Prof. Dr. Edmir Parada Vasques Prado", email: "eprado@usp.br", room: "110M – Edifício A1", lattes: "https://lattes.cnpq.br/2091731281771940", personal: null, areas: "Gestão da Informação e do Conhecimento, Governança e Gestão de Tecnologia da Informação, Sistemas de Informação Organizacionais e Interorganizacionais" },
  { name: "Prof. Dr. Esteban Fernandez Tuesta", email: "tuesta@usp.br", room: "346-E – Bloco I1", lattes: "https://lattes.cnpq.br/1068554491963326", personal: null, areas: "Probabilidade Aplicada, Estatística Aplicada, Processos Markovianos e Ciência da Informação" },
  { name: "Prof. Dr. Fabio Nakano", email: "fabionakano@usp.br", room: "A1-204E", lattes: "https://lattes.cnpq.br/7142543937454545", personal: null, areas: "Bioinformática, Banco de Dados, Matemática Aplicada",
    past_exams: [
      { label: "IP", url: "https://github.com/driveeach/drivesi/tree/master/Materias%20Obrigatorias/1%C2%BA%20Semestre/IP%20-%20Introduc%CC%A7a%CC%83o%20a%20Programac%CC%A7a%CC%83o/Nakano/Provas" },
    ]
  },
  { name: "Profa. Dra. Fátima de Lourdes dos Santos Nunes Marques", email: "fatima.nunes@usp.br", room: "210P – Prédio A1", lattes: "https://lattes.cnpq.br/8626964624628522", personal: null, areas: "Realidade Virtual, Processamento de Imagens, Banco de Dados, Sistemas de Auxílio ao Diagnóstico, Treinamento Médico Virtual, Mamografia, Recuperação Baseada em Conteúdo" },
  { name: "Prof. Dr. Fernando Auil", email: "auil@usp.br", room: "357 F – Prédio I1", lattes: "https://lattes.cnpq.br/9270505088399430", personal: null, areas: "Abordagem de Beurling da Hipótese de Riemann, Matemática Aplicada" },
  { name: "Prof. Dr. Flávio Luiz Coutinho", email: "flcoutinho@usp.br", room: "357 F – Prédio I1", lattes: "https://lattes.cnpq.br/3100288618568772", personal: null, areas: "Rastreamento de olhar, razão cruzada, compensação de movimentos de cabeça e interação humano computador" },
  { name: "Profa. Dra. Gisele da Silva Craveiro", email: "giselesc@usp.br", room: "252 – Edifício I1", lattes: "https://lattes.cnpq.br/0361123363747622", personal: null, areas: "Impactos de Sistemas de Informação na Sociedade, Governo eletrônico, Dados Abertos, Governo Aberto, Cultura livre e cultura digital" },
  { name: "Prof. Dr. Helton Hideraldo Bíscaro", email: "heltonhb@usp.br", room: "352B – Prédio I1", lattes: "https://lattes.cnpq.br/8794441658476782", personal: null, areas: "Estrutura de Dados, Reconstrução, Nuvem de pontos, Complexos Simpliciais, Teoria de Morse Discreta",
    past_exams: [
      { label: "Calculo 1", url: "https://github.com/driveeach/drivesi/tree/master/Materias%20Obrigatorias/1%C2%BA%20Semestre/Calc%20I%20-%20Ca%CC%81lculo%20I/Helton" },
    ]
  },
  { name: "Prof. Dr. Ivandré Paraboni", email: "ivandre@usp.br", room: "320F – Edifício I1", lattes: "https://lattes.cnpq.br/4979536048261282", personal: "https://www.each.usp.br/ivandre", areas: "Processamento de Língua Natural, Ciências Cognitivas, Inteligência Artificial, Tecnologia da Língua Humana" },
  { name: "Prof. Dr. João Luiz Bernardes Júnior", email: "jlbernardes@usp.br", room: "110G – Edifício A1", lattes: "https://lattes.cnpq.br/8529032048850930", personal: null, areas: "Interação Humano-Computador, Análise e Processamento de Imagens, Computação Gráfica, Visualização Científica, Jogos Digitais, Realidade Virtual e Aumentada" },
  { name: "Prof. Dr. José de Jesús Pérez Alcázar", email: "jperez@usp.br", room: "352 F – Prédio I1", lattes: "https://lattes.cnpq.br/2201580020088062", personal: null, areas: "Tecnologia Web, Sistemas de Informação e Engenharia de Software, Inteligência Artificial e Bancos de Dados" },
  { name: "Prof. Dr. José Ricardo Gonçalves de Mendonça", email: "jricardo@usp.br", room: null, lattes: "https://lattes.cnpq.br/8792749813872106", personal: null, areas: "Física Estatística, Sistemas de Computação, Empreendedorismo de base tecnológica",
    past_exams: [
      { label: "MD", url: "https://github.com/driveeach/drivesi/tree/master/Materias%20Obrigatorias/2%C2%BA%20Semestre/MD%20-%20Matema%CC%81tica%20Discreta%20I/Jos%C3%A9%20Ricardo" },
    ]
  },
  { name: "Profa. Dra. Karina Valdivia Delgado", email: "kvd@usp.br", room: "104F – Edifício A1", lattes: "https://lattes.cnpq.br/8420771612707965", personal: "https://www.ime.usp.br/~kvd", areas: "Inteligência Artificial, Planejamento Probabilístico, Tomada de decisão, Processos de decisão markovianos" },
  { name: "Prof. Dr. Karla Roberta Pereira Sampaio Lima", email: "ksampaiolima@usp.br", room: "104P – Edifício A1", lattes: "https://lattes.cnpq.br/8474346566632932", personal: null, areas: "Otimização Combinatória e Teoria dos Grafos" },
  { name: "Profa. Dra. Luciane Meneguin Ortega", email: "luciane.ortega@usp.br", room: "210C – Edifício A1", lattes: "https://lattes.cnpq.br/8594007840837513", personal: null, areas: "Empreendedorismo, Inovação Tecnológica, Inovação Social, Pequenas e Médias Empresas" },
  { name: "Prof. Dr. Marcelo Fantinato", email: "m.fantinato@usp.br", room: "110I – Edifício A1", lattes: "https://lattes.cnpq.br/8207954538307988", personal: "https://www.each.usp.br/fantinato", areas: "Mineração de Processos, Gestão de Processos de Negócio (BPM), Internet das Coisas (IoT), Brinquedos Inteligentes e Robôs de Companhia" },
  { name: "Prof. Dr. Marcelo Medeiros Eler", email: "marceloeler@usp.br", room: null, lattes: "https://lattes.cnpq.br/0170428647417667", personal: null, areas: "Engenharia de Software, Teste de Software, Geração automática de dados de teste, Governo Eletrônico, Gestão de TI" },
  { name: "Prof. Dr. Marcelo Morandini", email: "m.morandini@usp.br", room: "322E – Edifício I1", lattes: "https://lattes.cnpq.br/7235951485247158", personal: "https://www.each.usp.br/morandini", areas: "Engenharia de Software, Interação Humano-Computador, Usabilidade, Ergonomia e Testes de Software" },
  { name: "Prof. Dr. Marcio Moretto Ribeiro", email: "marciomr@usp.br", room: null, lattes: "https://lattes.cnpq.br/2153927915438535", personal: null, areas: "Lógicas de Descrição e Revisão de Crenças" },
  { name: "Prof. Dr. Marcos Lordello Chaim", email: "chaim@usp.br", room: "322 N – Edifício I1", lattes: "https://lattes.cnpq.br/6414738466336890", personal: "https://www.each.usp.br/chaim", areas: "Engenharia de Software, Teste e Depuração de Software, Manutenção de Software, Métodos de Desenvolvimento de Software, Linguagens de Programação" },
  { name: "Prof. Dr. Masayuki Oka Hase", email: "mhase@usp.br", room: "202A – Edifício I1", lattes: "https://lattes.cnpq.br/9979732565759430", personal: null, areas: "Física Estatística, Redes Complexas" },
  { name: "Prof. Dr. Norton Trevisan Roman", email: "norton@usp.br", room: "110R – Edifício A1", lattes: "https://lattes.cnpq.br/4440731926425760", personal: "https://www.each.usp.br/norton", areas: "Processamento de Língua Natural (Linguística Computacional), Inteligência Artificial, Educação em Informática" },
  { name: "Profa. Dra. Patrícia Rufino Oliveira", email: "proliveira@usp.br", room: "322A – Edifício I1", lattes: "https://lattes.cnpq.br/9174573815394512", personal: null, areas: "Inteligência Artificial, Computação Bioinspirada, Redes Neurais Artificiais, Processamento de Imagens Digitais, Visão Computacional, Análise de Componentes Independentes" },
  { name: "Prof. Dr. Renan Cerqueira Afonso Alves", email: "renanalves@usp.br", room: null, lattes: "https://lattes.cnpq.br/4974090084595688", personal: null, areas: "Redes de sensores sem fio, Internet das coisas, Modelagem de redes de computadores" },
  { name: "Prof. Dr. Regis Rossi Alves Faria", email: "regis@usp.br", room: "357H – Edifício I1", lattes: "https://lattes.cnpq.br/9990463602315076", personal: null, areas: "Computação sônica/musical, Processamento de sinais/áudio, Sonologia, Tecnologia da música, Bioacústica, Sistemas musicais interativos" },
  { name: "Profa. Dra. Sarajane Marques Peres", email: "sarajane@usp.br", room: "320A – Edifício I1", lattes: "https://lattes.cnpq.br/6265936760089757", personal: "https://www.each.usp.br/sarajane", areas: "Inteligência Computacional, Aprendizado de Máquina, Reconhecimento de Padrões" },
  { name: "Prof. Dr. Valdinei Freire da Silva", email: "valdinei.freire@usp.br", room: "110O – Edifício A1", lattes: "https://lattes.cnpq.br/0813823100105934", personal: "https://www.each.usp.br/valdinei", areas: "Inteligência Artificial, Processos Markovianos de Decisão, Aprendizado por Reforço, Sistemas de Recomendação, Robótica Inteligente" },
  { name: "Profa. Dra. Violeta Sun", email: "violeta@usp.br", room: "110M – Edifício A1", lattes: "https://lattes.cnpq.br/1018507649746734", personal: null, areas: "Gestão de TI, Governança de TI, Gestão de TI na Saúde, Gestão de Projetos, Aplicação de TI na Área Pública" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .replace(/^(Prof\.|Profa\.|Dr\.|Dra\.)\s*/gi, '')
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

// Deterministic hue from name string
function nameToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocentesPage() {
  const [query, setQuery] = useState('')
  const [examsDoc, setExamsDoc] = useState<Docente | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return DOCENTES_DATA
    return DOCENTES_DATA.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      d.areas.toLowerCase().includes(q) ||
      (d.room && d.room.toLowerCase().includes(q))
    )
  }, [query])

  return (
    <div className="px-4 py-5 sm:px-6 md:px-8 md:py-6 max-w-7xl mx-auto page-mobile">

      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="relative mb-5 overflow-hidden rounded-2xl p-6 animate-in"
        style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 40px var(--accent-glow)',
        }}
      >
        {/* Decorative orb */}
        <div
          className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, var(--accent-1), transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--gradient-btn)', boxShadow: '0 2px 12px var(--accent-glow)' }}
              >
                <BookOpen size={17} className="text-white" />
              </div>
              <h1
                className="font-display font-bold text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Docentes
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Corpo docente do curso de Sistemas de Informação · EACH · USP
            </p>
          </div>

          {/* Count badge */}
          <div
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-1)',
              color: 'var(--accent-3)',
            }}
          >
            {filtered.length === DOCENTES_DATA.length
              ? `${DOCENTES_DATA.length} docentes`
              : `${filtered.length} de ${DOCENTES_DATA.length}`}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mt-5">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Buscar por nome, área, e-mail ou sala…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition-all outline-none"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--accent-1)'
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <Search size={32} style={{ color: 'var(--text-muted)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Nenhum docente encontrado para "{query}"
          </p>
          <button
            onClick={() => setQuery('')}
            className="mt-3 text-xs underline underline-offset-2"
            style={{ color: 'var(--accent-3)' }}
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <div
          className="grid gap-3 md:gap-4 docentes-grid animate-in-delay-1"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {filtered.map((doc, i) => (
            <DocenteCard
              key={doc.email}
              doc={doc}
              index={i}
              highlight={query.trim() || undefined}
              onOpenExams={setExamsDoc}
            />
          ))}
        </div>
      )}

      {examsDoc && examsDoc.past_exams && (
        <div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setExamsDoc(null) }}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
            </div>
            <div className="px-5 pt-4 pb-3 flex items-start justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Provas antigas
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {examsDoc.name}
                </p>
              </div>
              <button
                onClick={() => setExamsDoc(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <X size={15} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-2">
              {examsDoc.past_exams.map((exam) => (
                <a
                  key={exam.url}
                  href={exam.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.01]"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <span>{exam.label}</span>
                  <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function DocenteCard({
  doc,
  index,
  highlight,
  onOpenExams,
}: {
  doc: Docente
  index: number
  highlight?: string
  onOpenExams: (doc: Docente) => void
}) {
  const initials = getInitials(doc.name)
  const hue = nameToHue(doc.name)

  const avatarBg = `hsla(${hue}, 60%, 55%, 0.15)`
  const avatarBorder = `hsla(${hue}, 60%, 55%, 0.35)`
  const avatarColor = `hsl(${hue}, 70%, 70%)`

  // Extract 2-3 area tags
  const areasTags = doc.areas
    .split(/[,;]/)
    .map(a => a.trim())
    .filter(a => a.length > 3 && a.length < 40)
    .slice(0, 3)

  // Highlight matching text
  const highlightText = (text: string): ReactNode => {
    if (!highlight?.trim()) return text
    const idx = text.toLowerCase().indexOf(highlight.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', borderRadius: 3, padding: '0 2px' }}>
          {text.slice(idx, idx + highlight.length)}
        </mark>
        {text.slice(idx + highlight.length)}
      </>
    )
  }

  return (
    <div
      className="card-hover flex flex-col gap-3 animate-in"
      style={{
        animationDelay: `${Math.min(index * 0.035, 0.5)}s`,
        animationFillMode: 'both',
        borderLeft: `3px solid hsla(${hue}, 70%, 58%, 0.55)`,
      }}
    >
      {/* Top row: avatar + name/email/room */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold font-display"
          style={{
            background: avatarBg,
            border: `1px solid ${avatarBorder}`,
            color: avatarColor,
            letterSpacing: '0.05em',
          }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {highlightText(doc.name)}
          </p>

          <a
            href={`mailto:${doc.email}`}
            className="flex items-center gap-1.5 mt-1 text-xs transition-opacity hover:opacity-70 truncate"
            style={{ color: 'var(--accent-3)' }}
          >
            <Mail size={11} />
            <span className="truncate">{doc.email}</span>
          </a>

          {doc.room && (
            <div className="flex items-center gap-1.5 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <MapPin size={11} />
              <span>{doc.room}</span>
            </div>
          )}
        </div>
      </div>

      {/* Area tags */}
      <div className="flex flex-wrap gap-1.5">
        {areasTags.map((tag, i) => (
          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: `hsla(${hue}, 60%, 55%, 0.12)`,
                  border: `1px solid hsla(${hue}, 60%, 55%, 0.25)`,
                  color: `hsl(${hue}, 70%, ${hue > 180 ? 50 : 65}%)`,
                }}>
            {tag.length > 30 ? tag.slice(0, 28) + '…' : tag}
          </span>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: 'var(--border)' }} />

      {/* Full areas */}
      <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>
        {highlightText(doc.areas)}
      </p>

      {/* Links */}
      {(doc.lattes || doc.personal || doc.past_exams?.length) && (
        <div className="flex items-center gap-2 mt-auto pt-1">
          {doc.past_exams?.length && (
            <button
              onClick={() => onOpenExams(doc)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-1)'; e.currentTarget.style.color = 'var(--accent-3)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <BookOpen size={11} /> Provas antigas
            </button>
          )}
          {doc.lattes && (
            <a
              href={doc.lattes}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-1)'; e.currentTarget.style.color = 'var(--accent-3)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <ExternalLink size={11} /> Lattes
            </a>
          )}
          {doc.personal && (
            <a
              href={doc.personal}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-1)'; e.currentTarget.style.color = 'var(--accent-3)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <ExternalLink size={11} /> Site
            </a>
          )}
        </div>
      )}
    </div>
  )
}
