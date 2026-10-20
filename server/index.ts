import 'dotenv/config'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { allowedOrigins, port } from './lib/config.js'
import { securityHeaders } from './lib/middleware.js'
import authRouter from './routes/auth.js'
import scheduleRouter from './routes/schedule.js'

const app = express()

app.set('trust proxy', 1)
app.use(cors({ origin: (origin, callback) => callback(null, origin ? allowedOrigins.has(origin) : true), credentials: true }))
app.use(express.json({ limit: '16kb' }))
app.use(cookieParser())
app.disable('x-powered-by')
app.use(securityHeaders)

app.use(authRouter)
app.use(scheduleRouter)

export default app

if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`Auth server listening on port ${port}`))
}
