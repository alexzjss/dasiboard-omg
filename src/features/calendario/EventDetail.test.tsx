import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventDto } from '../../lib/eventsApi'

vi.mock('../../lib/eventsApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/eventsApi')>()
  return { ...actual, cancelEvent: vi.fn(), reportEvent: vi.fn(), updateEvent: vi.fn(), createEvent: vi.fn(), fetchEventScopes: vi.fn() }
})

import { cancelEvent, fetchEventScopes, reportEvent } from '../../lib/eventsApi'
import { ApiError } from '../../lib/socialApi'
import { EventDetail } from './EventDetail'

const event = (over: Partial<EventDto> = {}): EventDto => ({
  id: 'e1', title: 'Prova de Cálculo', description: null, kind: 'exam', scope: 'class', scopeValue: 'ACH2001', scopeLabel: 'ACH2001',
  visibility: 'public', startsAt: '2026-10-25T14:00:00-03:00', endsAt: '2026-10-25T16:00:00-03:00', allDay: false,
  location: 'Sala 3', link: 'https://exemplo.com/a', status: 'approved', source: 'user', createdAt: '2026-10-01T10:00:00-03:00',
  author: { name: 'Ana', handle: 'ana1' }, pendingChanges: null, reviewNote: null,
  permissions: { edit: false, cancel: false, report: false, moderate: false }, reportedByMe: false,
  ...over,
})
const perms = (over: Partial<EventDto['permissions']>) => ({ edit: false, cancel: false, report: false, moderate: false, ...over })

const onClose = vi.fn()
const onChanged = vi.fn()
const renderDetail = (ev: EventDto) => render(<MemoryRouter><EventDetail event={ev} onClose={onClose} onChanged={onChanged} /></MemoryRouter>)

beforeEach(() => {
  vi.mocked(fetchEventScopes).mockResolvedValue([])
  vi.mocked(cancelEvent).mockResolvedValue(undefined)
  vi.mocked(reportEvent).mockResolvedValue({ reported: true, hidden: false })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('EventDetail', () => {
  it('mostra os dados em pt-BR, link seguro e autor com link para o perfil', () => {
    renderDetail(event())
    expect(screen.getByRole('dialog', { name: 'Prova de Cálculo' })).toBeTruthy()
    expect(screen.getByText('Dom, 25 out · 14:00–16:00')).toBeTruthy()
    expect(screen.getByText('Sala 3')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'https://exemplo.com/a' })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getByRole('link', { name: 'Ana' }).getAttribute('href')).toBe('/comunidade/ana1')
  })

  it('a descrição com <script> aparece como texto, com quebras de linha', () => {
    const { baseElement } = renderDetail(event({ description: '<script>alert(1)</script>\nsegunda linha' }))
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeTruthy()
    expect(baseElement.querySelector('script')).toBeNull()
    const p = baseElement.querySelector('.cal-description') as HTMLElement
    expect(p.textContent).toBe('<script>alert(1)</script>\nsegunda linha')
  })

  it('Esc fecha o diálogo', () => {
    renderDetail(event())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('Denunciar só aparece com permissions.report', () => {
    renderDetail(event())
    expect(screen.queryByRole('button', { name: 'Denunciar' })).toBeNull()
    cleanup()
    renderDetail(event({ permissions: perms({ report: true }) }))
    expect(screen.getByRole('button', { name: 'Denunciar' })).toBeTruthy()
  })

  it('denunciar pede confirmação com aviso e depois mostra "Denunciado"', async () => {
    renderDetail(event({ permissions: perms({ report: true }) }))
    fireEvent.click(screen.getByRole('button', { name: 'Denunciar' }))
    expect(screen.getByText('3 denúncias escondem o evento até um admin revisar.')).toBeTruthy()
    expect(reportEvent).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Motivo (opcional)'), { target: { value: 'spam' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Denunciar' }).at(-1)!)
    await waitFor(() => expect(reportEvent).toHaveBeenCalledWith('e1', 'spam'))
    expect(await screen.findByText('Denunciado')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Denunciar' })).toBeNull()
    expect(onChanged).toHaveBeenCalledWith('Denunciado')
  })

  it('cancelar exige confirmação', async () => {
    renderDetail(event({ permissions: perms({ cancel: true }) }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar evento' }))
    expect(cancelEvent).not.toHaveBeenCalled()
    expect(screen.getByText('Cancelar este evento? Não dá para desfazer.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(cancelEvent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar evento' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar evento' }))
    await waitFor(() => expect(cancelEvent).toHaveBeenCalledWith('e1'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onChanged).toHaveBeenCalled()
  })

  it('erro do servidor aparece dentro do painel', async () => {
    vi.mocked(cancelEvent).mockRejectedValue(new ApiError(409, 'O evento já não está ativo'))
    renderDetail(event({ permissions: perms({ cancel: true }) }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar evento' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar evento' }).at(-1)!)
    expect((await screen.findByRole('alert')).textContent).toBe('O evento já não está ativo')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Editar só aparece com permissions.edit e abre o formulário', () => {
    renderDetail(event())
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
    cleanup()
    renderDetail(event({ permissions: perms({ edit: true }) }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('dialog', { name: 'Editar evento' })).toBeTruthy()
  })

  it('mostra edição pendente e motivo da recusa', () => {
    renderDetail(event({ pendingChanges: { title: 'Prova 2' } }))
    expect(screen.getByText('Título: Prova 2')).toBeTruthy()
    cleanup()
    renderDetail(event({ status: 'rejected', reviewNote: 'Data errada' }))
    expect(screen.getByText('Motivo da recusa: Data errada')).toBeTruthy()
  })
})
