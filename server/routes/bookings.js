const express = require('express')
const { getDb } = require('../db/database')
const { requireAuth } = require('../middleware/auth')
const { queueConfirmationSms, queueReminderSms } = require('../services/smsService')

const router = express.Router()

// Available time slots: 9am–6pm Mon–Sat (hour slots)
const SLOT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17] // 9am to 5pm start (last appt 5–6pm)

// GET /api/bookings/available?date=YYYY-MM-DD
router.get('/available', (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  const db = getDb()
  const booked = db.prepare(`
    SELECT appointment_date FROM appointments
    WHERE appointment_date LIKE ? AND status NOT IN ('declined')
  `).all(`${date}%`)

  const bookedHours = new Set(
    booked.map(r => new Date(r.appointment_date).getUTCHours())
  )

  const slots = SLOT_HOURS.map(hour => ({
    hour,
    label: formatHour(hour),
    available: !bookedHours.has(hour),
  }))

  res.json(slots)
})

// GET /api/bookings — dashboard list (auth required)
router.get('/', requireAuth, (req, res) => {
  const { status } = req.query
  const db = getDb()

  let query = `
    SELECT a.*, c.name, c.phone, c.car_make, c.car_model, c.car_year
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
  `
  const params = []
  if (status) {
    query += ' WHERE a.status = ?'
    params.push(status)
  }
  query += ' ORDER BY a.appointment_date ASC'

  res.json(db.prepare(query).all(...params))
})

// POST /api/bookings — public booking submission
router.post('/', (req, res) => {
  const { name, phone, car_make, car_model, car_year, issue_description, appointment_date } = req.body

  if (!name || !phone || !appointment_date) {
    return res.status(400).json({ error: 'Name, phone, and appointment date are required' })
  }

  const db = getDb()

  // Check slot still available
  const conflict = db.prepare(`
    SELECT id FROM appointments
    WHERE appointment_date = ? AND status NOT IN ('declined')
  `).get(appointment_date)
  if (conflict) {
    return res.status(409).json({ error: 'That time slot was just booked. Please choose another.' })
  }

  // Upsert customer by phone
  let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone)
  if (!customer) {
    const result = db.prepare(
      'INSERT INTO customers (name, phone, car_make, car_model, car_year) VALUES (?, ?, ?, ?, ?)'
    ).run(name, phone, car_make || null, car_model || null, car_year || null)
    customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid)
  } else {
    // Update car info if provided
    db.prepare(
      'UPDATE customers SET name = ?, car_make = ?, car_model = ?, car_year = ? WHERE id = ?'
    ).run(name, car_make || customer.car_make, car_model || customer.car_model, car_year || customer.car_year, customer.id)
    customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id)
  }

  const result = db.prepare(`
    INSERT INTO appointments (customer_id, issue_description, appointment_date, status)
    VALUES (?, ?, ?, 'pending')
  `).run(customer.id, issue_description || null, appointment_date)

  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid)

  // Queue confirmation SMS
  queueConfirmationSms(customer, appointment)
  // Queue 24h reminder
  queueReminderSms(customer, appointment)

  res.status(201).json({ message: 'Booking request received!', appointmentId: appointment.id })
})

// PATCH /api/bookings/:id/status — accept, decline (auth)
router.patch('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'status must be accepted or declined' })
  }

  const db = getDb()
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id)
  if (!appt) return res.status(404).json({ error: 'Appointment not found' })

  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ message: `Appointment ${status}` })
})

// PATCH /api/bookings/:id/complete — mark job complete (auth)
router.patch('/:id/complete', requireAuth, (req, res) => {
  const { service_summary } = req.body
  const db = getDb()

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id)
  if (!appt) return res.status(404).json({ error: 'Appointment not found' })

  const completedAt = new Date().toISOString()
  db.prepare(`
    UPDATE appointments SET status = 'complete', service_summary = ?, completed_at = ? WHERE id = ?
  `).run(service_summary || appt.issue_description, completedAt, req.params.id)

  // Queue all follow-up SMS messages
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(appt.customer_id)
  const updatedAppt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id)

  const { queueFollowUpSms } = require('../services/smsService')
  queueFollowUpSms(customer, updatedAppt)

  res.json({ message: 'Job marked complete, follow-up messages scheduled' })
})

function formatHour(h) {
  if (h === 12) return '12:00 PM'
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}

module.exports = router
