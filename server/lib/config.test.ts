// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

const original = { ...process.env }
afterEach(() => {
  process.env = { ...original }
  vi.resetModules()
  vi.restoreAllMocks()
})

async function loadConfig(env: Record<string, string | undefined>) {
  vi.resetModules()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return import('./config.js')
}

describe('config', () => {
  it('refuses DEV_FAKE_SESSION=1 in production', async () => {
    await expect(loadConfig({ NODE_ENV: 'production', DEV_FAKE_SESSION: '1', VERCEL: undefined })).rejects.toThrow(/DEV_FAKE_SESSION/)
  })

  it('refuses DEV_FAKE_SESSION=1 on Vercel even if NODE_ENV is not production', async () => {
    await expect(loadConfig({ NODE_ENV: 'development', DEV_FAKE_SESSION: '1', VERCEL: '1' })).rejects.toThrow(/DEV_FAKE_SESSION/)
  })

  it('allows DEV_FAKE_SESSION=1 in development', async () => {
    const config = await loadConfig({ NODE_ENV: 'development', DEV_FAKE_SESSION: '1', VERCEL: undefined })
    expect(config.devFakeSession).toBe(true)
  })

  it('requires INVITE_CODE_PEPPER (32+ chars) in production', async () => {
    await expect(loadConfig({ NODE_ENV: 'production', DEV_FAKE_SESSION: undefined, INVITE_CODE_PEPPER: undefined })).rejects.toThrow(/INVITE_CODE_PEPPER/)
    await expect(loadConfig({ NODE_ENV: 'production', INVITE_CODE_PEPPER: 'short' })).rejects.toThrow(/32/)
  })

  it('derives the pepper from SESSION_SECRET in development', async () => {
    const config = await loadConfig({ NODE_ENV: 'development', VERCEL: undefined, DEV_FAKE_SESSION: undefined, INVITE_CODE_PEPPER: undefined })
    expect(config.inviteCodePepper.length).toBeGreaterThanOrEqual(32)
  })

  it('normalizes SUPERADMIN_EMAILS', async () => {
    const config = await loadConfig({ NODE_ENV: 'test', SUPERADMIN_EMAILS: ' A@USP.br,,b@usp.br ' })
    expect(config.isSuperadminEmail('a@usp.br')).toBe(true)
    expect(config.isSuperadminEmail(' B@usp.BR')).toBe(true)
    expect(config.isSuperadminEmail('c@usp.br')).toBe(false)
  })
})
