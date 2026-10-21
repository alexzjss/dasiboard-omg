import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/eventsApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/eventsApi')>()
  return { ...actual, fetchFeedStatus: vi.fn(), createFeedToken: vi.fn(), disableFeed: vi.fn() }
})

import { createFeedToken, disableFeed, fetchFeedStatus } from '../../lib/eventsApi'
import { FeedLink } from './FeedLink'

const URL1 = 'https://dasiboard.vercel.app/api/calendar-feed/abc.ics'
const writeText = vi.fn()

beforeEach(() => {
  vi.mocked(fetchFeedStatus).mockResolvedValue({ enabled: false })
  vi.mocked(createFeedToken).mockResolvedValue({ url: URL1 })
  vi.mocked(disableFeed).mockResolvedValue(undefined)
  writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('FeedLink', () => {
  it('generates the link and shows it with the Google Calendar shortcut', async () => {
    render(<FeedLink onClose={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar link' }))
    expect((await screen.findByLabelText('Seu link') as HTMLInputElement).value).toBe(URL1)
    const href = screen.getByRole('link', { name: 'Abrir no Google Calendar' }).getAttribute('href')
    expect(href).toBe(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent('webcal://dasiboard.vercel.app/api/calendar-feed/abc.ics')}`)
  })

  it('copies the link', async () => {
    render(<FeedLink onClose={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar link' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Copiar' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(URL1))
    expect(await screen.findByText('Link copiado')).toBeTruthy()
  })

  it('asks for confirmation before generating a new link', async () => {
    vi.mocked(fetchFeedStatus).mockResolvedValue({ enabled: true })
    render(<FeedLink onClose={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar novo link' }))
    expect(createFeedToken).not.toHaveBeenCalled()
    expect(screen.getByText(/O link atual deixa de funcionar/)).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Gerar novo link' })[0])
    await waitFor(() => expect(createFeedToken).toHaveBeenCalledTimes(1))
    expect(await screen.findByLabelText('Seu link')).toBeTruthy()
  })

  it('turns the link off', async () => {
    vi.mocked(fetchFeedStatus).mockResolvedValue({ enabled: true })
    render(<FeedLink onClose={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Desligar link' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Desligar' }))
    await waitFor(() => expect(disableFeed).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('button', { name: 'Gerar link' })).toBeTruthy()
  })
})
