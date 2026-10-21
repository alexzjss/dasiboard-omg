import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventDto } from '../../lib/eventsApi'
import type { ScheduleEntry } from '../home/types'

vi.mock('../../lib/eventsApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/eventsApi')>()
  return { ...actual, fetchEvents: vi.fn(), fetchEvent: vi.fn(), fetchReviewCount: vi.fn(), fetchMyEvents: vi.fn(), fetchReviewQueue: vi.fn(), fetchEventScopes: vi.fn() }
})
vi.mock('../../auth/authContext', () => ({
  useAuth: () => ({ status: 'authenticated', user: { name: 'Ana', email: 'ana@usp.br', picture: null }, login: vi.fn(), logout: vi.fn() }),
}))
const scheduleMock = vi.hoisted(() => ({ entries: [] as ScheduleEntry[] }))
vi.mock('../home/useSchedule', () => ({ useSchedule: () => ({ schedule: scheduleMock.entries }) }))

import { fetchEvent, fetchEvents, fetchEventScopes, fetchMyEvents, fetchReviewCount } from '../../lib/eventsApi'
import { CalendarioPage } from './CalendarioPage'

// Quarta, 21 out 2026 (America/Sao_Paulo).
const NOW = new Date('2026-10-21T15:00:00-03:00')

const event = (over: Partial<EventDto> = {}): EventDto => ({
  id: 'e1', title: 'Semana da SI', description: null, kind: 'event', scope: 'usp', scopeValue: null, scopeLabel: 'USP',
  visibility: 'public', startsAt: '2026-10-15T14:00:00-03:00', endsAt: '2026-10-15T16:00:00-03:00', allDay: false,
  location: null, link: null, status: 'approved', source: 'user', createdAt: '2026-10-01T10:00:00-03:00', author: null,
  pendingChanges: null, reviewNote: null, permissions: { edit: false, cancel: false, report: false, moderate: false }, reportedByMe: false,
  ...over,
})

function renderPage(url = '/calendario') {
  return render(<MemoryRouter initialEntries={[url]}><CalendarioPage /></MemoryRouter>)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW })
  localStorage.clear()
  scheduleMock.entries = []
  vi.mocked(fetchReviewCount).mockResolvedValue(0)
  vi.mocked(fetchEvents).mockResolvedValue([])
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers() })

describe('CalendarioPage', () => {
  it('renderiza os eventos do mês e pede o intervalo da grade', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([event(), event({ id: 'e2', title: 'Prova de Cálculo', kind: 'exam', startsAt: '2026-10-22T00:00:00-03:00', endsAt: null, allDay: true })])
    renderPage()
    const day = await screen.findByRole('button', { name: '15 de outubro, 1 evento' })
    expect(within(day).getByText('Semana da SI')).toBeTruthy()
    expect(screen.getByRole('button', { name: '22 de outubro, 1 evento' })).toBeTruthy()
    const range = vi.mocked(fetchEvents).mock.calls[0][0]
    expect(range.from.startsWith('2026-09-27T00:00:00')).toBe(true) // domingo da primeira semana
    expect(screen.getByRole('heading', { name: 'Outubro de 2026' })).toBeTruthy()
  })

  it('outras matérias desligado não manda otherClasses; ligado manda', async () => {
    renderPage()
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled())
    expect(vi.mocked(fetchEvents).mock.calls.at(-1)?.[1]).toEqual({ otherClasses: false })
    fireEvent.click(screen.getByRole('button', { name: 'Outras matérias' }))
    await waitFor(() => expect(vi.mocked(fetchEvents).mock.calls.at(-1)?.[1]).toEqual({ otherClasses: true }))
    expect(JSON.parse(localStorage.getItem('orbe_calendar_filters') ?? '{}').others).toBe(true)
  })

  it('evento pendente mostra o selo', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([
      event({ id: 'p1', title: 'Hackathon', status: 'pending', startsAt: '2026-10-21T10:00:00-03:00', endsAt: null }),
      event({ id: 'p2', title: 'Festa', pendingChanges: { title: 'Festa junina' }, startsAt: '2026-10-21T20:00:00-03:00', endsAt: null }),
    ])
    renderPage()
    expect(await screen.findByText('Aguardando aprovação')).toBeTruthy()
    expect(screen.getByText('Edição pendente')).toBeTruthy()
  })

  it('a aba revisar não aparece para quem não modera e aparece com contador para quem modera', async () => {
    renderPage()
    await waitFor(() => expect(fetchReviewCount).toHaveBeenCalled())
    expect(screen.queryByRole('tab', { name: /Para revisar/ })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Minhas submissões' })).toBeTruthy()
    cleanup()

    vi.mocked(fetchReviewCount).mockResolvedValue(3)
    renderPage()
    const tab = await screen.findByRole('tab', { name: 'Para revisar, 3 para revisar' })
    expect(tab.querySelector('.count-badge')?.textContent).toBe('3')
  })

  it('aula do Júpiter aparece só no dia da semana certo', async () => {
    scheduleMock.entries = [{ weekday: 2, startsAt: '14:00', endsAt: '16:00', title: 'Algoritmos', code: 'ACH2001', room: '101', building: 'I1' }]
    renderPage()
    const wednesday = await screen.findByRole('button', { name: '14 de outubro, 1 aula' })
    expect(within(wednesday).getByText('ACH2001')).toBeTruthy()
    expect(screen.getByRole('button', { name: '15 de outubro' })).toBeTruthy() // quinta: sem aula
    expect(screen.getByRole('button', { name: '21 de outubro, 1 aula' })).toBeTruthy()
    // Desligando "Aulas" elas somem.
    fireEvent.click(screen.getByRole('button', { name: 'Aulas' }))
    expect(screen.queryByRole('button', { name: '14 de outubro, 1 aula' })).toBeNull()
  })

  it('erro mostra Tentar de novo', async () => {
    vi.mocked(fetchEvents).mockRejectedValueOnce(new Error('falhou'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(fetchEvents).toHaveBeenCalledTimes(2))
  })

  it('?evento abre o painel do evento e a agenda agrupa por dia', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([event({ id: 'e9', title: 'Palestra', startsAt: '2026-10-21T10:00:00-03:00', endsAt: null })])
    renderPage('/calendario?evento=e9')
    const panel = await screen.findByRole('dialog', { name: 'Palestra' })
    expect(within(panel).getByText('Palestra')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Agenda' }))
    expect(await screen.findByRole('heading', { name: 'Qua, 21 out' })).toBeTruthy()
  })

  it('?evento fora do mês carregado busca por id, vai para o mês do evento e abre o detalhe', async () => {
    vi.mocked(fetchEvent).mockResolvedValue(event({ id: 'far', title: 'Formatura', startsAt: '2026-12-10T19:00:00-03:00', endsAt: null }))
    renderPage('/calendario?evento=far')
    expect(await screen.findByRole('dialog', { name: 'Formatura' })).toBeTruthy()
    expect(vi.mocked(fetchEvent).mock.calls[0].slice(0, 2)).toEqual(['far', { otherClasses: false }])
    expect(await screen.findByRole('heading', { name: 'Dezembro de 2026' })).toBeTruthy()
  })

  it('?evento inexistente tira o detalhe sem erro', async () => {
    vi.mocked(fetchEvent).mockRejectedValue(new Error('404'))
    renderPage('/calendario?evento=nada')
    await waitFor(() => expect(fetchEvent).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('"Propor evento" fica no cabeçalho e abre o formulário', async () => {
    vi.mocked(fetchEventScopes).mockResolvedValue([{ scope: 'usp', scopeValue: null, label: 'USP', moderated: true }])
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Propor evento' }))
    expect(await screen.findByRole('dialog', { name: 'Propor evento' })).toBeTruthy()
  })

  it('aba Minhas submissões lista e mostra o vazio com botão de propor', async () => {
    vi.mocked(fetchMyEvents).mockResolvedValue([])
    renderPage('/calendario?aba=minhas')
    expect(await screen.findByText('Você ainda não propôs nenhum evento')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Propor evento' })).toHaveLength(2)
    cleanup()
    vi.mocked(fetchMyEvents).mockResolvedValue([event({ id: 'm1', title: 'Hackathon', status: 'rejected', reviewNote: 'Fora do escopo' })])
    renderPage('/calendario?aba=minhas')
    expect(await screen.findByText('Hackathon')).toBeTruthy()
    expect(screen.getByText('Recusado')).toBeTruthy()
    expect(screen.getByText('Motivo da recusa: Fora do escopo')).toBeTruthy()
  })
})
