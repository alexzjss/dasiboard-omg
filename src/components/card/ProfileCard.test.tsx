import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ProfileCard, cardUrl } from './ProfileCard'
import { DEFAULT_CARD } from '../../lib/cardOptions'
import type { CardData } from '../../lib/socialApi'

afterEach(cleanup)

const FULL: CardData = {
  handle: 'alex',
  name: 'Alex Benedito',
  picture: 'https://example.com/alex.jpg',
  subtitle: 'Diretor de Marketing · DASI',
  course: 'SI',
  entryYear: 2024,
  technologies: ['react', 'python'],
  links: { github: 'https://github.com/alexb' },
  entities: [{ entityId: 'dasi', name: 'DASI', title: 'Diretor' }],
  badges: [{ kind: 'achievement', sourceId: 'x', label: 'Hackathon', icon: 'trophy', color: null, entityId: null }],
  settings: DEFAULT_CARD,
  viewer: null,
}

const MINIMAL: CardData = { ...FULL, picture: null, technologies: [], links: {}, entities: [], badges: [], subtitle: 'SI · Turma 2024' }

describe('ProfileCard', () => {
  it('mostra o nome e o subtítulo', () => {
    render(<ProfileCard data={FULL} />)
    expect(screen.getByText('Alex Benedito')).toBeTruthy()
    expect(screen.getByText('Diretor de Marketing · DASI')).toBeTruthy()
  })

  it('clicar vira a carta e avisa a face', () => {
    const onFlip = vi.fn()
    render(<ProfileCard data={FULL} onFlip={onFlip} />)
    const button = screen.getByRole('button', { name: 'Virar a carta de Alex Benedito' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(button)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(onFlip).toHaveBeenCalledWith('back')
    fireEvent.click(button)
    expect(onFlip).toHaveBeenLastCalledWith('front')
  })

  it('a face oculta fica aria-hidden e o verso tem o QR e as redes', () => {
    const { container } = render(<ProfileCard data={FULL} />)
    expect(container.querySelector('.pcard-front')?.getAttribute('aria-hidden')).toBe('false')
    expect(container.querySelector('.pcard-back')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.pcard-back svg.card-qr')).not.toBeNull()
    expect(container.querySelector('.pcard-back a[href="https://github.com/alexb"]')).not.toBeNull()
  })

  it('mini não tem QR nem botão de virar', () => {
    const { container } = render(<ProfileCard data={FULL} variant="mini" />)
    expect(container.querySelector('svg.card-qr')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Alex Benedito')).toBeTruthy()
  })

  it('sem foto mostra o gradiente no lugar', () => {
    render(<ProfileCard data={MINIMAL} />)
    expect(screen.getByTestId('card-photo-fallback')).toBeTruthy()
  })

  it('com dados mínimos não renderiza a etiqueta de tecnologias nem os ícones', () => {
    const { container } = render(<ProfileCard data={MINIMAL} />)
    expect(container.querySelector('.pcard-tags')).toBeNull()
    expect(container.querySelector('.pcard-icons')).toBeNull()
    expect(screen.getByText('SI · Turma 2024')).toBeTruthy()
  })

  it('com tecnologias renderiza a etiqueta com o separador', () => {
    const { container } = render(<ProfileCard data={FULL} />)
    expect(container.querySelector('.pcard-front .pcard-tags')?.textContent).toContain('React')
    expect(container.querySelector('.pcard-hatch')).not.toBeNull()
  })
})

describe('cardUrl', () => {
  it('termina em /c/:handle', () => {
    expect(cardUrl('alex').endsWith('/c/alex')).toBe(true)
  })
})
