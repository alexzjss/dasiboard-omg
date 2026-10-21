import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DEFAULT_CARD } from '../../../lib/cardOptions'
import type { CardData } from '../../../lib/socialApi'

vi.mock('../../../lib/socialApi', async (orig) => ({ ...(await orig<typeof import('../../../lib/socialApi')>()), getCollection: vi.fn() }))

import * as api from '../../../lib/socialApi'
import { ColecaoPage } from './ColecaoPage'

const card = (handle: string): CardData => ({
  handle, name: handle.toUpperCase(), picture: null, subtitle: 'SI', course: 'SI', entryYear: 2024, technologies: [], links: {},
  entities: [], badges: [], settings: DEFAULT_CARD, viewer: { collected: true, connection: 'none' },
})
const renderPage = () => render(<MemoryRouter><ColecaoPage /></MemoryRouter>)

beforeEach(() => { vi.resetAllMocks() })
afterEach(cleanup)

describe('ColecaoPage', () => {
  it('shows the empty state', async () => {
    vi.mocked(api.getCollection).mockResolvedValue({ items: [], nextCursor: null })
    renderPage()
    expect(await screen.findByText('Escaneie o QR de alguém para começar sua coleção.')).toBeTruthy()
  })

  it('lists cards and loads more', async () => {
    vi.mocked(api.getCollection)
      .mockResolvedValueOnce({ items: [card('ana'), card('bia')], nextCursor: 'c1' })
      .mockResolvedValueOnce({ items: [card('caio')], nextCursor: null })
    renderPage()
    expect(await screen.findByText('2+ cartas')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
    expect(await screen.findByText('3 cartas')).toBeTruthy()
    expect(api.getCollection).toHaveBeenLastCalledWith('c1', undefined)
  })
})
