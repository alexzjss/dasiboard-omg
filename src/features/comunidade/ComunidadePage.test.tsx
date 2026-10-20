import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type PersonCard } from '../../lib/socialApi'

vi.mock('../../lib/socialApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/socialApi')>()
  return { ...actual, listPeople: vi.fn(), getFeed: vi.fn() }
})
vi.mock('../docentes/DocentesPage', () => ({ DocentesPage: () => <p>Página de docentes</p> }))

import { getFeed, listPeople } from '../../lib/socialApi'
import { ComunidadePage } from './ComunidadePage'

const person = (over: Partial<PersonCard> = {}): PersonCard => ({
  handle: 'ana.silva', name: 'Ana Silva', picture: null, course: 'Sistemas de Informação', entryYear: 2023,
  badges: [{ kind: 'entity_member', sourceId: 'dasi', label: 'DASI', icon: null, color: null, entityId: 'dasi' }], connection: 'none', commonCourses: 3, ...over,
})

function Loc() { const l = useLocation(); return <output data-testid="loc">{l.search}</output> }
function renderAt(url: string) {
  return render(<MemoryRouter initialEntries={[url]}><ComunidadePage /><Loc /></MemoryRouter>)
}

beforeEach(() => {
  vi.mocked(getFeed).mockResolvedValue({ items: [], nextCursor: null })
  vi.mocked(listPeople).mockResolvedValue({ people: [person()], nextCursor: null })
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks() })

describe('ComunidadePage', () => {
  it('renderiza os cartões de alunos', async () => {
    renderAt('/comunidade')
    expect(await screen.findByText('Ana Silva')).toBeTruthy()
    expect(screen.getByText('3 matérias em comum')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Entidades' }).textContent).toContain('DASI')
    expect(screen.getByRole('button', { name: /Conectar: Ana Silva/ })).toBeTruthy()
  })

  it('aplica debounce de 300ms na busca por nome', async () => {
    renderAt('/comunidade')
    await screen.findByText('Ana Silva')
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Buscar por nome'), { target: { value: 'ana' } })
    await act(async () => { vi.advanceTimersByTime(299) })
    expect(vi.mocked(listPeople).mock.calls.some(([f]) => f?.q === 'ana')).toBe(false)
    await act(async () => { vi.advanceTimersByTime(2) })
    expect(vi.mocked(listPeople).mock.calls.some(([f]) => f?.q === 'ana')).toBe(true)
  })

  it('usa o filtro de matéria vindo da URL', async () => {
    renderAt('/comunidade?materia=ACH2023')
    await screen.findByText('Ana Silva')
    expect(vi.mocked(listPeople).mock.calls[0][0]).toEqual({ materia: 'ACH2023' })
    expect((screen.getByLabelText('Matéria') as HTMLInputElement).value).toBe('ACH2023')
  })

  it('troca de aba atualiza ?aba=', async () => {
    renderAt('/comunidade')
    await screen.findByText('Ana Silva')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Alunos' }), { key: 'ArrowRight' })
    expect(await screen.findByText('Página de docentes')).toBeTruthy()
    expect(screen.getByTestId('loc').textContent).toBe('?aba=docentes')
    expect(screen.getByRole('tab', { name: 'Docentes' }).getAttribute('aria-selected')).toBe('true')
  })

  it('mostra erro com tentar de novo', async () => {
    vi.mocked(listPeople).mockRejectedValueOnce(new ApiError(500, 'Servidor indisponível'))
    renderAt('/comunidade')
    expect(await screen.findByText('Servidor indisponível')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Ana Silva')).toBeTruthy()
    await waitFor(() => expect(vi.mocked(listPeople)).toHaveBeenCalledTimes(2))
  })
})
