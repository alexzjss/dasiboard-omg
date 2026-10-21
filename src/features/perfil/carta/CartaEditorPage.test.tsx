import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DEFAULT_CARD } from '../../../lib/cardOptions'
import type { MyCard, MyProfile } from '../../../lib/socialApi'

vi.mock('../../../lib/socialApi', async (orig) => {
  const actual = await orig<typeof import('../../../lib/socialApi')>()
  return { ...actual, getMyCard: vi.fn(), updateMyCard: vi.fn(), getMyProfile: vi.fn() }
})

import * as api from '../../../lib/socialApi'
import { CartaEditorPage } from './CartaEditorPage'

const card = (): MyCard => ({
  settings: DEFAULT_CARD,
  public: false,
  unlocks: {
    finishes: ['common'],
    palettes: ['coral', 'ocean', 'forest', 'grape', 'ink', 'sun', 'mint', 'rose'],
    requirements: { foil: 'Ganhe 5 badges', neon: 'Ganhe 5 badges', 'ent-dasi': 'Entre na entidade DASI' },
  },
  card: {
    handle: 'alex', name: 'Alex Santana', picture: null, subtitle: 'SI · Turma 2024', course: 'SI', entryYear: 2024, technologies: [], links: {},
    entities: [], badges: [], settings: DEFAULT_CARD, viewer: { collected: false, connection: 'self' },
  },
})

const profile = (): MyProfile => ({
  profile: { handle: 'alex', name: 'Alex Santana', email: 'a@usp.br', picture: null, hasCustomAvatar: false, bio: null, course: 'SI', entryYear: 2024, links: {}, technologies: [], showCourses: 'all', showConnections: 'all' },
  entities: [], badges: [], adminOf: [], isSuperadmin: false, courses: [], pendingCount: 0, pendingRequests: [],
})

const renderPage = () => render(<MemoryRouter><CartaEditorPage /></MemoryRouter>)

beforeEach(() => {
  vi.mocked(api.getMyCard).mockResolvedValue(card())
  vi.mocked(api.getMyProfile).mockResolvedValue(profile())
  vi.mocked(api.updateMyCard).mockResolvedValue(card())
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('CartaEditorPage', () => {
  it('trocar a paleta muda o preview', async () => {
    const { container } = renderPage()
    await screen.findByRole('button', { name: 'Oceano' })
    expect(container.querySelector('[data-palette]')?.getAttribute('data-palette')).toBe('coral')
    fireEvent.click(screen.getByRole('button', { name: 'Oceano' }))
    expect(container.querySelector('[data-palette]')?.getAttribute('data-palette')).toBe('ocean')
  })

  it('acabamento bloqueado mostra o requisito e não é selecionável', async () => {
    renderPage()
    const foil = (await screen.findByText('Foil')).closest('button') as HTMLButtonElement
    expect(foil.disabled).toBe(true)
    expect(within(foil).getByText(/Ganhe 5 badges/)).toBeTruthy()
    fireEvent.click(foil)
    expect(foil.getAttribute('aria-pressed')).toBe('false')
  })

  it('Salvar manda o settings completo', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Oceano' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(api.updateMyCard).toHaveBeenCalledWith({ settings: { ...DEFAULT_CARD, palette: 'ocean' }, public: false }))
  })

  it('Descartar volta ao que estava salvo', async () => {
    const { container } = renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Oceano' }))
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(container.querySelector('[data-palette]')?.getAttribute('data-palette')).toBe('coral')
  })

  it('no modo automático mostra as escolhas automáticas no preview mas salva entities/badges vazios', async () => {
    const auto = card()
    auto.card.entities = [{ entityId: 'dasi', name: 'DASI', title: null }]
    vi.mocked(api.getMyCard).mockResolvedValue(auto)
    vi.mocked(api.getMyProfile).mockResolvedValue({ ...profile(), entities: [{ entityId: 'dasi', name: 'DASI', title: null }] } as MyProfile)
    const { container } = renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Oceano' }))
    expect(container.querySelector('.pcard-ico img[alt="DASI"], .pcard-ico')).toBeTruthy()
    expect((screen.getByRole('checkbox', { name: 'DASI' }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(api.updateMyCard).toHaveBeenCalledWith({ settings: { ...DEFAULT_CARD, palette: 'ocean', entities: [], badges: [] }, public: false }))
  })

  it('ao mexer na lista de entidades passa a salvar a escolha explícita', async () => {
    const auto = card()
    auto.card.entities = [{ entityId: 'dasi', name: 'DASI', title: null }, { entityId: 'hype', name: 'Hype USP', title: null }]
    vi.mocked(api.getMyCard).mockResolvedValue(auto)
    vi.mocked(api.getMyProfile).mockResolvedValue({ ...profile(), entities: [{ entityId: 'dasi', name: 'DASI', title: null }, { entityId: 'hype', name: 'Hype USP', title: null }] } as MyProfile)
    renderPage()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Hype USP' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(api.updateMyCard).toHaveBeenCalledWith({ settings: { ...DEFAULT_CARD, entities: ['dasi'] }, public: false }))
  })
})
