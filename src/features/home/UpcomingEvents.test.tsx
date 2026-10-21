import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEvents, type EventDto } from '../../lib/eventsApi'
import { UpcomingEvents } from './UpcomingEvents'

vi.mock('../../lib/eventsApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/eventsApi')>()
  return { ...actual, fetchEvents: vi.fn() }
})

// Quarta, 21 out 2026 (America/Sao_Paulo).
const NOW = new Date('2026-10-21T15:00:00-03:00')

const event = (over: Partial<EventDto> = {}): EventDto => ({
  id: 'e1', title: 'Semana da SI', description: null, kind: 'event', scope: 'usp', scopeValue: null, scopeLabel: 'USP',
  visibility: 'public', startsAt: '2026-10-22T14:00:00-03:00', endsAt: '2026-10-22T16:00:00-03:00', allDay: false,
  location: null, link: null, status: 'approved', source: 'user', createdAt: '2026-10-01T10:00:00-03:00', author: null,
  pendingChanges: null, reviewNote: null, permissions: { edit: false, cancel: false, report: false, moderate: false }, reportedByMe: false,
  ...over,
})

function renderCard() {
  return render(<MemoryRouter><UpcomingEvents /></MemoryRouter>)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW })
  vi.mocked(fetchEvents).mockResolvedValue([])
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers() })

describe('UpcomingEvents', () => {
  it('mostra no máximo 5 eventos, em ordem de início, e pede as duas semanas sem outras matérias', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([
      event({ id: 'e7', title: 'Sétimo', startsAt: '2026-11-01T10:00:00-03:00', endsAt: null }),
      event({ id: 'e3', title: 'Terceiro', startsAt: '2026-10-25T10:00:00-03:00', endsAt: null }),
      event({ id: 'e1', title: 'Primeiro', startsAt: '2026-10-22T14:00:00-03:00' }),
      event({ id: 'e5', title: 'Quinto', startsAt: '2026-10-27T10:00:00-03:00', endsAt: null }),
      event({ id: 'e2', title: 'Segundo', startsAt: '2026-10-23T09:00:00-03:00', endsAt: null, allDay: true }),
      event({ id: 'e4', title: 'Quarto', startsAt: '2026-10-26T10:00:00-03:00', endsAt: null }),
      event({ id: 'e6', title: 'Sexto', startsAt: '2026-10-30T10:00:00-03:00', endsAt: null }),
    ])
    renderCard()
    const list = await screen.findByRole('list')
    const items = within(list).getAllByRole('link')
    expect(items).toHaveLength(5)
    expect(items.map((a) => a.textContent)).toEqual([
      expect.stringContaining('Primeiro'),
      expect.stringContaining('Segundo'),
      expect.stringContaining('Terceiro'),
      expect.stringContaining('Quarto'),
      expect.stringContaining('Quinto'),
    ])
    expect(within(items[1]).getByText('Dia todo')).toBeTruthy()
    expect(within(items[0]).getByText('Qui, 22 out')).toBeTruthy()

    const range = vi.mocked(fetchEvents).mock.calls[0][0]
    expect(range.from.startsWith('2026-10-21T00:00:00')).toBe(true)
    expect(range.to.startsWith('2026-11-04T00:00:00')).toBe(true)
    expect(vi.mocked(fetchEvents).mock.calls[0][1]).toEqual({ otherClasses: false })
  })

  it('ignora eventos pendentes, recusados e os que já terminaram', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([
      event({ id: 'p1', title: 'Pendente', status: 'pending' }),
      event({ id: 'r1', title: 'Recusado', status: 'rejected' }),
      event({ id: 'o1', title: 'Terminado', startsAt: '2026-10-21T08:00:00-03:00', endsAt: '2026-10-21T12:00:00-03:00' }),
      event({ id: 'ok', title: 'Aprovado', startsAt: '2026-10-24T10:00:00-03:00', endsAt: null }),
    ])
    renderCard()
    const items = await screen.findAllByRole('link', { name: /Aprovado/ })
    expect(items).toHaveLength(1)
    expect(screen.queryByText('Pendente')).toBeNull()
    expect(screen.queryByText('Recusado')).toBeNull()
    expect(screen.queryByText('Terminado')).toBeNull()
  })

  it('mostra o vazio com o link para propor', async () => {
    renderCard()
    expect(await screen.findByText('Nada marcado nas próximas duas semanas')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Propor evento' }).getAttribute('href')).toBe('/calendario')
    expect(screen.getByRole('link', { name: 'Ver calendário' }).getAttribute('href')).toBe('/calendario')
  })

  it('o item aponta para o calendário com ?evento=<id>', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([event({ id: 'abc-123' })])
    renderCard()
    const link = await screen.findByRole('link', { name: /Semana da SI/ })
    expect(link.getAttribute('href')).toBe('/calendario?evento=abc-123')
  })

  it('erro: o card não aparece', async () => {
    vi.mocked(fetchEvents).mockRejectedValue(new Error('offline'))
    const { container } = renderCard()
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled())
    await waitFor(() => expect(container.querySelector('section')).toBeNull())
  })
})
