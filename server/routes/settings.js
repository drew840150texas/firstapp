const express = require('express')
const { getDb } = require('../db/database')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

const TWILIO_KEYS = ['twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number']

// GET /api/settings/twilio
router.get('/twilio', requireAuth, (req, res) => {
  const db = getDb()
  const rows = db.prepare(
    `SELECT key, value FROM settings WHERE key IN (${TWILIO_KEYS.map(() => '?').join(',')})`
  ).all(...TWILIO_KEYS)

  const config = {}
  for (const row of rows) {
    // Mask auth token in response
    config[row.key] = row.key === 'twilio_auth_token'
      ? maskToken(row.value)
      : row.value
  }

  const configured = TWILIO_KEYS.every(k => rows.find(r => r.key === k && r.value))
  res.json({ ...config, configured })
})

// POST /api/settings/twilio
router.post('/twilio', requireAuth, (req, res) => {
  const { twilio_account_sid, twilio_auth_token, twilio_phone_number } = req.body

  if (!twilio_account_sid || !twilio_auth_token || !twilio_phone_number) {
    return res.status(400).json({ error: 'All three Twilio fields are required' })
  }

  const db = getDb()
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `)

  // Only update auth token if it's not the masked placeholder
  const upsertAll = db.transaction(() => {
    upsert.run('twilio_account_sid', twilio_account_sid.trim())
    if (!twilio_auth_token.includes('*')) {
      upsert.run('twilio_auth_token', twilio_auth_token.trim())
    }
    upsert.run('twilio_phone_number', twilio_phone_number.trim())
  })

  upsertAll()
  res.json({ message: 'Twilio settings saved' })
})

// GET /api/settings/twilio/status — pending message count warning
router.get('/twilio/status', requireAuth, (req, res) => {
  const db = getDb()
  const rows = db.prepare(
    `SELECT key, value FROM settings WHERE key IN (${TWILIO_KEYS.map(() => '?').join(',')})`
  ).all(...TWILIO_KEYS)

  const configured = TWILIO_KEYS.every(k => rows.find(r => r.key === k && r.value))

  const pendingCount = db.prepare(
    `SELECT COUNT(*) as count FROM sms_queue WHERE status = 'pending'`
  ).get().count

  res.json({ configured, pendingCount })
})

function maskToken(token) {
  if (!token || token.length < 8) return token
  return token.slice(0, 4) + '*'.repeat(token.length - 8) + token.slice(-4)
}

module.exports = router
