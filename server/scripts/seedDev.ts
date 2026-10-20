// Demo data for local development: `npm run seed:dev`.
// Creates fictitious @usp.br students, connections, pending requests and entity members in the
// DEVELOPMENT Supabase, plus the dev user that DEV_FAKE_SESSION=1 acts as. Safe to run again.
// Never run it against production: see the guards below.
import 'dotenv/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { looksLikeProduction } from './seedGuard.js'

type Seed = {
  handle: string; name: string; course: string; year: number; bio: string
  courses: string[]; showCourses?: 'all' | 'connections' | 'none'; showConnections?: 'all' | 'connections' | 'none'
  links?: Record<string, string>
}

// Real codes and names from src/features/disciplinas/data.ts.
const CATALOG: Record<string, string> = {
  ACH2001: 'Introdução à Programação',
  ACH2011: 'Cálculo I',
  ACH2014: 'Fundamentos de Sistemas de Informação',
  ACH2013: 'Matemática Discreta I',
  ACH2023: 'Algoritmos e Estruturas de Dados I',
  ACH2012: 'Cálculo II',
  ACH2002: 'Introdução à Análise de Algoritmos',
  ACH2033: 'Matrizes, Vetores e Geometria Analítica',
  ACH2024: 'Algoritmos e Estruturas de Dados II',
  ACH2003: 'Computação Orientada a Objetos',
  ACH2053: 'Introdução à Estatística',
  ACH2034: 'Organização e Arquitetura de Computadores I',
  ACH2004: 'Bancos de Dados 1',
  ACH2044: 'Sistemas Operacionais',
  ACH2005: 'Análise, Projeto e Interface Humano-Computador',
  ACH2016: 'Inteligência Artificial',
  ACH2006: 'Engenharia de Sistemas de Informação I',
}

const DEV_HANDLE = 'estudante'

const STUDENTS: Seed[] = [
  { handle: 'ana.lima', name: 'Ana Lima', course: 'Sistemas de Informação', year: 2025, bio: 'Primeiro ano, curiosa por dados e jogos.', courses: ['ACH2001', 'ACH2011', 'ACH2014', 'ACH2013'], links: { github: 'https://github.com/ana-lima-demo' } },
  { handle: 'bruno.souza', name: 'Bruno Souza', course: 'Sistemas de Informação', year: 2025, bio: 'Calouro, jogo xadrez nos intervalos.', courses: ['ACH2001', 'ACH2011', 'ACH2014', 'ACH2033'] },
  { handle: 'carla.mendes', name: 'Carla Mendes', course: 'Sistemas de Informação', year: 2024, bio: 'Estudando estruturas de dados e café.', courses: ['ACH2023', 'ACH2012', 'ACH2002', 'ACH2013'], links: { linkedin: 'https://www.linkedin.com/in/carla-mendes-demo' } },
  { handle: 'diego.rocha', name: 'Diego Rocha', course: 'Sistemas de Informação', year: 2024, bio: 'Back-end e música.', courses: ['ACH2023', 'ACH2012', 'ACH2002', 'ACH2033'], showCourses: 'connections' },
  { handle: 'elisa.martins', name: 'Elisa Martins', course: 'Sistemas de Informação', year: 2023, bio: 'Procurando grupo para o projeto de BD.', courses: ['ACH2024', 'ACH2003', 'ACH2053', 'ACH2034'] },
  { handle: 'felipe.costa', name: 'Felipe Costa', course: 'Sistemas de Informação', year: 2023, bio: 'Computação orientada a objetos e futebol.', courses: ['ACH2024', 'ACH2003', 'ACH2053', 'ACH2023'], showConnections: 'connections' },
  { handle: 'gabriela.alves', name: 'Gabriela Alves', course: 'Sistemas de Informação', year: 2023, bio: 'Interessada em IHC e design.', courses: ['ACH2004', 'ACH2044', 'ACH2005', 'ACH2003'], links: { instagram: 'https://www.instagram.com/gabi.demo' } },
  { handle: 'henrique.dias', name: 'Henrique Dias', course: 'Sistemas de Informação', year: 2022, bio: 'Sistemas operacionais e bicicleta.', courses: ['ACH2004', 'ACH2044', 'ACH2005'], showCourses: 'none' },
  { handle: 'isabela.nunes', name: 'Isabela Nunes', course: 'Sistemas de Informação', year: 2022, bio: 'Monitora de Introdução à Programação.', courses: ['ACH2016', 'ACH2004', 'ACH2006', 'ACH2001'] },
  { handle: 'joao.pereira', name: 'João Pereira', course: 'Sistemas de Informação', year: 2022, bio: 'IA, redes e muito suco de laranja.', courses: ['ACH2016', 'ACH2004', 'ACH2006'] },
  { handle: 'karina.freitas', name: 'Karina Freitas', course: 'Sistemas de Informação', year: 2021, bio: 'Reta final, TCC sobre dados abertos.', courses: ['ACH2006', 'ACH2016', 'ACH2005'], showConnections: 'none' },
  { handle: 'lucas.ribeiro', name: 'Lucas Ribeiro', course: 'Sistemas de Informação', year: 2021, bio: 'Estágio em desenvolvimento web.', courses: ['ACH2006', 'ACH2005', 'ACH2004'] },
  { handle: 'marina.teixeira', name: 'Marina Teixeira', course: 'Sistemas de Informação', year: 2025, bio: 'Gosto de matemática discreta (sim, de verdade).', courses: ['ACH2001', 'ACH2013', 'ACH2011', 'ACH2014'] },
  { handle: 'nicolas.barros', name: 'Nicolas Barros', course: 'Sistemas de Informação', year: 2024, bio: 'Organização e arquitetura, hardware e retrô.', courses: ['ACH2034', 'ACH2023', 'ACH2012', 'ACH2053'] },
  { handle: 'olivia.campos', name: 'Olívia Campos', course: 'Sistemas de Informação', year: 2024, bio: 'Admin do DASI neste ambiente de demonstração.', courses: ['ACH2023', 'ACH2002', 'ACH2033', 'ACH2012'] },
]

// accepted: pairs (by handle); pending: [requester, addressee]
const ACCEPTED: [string, string][] = [
  ['estudante', 'ana.lima'], ['estudante', 'carla.mendes'], ['estudante', 'elisa.martins'], ['estudante', 'marina.teixeira'],
  ['ana.lima', 'bruno.souza'], ['ana.lima', 'marina.teixeira'], ['carla.mendes', 'diego.rocha'], ['carla.mendes', 'nicolas.barros'],
  ['elisa.martins', 'felipe.costa'], ['gabriela.alves', 'henrique.dias'], ['isabela.nunes', 'joao.pereira'], ['joao.pereira', 'karina.freitas'],
  ['karina.freitas', 'lucas.ribeiro'], ['olivia.campos', 'carla.mendes'],
]
const PENDING: [string, string][] = [
  ['bruno.souza', 'estudante'], ['diego.rocha', 'estudante'], ['gabriela.alves', 'estudante'], // requests to the dev user
  ['estudante', 'isabela.nunes'], // sent by the dev user
  ['felipe.costa', 'nicolas.barros'], ['lucas.ribeiro', 'olivia.campos'],
]
const MEMBERS: [string, string[]][] = [
  ['dasi', ['olivia.campos', 'carla.mendes', 'diego.rocha', 'ana.lima', 'estudante']],
  ['sintese', ['felipe.costa', 'isabela.nunes', 'lucas.ribeiro']],
  ['petsi', ['elisa.martins', 'joao.pereira', 'karina.freitas']],
  ['hype', ['gabriela.alves', 'marina.teixeira']],
  ['codelab', ['nicolas.barros', 'bruno.souza', 'henrique.dias']],
]
const DASI_ADMIN = 'olivia.campos'
const ENTITY_NAMES: Record<string, string> = {
  dasi: 'DASI', sintese: 'Síntese Jr.', petsi: 'PET-SI', hype: 'Hype USP', codelab: 'CodeLab Leste',
  eachintheshell: 'Each in The Shell', conway: 'Conway USP', cossi: 'COSSI',
}

function must<T>(label: string, result: { data: T | null; error: { message: string } | null }) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data as T
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('seed:dev refuses to run with NODE_ENV=production')
  if (looksLikeProduction(process.env.SUPABASE_URL) && process.env.SEED_DEV_CONFIRM !== '1') {
    throw new Error(
      `SUPABASE_URL (${process.env.SUPABASE_URL ?? 'unset'}) does not look like a development database. `
      + 'If you are sure it is, run again with SEED_DEV_CONFIRM=1.',
    )
  }
  const { devUser } = await import('../lib/session.js') // same identity DEV_FAKE_SESSION uses
  const { getClient } = await import('../lib/supabase.js')
  const { generateInviteCode, hashInviteCode } = await import('../social/inviteCode.js')
  const client: SupabaseClient = getClient()

  // 1. users and profiles
  const everyone = [
    { sub: devUser.sub, email: devUser.email, name: devUser.name, seed: { handle: DEV_HANDLE, course: 'Sistemas de Informação', year: 2024, bio: 'Usuário de desenvolvimento (DEV_FAKE_SESSION=1).', courses: ['ACH2001', 'ACH2011', 'ACH2023', 'ACH2003'], links: {} } as Seed },
    ...STUDENTS.map((s) => ({ sub: `seed-${s.handle}`, email: `${s.handle}@usp.br`, name: s.name, seed: s })),
  ]
  const ids = new Map<string, string>()
  for (const person of everyone) {
    const user = must<{ id: string }>('upsert user', await client.from('users')
      .upsert({ google_sub: person.sub, email: person.email, name: person.name, picture: null, updated_at: new Date().toISOString() }, { onConflict: 'google_sub' })
      .select('id').single())
    ids.set(person.seed.handle, user.id)
    const { error } = await client.from('student_profiles').upsert({
      user_id: user.id, handle: person.seed.handle, course: person.seed.course, entry_year: person.seed.year, bio: person.seed.bio,
      links: person.seed.links ?? {}, show_courses: person.seed.showCourses ?? 'all', show_connections: person.seed.showConnections ?? 'all',
    }, { onConflict: 'user_id' })
    if (error) throw new Error(`upsert profile ${person.seed.handle}: ${error.message}`)
    // replace this student's courses
    must('clear courses', await client.from('user_courses').delete().eq('user_id', user.id).select('code'))
    must('insert courses', await client.from('user_courses').insert(person.seed.courses.map((code) => ({ user_id: user.id, code, title: CATALOG[code] })) ).select('code'))
  }
  const idOf = (handle: string) => ids.get(handle)!
  const seedIds = [...ids.values()]

  // 2. connections among seed users only
  must('clear connections', await client.from('connections').delete()
    .in('requester_id', seedIds).in('addressee_id', seedIds).select('requester_id'))
  const now = Date.now()
  const rows = [
    ...ACCEPTED.map(([a, b], i) => ({ requester_id: idOf(a), addressee_id: idOf(b), status: 'accepted', created_at: new Date(now - (i + 2) * 86_400_000).toISOString(), responded_at: new Date(now - (i + 1) * 86_400_000).toISOString() })),
    ...PENDING.map(([a, b], i) => ({ requester_id: idOf(a), addressee_id: idOf(b), status: 'pending', created_at: new Date(now - i * 3_600_000).toISOString(), responded_at: null })),
  ]
  must('insert connections', await client.from('connections').insert(rows).select('requester_id'))

  // 3. entities, members, badges, and a known invite code for DASI
  must('entities', await client.from('entities').upsert(Object.entries(ENTITY_NAMES).map(([id, name]) => ({ id, name })), { onConflict: 'id' }).select('id'))
  must('clear members', await client.from('entity_members').delete().in('user_id', seedIds).select('user_id'))
  must('clear badges', await client.from('user_badges').delete().in('user_id', seedIds).eq('kind', 'entity_member').select('id'))
  for (const [entityId, handles] of MEMBERS) {
    must('members', await client.from('entity_members').insert(handles.map((h, i) => ({
      entity_id: entityId, user_id: idOf(h), role: entityId === 'dasi' && h === DASI_ADMIN ? 'admin' : 'member', joined_at: new Date(now - (i + 1) * 43_200_000).toISOString(),
    }))).select('user_id'))
    must('badges', await client.from('user_badges').insert(handles.map((h) => ({ user_id: idOf(h), kind: 'entity_member', source_id: entityId, label: ENTITY_NAMES[entityId], entity_id: entityId }))).select('id'))
  }
  const code = generateInviteCode()
  must('invite code', await client.from('entities').update({ invite_code_hash: hashInviteCode(code), invite_code_rotated_at: new Date().toISOString() }).eq('id', 'sintese').select('id'))

  console.log(`Seed complete: ${everyone.length} students (including the dev user "${DEV_HANDLE}"), ${ACCEPTED.length} connections, ${PENDING.length} pending requests.`)
  console.log(`Admin of DASI: ${DASI_ADMIN}. Invite code for "Síntese Jr." (the dev user is not a member): ${code}`)
  console.log('Run the API with DEV_FAKE_SESSION=1 (and NODE_ENV not set to production) to act as the dev user.')
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1) })
