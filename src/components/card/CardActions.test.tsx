import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'

vi.mock('./exportCard', async (orig) => ({ ...(await orig<typeof import('./exportCard')>()), exportCard: vi.fn(async () => new Blob(['x'], { type: 'image/png' })) }))

import { CardActions } from './CardActions'
import { exportCard } from './exportCard'

const renderActions = () => {
  const ref = createRef<HTMLDivElement>() as { current: HTMLDivElement | null }
  ref.current = document.createElement('div')
  return render(<CardActions data={{ handle: 'alex' }} cardRef={ref} />)
}

const setNavigator = (patch: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(patch)) Object.defineProperty(navigator, key, { value, configurable: true })
}

beforeEach(() => {
  setNavigator({ share: undefined, canShare: undefined, clipboard: { writeText: vi.fn(async () => undefined) } })
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks() })

describe('CardActions', () => {
  it('compartilha o PNG quando canShare aceita arquivos', async () => {
    const share = vi.fn(async (_data: { files: File[]; title: string; url: string }) => undefined)
    setNavigator({ share, canShare: vi.fn(() => true) })
    renderActions()
    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }))
    await waitFor(() => expect(share).toHaveBeenCalled())
    const arg = share.mock.calls[0][0]
    expect(arg.files[0].name).toBe('carta-alex.png')
    expect(arg.title).toBe('Minha carta no DASIboard')
    expect(arg.url.endsWith('/c/alex')).toBe(true)
  })

  it('sem share, copia o link e avisa', async () => {
    renderActions()
    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }))
    expect(await screen.findByText('Link copiado')).toBeTruthy()
    const text = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0]
    expect(text.endsWith('/c/alex')).toBe(true)
  })

  it('Baixar imagem baixa carta-{handle}.png', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const names: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download) })
    renderActions()
    fireEvent.click(screen.getByRole('button', { name: 'Baixar imagem' }))
    await waitFor(() => expect(names).toEqual(['carta-alex.png']))
    expect(vi.mocked(exportCard).mock.calls[0][1]).toMatchObject({ face: 'front' })
  })
})
