import 'dotenv/config'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import webpush from 'web-push'
import { allowedOrigins, port, vapid } from './lib/config.js'
import { logError } from './lib/errors.js'
import { securityHeaders } from './lib/middleware.js'
import authRouter from './routes/auth.js'
import adminRouter from './routes/admin.js'
import announcementsRouter from './routes/announcements.js'
import avatarRouter from './routes/avatar.js'
import badgesRouter from './routes/badges.js'
import calendarFeedRouter from './routes/calendarFeed.js'
import cardsRouter from './routes/cards.js'
import entitiesRouter from './routes/entities.js'
import eventsRouter from './routes/events.js'
import notificationsRouter from './routes/notifications.js'
import pushRouter from './routes/push.js'
import scheduleRouter from './routes/schedule.js'
import socialRouter from './routes/social.js'
import { setPushDeliverer } from './social/notify.js'
import { createPushDeliverer, type PushSender } from './social/push.js'

if (vapid) {
  // Malformed VAPID keys must only disable push, never take the whole API down at boot.
  try {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
    const webPushSender: PushSender = async (sub, payload) => {
      const { statusCode } = await webpush.sendNotification(sub, payload, { TTL: 86400 })
      return { statusCode }
    }
    setPushDeliverer(createPushDeliverer(webPushSender))
  } catch (error) {
    logError('Invalid VAPID configuration; push disabled', error)
  }
}

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
app.use(pushRouter)
app.use(entitiesRouter)
app.use(adminRouter)
app.use(announcementsRouter)
app.use(eventsRouter)
app.use(calendarFeedRouter)
app.use(badgesRouter)
app.use(cardsRouter)
app.use(avatarRouter)

export default app

if (!process.env.VERCEL && !process.env.VITEST) {
  app.listen(port, () => console.log(`Auth server listening on port ${port}`))
}
