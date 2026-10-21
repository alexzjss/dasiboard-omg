import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventDto, EventScopeOption } from '../../lib/eventsApi'

vi.mock('../../lib/eventsApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/eventsApi')>()
  return { ...actual, fetchEventScopes: vi.fn(), createEvent: vi.fn(), updateEvent: vi.fn() }
})

import { createEvent, fetchEventScopes, updateEvent } from '../../lib/eventsApi'
import { EventForm } from './EventForm'

const NOW = new Date('2026-10-21T15:00:00-03:00')

const SCOPES: EventScopeOption[] = [
  { scope: 'usp', scopeValue: null, label: 'USP', moderated: true },
  { scope: 'class', scopeValue: 'ACH2001', label: 'ACH2001', moderated: false },
  { scope: 'entity', scopeValue: 'dasi', label: 'DASI', moderated: true },
]

const event = (over: Partial<EventDto> = {}): EventDto => ({
  id: 'e1', title: 'Reunião', description: null, kind: 'meeting', scope: 'entity', scopeValue: 'dasi', scopeLabel: 'DASI',
  visibility: 'public', startsAt: '2026-10-25T14:00:00-03:00', endsAt: '2026-10-25T16:00:00-03:00', allDay: false,
  location: null, link: null, status: 'approved', source: 'user', createdAt: '2026-10-01T10:00:00-03:00', author: { name: 'Ana', handle: 'ana1' },
  pendingChanges: null, reviewNote: null, permissions: { edit: true, cancel: true, report: false, moderate: false }, reportedByMe: false, rsvp: { going: 0, interested: 0, mine: null },
  ...over,
})

const savedEvent = (over: Partial<EventDto> = {}) => event(over)
const onClose = vi.fn()
const onSaved = vi.fn()

function renderForm(ev?: EventDto) {
  return render(<EventForm event={ev} onClose={onClose} onSaved={onSaved} />)
}
const pick = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW })
  vi.mocked(fetchEventScopes).mockResolvedValue(SCOPES)
  vi.mocked(createEvent).mockResolvedValue(savedEvent({ status: 'pending' }))
  vi.mocked(updateEvent).mockResolvedValue(savedEvent())
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers() })

describe('EventForm (criar)', () => {
  it('escopo moderado mostra o aviso de aprovação e escopo livre publica na hora', async () => {
    renderForm()
    await screen.findByRole('option', { name: 'USP' })
    expect(screen.getByText('Vai para aprovação da administração')).toBeTruthy()
    pick('Onde', 'entity:dasi')
    expect(screen.getByText('Vai para aprovação dos admins de DASI')).toBeTruthy()
    pick('Onde', 'class:ACH2001')
    expect(screen.getByText('Publica na hora')).toBeTruthy()
  })

  it('agrupa os escopos', async () => {
    renderForm()
    await screen.findByRole('option', { name: 'USP' })
    expect(screen.getByRole('group', { name: 'Geral' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Minhas matérias' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Minhas entidades' })).toBeTruthy()
  })

  it('"Só membros da entidade" só aparece para escopo de entidade', async () => {
    renderForm()
    await screen.findByRole('option', { name: 'USP' })
    expect(screen.queryByLabelText('Só membros da entidade')).toBeNull()
    pick('Onde', 'entity:dasi')
    expect(screen.getByLabelText('Só membros da entidade')).toBeTruthy()
  })

  it('fim antes do início bloqueia o envio', async () => {
    renderForm()
    await screen.findByRole('option', { name: 'USP' })
    pick('Título', 'Palestra')
    pick('Início', '2026-10-25T14:00')
    pick('Fim (opcional)', '2026-10-25T13:00')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect((await screen.findByRole('alert')).textContent).toBe('O fim não pode ser antes do início')
    expect(createEvent).not.toHaveBeenCalled()
  })

  it('recusa link http e duração maior que 31 dias', async () => {
    renderForm()
    await screen.findByRole('option', { name: 'USP' })
    pick('Título', 'Palestra')
    pick('Início', '2026-10-25T14:00')
    pick('Link https (opcional)', 'http://exemplo.com')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect((await screen.findByRole('alert')).textContent).toContain('https')
    pick('Link https (opcional)', '')
    pick('Fim (opcional)', '2026-12-25T14:00')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('31 dias'))
    expect(createEvent).not.toHaveBeenCalled()
  })

  it('dia inteiro manda YYYY-MM-DD', async () => {
    renderForm()
    await screen.findByRole('option', { name: 'USP' })
    pick('Título', 'Feriado')
    fireEvent.click(screen.getByLabelText('Dia inteiro'))
    pick('Início', '2026-10-28')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(createEvent).toHaveBeenCalled())
    expect(vi.mocked(createEvent).mock.calls[0][0]).toMatchObject({ scope: 'usp', allDay: true, startsAt: '2026-10-28', endsAt: null, visibility: 'public' })
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Enviado para aprovação'))
  })

  it('sem dia inteiro manda ISO com -03:00 e avisa "Publicado" quando já está aprovado', async () => {
    vi.mocked(createEvent).mockResolvedValue(savedEvent({ status: 'approved' }))
    renderForm()
    await screen.findByRole('option', { name: 'USP' })
    pick('Onde', 'class:ACH2001')
    pick('Título', 'Prova')
    pick('Início', '2026-10-25T14:00')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(createEvent).toHaveBeenCalled())
    expect(vi.mocked(createEvent).mock.calls[0][0]).toMatchObject({ scope: 'class', scopeValue: 'ACH2001', startsAt: '2026-10-25T14:00:00-03:00' })
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Publicado'))
  })

  it('mostra o erro do servidor dentro do formulário', async () => {
    const { ApiError } = await import('../../lib/socialApi')
    vi.mocked(createEvent).mockRejectedValue(new ApiError(429, 'Limite de 10 eventos por dia'))
    renderForm()
    await screen.findByRole('option', { name: 'USP' })
    pick('Título', 'Palestra')
    pick('Início', '2026-10-25T14:00')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Limite de 10 eventos por dia')
    expect(onSaved).not.toHaveBeenCalled()
  })
})

describe('EventForm (editar)', () => {
  it('mostra o escopo sem permitir mudança e avisa da aprovação em evento aprovado', () => {
    renderForm(event())
    const scope = screen.getByLabelText('Onde') as HTMLInputElement
    expect(scope.value).toBe('DASI')
    expect(scope.disabled).toBe(true)
    expect(screen.getByText('Mudar isso manda a edição para aprovação; até lá vale a versão atual')).toBeTruthy()
  })

  it('moderador e evento de matéria não veem o aviso', () => {
    renderForm(event({ permissions: { edit: true, cancel: true, report: false, moderate: true } }))
    expect(screen.queryByText(/manda a edição para aprovação/)).toBeNull()
    cleanup()
    renderForm(event({ scope: 'class', scopeValue: 'ACH2001', scopeLabel: 'ACH2001' }))
    expect(screen.queryByText(/manda a edição para aprovação/)).toBeNull()
  })

  it('manda só os campos alterados', async () => {
    renderForm(event())
    pick('Local (opcional)', 'Sala 3')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(updateEvent).toHaveBeenCalled())
    expect(vi.mocked(updateEvent).mock.calls[0]).toEqual(['e1', { location: 'Sala 3' }])
  })

  it('mexer na data manda allDay junto, com início e fim', async () => {
    vi.mocked(updateEvent).mockResolvedValue(savedEvent({ pendingChanges: { startsAt: '2026-10-26T14:00:00-03:00' } }))
    renderForm(event())
    pick('Início', '2026-10-24T14:00')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(updateEvent).toHaveBeenCalled())
    expect(vi.mocked(updateEvent).mock.calls[0][1]).toEqual({ startsAt: '2026-10-24T14:00:00-03:00', endsAt: '2026-10-25T16:00:00-03:00', allDay: false })
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Enviado para aprovação'))
  })

  it('sem alterações não envia', async () => {
    renderForm(event())
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Nada foi alterado')
    expect(updateEvent).not.toHaveBeenCalled()
  })
})
