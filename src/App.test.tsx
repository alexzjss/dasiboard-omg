import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BottomNav } from './App'

describe('BottomNav', () => {
  it('esconde ao rolar para baixo e reaparece ao rolar para cima', () => {
    render(<BottomNav activeTab="Início" onSelectTab={() => undefined} />)

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(nav.classList.contains('is-visible')).toBe(true)

    Object.defineProperty(window, 'scrollY', { value: 300, writable: true })
    fireEvent.scroll(window)
    expect(nav.classList.contains('is-visible')).toBe(false)

    Object.defineProperty(window, 'scrollY', { value: 200, writable: true })
    fireEvent.scroll(window)
    expect(nav.classList.contains('is-visible')).toBe(true)
  })
})
