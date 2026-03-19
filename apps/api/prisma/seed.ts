/**
 * Seed completo do DaSIboard v2
 * Migra todos os dados dos arquivos JSON estáticos do projeto original.
 * Execute: pnpm db:seed
 */

import { PrismaClient, EventType, MaterialType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DAY_MAP: Record<string, number> = {
  Domingo: 0, Segunda: 1, Terça: 2, Quarta: 3, Quinta: 4, Sexta: 5, Sábado: 6,
}
const TURMA_CODE_MAP: Record<string, string> = {
  '02': '2026102', '04': '2026104', '94': '2026194',
}

// ─── Entidades (10 do projeto original) ──────────────────────────────────────

const ENTIDADES = [
  { slug: 'dasi', name: 'DASI', fullName: 'Diretório Acadêmico de Sistemas de Informação', type: 'Diretório Acadêmico', colorPrimary: '#7c3aed', colorSecondary: '#c084fc', emoji: '🎓', email: 'dasi.usp@gmail.com', links: [{ label: 'Instagram @dasiusp', url: 'https://instagram.com/dasiusp', icon: 'instagram' }, { label: 'Site oficial', url: '#', icon: 'globe' }], description: 'Órgão representativo máximo dos estudantes de SI da USP/EACH. O DASI organiza eventos, promove a integração da turma, representa os alunos junto à administração.' },
  { slug: 'semana-si', name: 'Semana de SI', fullName: 'Semana de Sistemas de Informação da USP', type: 'Evento Acadêmico', colorPrimary: '#0ea5e9', colorSecondary: '#7dd3fc', emoji: '🚀', email: 'semana.si@usp.br', links: [{ label: 'Instagram @semanadesi', url: 'https://instagram.com/semanadesi', icon: 'instagram' }], description: 'O maior evento acadêmico do curso de SI da USP, com palestras, workshops, hackathons e networking com empresas.' },
  { slug: 'grace', name: 'GRACE USP', fullName: 'GRACE — Garotas em Computação e Empreendedorismo', type: 'Grupo de Afinidade', colorPrimary: '#ec4899', colorSecondary: '#f9a8d4', emoji: '💜', email: 'grace.usp@gmail.com', links: [{ label: 'Instagram @graceusp', url: 'https://instagram.com/graceusp', icon: 'instagram' }], description: 'Grupo voltado para inclusão e representatividade de mulheres na área de Computação e Empreendedorismo na USP.' },
  { slug: 'each-in-the-shell', name: 'EiTS', fullName: 'EiTS — Each in the Shell', type: 'Competição', colorPrimary: '#10b981', colorSecondary: '#6ee7b7', emoji: '🐚', email: 'eachintheshell@usp.br', links: [{ label: 'Instagram @eachintheshell', url: 'https://instagram.com/eachintheshell', icon: 'instagram' }], description: 'Competição de programação, CTF e segurança da EACH-USP com cases desafiadores em diversas áreas da computação.' },
  { slug: 'hype', name: 'Hype', fullName: 'Hype — Data & AI', type: 'Grupo de Empreendedorismo', colorPrimary: '#f97316', colorSecondary: '#fdba74', emoji: '⚡', email: 'hype.each@gmail.com', links: [{ label: 'Instagram @hype.usp', url: 'https://instagram.com/hype.usp', icon: 'instagram' }], description: 'Grupo focado em Data Science, Machine Learning e empreendedorismo tecnológico no ecossistema USP.' },
  { slug: 'codelab', name: 'CodeLab', fullName: 'USPCodeLab Leste', type: 'Liga de Desenvolvimento', colorPrimary: '#6366f1', colorSecondary: '#a5b4fc', emoji: '💻', email: 'codelab.each@gmail.com', links: [{ label: 'GitHub', url: '#', icon: 'github' }, { label: 'Instagram @uspcodelableste', url: 'https://instagram.com/uspcodelableste', icon: 'instagram' }], description: 'Liga de desenvolvimento de software open source da USP Leste, com projetos reais, hackathons e formação técnica.' },
  { slug: 'lab-das-minas', name: 'Lab das Minas', fullName: 'Lab das Minas', type: 'Coletivo', colorPrimary: '#d946ef', colorSecondary: '#f0abfc', emoji: '🔬', email: 'labdasminas@usp.br', links: [{ label: 'Instagram @labdasminas', url: 'https://instagram.com/labdasminas', icon: 'instagram' }], description: 'Coletivo dedicado à inclusão e empoderamento de mulheres na ciência e tecnologia dentro da USP.' },
  { slug: 'conway', name: 'Conway', fullName: 'Conway USP', type: 'Liga Acadêmica', colorPrimary: '#14b8a6', colorSecondary: '#99f6e4', emoji: '🧮', email: 'conway.each@usp.br', links: [{ label: 'Instagram @conway_usp', url: 'https://instagram.com/conway_usp', icon: 'instagram' }], description: 'Liga acadêmica com foco em game dev, computação gráfica e os fundamentos matemáticos por trás das imagens interativas.' },
  { slug: 'pet-si', name: 'PET-SI', fullName: 'PET-SI — Programa de Educação Tutorial', type: 'Programa Federal', colorPrimary: '#f59e0b', colorSecondary: '#fde68a', emoji: '🏅', email: 'pet.si@usp.br', links: [{ label: 'Site PET-SI', url: '#', icon: 'globe' }, { label: 'Instagram @petsieach', url: 'https://instagram.com/petsieach', icon: 'instagram' }], description: 'Programa federal de excelência acadêmica (MEC) que apoia pesquisa, ensino e extensão de alto impacto no curso de SI-USP.' },
  { slug: 'sintese-jr', name: 'Síntese Jr.', fullName: 'Síntese Jr. — Empresa Júnior de SI', type: 'Empresa Júnior', colorPrimary: '#ef4444', colorSecondary: '#fca5a5', emoji: '💼', email: 'contato@sintesejr.com.br', links: [{ label: 'Site', url: '#', icon: 'globe' }, { label: 'Instagram @sintesejr', url: 'https://instagram.com/sintesejr', icon: 'instagram' }], description: 'Empresa júnior do curso de SI da USP/EACH, com projetos reais de software, consultoria em TI e transformação digital.' },
]

// ─── Eventos (36 do projeto original) ────────────────────────────────────────

const EVENTS: {
  date: string; title: string; description: string
  type: EventType; turmas: string[]; entidadeSlug?: string
}[] = [
  { date: '2026-03-14', title: 'Fim das inscrições Each in the Shell', description: 'Prazo de inscrição encerra.', type: 'deadline', turmas: [], entidadeSlug: 'each-in-the-shell' },
  { date: '2026-03-14', title: 'Inscrições Semana de SI', description: 'Abertura das inscrições para o evento.', type: 'evento', turmas: [], entidadeSlug: 'semana-si' },
  { date: '2026-03-15', title: "Pesquisa 'A Terceira Onda'", description: 'Resumo de no mínimo 3 páginas sobre a obra de Alvin Toffler.', type: 'entrega', turmas: ['2026102'] },
  { date: '2026-03-16', title: 'Exclusivo noturno — teste', description: 'Evento de teste para turma noturna.', type: 'deadline', turmas: ['2026104'] },
  { date: '2026-03-16', title: 'Liberação dos Cases Each in the Shell', description: 'Cases da competição disponibilizados.', type: 'evento', turmas: [], entidadeSlug: 'each-in-the-shell' },
  { date: '2026-03-18', title: 'Palestra: Bate-papo com Tiago Fraga', description: 'Palestra aberta para todos os alunos de SI.', type: 'evento', turmas: [] },
  { date: '2026-03-20', title: 'Reunião Geral DASI', description: 'Reunião aberta com todos os estudantes do curso. Pauta: orçamento semestral e projetos.', type: 'evento', turmas: [], entidadeSlug: 'dasi' },
  { date: '2026-03-23', title: 'Conceitos de GameDev na Computação', description: 'Workshop introdutório de desenvolvimento de jogos organizado pela Conway.', type: 'evento', turmas: [], entidadeSlug: 'conway' },
  { date: '2026-03-28', title: 'Semana de SI 2026 — Abertura', description: 'Cerimônia de abertura oficial da Semana de SI.', type: 'evento', turmas: [], entidadeSlug: 'semana-si' },
  { date: '2026-04-01', title: 'Palestra: Mercado de Trabalho em TI', description: 'Profissionais do setor compartilham experiências e dicas de carreira.', type: 'evento', turmas: [] },
  { date: '2026-04-05', title: 'P1 — Resolução de Problemas I', description: 'Primeira prova da disciplina ACH0041.', type: 'prova', turmas: ['2026102', '2026104', '2026194'] },
  { date: '2026-04-07', title: 'Entrega — Trabalho de Fundamentos de SI', description: 'Entrega do trabalho individual via JupiterWeb.', type: 'entrega', turmas: ['2026102', '2026104', '2026194'] },
  { date: '2026-04-10', title: 'Deadline: Processo Seletivo AcaDASI', description: 'Último dia para inscrição no programa de monitoria do DASI.', type: 'deadline', turmas: [], entidadeSlug: 'dasi' },
  { date: '2026-04-15', title: 'P1 — Introdução à Programação', description: 'Primeira avaliação prática da disciplina ACH2001.', type: 'prova', turmas: ['2026102', '2026104', '2026194'] },
  { date: '2026-04-18', title: 'Hackathon CodeLab 2026', description: 'Hackathon de 24h organizado pela USPCodeLab Leste. Tema: Sustentabilidade e Tecnologia.', type: 'evento', turmas: [], entidadeSlug: 'codelab' },
  { date: '2026-04-20', title: 'Workshop: Introdução ao Git e GitHub', description: 'Workshop prático de controle de versão para calouros. Presencial.', type: 'evento', turmas: [] },
  { date: '2026-04-25', title: 'Entrega — EP1 Introdução à Programação', description: 'Primeiro exercício-programa da disciplina. Submissão pelo Moodle.', type: 'entrega', turmas: ['2026102', '2026104', '2026194'] },
  { date: '2026-05-02', title: 'Prazo: Desistência sem ônus', description: 'Último dia para desistir de disciplinas sem reprovação no histórico.', type: 'deadline', turmas: [] },
  { date: '2026-05-10', title: 'P2 — Resolução de Problemas I', description: 'Segunda prova da disciplina ACH0041.', type: 'prova', turmas: ['2026102', '2026104', '2026194'] },
  { date: '2026-05-12', title: 'Evento GRACE USP — Mulheres em Tech', description: 'Painel com mulheres líderes em tecnologia e carreiras em TI.', type: 'evento', turmas: [], entidadeSlug: 'grace' },
  { date: '2026-05-15', title: 'P2 — Cálculo I', description: 'Segunda prova de Cálculo I (ACH2011).', type: 'prova', turmas: ['2026102', '2026194'] },
  { date: '2026-05-20', title: 'Entrega — Projeto de Análise de Dados', description: 'Entrega do projeto prático de Tratamento e Análise de Dados.', type: 'entrega', turmas: ['2026102', '2026104', '2026194'] },
  { date: '2026-05-25', title: 'Série de Palestras PET-SI', description: 'Palestras técnicas sobre pesquisa e carreira acadêmica.', type: 'evento', turmas: [], entidadeSlug: 'pet-si' },
  { date: '2026-06-01', title: 'P3 (Substitutiva) — Introdução à Programação', description: 'Prova substitutiva opcional para alunos com nota abaixo de 5.', type: 'prova', turmas: ['2026102', '2026104', '2026194'] },
  { date: '2026-06-05', title: 'Entrega Final — EP2 Introdução à Programação', description: 'Segundo e último exercício-programa. Submissão pelo Moodle.', type: 'entrega', turmas: ['2026102', '2026104', '2026194'] },
  { date: '2026-06-10', title: 'Apresentações — Projeto de Fundamentos de SI', description: 'Apresentações dos projetos finais para a turma e professores.', type: 'apresentacao', turmas: ['2026102', '2026104', '2026194'] },
  { date: '2026-06-15', title: 'Recesso: Corpus Christi', description: 'Feriado nacional — sem aulas.', type: 'evento', turmas: [] },
  { date: '2026-06-20', title: 'Provas Finais — Semana 1', description: 'Início das provas finais do semestre 2026.1.', type: 'prova', turmas: [] },
  { date: '2026-06-22', title: 'Provas Finais — Semana 2', description: 'Continuação das provas finais.', type: 'prova', turmas: [] },
  { date: '2026-06-27', title: 'Provas Substitutivas', description: 'Provas de recuperação para alunos com média inferior a 5.', type: 'prova', turmas: [] },
  { date: '2026-06-30', title: 'Encerramento do Semestre 2026.1', description: 'Último dia de lançamento de notas no Júpiter Web.', type: 'deadline', turmas: [] },
  { date: '2026-07-15', title: 'Abertura de Matrículas 2026.2', description: 'Sistema de matrículas abre para o segundo semestre.', type: 'deadline', turmas: [] },
  { date: '2026-07-28', title: 'Início do Semestre 2026.2', description: 'Começo oficial das aulas do segundo semestre de 2026.', type: 'evento', turmas: [] },
  { date: '2026-08-05', title: 'Processo Seletivo Síntese Jr.', description: 'Inscrições abertas para a empresa júnior de SI. Vagas em dev, design e gestão.', type: 'deadline', turmas: [], entidadeSlug: 'sintese-jr' },
  { date: '2026-08-10', title: 'Workshop: Machine Learning com Python — Hype', description: 'Introdução prática a scikit-learn, pandas e visualização de dados.', type: 'evento', turmas: [], entidadeSlug: 'hype' },
  { date: '2026-10-01', title: 'Eleições DASI 2026', description: 'Processo eleitoral para a nova gestão do Diretório Acadêmico. Vote!', type: 'evento', turmas: [], entidadeSlug: 'dasi' },
]

// ─── Grade Horária (turmas 2026102, 2026104, 2026194) ─────────────────────────

const SCHEDULE: {
  semId: string; turma: string; day: string; time: string
  code: string; course: string; room: string; professor: string
}[] = [
  // 1º Semestre — Turma 02 (Diurna)
  { semId: '1', turma: '02', day: 'Quarta', time: '08:00-12:00', code: 'ACH0041', course: 'Resolução de Problemas I', room: 'Térreo - Bloco I Sala 03', professor: 'Karla Sampaio / Káthia Honório' },
  { semId: '1', turma: '02', day: 'Terça',  time: '08:00-09:45', code: 'ACH0021', course: 'Tratamento e Análise de Dados e Informações', room: '1° Andar - Sala 112', professor: 'Patrícia Rufino' },
  { semId: '1', turma: '02', day: 'Quarta', time: '10:15-12:00', code: 'ACH0111', course: 'Ciências da Natureza — Ciências da Vida', room: 'Térreo - Bloco I Sala 09', professor: 'Marcos Hara' },
  { semId: '1', turma: '02', day: 'Quinta', time: '08:00-09:45', code: 'ACH2001', course: 'Introdução à Programação', room: 'Térreo - Bloco II Lab 01', professor: 'A definir' },
  { semId: '1', turma: '02', day: 'Sexta',  time: '08:00-09:45', code: 'ACH2011', course: 'Cálculo I', room: '1° Andar - Sala 110', professor: 'A definir' },
  { semId: '1', turma: '02', day: 'Terça',  time: '10:15-12:00', code: 'ACH2014', course: 'Fundamentos de Sistemas de Informação', room: '1° Andar - Sala 113', professor: 'A definir' },
  { semId: '1', turma: '02', day: 'Quinta', time: '10:15-12:00', code: 'ACH0131', course: 'Ciências da Natureza — Ciência, Cultura e Sociedade', room: 'Térreo - Bloco I Sala 05', professor: 'A definir' },
  { semId: '1', turma: '02', day: 'Sexta',  time: '10:15-12:00', code: 'ACH0141', course: 'Sociedade, Multiculturalismo e Direitos', room: '1° Andar - Sala 111', professor: 'A definir' },
  // 1º Semestre — Turma 04 (Noturna)
  { semId: '1', turma: '04', day: 'Segunda', time: '19:00-22:40', code: 'ACH0041', course: 'Resolução de Problemas I', room: 'Térreo - Bloco II Salas RP', professor: 'Luciano Antonio Digiampietri' },
  { semId: '1', turma: '04', day: 'Terça',   time: '19:00-20:40', code: 'ACH0021', course: 'Tratamento e Análise de Dados e Informações', room: '1° Andar - Sala 112', professor: 'Patrícia Rufino' },
  { semId: '1', turma: '04', day: 'Quarta',  time: '19:00-20:40', code: 'ACH2001', course: 'Introdução à Programação', room: 'Térreo - Lab 02', professor: 'A definir' },
  { semId: '1', turma: '04', day: 'Quinta',  time: '19:00-20:40', code: 'ACH2011', course: 'Cálculo I', room: '1° Andar - Sala 110', professor: 'A definir' },
  { semId: '1', turma: '04', day: 'Terça',   time: '21:00-22:40', code: 'ACH2014', course: 'Fundamentos de Sistemas de Informação', room: '1° Andar - Sala 113', professor: 'A definir' },
  { semId: '1', turma: '04', day: 'Quarta',  time: '21:00-22:40', code: 'ACH0111', course: 'Ciências da Natureza — Ciências da Vida', room: 'Térreo - Sala 09', professor: 'A definir' },
  { semId: '1', turma: '04', day: 'Quinta',  time: '21:00-22:40', code: 'ACH0131', course: 'Ciências da Natureza — Ciência, Cultura e Sociedade', room: 'Térreo - Sala 05', professor: 'A definir' },
  { semId: '1', turma: '04', day: 'Sexta',   time: '19:00-20:40', code: 'ACH0141', course: 'Sociedade, Multiculturalismo e Direitos', room: '1° Andar - Sala 111', professor: 'A definir' },
  // 1º Semestre — Turma 94 (Noturna)
  { semId: '1', turma: '94', day: 'Segunda', time: '19:00-22:40', code: 'ACH0041', course: 'Resolução de Problemas I', room: 'Térreo - Bloco II Salas RP', professor: 'A definir' },
  { semId: '1', turma: '94', day: 'Terça',   time: '19:00-20:40', code: 'ACH0021', course: 'Tratamento e Análise de Dados e Informações', room: '1° Andar - Sala 114', professor: 'A definir' },
  { semId: '1', turma: '94', day: 'Quarta',  time: '19:00-20:40', code: 'ACH2001', course: 'Introdução à Programação', room: 'Térreo - Lab 03', professor: 'A definir' },
  { semId: '1', turma: '94', day: 'Quinta',  time: '19:00-20:40', code: 'ACH2011', course: 'Cálculo I', room: '1° Andar - Sala 108', professor: 'A definir' },
  { semId: '1', turma: '94', day: 'Terça',   time: '21:00-22:40', code: 'ACH2014', course: 'Fundamentos de Sistemas de Informação', room: '1° Andar - Sala 115', professor: 'A definir' },
  { semId: '1', turma: '94', day: 'Quarta',  time: '21:00-22:40', code: 'ACH0111', course: 'Ciências da Natureza — Ciências da Vida', room: 'Térreo - Sala 10', professor: 'A definir' },
  { semId: '1', turma: '94', day: 'Quinta',  time: '21:00-22:40', code: 'ACH0131', course: 'Ciências da Natureza — Ciência, Cultura e Sociedade', room: 'Térreo - Sala 06', professor: 'A definir' },
  { semId: '1', turma: '94', day: 'Sexta',   time: '19:00-20:40', code: 'ACH0141', course: 'Sociedade, Multiculturalismo e Direitos', room: '1° Andar - Sala 109', professor: 'A definir' },
]

// ─── Materiais de estudo (11 do projeto original + extras) ───────────────────

const STUDY_MATERIALS: {
  title: string; type: MaterialType; area: string
  discipline?: string; author?: string; url?: string; tags: string[]
}[] = [
  { title: 'Resumo de Estruturas de Dados', type: 'pdf', area: 'Computação', discipline: 'Algoritmos e Estruturas de Dados', author: 'Alex J.S.', tags: ['algoritmos', 'python', 'estruturas-de-dados'] },
  { title: 'Introduction to Algorithms (CLRS)', type: 'livro', area: 'Algoritmos', author: 'Cormen, Leiserson, Rivest, Stein', url: 'https://mitpress.mit.edu/9780262046305/', tags: ['algoritmos', 'estruturas-de-dados', 'inglês', 'referência'] },
  { title: 'CS50 — Introduction to Computer Science', type: 'curso', area: 'Programação', url: 'https://cs50.harvard.edu/x/', tags: ['programação', 'c', 'python', 'web', 'harvard', 'gratuito'] },
  { title: 'MDN Web Docs', type: 'link', area: 'Desenvolvimento Web', url: 'https://developer.mozilla.org/', tags: ['web', 'html', 'css', 'javascript', 'referência'] },
  { title: 'Python para Análise de Dados', type: 'livro', area: 'Ciência de Dados', discipline: 'Tratamento e Análise de Dados e Informações', author: 'Wes McKinney', url: 'https://wesmckinney.com/book/', tags: ['python', 'pandas', 'análise-de-dados', 'gratuito-online'] },
  { title: 'The Pragmatic Programmer', type: 'livro', area: 'Engenharia de Software', author: 'Dave Thomas, Andrew Hunt', url: 'https://pragprog.com/titles/tpp20/', tags: ['engenharia-de-software', 'boas-práticas', 'carreira'] },
  { title: 'Visualização de Dados com Python', type: 'artigo', area: 'Ciência de Dados', discipline: 'Tratamento e Análise de Dados e Informações', tags: ['visualização', 'matplotlib', 'seaborn', 'python'] },
  { title: 'Fundamentos de SQL — Curso Prático', type: 'curso', area: 'Banco de Dados', discipline: 'Bancos de Dados 1', url: 'https://sqlzoo.net/', tags: ['sql', 'banco-de-dados', 'gratuito'] },
  { title: 'Clean Code', type: 'livro', area: 'Engenharia de Software', author: 'Robert C. Martin', url: 'https://www.oreilly.com/library/view/clean-code-a/9780136083238/', tags: ['clean-code', 'boas-práticas', 'java'] },
  { title: 'Anotações de Cálculo I — Comunidade SI', type: 'pdf', area: 'Matemática', discipline: 'Cálculo I', author: 'Comunidade SI-USP', tags: ['cálculo', 'matemática', 'resumo', 'si-usp'] },
  { title: 'Slides — Fundamentos de Sistemas de Informação', type: 'pdf', area: 'Sistemas de Informação', discipline: 'Fundamentos de Sistemas de Informação', tags: ['sistemas-de-informação', 'slides', 'teoria'] },
]

// ─── Newsletters ──────────────────────────────────────────────────────────────

const NEWSLETTERS = [
  {
    entidadeSlug: null as string | null,
    title: 'DaSIboard v2 — Bem-vindos ao novo sistema!',
    summary: 'O dashboard acadêmico de SI agora tem backend próprio, login e sincronização em nuvem.',
    content: 'O DaSIboard foi completamente reconstruído!\n\nNovidades:\n- Login com conta própria (sem Google/Firebase)\n- Kanban salvo na nuvem — acessível em qualquer dispositivo\n- Notas & GPA sincronizados por usuário\n- Controle de faltas com limite de 30%\n- Fluxograma curricular completo com todos os 8 semestres\n\nCrie sua conta em /signup e experimente!',
    publishedAt: new Date('2026-03-18'),
  },
  {
    entidadeSlug: 'dasi',
    title: 'Bem-vindos ao 1º Semestre de 2026!',
    summary: 'Calouros e veteranos, o DASI inicia o semestre com novidades: novos projetos, eventos culturais e oportunidades de monitoria.',
    content: 'O DASI dá as boas-vindas a todos os alunos de SI para o semestre 2026.1!\n\nDestaques:\n- Abertura do processo seletivo AcaDASI\n- Parceria com entidades para workshops\n- Processo eleitoral da nova gestão em outubro\n\nContato: Instagram @dasiusp',
    publishedAt: new Date('2026-03-14'),
  },
  {
    entidadeSlug: 'dasi',
    title: 'Reunião Geral DASI — Resumo e próximos passos',
    summary: 'A Reunião Geral reuniu mais de 60 alunos. Confira as decisões tomadas e os projetos aprovados.',
    content: 'Principais deliberações:\n- Aprovação do orçamento semestral\n- Abertura de vagas nos departamentos de Comunicação, Eventos e TI\n- Confirmação da parceria com a Semana de SI\n\nPróxima reunião: 24 de abril, às 19h.',
    publishedAt: new Date('2026-03-22'),
  },
  {
    entidadeSlug: 'semana-si',
    title: 'Inscrições abertas para a Semana de SI 2026',
    summary: 'O evento mais esperado do ano está chegando. Palestras, workshops e muito networking te esperam.',
    content: 'A Semana de SI 2026 está confirmada!\n\nProgramação:\n- Palestras com profissionais de TI\n- Workshops práticos de programação\n- Feira de empresas e estágios\n- Competição de projetos acadêmicos\n\nInscreva-se: Instagram @semanadesi',
    publishedAt: new Date('2026-03-14'),
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed completo do DaSIboard v2...\n')

  // Usuários
  const adminHash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dasiboard.local' },
    update: {},
    create: { email: 'admin@dasiboard.local', passwordHash: adminHash, displayName: 'Admin DaSIboard', role: 'ADMIN' },
  })

  const demoHash = await bcrypt.hash('demo123', 12)
  await prisma.user.upsert({
    where: { email: 'aluno@dasiboard.local' },
    update: {},
    create: { email: 'aluno@dasiboard.local', passwordHash: demoHash, displayName: 'Aluno Demo', role: 'USER', turma: '2026102' },
  })
  console.log('✅ Usuários: admin@dasiboard.local / admin123 | aluno@dasiboard.local / demo123')

  // Entidades
  const entidadeMap: Record<string, string> = {}
  for (const e of ENTIDADES) {
    const rec = await prisma.entidade.upsert({
      where: { slug: e.slug },
      update: { name: e.name, fullName: e.fullName, type: e.type, colorPrimary: e.colorPrimary, colorSecondary: e.colorSecondary, emoji: e.emoji, email: e.email, links: e.links, description: e.description },
      create: { ...e },
    })
    entidadeMap[e.slug] = rec.id
  }
  console.log(`✅ ${ENTIDADES.length} entidades`)

  // Newsletters
  for (const n of NEWSLETTERS) {
    await prisma.newsletterIssue.create({
      data: {
        entidadeId: n.entidadeSlug ? entidadeMap[n.entidadeSlug] : undefined,
        title: n.title, summary: n.summary, content: n.content,
        publishedAt: n.publishedAt, createdById: admin.id,
      },
    })
  }
  console.log(`✅ ${NEWSLETTERS.length} newsletters`)

  // Eventos
  for (const ev of EVENTS) {
    await prisma.event.create({
      data: {
        title: ev.title, description: ev.description,
        date: new Date(ev.date + 'T12:00:00.000Z'),
        type: ev.type, turmas: ev.turmas, status: 'published',
        entidadeId: ev.entidadeSlug ? entidadeMap[ev.entidadeSlug] : undefined,
        createdById: admin.id,
      },
    })
  }
  console.log(`✅ ${EVENTS.length} eventos`)

  // Grade horária
  for (const s of SCHEDULE) {
    const turmaCode = TURMA_CODE_MAP[s.turma]!
    const semester = parseInt(s.semId)
    const [ts, te] = s.time.split('-')
    await prisma.scheduleSlot.create({
      data: {
        turmaCode, semester,
        dayOfWeek: DAY_MAP[s.day] ?? 0,
        timeStart: ts?.trim() ?? '',
        timeEnd: te?.trim() ?? '',
        courseName: s.course,
        courseCode: s.code,
        room: s.room,
        professor: s.professor,
      },
    })
  }
  console.log(`✅ ${SCHEDULE.length} slots de horário (3 turmas)`)

  // Materiais de estudo
  for (const m of STUDY_MATERIALS) {
    await prisma.studyMaterial.create({
      data: { ...m, createdById: admin.id },
    })
  }
  console.log(`✅ ${STUDY_MATERIALS.length} materiais de estudo`)

  console.log('\n🎉 Seed concluído!')
  console.log('────────────────────────────────────────')
  console.log('  Admin: admin@dasiboard.local  / admin123')
  console.log('  Demo:  aluno@dasiboard.local  / demo123')
  console.log('────────────────────────────────────────')
}

main()
  .catch((err) => { console.error('\n❌ Seed falhou:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
