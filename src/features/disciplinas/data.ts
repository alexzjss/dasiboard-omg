export type Discipline = { code: string; name: string; credAula: number; credTrab: number; ch: number; ce?: number; cp?: number; atpa?: number; ext?: number; driveUrl?: string; prereqs?: { code: string; name: string; type: string }[] }
export type Period = { label: string; disciplines: Discipline[] }

// GitHub DriveEACH/drivesi URLs — only disciplines that have a folder in the repo
const BASE = 'https://github.com/driveeach/drivesi/tree/master'
const OBR  = `${BASE}/Materias%20Obrigatorias`
const OPT  = `${BASE}/Materias%20Optativas`
export const DRIVE_URLS: Record<string, string> = {
  // ── Obrigatórias ──
  // 1º Semestre
  'ACH2011': `${OBR}/1%C2%BA%20Semestre/Calc%20I%20-%20Ca%CC%81lculo%20I`,
  'ACH2014': `${OBR}/1%C2%BA%20Semestre/FSI%20-%20Fundamentos%20de%20Sistemas%20de%20Informac%CC%A7a%CC%83o`,
  'ACH2001': `${OBR}/1%C2%BA%20Semestre/IP%20-%20Introduc%CC%A7a%CC%83o%20a%20Programac%CC%A7a%CC%83o`,
  // 2º Semestre
  'ACH2023': `${OBR}/2%C2%BA%20Semestre/AED%20I%20-%20Algoritmos%20e%20Estruturas%20de%20Dados%20I`,
  'ACH2012': `${OBR}/2%C2%BA%20Semestre/Calc%20II%20-%20Ca%CC%81lculo%20II`,
  'ACH2002': `${OBR}/2%C2%BA%20Semestre/IAA%20-%20Introduc%CC%A7a%CC%83o%20a%CC%80%20Ana%CC%81lise%20de%20Algoritmos`,
  'ACH2013': `${OBR}/2%C2%BA%20Semestre/MD%20-%20Matema%CC%81tica%20Discreta%20I`,
  'ACH2033': `${OBR}/2%C2%BA%20Semestre/MVGA%20-%20Matrizes,%20Vetores%20e%20Geometria%20Anali%CC%81tica`,
  // 3º Semestre
  'ACH2024': `${OBR}/3%C2%BA%20Semestre/AED%20II%20-%20Algoritmos%20e%20Estruturas%20de%20Dados%20II`,
  'ACH2003': `${OBR}/3%C2%BA%20Semestre/COO%20-%20Computac%CC%A7a%CC%83o%20Orientada%20a%20Objetos`,
  'ACH2063': `${OBR}/3%C2%BA%20Semestre/IAC%20-%20Introduc%CC%A7a%CC%83o%20a%CC%80%20Administrac%CC%A7a%CC%83o%20para%20Computac%CC%A7a%CC%83o`,
  'ACH2053': `${OBR}/3%C2%BA%20Semestre/IE%20-%20Introduc%CC%A7a%CC%83o%20a%CC%80%20Estati%CC%81stica`,
  'ACH2034': `${OBR}/3%C2%BA%20Semestre/OAC%20I%20-%20Organizac%CC%A7a%CC%83o%20e%20Arquitetura%20de%20Computadores%20I`,
  // 4º Semestre
  'ACH2055': `${OBR}/4%C2%BA%20Semestre/AC%20-%20Arquitetura%20de%20Computadores`,
  'ACH2004': `${OBR}/4%C2%BA%20Semestre/BD%20-%20Banco%20de%20Dados`,
  'ACH2043': `${OBR}/4%C2%BA%20Semestre/ITC%20-%20Introduc%CC%A7a%CC%83o%20a%CC%80%20Teoria%20da%20Computac%CC%A7a%CC%83o`,
  'ACH2036': `${OBR}/4%C2%BA%20Semestre/MQAAE%20-%20Me%CC%81todos%20Quantitativos%20Aplicados%20a%CC%80%20Administrac%CC%A7a%CC%83o%20de%20Empresas%20I`,
  'ACH2026': `${OBR}/6%C2%BA%20Semestre/RC%20-%20Redes%20de%20Computadores`,
  'ACH2044': `${OBR}/4%C2%BA%20Semestre/SO%20-%20Sistemas%20Operacionais`,
  // 5º Semestre
  'ACH2005': `${OBR}/5%C2%BA%20Semestre/IHC%20-%20Ana%CC%81lise,%20Projeto%20e%20Interface%20Humano-Computador`,
  'ACH2016': `${OBR}/5%C2%BA%20Semestre/IA%20-%20Intelige%CC%82ncia%20Artificial`,
  'ACH2025': `${OBR}/5%C2%BA%20Semestre/LBD%20-%20Laborato%CC%81rio%20de%20Bancos%20de%20Dados`,
  'ACH2147': `${OBR}/5%C2%BA%20Semestre/DSID%20-%20Desenvolvimento%20de%20Sistemas%20de%20Informa%C3%A7%C3%A3o%20Distribu%C3%ADdos`,
  // 6º Semestre
  'ACH0042': `${OBR}/6%C2%BA%20Semestre/RP%20II%20-%20Resoluc%CC%A7a%CC%83o%20de%20Problemas%20II`,
  'ACH2006': `${OBR}/6%C2%BA%20Semestre/ESI%20I%20-%20Engenharia%20de%20Sistemas%20de%20Informac%CC%A7a%CC%83o%20I`,
  'ACH2027': `${OBR}/6%C2%BA%20Semestre/PGP%20-%20Pra%CC%81tica%20e%20Gerenciamento%20de%20Projetos`,
  // 7º Semestre
  'ACH2017': `${OBR}/7%C2%BA%20Semestre/PSG%20I%20-%20Projeto%20Supervisionado%20ou%20de%20Graduac%CC%A7a%CC%83o%20I`,
  // 8º Semestre
  'ACH2008': `${OBR}/8%C2%BA%20Semestre/EI%20-%20Empreendedores%20em%20Informatica`,
  'ACH2018': `${OBR}/8%C2%BA%20Semestre/PSG%20II%20-%20Projeto%20Supervisionado%20ou%20de%20Graduac%CC%A7a%CC%83o%20II`,
  'ACH2098': `${OBR}/8%C2%BA%20Semestre/Web%20Sem%C3%A2ntica`,
  // ── Optativas ──
  // 7º Semestre
  'ACH2117': `${OPT}/7%C2%BA%20Semestre/CG%20-%20Computac%CC%A7a%CC%83o%20Gra%CC%81fica`,
  'ACH2107': `${OPT}/7%C2%BA%20Semestre/DP%20I%20-Desafios%20de%20Programac%CC%A7a%CC%83o%20I`,
  'ACH2067': `${OPT}/7%C2%BA%20Semestre/GPN%20-%20Gesta%CC%83o%20de%20Processos%20de%20Nego%CC%81cios`,
  'ACH2076': `${OPT}/7%C2%BA%20Semestre/SI%20-%20Seguranc%CC%A7a%20da%20Informac%CC%A7a%CC%83o`,
  'ACH2077': `${OPT}/7%C2%BA%20Semestre/SWSL%20-%20Soluc%CC%A7o%CC%83es%20Web%20Baseadas%20em%20Software%20Livre`,
  // 8º Semestre
  'ACH2108': `${OPT}/8%C2%BA%20Semestre/DP%20II%20-%20Desafios%20de%20Programac%CC%A7a%CC%83o%20II`,
  'ACH2078': `${OPT}/8%C2%BA%20Semestre/GE%20-%20Gesta%CC%83o%20Empresarial`,
}

export const obrigatoriasData: Period[] = [
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

export const optativasData: Period[] = [
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

