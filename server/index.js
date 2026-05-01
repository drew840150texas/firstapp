require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const { initDatabase } = require('./db/database')
const { requireAuth } = require('./middleware/auth')
const authRoutes = require('./routes/auth')
const bookingRoutes = require('./routes/bookings')
const customerRoutes = require('./routes/customers')
const settingsRoutes = require('./routes/settings')
const webhookRoutes = require('./routes/webhooks')
const { startScheduler } = require('./services/schedulerService')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/webhooks', webhookRoutes)

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  })
}

initDatabase()
startScheduler()

app.listen(PORT, () => {
  console.log(`MyMech server running on http://localhost:${PORT}`)
})
