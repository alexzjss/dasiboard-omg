// Loaded by vitest before any server module: config.ts reads these at import time.
process.env.GOOGLE_CLIENT_ID = 'test-client-id'
process.env.SESSION_SECRET = 'test-session-secret-with-more-than-32-chars'
process.env.INVITE_CODE_PEPPER = 'test-invite-pepper-with-more-than-32-chars'
process.env.SUPERADMIN_EMAILS = ' Root@USP.br , other@usp.br '
process.env.FRONTEND_URL = 'http://localhost:5173'
delete process.env.DEV_FAKE_SESSION
process.env.NODE_ENV = 'test'
delete process.env.VERCEL
