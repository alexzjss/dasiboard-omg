import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../auth/authContext'
import { LayoutContext } from '../../app/layoutContext'
import type { MyProfile } from '../../lib/socialApi'

vi.mock('../../lib/socialApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/socialApi')>()
  return {
    ...actual,
    getMyProfile: vi.fn(),
    updateMyProfile: vi.fn(),
    listConnections: vi.fn(),
    acceptConnection: vi.fn(),
    removeConnection: vi.fn(),
    joinEntity: vi.fn(),
    leaveEntity: vi.fn(),
    listEntityMembers: vi.fn(),
    rotateInviteCode: vi.fn(),
    removeEntityMember: vi.fn(),
    setEntityAdmin: vi.fn(),
    listAdminBadges: vi.fn(),
    listEntityBadges: vi.fn(),
  }
})

import * as api from '../../lib/socialApi'
import { PerfilPage } from './PerfilPage'

const me = (over: Partial<MyProfile> = {}): MyProfile => ({
  profile: {
    handle: 'alex', name: 'Alex Santana', email: 'alex@usp.br', picture: null, hasCustomAvatar: false, bio: null, course: 'Sistemas de Informação',
    entryYear: 2024, links: {}, technologies: [], showCourses: 'all', showConnections: 'all',
  },
  entities: [], badges: [], adminOf: [], isSuperadmin: false, courses: [{ code: 'ACH2023', title: 'Algoritmos I' }],
  pendingCount: 0, pendingRequests: [], ...over,
})

const refreshNotifications = vi.fn()
const getMyProfileWith = (technologies: string[]) => vi.mocked(api.getMyProfile).mockResolvedValue(me({ profile: { ...me().profile, technologies } }))

function renderPage() {
  const auth = { status: 'authenticated' as const, user: { name: 'Alex Santana', email: 'alex@usp.br' }, login: vi.fn(), logout: vi.fn() }
  return render(
    <AuthContext value={auth}>
      <LayoutContext value={{ openUserMenu: () => undefined, refreshNotifications }}>
        <MemoryRouter><PerfilPage /></MemoryRouter>
      </LayoutContext>
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }))
  vi.mocked(api.getMyProfile).mockResolvedValue(me())
  vi.mocked(api.listConnections).mockResolvedValue([])
  vi.mocked(api.listAdminBadges).mockResolvedValue([])
  vi.mocked(api.listEntityBadges).mockResolvedValue([])
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('PerfilPage', () => {
  it('salva o perfil enviando só o patch do que mudou', async () => {
    vi.mocked(api.updateMyProfile).mockResolvedValue(me({ profile: { ...me().profile, bio: 'Gosto de dados.' } }))
    renderPage()
    fireEvent.change(await screen.findByLabelText('Bio'), { target: { value: 'Gosto de dados.' } })
    fireEvent.change(screen.getByLabelText('GitHub'), { target: { value: 'https://github.com/alex' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
    await waitFor(() => expect(api.updateMyProfile).toHaveBeenCalledTimes(1))
    expect(api.updateMyProfile).toHaveBeenCalledWith({ bio: 'Gosto de dados.', links: { github: 'https://github.com/alex' } })
    expect(await screen.findByText('Perfil salvo.')).toBeTruthy()
  })

  it('adiciona tecnologia e salva no perfil', async () => {
    vi.mocked(api.updateMyProfile).mockResolvedValue(me({ profile: { ...me().profile, technologies: ['react'] } }))
    renderPage()
    fireEvent.change(await screen.findByPlaceholderText('Buscar tecnologia (ex.: React)'), { target: { value: 'React' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar React' }))
    expect(screen.getByText('1/12')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
    await waitFor(() => expect(api.updateMyProfile).toHaveBeenCalledTimes(1))
    expect(api.updateMyProfile).toHaveBeenCalledWith({ technologies: ['react'] })
    expect(await screen.findByText('Perfil salvo.')).toBeTruthy()
  })

  it('reordena e remove tecnologias pelos botões', async () => {
    getMyProfileWith(['react', 'vue'])
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Mover Vue.js para cima' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remover React' }))
    vi.mocked(api.updateMyProfile).mockResolvedValue(me())
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
    await waitFor(() => expect(api.updateMyProfile).toHaveBeenCalledWith({ technologies: ['vue'] }))
  })

  it('link inválido bloqueia o salvamento e mostra o erro no campo', async () => {
    renderPage()
    fireEvent.change(await screen.findByLabelText('LinkedIn'), { target: { value: 'http://linkedin.com/in/alex' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
    expect(await screen.findByText('Use um link https de linkedin.com')).toBeTruthy()
    expect(api.updateMyProfile).not.toHaveBeenCalled()
  })

  it('mostra erro do servidor no campo correspondente', async () => {
    vi.mocked(api.updateMyProfile).mockRejectedValue(new api.ApiError(400, 'Ano de ingresso inválido'))
    renderPage()
    fireEvent.change(await screen.findByLabelText('Ano de ingresso'), { target: { value: '2025' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
    expect(await screen.findByText('Ano de ingresso inválido')).toBeTruthy()
  })

  it('aceitar pedido chama a API, remove da lista e atualiza o contador', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([{ handle: 'ana', name: 'Ana Silva', picture: null, course: 'SI', createdAt: '2026-10-01T00:00:00Z' }] as never)
    vi.mocked(api.acceptConnection).mockResolvedValue({ status: 'accepted' })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar pedido de Ana Silva' }))
    await waitFor(() => expect(api.acceptConnection).toHaveBeenCalledWith('ana'))
    await waitFor(() => expect(screen.queryByText('Ana Silva')).toBeNull())
    expect(refreshNotifications).toHaveBeenCalled()
    expect(screen.getByText('Nenhum pedido pendente.')).toBeTruthy()
  })

  it('código válido mostra sucesso e marca a entidade como membro', async () => {
    vi.mocked(api.joinEntity).mockResolvedValue({ entity: { id: 'dasi', name: 'DASI' } })
    vi.mocked(api.getMyProfile)
      .mockResolvedValueOnce(me())
      .mockResolvedValue(me({ entities: [{ entityId: 'dasi', name: 'DASI', role: 'member', joinedAt: '2026-10-20T00:00:00Z', title: null }] }))
    const { container } = renderPage()
    fireEvent.change(await screen.findByLabelText('Tenho um código'), { target: { value: ' dasi 7kq2 abcd ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Você entrou em DASI.')).toBeTruthy()
    expect(api.joinEntity).toHaveBeenCalledWith('dasi 7kq2 abcd')
    await waitFor(() => expect(container.querySelector('.pf-entity[data-member="true"]')).not.toBeNull())
    expect(screen.getByRole('button', { name: 'Sair de DASI' })).toBeTruthy()
  })

  it('código inválido mostra erro genérico', async () => {
    vi.mocked(api.joinEntity).mockRejectedValue(new api.ApiError(404, 'Código inválido'))
    renderPage()
    fireEvent.change(await screen.findByLabelText('Tenho um código'), { target: { value: 'xxxx' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Código inválido')
  })

  it('sair da entidade pede confirmação', async () => {
    vi.mocked(api.leaveEntity).mockResolvedValue(undefined)
    vi.mocked(api.getMyProfile).mockResolvedValue(me({ entities: [{ entityId: 'dasi', name: 'DASI', role: 'member', joinedAt: '2026-10-20T00:00:00Z', title: null }] }))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Sair de DASI' }))
    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(api.leaveEntity).toHaveBeenCalledWith('dasi'))
  })

  it('privacidade salva na hora ao trocar', async () => {
    vi.mocked(api.updateMyProfile).mockResolvedValue(me({ profile: { ...me().profile, showCourses: 'none' } }))
    renderPage()
    const group = await screen.findByRole('radiogroup', { name: 'Quem vê minhas matérias' })
    fireEvent.click(within(group).getByRole('radio', { name: 'Ninguém' }))
    await waitFor(() => expect(api.updateMyProfile).toHaveBeenCalledWith({ showCourses: 'none' }))
    await waitFor(() => expect(within(group).getByRole('radio', { name: 'Ninguém' }).getAttribute('aria-checked')).toBe('true'))
  })

  it('seção Administrar só aparece para admin ou superadmin', async () => {
    const first = renderPage()
    await screen.findByLabelText('Bio')
    expect(screen.queryByRole('heading', { name: 'Administrar' })).toBeNull()
    first.unmount()

    vi.mocked(api.getMyProfile).mockResolvedValue(me({ adminOf: ['dasi'] }))
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Administrar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Gerar novo código' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Gerar novo código' })).toHaveLength(1)
  })

  it('superadmin administra as 8 entidades', async () => {
    vi.mocked(api.getMyProfile).mockResolvedValue(me({ isSuperadmin: true }))
    renderPage()
    expect(await screen.findAllByRole('button', { name: 'Gerar novo código' })).toHaveLength(8)
  })

  it('gerar código exibe uma vez, avisa e copia', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    vi.mocked(api.getMyProfile).mockResolvedValue(me({ adminOf: ['dasi'] }))
    vi.mocked(api.rotateInviteCode).mockResolvedValue({ code: 'DASI-7KQ2-ABCD' })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar novo código' }))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('O código antigo para de funcionar'))
    expect(await screen.findByText('DASI-7KQ2-ABCD')).toBeTruthy()
    expect(screen.getByText(/não será mostrado de novo/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('DASI-7KQ2-ABCD'))
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeTruthy()
  })

  it('admin não remove admin; superadmin remove e promove; 403 vira mensagem clara', async () => {
    vi.mocked(api.getMyProfile).mockResolvedValue(me({ adminOf: ['dasi'] }))
    vi.mocked(api.listEntityMembers).mockResolvedValue([
      { handle: 'alex', name: 'Alex Santana', picture: null, role: 'admin', joinedAt: '', title: null },
      { handle: 'bia', name: 'Bia Souza', picture: null, role: 'admin', joinedAt: '', title: null },
      { handle: 'caio', name: 'Caio Lima', picture: null, role: 'member', joinedAt: '', title: null },
    ])
    vi.mocked(api.removeEntityMember).mockRejectedValue(new api.ApiError(403, 'Acesso negado'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Ver membros' }))
    await screen.findByText('Caio Lima')
    expect(screen.queryByRole('button', { name: 'Remover Alex Santana de DASI' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remover Bia Souza de DASI' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Promover a admin/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Caio Lima de DASI' }))
    expect((await screen.findByRole('alert')).textContent).toContain('não tem permissão')
  })

  it('superadmin promove e rebaixa', async () => {
    vi.mocked(api.getMyProfile).mockResolvedValue(me({ isSuperadmin: true }))
    vi.mocked(api.listEntityMembers).mockResolvedValue([{ handle: 'caio', name: 'Caio Lima', picture: null, role: 'member', joinedAt: '', title: null }])
    vi.mocked(api.setEntityAdmin).mockResolvedValue({ entityId: 'dasi', handle: 'caio', role: 'admin' })
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver membros' }))[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Promover a admin: Caio Lima' }))
    await waitFor(() => expect(api.setEntityAdmin).toHaveBeenCalledWith('dasi', 'caio', true))
    expect(await screen.findByRole('button', { name: 'Rebaixar: Caio Lima' })).toBeTruthy()
  })
})
