import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { getMyProfile, listEntityMembers, setMemberTitle, type EntityMember, type MyProfile } from '../../lib/socialApi'
import { EntidadeMembers } from './EntidadeMembers'

vi.mock('../../lib/socialApi', () => ({ listEntityMembers: vi.fn(), getMyProfile: vi.fn(), setMemberTitle: vi.fn() }))

const viewer = (adminOf: string[], isSuperadmin = false) => ({ adminOf, isSuperadmin }) as MyProfile

const member = (handle: string, name: string, role: 'member' | 'admin' = 'member', picture: string | null = null): EntityMember => ({
  handle,
  name,
  picture,
  role,
  joinedAt: '2026-01-01T00:00:00Z',
  title: null,
})

function renderSection(id = 'dasi') {
  return render(
    <MemoryRouter>
      <EntidadeMembers entidadeId={id} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(listEntityMembers).mockReset()
  vi.mocked(getMyProfile).mockReset().mockResolvedValue(viewer([]))
  vi.mocked(setMemberTitle).mockReset()
})

afterEach(() => {
  cleanup() // vitest sem globals não limpa o DOM entre testes
})

describe('EntidadeMembers', () => {
  it('busca pelo id da entidade e linka cada membro para o perfil, marcando admins', async () => {
    vi.mocked(listEntityMembers).mockResolvedValue([member('ana.silva', 'Ana Silva', 'admin'), member('bruno.lima', 'Bruno Lima')])
    const { container } = renderSection('dasi')

    const ana = await screen.findByRole('link', { name: /Ana Silva/ })
    expect(listEntityMembers).toHaveBeenCalledWith('dasi', expect.any(AbortSignal))
    expect(ana.getAttribute('href')).toBe('/comunidade/ana.silva')
    expect(ana.querySelector('.ent-member-admin')?.textContent).toBe('admin')

    const bruno = screen.getByRole('link', { name: 'Bruno Lima' })
    expect(bruno.getAttribute('href')).toBe('/comunidade/bruno.lima')
    expect(bruno.querySelector('.ent-member-admin')).toBeNull()
    expect(container.querySelectorAll('.ent-member-avatar')).toHaveLength(2)
  })

  it('usa a foto quando existe e iniciais quando não existe', async () => {
    vi.mocked(listEntityMembers).mockResolvedValue([member('ana.silva', 'Ana Silva', 'member', 'https://img.example/ana.jpg'), member('bruno.lima', 'bruno lima maria')])
    const { container } = renderSection()
    await screen.findByRole('link', { name: /Ana Silva/ })
    expect(container.querySelector('.ent-member-avatar img')?.getAttribute('src')).toBe('https://img.example/ana.jpg')
    expect(container.querySelectorAll('.ent-member-avatar')[1]?.textContent).toBe('BL')
  })

  it('mostra no máximo 12 avatares e a contagem total', async () => {
    const many = Array.from({ length: 14 }, (_, i) => member(`aluno${i}`, `Aluno ${i}`))
    vi.mocked(listEntityMembers).mockResolvedValue(many)
    const { container } = renderSection()
    await screen.findByText('14 pessoas daqui no daSIboard')
    expect(container.querySelectorAll('.ent-member')).toHaveLength(12)
  })

  it('vazio mostra a mensagem e o link para o perfil (código)', async () => {
    vi.mocked(listEntityMembers).mockResolvedValue([])
    renderSection()
    expect(await screen.findByText(/Ninguém daqui entrou ainda\. Tem o código\?/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Use no seu perfil.' }).getAttribute('href')).toBe('/perfil')
    expect(screen.queryByRole('link', { name: /Ana/ })).toBeNull()
  })

  it('mostra o cargo abaixo do nome', async () => {
    vi.mocked(listEntityMembers).mockResolvedValue([{ ...member('ana.silva', 'Ana Silva'), title: 'Diretora de Marketing' }])
    renderSection()
    expect(await screen.findByText('Diretora de Marketing')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Definir cargo/ })).toBeNull()
  })

  it('admin define o cargo com Enter, Esc cancela', async () => {
    vi.mocked(getMyProfile).mockResolvedValue(viewer(['dasi']))
    vi.mocked(listEntityMembers).mockResolvedValue([member('ana.silva', 'Ana Silva')])
    vi.mocked(setMemberTitle).mockResolvedValue({ handle: 'ana.silva', title: 'Tesoureira' })
    renderSection()
    fireEvent.click(await screen.findByRole('button', { name: 'Definir cargo de Ana Silva' }))
    fireEvent.keyDown(screen.getByLabelText('Cargo de ana.silva'), { key: 'Escape' })
    expect(screen.queryByLabelText('Cargo de ana.silva')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Definir cargo de Ana Silva' }))
    const input = screen.getByLabelText('Cargo de ana.silva')
    fireEvent.change(input, { target: { value: ' Tesoureira ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(await screen.findByText('Tesoureira')).toBeTruthy()
    expect(setMemberTitle).toHaveBeenCalledWith('dasi', 'ana.silva', 'Tesoureira')
  })

  it('carregando mostra o estado de espera', () => {
    vi.mocked(listEntityMembers).mockReturnValue(new Promise(() => undefined))
    renderSection()
    expect(screen.getByText('Carregando…')).toBeTruthy()
  })

  it('erro esconde a seção inteira, sem mensagem', async () => {
    vi.mocked(listEntityMembers).mockRejectedValue(new Error('boom'))
    const { container } = renderSection()
    await waitFor(() => expect(container.querySelector('.ent-members-section')).toBeNull())
    expect(container.textContent).toBe('')
  })
})
