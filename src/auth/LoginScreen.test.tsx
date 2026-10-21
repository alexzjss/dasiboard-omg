import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from './authContext'
import { LoginScreen, safeReturnPath } from './LoginScreen'

const auth = { status: 'authenticated' as const, user: { name: 'Alex', email: 'a@usp.br' }, login: vi.fn(), logout: vi.fn() }

function renderAt(url: string) {
  return render(
    <AuthContext value={auth}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/entrar" element={<LoginScreen />} />
          <Route path="/c/:handle" element={<p>carta publica</p>} />
          <Route path="/" element={<p>home</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }))
})
afterEach(cleanup)

describe('LoginScreen volta', () => {
  it('goes back to an internal path after login', () => {
    renderAt('/entrar?volta=/c/alex')
    expect(screen.getByText('carta publica')).toBeTruthy()
  })

  it('ignores an external destination', () => {
    renderAt('/entrar?volta=https://mal.com')
    expect(screen.getByText('home')).toBeTruthy()
  })

  it('only accepts paths starting with a single slash', () => {
    expect(safeReturnPath('/c/alex')).toBe('/c/alex')
    for (const bad of [null, '', 'https://mal.com', '//mal.com', 'c/alex', '/' + String.fromCharCode(92) + 'mal.com']) expect(safeReturnPath(bad)).toBe('/')
  })
})
