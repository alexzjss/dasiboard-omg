import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { listPeople } from '../../lib/socialApi'
import { ColegasDisclosure, ColegasLink } from './ColegasLink'
import { clearColegasCache } from './colegasCache'

vi.mock('../../lib/socialApi', () => ({ listPeople: vi.fn() }))

const page = (n: number, nextCursor: string | null = null) => ({
  people: Array.from({ length: n }, (_, i) => ({ handle: `aluno${i}`, name: `Aluno ${i}` })),
  nextCursor,
})

function renderLink(code: string) {
  return render(
    <MemoryRouter>
      <ColegasLink code={code} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  clearColegasCache()
  vi.mocked(listPeople).mockReset()
})

afterEach(() => {
  cleanup() // vitest sem globals não limpa o DOM entre testes
})

describe('ColegasLink', () => {
  it('mostra "N colegas fazem esta matéria" linkando para a lista filtrada', async () => {
    vi.mocked(listPeople).mockResolvedValue(page(3) as never)
    renderLink('ACH2023')
    const link = await screen.findByRole('link', { name: '3 colegas fazem esta matéria' })
    expect(link.getAttribute('href')).toBe('/comunidade?materia=ACH2023')
    expect(listPeople).toHaveBeenCalledWith({ materia: 'ACH2023' })
  })

  it('singular para um colega', async () => {
    vi.mocked(listPeople).mockResolvedValue(page(1) as never)
    renderLink('ACH2024')
    expect(await screen.findByRole('link', { name: '1 colega faz esta matéria' })).toBeTruthy()
  })

  it('com próxima página mostra "20+" em vez do número exato', async () => {
    vi.mocked(listPeople).mockResolvedValue(page(20, 'cursor-2') as never)
    renderLink('ACH2025')
    expect(await screen.findByRole('link', { name: '20+ colegas fazem esta matéria' })).toBeTruthy()
  })

  it('zero colegas esconde tudo', async () => {
    vi.mocked(listPeople).mockResolvedValue(page(0) as never)
    const { container } = renderLink('ACH2026')
    await waitFor(() => expect(listPeople).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toBe('')
  })

  it('erro esconde tudo, sem quebrar a tela', async () => {
    vi.mocked(listPeople).mockRejectedValue(new Error('offline'))
    const { container } = renderLink('ACH2027')
    await waitFor(() => expect(listPeople).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    await Promise.resolve()
    expect(container.textContent).toBe('')
  })

  it('cache em memória: a segunda exibição da mesma matéria não chama a API', async () => {
    vi.mocked(listPeople).mockResolvedValue(page(2) as never)
    const first = renderLink('ACH2023')
    await screen.findByRole('link', { name: '2 colegas fazem esta matéria' })
    first.unmount()

    renderLink('ACH2023')
    expect(await screen.findByRole('link', { name: '2 colegas fazem esta matéria' })).toBeTruthy()
    expect(listPeople).toHaveBeenCalledTimes(1)
  })

  it('erro não fica preso no cache: a próxima exibição tenta de novo', async () => {
    vi.mocked(listPeople).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page(4) as never)
    const first = renderLink('ACH2023')
    await waitFor(() => expect(listPeople).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    await Promise.resolve()
    first.unmount()

    renderLink('ACH2023')
    expect(await screen.findByRole('link', { name: '4 colegas fazem esta matéria' })).toBeTruthy()
    expect(listPeople).toHaveBeenCalledTimes(2)
  })
})

describe('ColegasDisclosure (lista)', () => {
  it('não busca nada até o aluno abrir a disciplina', async () => {
    vi.mocked(listPeople).mockResolvedValue(page(5) as never)
    render(
      <MemoryRouter>
        <ColegasDisclosure code="ACH2023" />
      </MemoryRouter>,
    )
    expect(listPeople).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Ver colegas desta matéria' }))
    expect(await screen.findByRole('link', { name: '5 colegas fazem esta matéria' })).toBeTruthy()
    expect(listPeople).toHaveBeenCalledTimes(1)
  })
})
