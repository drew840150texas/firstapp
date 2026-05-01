const { getDb } = require('../db/database')

function getTwilioConfig() {
  const db = getDb()
  const rows = db.prepare(
    `SELECT key, value FROM settings WHERE key IN ('twilio_account_sid','twilio_auth_token','twilio_phone_number')`
  ).all()
  const cfg = {}
  for (const r of rows) cfg[r.key] = r.value
  const ready = cfg.twilio_account_sid && cfg.twilio_auth_token && cfg.twilio_phone_number
  return ready ? cfg : null
}

async function sendSms(to, body) {
  const cfg = getTwilioConfig()
  if (!cfg) throw new Error('Twilio not configured')

  const twilio = require('twilio')(cfg.twilio_account_sid, cfg.twilio_auth_token)
  return twilio.messages.create({ to, from: cfg.twilio_phone_number, body })
}

function addDays(date, days) {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

function scheduledFor(isoDate, offsetDays) {
  return addDays(isoDate, offsetDays)
}

function carLabel(c) {
  const parts = [c.car_year, c.car_make, c.car_model].filter(Boolean)
  return parts.length ? parts.join(' ') : 'your vehicle'
}

// ── Message builders ──────────────────────────────────────────────────────────

function buildConfirmation(customer, appointment) {
  const dt = new Date(appointment.appointment_date)
  const dateStr = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
  const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
  return (
    `Hey ${customer.name}! Your appointment at MyMech is confirmed for ${dateStr} at ${timeStr}. ` +
    `We'll be working on ${carLabel(customer)}. See you then! ` +
    `Reply STOP to unsubscribe.`
  )
}

function buildReminder(customer, appointment) {
  const dt = new Date(appointment.appointment_date)
  const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
  return (
    `Quick reminder, ${customer.name} — your MyMech appointment is tomorrow at ${timeStr} ` +
    `for ${carLabel(customer)}. If anything comes up, just reply here. See you soon! ` +
    `Reply STOP to unsubscribe.`
  )
}

function buildFollowUp2(customer, appointment) {
  const service = appointment.service_summary || appointment.issue_description || 'the service'
  return (
    `Hey ${customer.name}! Just checking in — how's the ${carLabel(customer)} running after ` +
    `we took care of ${service}? Hope everything feels smooth. ` +
    `If anything feels off, just shoot me a text and I'll take a look. ` +
    `Reply STOP to unsubscribe.`
  )
}

function buildFollowUp30(customer, appointment) {
  const service = appointment.service_summary || appointment.issue_description || 'the work we did'
  return (
    `Hi ${customer.name}! It's been about a month since we worked on your ${carLabel(customer)} ` +
    `(${service}). How's it been treating you? ` +
    `Let me know if there are any concerns or if you need anything checked out. ` +
    `Reply STOP to unsubscribe.`
  )
}

function buildFollowUp60(customer, appointment) {
  const service = appointment.service_summary || appointment.issue_description || 'your last service'
  const car = carLabel(customer)
  return (
    `Hey ${customer.name}, it's been a couple months since we handled ${service} on your ${car}. ` +
    `Just wanted to make sure everything's still running great — and remind you that staying ` +
    `on top of regular maintenance keeps repair costs down long-term. ` +
    `Give me a shout if you want to schedule a quick check-up! ` +
    `Reply STOP to unsubscribe.`
  )
}

function buildFollowUp90(customer, appointment) {
  const service = appointment.service_summary || appointment.issue_description || 'your last service'
  const car = carLabel(customer)
  return (
    `Hi ${customer.name}! Can't believe it's been 3 months since we worked on your ${car}. ` +
    `If you're coming up on an oil change, inspection, or just want a once-over after ${service}, ` +
    `I'd love to get you back in. You can book online or just reply here to set something up. ` +
    `Reply STOP to unsubscribe.`
  )
}

// ── Queue helpers ─────────────────────────────────────────────────────────────

function enqueue(customer_id, appointment_id, message_type, message_body, scheduled_for) {
  const db = getDb()
  db.prepare(`
    INSERT INTO sms_queue (customer_id, appointment_id, message_type, message_body, scheduled_for, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(customer_id, appointment_id, message_type, message_body, scheduled_for)
}

function queueConfirmationSms(customer, appointment) {
  enqueue(
    customer.id,
    appointment.id,
    'confirmation',
    buildConfirmation(customer, appointment),
    new Date().toISOString()
  )
}

function queueReminderSms(customer, appointment) {
  const reminderAt = scheduledFor(appointment.appointment_date, -1)
  enqueue(
    customer.id,
    appointment.id,
    'reminder',
    buildReminder(customer, appointment),
    reminderAt
  )
}

function queueFollowUpSms(customer, appointment) {
  const base = appointment.completed_at || new Date().toISOString()
  enqueue(customer.id, appointment.id, 'followup_2',  buildFollowUp2(customer, appointment),  scheduledFor(base, 2))
  enqueue(customer.id, appointment.id, 'followup_30', buildFollowUp30(customer, appointment), scheduledFor(base, 30))
  enqueue(customer.id, appointment.id, 'followup_60', buildFollowUp60(customer, appointment), scheduledFor(base, 60))
  enqueue(customer.id, appointment.id, 'followup_90', buildFollowUp90(customer, appointment), scheduledFor(base, 90))
}

module.exports = {
  sendSms,
  getTwilioConfig,
  queueConfirmationSms,
  queueReminderSms,
  queueFollowUpSms,
}
