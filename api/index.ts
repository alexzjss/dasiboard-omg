import app from '../server/index.js'

// Recebe todas as rotas /api/* sem arquivo próprio (rewrite em vercel.json); o Express roteia pelo caminho original.
export default app
