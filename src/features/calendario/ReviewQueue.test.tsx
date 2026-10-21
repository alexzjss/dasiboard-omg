import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewEventDto } from '../../lib/eventsApi'
import { ApiError } from '../../lib/socialApi'

vi.mock('../../lib/eventsApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/eventsApi')>()
  return { ...actual, fetchReviewQueue: vi.fn(), reviewEvent: vi.fn(), fetchEventScopes: vi.fn() }
})

import { fetchEventScopes, fetchReviewQueue, reviewEvent } from '../../lib/eventsApi'
import { ReviewQueue } from './ReviewQueue'

const item = (over: Partial<ReviewEventDto> = {}): ReviewEventDto => ({
  id: 'e1', title: 'Hackathon', description: 'Maratona de código', kind: 'event', scope: 'entity', scopeValue: 'dasi', scopeLabel: 'DASI',
  visibility: 'public', startsAt: '2027-03-10T14:00:00-03:00', endsAt: null, allDay: false, location: null, link: null,
  status: 'pending', source: 'user', createdAt: '2026-10-01T10:00:00-03:00', author: { name: 'Ana', handle: 'ana' },
  pendingChanges: null, reviewNote: null, permissions: { edit: false, cancel: false, report: false, moderate: true }, reportedByMe: false, rsvp: { going: 0, interested: 0, mine: null },
  reviewKind: 'new', ...over,
})

const onChanged = vi.fn()
function renderQueue(entityId?: string) {
  return render(<MemoryRouter><ReviewQueue onChanged={onChanged} entityId={entityId} /></MemoryRouter>)
}
const card = (name: string) => screen.getByRole('article', { name })

beforeEach(() => {
  vi.mocked(fetchReviewQueue).mockResolvedValue([
    item(),
    item({ id: 'e2', title: 'Festa', reviewKind: 'edit', status: 'approved', pendingChanges: { title: 'Festa junina' } }),
    item({ id: 'e3', title: 'Spam', reviewKind: 'reported', status: 'hidden', scope: 'class', scopeValue: 'ACH2001', scopeLabel: 'ACH2001' }),
  ])
  vi.mocked(reviewEvent).mockResolvedValue(item())
  vi.mocked(fetchEventScopes).mockResolvedValue([])
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('ReviewQueue', () => {
  it('mostra os três grupos com os botões de cada tipo', async () => {
    renderQueue()
    expect(await screen.findByRole('heading', { name: /Novos eventos/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Edições/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Denunciados/ })).toBeTruthy()
    expect(within(card('Hackathon')).getByRole('button', { name: 'Ajustar e aprovar' })).toBeTruthy()
    expect(within(card('Festa')).getByText('Festa junina')).toBeTruthy()
    expect(within(card('Festa')).getByRole('button', { name: 'Aprovar edição' })).toBeTruthy()
    expect(within(card('Spam')).getByText('Escondido após 3 denúncias')).toBeTruthy()
  })

  it('vazio mostra a mensagem', async () => {
    vi.mocked(fetchReviewQueue).mockResolvedValue([])
    renderQueue()
    expect(await screen.findByText('Nada para revisar agora')).toBeTruthy()
  })

  it('filtra pela entidade', async () => {
    renderQueue('dasi')
    await screen.findByRole('article', { name: 'Hackathon' })
    expect(screen.queryByRole('article', { name: 'Spam' })).toBeNull()
  })

  it('aprovar chama a API e tira o cartão', async () => {
    renderQueue()
    await screen.findByRole('article', { name: 'Hackathon' })
    fireEvent.click(within(card('Hackathon')).getByRole('button', { name: 'Aprovar' }))
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Hackathon' })).toBeNull())
    expect(reviewEvent).toHaveBeenCalledWith('e1', { decision: 'approve' })
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Evento aprovado')).toBeTruthy()
  })

  it('recusar manda a note', async () => {
    renderQueue()
    await screen.findByRole('article', { name: 'Hackathon' })
    fireEvent.click(within(card('Hackathon')).getByRole('button', { name: 'Recusar' }))
    fireEvent.change(screen.getByLabelText('Motivo (opcional)'), { target: { value: 'Fora do escopo' } })
    fireEvent.click(within(screen.getByRole('group', { name: 'Confirmar recusa' })).getByRole('button', { name: 'Recusar' }))
    await waitFor(() => expect(reviewEvent).toHaveBeenCalledWith('e1', { decision: 'reject', note: 'Fora do escopo' }))
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Hackathon' })).toBeNull())
  })

  it('ajustar e aprovar manda só os campos alterados', async () => {
    renderQueue()
    await screen.findByRole('article', { name: 'Hackathon' })
    fireEvent.click(within(card('Hackathon')).getByRole('button', { name: 'Ajustar e aprovar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ajustar e aprovar' })
    fireEvent.change(within(dialog).getByLabelText('Título'), { target: { value: 'Hackathon SI' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aprovar com ajustes' }))
    await waitFor(() => expect(reviewEvent).toHaveBeenCalledWith('e1', { decision: 'approve', changes: { title: 'Hackathon SI' } }))
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Hackathon' })).toBeNull())
  })

  it('409 mostra a mensagem e recarrega a fila', async () => {
    vi.mocked(reviewEvent).mockRejectedValue(new ApiError(409, 'Outra pessoa já decidiu esse evento'))
    renderQueue()
    await screen.findByRole('article', { name: 'Hackathon' })
    fireEvent.click(within(card('Hackathon')).getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByText('Outra pessoa já decidiu esse evento')).toBeTruthy()
    await waitFor(() => expect(fetchReviewQueue).toHaveBeenCalledTimes(2))
  })

  it('remover exige confirmação', async () => {
    renderQueue()
    await screen.findByRole('article', { name: 'Spam' })
    fireEvent.click(within(card('Spam')).getByRole('button', { name: 'Remover' }))
    expect(reviewEvent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Remover definitivamente' }))
    await waitFor(() => expect(reviewEvent).toHaveBeenCalledWith('e3', { decision: 'remove' }))
  })

  it('desabilita os botões enquanto o pedido está em andamento', async () => {
    let finish: (v: ReviewEventDto) => void = () => undefined
    vi.mocked(reviewEvent).mockReturnValue(new Promise((resolve) => { finish = resolve }))
    renderQueue()
    await screen.findByRole('article', { name: 'Hackathon' })
    const approve = within(card('Hackathon')).getByRole('button', { name: 'Aprovar' }) as HTMLButtonElement
    fireEvent.click(approve)
    await waitFor(() => expect(approve.disabled).toBe(true))
    expect((within(card('Hackathon')).getByRole('button', { name: 'Recusar' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(approve)
    expect(reviewEvent).toHaveBeenCalledTimes(1)
    finish(item())
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Hackathon' })).toBeNull())
  })
})
