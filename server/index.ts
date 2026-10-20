import 'dotenv/config'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { allowedOrigins, port } from './lib/config.js'
import { securityHeaders } from './lib/middleware.js'
import authRouter from './routes/auth.js'
import adminRouter from './routes/admin.js'
import announcementsRouter from './routes/announcements.js'
import avatarRouter from './routes/avatar.js'
import badgesRouter from './routes/badges.js'
import entitiesRouter from './routes/entities.js'
import notificationsRouter from './routes/notifications.js'
import scheduleRouter from './routes/schedule.js'
import socialRouter from './routes/social.js'

const app = express()

app.set('trust proxy', 1)
app.use(cors({ origin: (origin, callback) => callback(null, origin ? allowedOrigins.has(origin) : true), credentials: true }))
app.use(express.json({ limit: '16kb' }))
app.use(cookieParser())
app.disable('x-powered-by')
app.use(securityHeaders)

app.use(authRouter)
app.use(scheduleRouter)
app.use(socialRouter)
app.use(notificationsRouter)
app.use(entitiesRouter)
app.use(adminRouter)
app.use(announcementsRouter)
app.use(badgesRouter)
app.use(avatarRouter)

export default app

if (!process.env.VERCEL && !process.env.VITEST) {
  app.listen(port, () => console.log(`Auth server listening on port ${port}`))
}
