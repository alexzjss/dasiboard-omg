import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { env } from './utils/env'
import { errorHandler } from './middlewares/errorHandler'
import { notFound } from './middlewares/notFound'
import { requestLogger } from './middlewares/requestLogger'
import { generalLimiter, authLimiter } from './middlewares/rateLimit'

// Routes
import authRoutes from './routes/auth'
import eventsRoutes from './routes/events'
import scheduleRoutes from './routes/schedule'
import kanbanRoutes from './routes/kanban'
import gpaRoutes from './routes/gpa'
import faltasRoutes from './routes/faltas'
import newsletterRoutes from './routes/newsletter'
import docentesRoutes from './routes/docentes'
import estudosRoutes from './routes/estudos'
import entidadesRoutes from './routes/entidades'
import toolsRoutes from './routes/tools'
import challengesRoutes from './routes/challenges'

const app: express.Application = express()

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}))
app.use(generalLimiter)

// ─── Parsing & compression ────────────────────────────────────────────────────
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ─── Logging ──────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(requestLogger)
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
const api = express.Router()

api.use('/auth', authLimiter)
api.use('/auth', authRoutes)
api.use('/events', eventsRoutes)
api.use('/schedule', scheduleRoutes)
api.use('/kanban', kanbanRoutes)
api.use('/gpa', gpaRoutes)
api.use('/faltas', faltasRoutes)
api.use('/newsletter', newsletterRoutes)
api.use('/docentes', docentesRoutes)
api.use('/estudos', estudosRoutes)
api.use('/entidades', entidadesRoutes)
api.use('/tools', toolsRoutes)
api.use('/challenges', challengesRoutes)

app.use('/api', api)

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

export default app
