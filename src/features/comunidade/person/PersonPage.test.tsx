import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { PersonProfile } from '../../../lib/socialApi'

let impl: () => Promise<unknown> = () => Promise.resolve(null)
const getPerson = { mockReset: () => { impl = () => Promise.resolve(null) }, mockResolvedValue: (v: unknown) => { impl = () => Promise.resolve(v) }, mockRejected: (e: unknown) => { impl = () => Promise.reject(e) } }
vi.mock('../../../lib/socialApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/socialApi')>()
  return { ...actual, getPerson: () => impl() }
})

import { ApiError } from '../../../lib/socialApi'
import { PersonPage } from '../PersonPage'

afterEach(cleanup)
beforeEach(() => getPerson.mockReset())

function base(over: Partial<PersonProfile> = {}): PersonProfile {
  return {
    profile: { handle: 'ana.silva', name: 'Ana Silva', picture: null, course: 'Sistemas de Informação', entryYear: 2023, bio: 'Gosto de dados.', links: { github: 'https://github.com/ana' }, technologies: [], self: false },
    connection: 'none',
    badges: [{ kind: 'entity_member', sourceId: 'dasi', label: 'DASI', icon: null, color: null, entityId: 'dasi' }],
    entities: [{ entityId: 'dasi', name: 'DASI', title: null }],
    courses: [{ code: 'ACH2023', title: 'Algoritmos I', common: true }, { code: 'ACH2012', title: 'Cálculo II', common: false }],
    commonCourses: 1,
    classmatesInCommon: [{ handle: 'bia', name: 'Bia Souza', picture: null }],
    connections: { count: 2, people: [{ handle: 'caio', name: 'Caio Lima', picture: null }] },
    visibility: { courses: true, connections: true },
    ...over,
  }
}

function renderAt(handle = 'ana.silva') {
  return render(
    <MemoryRouter initialEntries={[`/comunidade/${handle}`]}>
      <Routes>
        <Route path="/comunidade/:handle" element={<PersonPage />} />
        <Route path="/perfil" element={<p>Meu perfil</p>} />
        <Route path="/comunidade" element={<p>Lista</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PersonPage', () => {
  it('renderiza o perfil completo', async () => {
    getPerson.mockResolvedValue(base())
    renderAt()
    expect(await screen.findByRole('heading', { name: 'Ana Silva' })).toBeTruthy()
    expect(screen.getByText('@ana.silva').className).toContain('mono')
    expect(screen.getByText('Gosto de dados.')).toBeTruthy()
    const gh = screen.getByRole('link', { name: 'GitHub' })
    expect(gh.getAttribute('rel')).toBe('noopener noreferrer')
    expect(gh.getAttribute('target')).toBe('_blank')
    expect(screen.getByRole('link', { name: /DASI/ }).getAttribute('href')).toBe('/entidades/dasi')
    const course = screen.getByRole('link', { name: /ACH2023/ })
    expect(course.getAttribute('href')).toBe('/comunidade?materia=ACH2023')
    expect(course.className).toContain('is-common')
    expect(screen.getByText('Caio Lima')).toBeTruthy()
    expect(screen.getByText('Bia Souza')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Conectar/ })).toBeTruthy()
    await waitFor(() => expect(document.title).toBe('Ana Silva · daSIboard'))
  })

  it('mostra as tecnologias e o cargo ao lado da entidade', async () => {
    const data = base()
    getPerson.mockResolvedValue(base({
      profile: { ...data.profile, technologies: ['react', 'typescript'] },
      entities: [{ entityId: 'dasi', name: 'DASI', title: 'Diretora de Marketing' }],
    }))
    renderAt()
    expect(await screen.findByRole('heading', { name: 'Tecnologias' })).toBeTruthy()
    expect(screen.getByText('React')).toBeTruthy()
    expect(screen.getByText('TypeScript')).toBeTruthy()
    expect(screen.getByRole('link', { name: /DASI.*Diretora de Marketing/ })).toBeTruthy()
  })

  it('mostra badges que não são de entidade em seção própria', async () => {
    getPerson.mockResolvedValue(base({ badges: [
      { kind: 'entity_member', sourceId: 'dasi', label: 'DASI', icon: null, color: null, entityId: 'dasi' },
      { kind: 'admin_award', sourceId: 'x1', label: 'Monitor', icon: 'star', color: '#e24a2b', entityId: null },
    ] }))
    renderAt()
    expect(await screen.findByRole('heading', { name: 'Badges' })).toBeTruthy()
    expect(screen.getByText('Monitor')).toBeTruthy()
  })

  it('campos privados mostram aviso', async () => {
    getPerson.mockResolvedValue(base({ courses: null, commonCourses: null, connections: null, classmatesInCommon: null, visibility: { courses: false, connections: false } }))
    renderAt()
    expect(await screen.findByText('Ana preferiu deixar as matérias em privado.')).toBeTruthy()
    expect(screen.getByText('Ana preferiu deixar as conexões em privado.')).toBeTruthy()
  })

  it('404 mostra perfil não encontrado com link para a Comunidade', async () => {
    getPerson.mockRejected(new ApiError(404, 'not found'))
    renderAt('ninguem')
    expect(await screen.findByText('Perfil não encontrado')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir para a Comunidade' }).getAttribute('href')).toBe('/comunidade')
  })

  it('erro de rede oferece tentar de novo', async () => {
    getPerson.mockRejected(new ApiError(500, 'x'))
    renderAt()
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })

  it('self redireciona para /perfil', async () => {
    getPerson.mockResolvedValue(base({ connection: 'self' }))
    renderAt()
    expect(await screen.findByText('Meu perfil')).toBeTruthy()
  })

  it('links com domínio ou protocolo inválido não renderizam', async () => {
    getPerson.mockResolvedValue(base({
      profile: { ...base().profile, links: { github: 'https://evil.com/ana', linkedin: 'http://www.linkedin.com/in/ana', instagram: 'https://instagram.com.evil.com/a' } },
    }))
    renderAt()
    await screen.findByRole('heading', { name: 'Ana Silva' })
    expect(screen.queryByRole('link', { name: 'GitHub' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'LinkedIn' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Instagram' })).toBeNull()
  })
})
