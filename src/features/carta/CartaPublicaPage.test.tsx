import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DEFAULT_CARD } from '../../lib/cardOptions'
import type { CardData } from '../../lib/socialApi'

vi.mock('../../lib/socialApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/socialApi')>()
  return { ...actual, getCard: vi.fn(), collectCard: vi.fn(), requestConnection: vi.fn() }
})

import * as api from '../../lib/socialApi'
import { CartaPublicaPage } from './CartaPublicaPage'

const card = (viewer: CardData['viewer']): CardData => ({
  handle: 'alex', name: 'Alex Santana', picture: null, subtitle: 'SI · Turma 2024', course: 'SI', entryYear: 2024, technologies: [], links: {},
  entities: [], badges: [], settings: DEFAULT_CARD, viewer,
})

const renderPage = () => render(
  <MemoryRouter initialEntries={['/c/alex']}>
    <Routes><Route path="/c/:handle" element={<CartaPublicaPage />} /></Routes>
  </MemoryRouter>,
)

beforeEach(() => { vi.resetAllMocks() })
afterEach(cleanup)

describe('CartaPublicaPage', () => {
  it('shows the login prompt on a 401', async () => {
    vi.mocked(api.getCard).mockRejectedValue(new api.ApiError(401, 'Entre para ver esta carta'))
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Entre para ver esta carta' })).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Entrar com Google' })
    expect(link.getAttribute('href')).toBe('/entrar?volta=%2Fc%2Falex')
  })

  it('invites an anonymous visitor to log in and collect', async () => {
    vi.mocked(api.getCard).mockResolvedValue(card(null))
    renderPage()
    expect(await screen.findByRole('link', { name: 'Entrar para colecionar' })).toBeTruthy()
  })

  it('collects, then offers to request a connection', async () => {
    vi.mocked(api.getCard).mockResolvedValue(card({ collected: false, connection: 'none' }))
    vi.mocked(api.collectCard).mockResolvedValue({ status: 'collected' })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Colecionar' }))
    await waitFor(() => expect(api.collectCard).toHaveBeenCalledWith('alex'))
    expect(await screen.findByRole('button', { name: 'Pedir conexão' })).toBeTruthy()
    expect(screen.getByText('Na sua coleção')).toBeTruthy()
  })

  it('shows the owner their own card', async () => {
    vi.mocked(api.getCard).mockResolvedValue(card({ collected: false, connection: 'self' }))
    renderPage()
    expect(await screen.findByText('Essa é a sua carta')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Colecionar' })).toBeNull()
  })

  it('shows the seal for an already collected card', async () => {
    vi.mocked(api.getCard).mockResolvedValue(card({ collected: true, connection: 'accepted' }))
    renderPage()
    expect(await screen.findByText('Na sua coleção')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver perfil' })).toBeTruthy()
  })
})
