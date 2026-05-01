const cron = require('node-cron')
const { getDb } = require('../db/database')
const { sendSms, getTwilioConfig } = require('./smsService')

async function processSmsQueue() {
  const cfg = getTwilioConfig()
  if (!cfg) return // Silently skip — messages stay pending until Twilio is configured

  const db = getDb()
  const now = new Date().toISOString()

  const due = db.prepare(`
    SELECT q.*, c.phone, c.opted_out
    FROM sms_queue q
    JOIN customers c ON q.customer_id = c.id
    WHERE q.status = 'pending' AND q.scheduled_for <= ?
    ORDER BY q.scheduled_for ASC
    LIMIT 20
  `).all(now)

  for (const msg of due) {
    if (msg.opted_out) {
      db.prepare(`UPDATE sms_queue SET status = 'skipped', error_message = 'Opted out' WHERE id = ?`).run(msg.id)
      continue
    }

    try {
      await sendSms(msg.phone, msg.message_body)
      db.prepare(`UPDATE sms_queue SET status = 'sent', sent_at = ? WHERE id = ?`).run(new Date().toISOString(), msg.id)
      console.log(`SMS sent [${msg.message_type}] → ${msg.phone}`)
    } catch (err) {
      const errMsg = err.message || 'Unknown error'
      db.prepare(`UPDATE sms_queue SET status = 'failed', error_message = ? WHERE id = ?`).run(errMsg, msg.id)
      console.error(`SMS failed [${msg.message_type}] → ${msg.phone}: ${errMsg}`)
    }
  }
}

function startScheduler() {
  // Run every minute
  cron.schedule('* * * * *', () => {
    processSmsQueue().catch(err => console.error('Scheduler error:', err))
  })
  console.log('SMS scheduler started (runs every minute)')
}

module.exports = { startScheduler, processSmsQueue }
