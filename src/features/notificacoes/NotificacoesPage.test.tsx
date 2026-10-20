import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationItem } from '../../lib/socialApi'

vi.mock('../../lib/socialApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/socialApi')>()
  return {
    ...actual,
    listNotifications: vi.fn(), markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn(),
    acceptConnection: vi.fn(), removeConnection: vi.fn(),
  }
})

import { acceptConnection, listNotifications, markAllNotificationsRead, markNotificationRead, removeConnection } from '../../lib/socialApi'
import { NotificacoesPage } from './NotificacoesPage'

const item = (over: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'n1', type: 'badge_awarded', title: 'Nova badge', body: 'Você ganhou uma badge.', url: '/perfil',
  createdAt: new Date().toISOString(), read: false, actor: null, ...over,
})

function Loc() { const l = useLocation(); return <output data-testid="loc">{l.pathname}</output> }
function renderPage() {
  return render(<MemoryRouter initialEntries={['/notificacoes']}><NotificacoesPage /><Loc /></MemoryRouter>)
}

beforeEach(() => {
  vi.mocked(markNotificationRead).mockResolvedValue(undefined)
  vi.mocked(markAllNotificationsRead).mockResolvedValue(undefined)
  vi.mocked(acceptConnection).mockResolvedValue(undefined as never)
  vi.mocked(removeConnection).mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('NotificacoesPage', () => {
  it('renderiza títulos e destaca as não lidas', async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [item(), item({ id: 'n2', title: 'Já vista', read: true })], nextCursor: null,
    })
    renderPage()
    const unread = (await screen.findByText('Nova badge')).closest('li')
    expect(unread?.className).toContain('is-unread')
    expect(screen.getByText('Já vista').closest('li')?.className).not.toContain('is-unread')
  })

  it('clicar marca como lida e navega para a url', async () => {
    vi.mocked(listNotifications).mockResolvedValue({ items: [item()], nextCursor: null })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Nova badge/ }))
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/perfil'))
    expect(markNotificationRead).toHaveBeenCalledWith('n1')
  })

  it('Aceitar chama acceptConnection com o handle do ator', async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [item({ id: 'n3', type: 'connection_request', title: 'Ana quer se conectar', actor: { handle: 'ana.silva', name: 'Ana Silva', picture: null } })],
      nextCursor: null,
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar' }))
    await waitFor(() => expect(acceptConnection).toHaveBeenCalledWith('ana.silva'))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Aceitar' })).toBeNull())
  })

  it('Recusar chama removeConnection', async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      items: [item({ id: 'n3', type: 'connection_request', actor: { handle: 'ana.silva', name: 'Ana Silva', picture: null } })],
      nextCursor: null,
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }))
    await waitFor(() => expect(removeConnection).toHaveBeenCalledWith('ana.silva'))
  })

  it('Marcar todas como lidas tira o destaque', async () => {
    vi.mocked(listNotifications).mockResolvedValue({ items: [item()], nextCursor: null })
    renderPage()
    await screen.findByText('Nova badge')
    fireEvent.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }))
    await waitFor(() => expect(screen.getByText('Nova badge').closest('li')?.className).not.toContain('is-unread'))
    expect(markAllNotificationsRead).toHaveBeenCalled()
  })

  it('Carregar mais usa o cursor', async () => {
    vi.mocked(listNotifications)
      .mockResolvedValueOnce({ items: [item()], nextCursor: 'c1' })
      .mockResolvedValueOnce({ items: [item({ id: 'n9', title: 'Mais antiga', read: true })], nextCursor: null })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Carregar mais' }))
    expect(await screen.findByText('Mais antiga')).toBeTruthy()
    expect(vi.mocked(listNotifications).mock.calls[1][0]).toBe('c1')
    expect(within(document.body).queryByRole('button', { name: 'Carregar mais' })).toBeNull()
  })

  it('lista vazia mostra o estado vazio', async () => {
    vi.mocked(listNotifications).mockResolvedValue({ items: [], nextCursor: null })
    renderPage()
    expect(await screen.findByText('Nada por aqui ainda.')).toBeTruthy()
  })
})
