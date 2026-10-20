import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/push', () => ({ pushState: vi.fn(), enablePush: vi.fn(), disablePush: vi.fn() }))

import { enablePush, pushState } from '../../lib/push'
import { PushOptIn } from './PushOptIn'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('PushOptIn', () => {
  it('renders nothing when unsupported', async () => {
    vi.mocked(pushState).mockResolvedValue('unsupported')
    const { container } = render(<PushOptIn />)
    await waitFor(() => expect(pushState).toHaveBeenCalled())
    expect(container.innerHTML).toBe('')
  })

  it('does not ask for permission on its own, only on click', async () => {
    vi.mocked(pushState).mockResolvedValueOnce('available').mockResolvedValue('enabled')
    vi.mocked(enablePush).mockResolvedValue()
    render(<PushOptIn />)
    const button = await screen.findByRole('button', { name: 'Ativar' })
    expect(enablePush).not.toHaveBeenCalled()
    fireEvent.click(button)
    expect(await screen.findByText('Avisos ativados neste dispositivo')).toBeTruthy()
    expect(enablePush).toHaveBeenCalledTimes(1)
  })

  it('explains when blocked', async () => {
    vi.mocked(pushState).mockResolvedValue('denied')
    render(<PushOptIn />)
    expect(await screen.findByText('Os avisos estão bloqueados nas configurações do navegador.')).toBeTruthy()
  })
})
