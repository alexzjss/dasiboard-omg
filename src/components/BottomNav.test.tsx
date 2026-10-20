import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BottomNav } from './BottomNav'

afterEach(cleanup) // vitest sem globals não limpa o DOM entre testes

const COMUNIDADE_ITEMS: [string, 'people'][] = [['Comunidade', 'people']]

describe('BottomNav: contador de pedidos', () => {
  it('mostra o número exato até 9', () => {
    render(<BottomNav activeTab="Início" onSelectTab={() => undefined} items={COMUNIDADE_ITEMS} badges={{ Comunidade: 3 }} />)
    const item = screen.getByRole('button', { name: 'Comunidade, 3 pedidos de conexão' })
    expect(item.querySelector('.count-badge')?.textContent).toBe('3')
    expect(item.querySelector('.count-badge')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('mostra 9+ acima de 9', () => {
    render(<BottomNav activeTab="Início" onSelectTab={() => undefined} items={COMUNIDADE_ITEMS} badges={{ Comunidade: 12 }} />)
    const item = screen.getByRole('button', { name: 'Comunidade, 12 pedidos de conexão' })
    expect(item.querySelector('.count-badge')?.textContent).toBe('9+')
  })

  it('sem pedidos não há bolinha nem sufixo no nome', () => {
    render(<BottomNav activeTab="Início" onSelectTab={() => undefined} items={COMUNIDADE_ITEMS} badges={{ Comunidade: 0 }} />)
    const item = screen.getByRole('button', { name: 'Comunidade' })
    expect(item.querySelector('.count-badge')).toBeNull()
  })

  it('contador no botão de perfil', () => {
    render(<BottomNav activeTab="Início" onSelectTab={() => undefined} items={COMUNIDADE_ITEMS} profileAction={() => undefined} profileName="Ana" profileBadge={1} />)
    const profile = screen.getByRole('button', { name: 'Abrir menu do usuário, 1 pedido de conexão' })
    expect(profile.querySelector('.count-badge')?.textContent).toBe('1')
  })
})

describe('BottomNav', () => {
  it('esconde ao rolar para baixo e reaparece ao rolar para cima', async () => {
    render(<BottomNav activeTab="Início" onSelectTab={() => undefined} />)

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(nav.classList.contains('is-visible')).toBe(true)

    Object.defineProperty(window, 'scrollY', { value: 300, writable: true })
    fireEvent.scroll(window)
    await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))))
    expect(nav.classList.contains('is-visible')).toBe(false)

    Object.defineProperty(window, 'scrollY', { value: 200, writable: true })
    fireEvent.scroll(window)
    await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))))
    expect(nav.classList.contains('is-visible')).toBe(true)
  })
})
