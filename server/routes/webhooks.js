const express = require('express')
const { getDb } = require('../db/database')

const router = express.Router()

// POST /api/webhooks/twilio — handles inbound SMS (STOP / opt-out)
// Twilio sends application/x-www-form-urlencoded
router.post('/twilio', express.urlencoded({ extended: false }), (req, res) => {
  const from = req.body.From || ''
  const body = (req.body.Body || '').trim().toUpperCase()

  if (from && isOptOut(body)) {
    const db = getDb()
    // Mark all customers with this phone as opted out
    db.prepare('UPDATE customers SET opted_out = 1 WHERE phone = ?').run(normalizePhone(from))
    // Cancel any pending SMS for this customer
    db.prepare(`
      UPDATE sms_queue SET status = 'skipped', error_message = 'Customer opted out'
      WHERE customer_id IN (SELECT id FROM customers WHERE phone = ?)
        AND status = 'pending'
    `).run(normalizePhone(from))
    console.log(`Opt-out recorded for ${from}`)
  }

  // Respond with empty TwiML so Twilio doesn't send an error
  res.set('Content-Type', 'text/xml')
  res.send('<Response></Response>')
})

function isOptOut(text) {
  return ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(text)
}

function normalizePhone(phone) {
  return phone.replace(/\s+/g, '').replace(/^(\+1)/, '')
}

module.exports = router
