const express = require('express')
const { getDb } = require('../db/database')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/customers
router.get('/', requireAuth, (req, res) => {
  const db = getDb()
  const customers = db.prepare(`
    SELECT c.*,
      COUNT(a.id) as total_appointments,
      MAX(a.appointment_date) as last_appointment
    FROM customers c
    LEFT JOIN appointments a ON a.customer_id = c.id AND a.status = 'complete'
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all()
  res.json(customers)
})

// GET /api/customers/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb()
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })

  const appointments = db.prepare(`
    SELECT * FROM appointments WHERE customer_id = ? ORDER BY appointment_date DESC
  `).all(req.params.id)

  const smsHistory = db.prepare(`
    SELECT * FROM sms_queue WHERE customer_id = ? ORDER BY scheduled_for DESC LIMIT 50
  `).all(req.params.id)

  res.json({ customer, appointments, smsHistory })
})

// PATCH /api/customers/:id
router.patch('/:id', requireAuth, (req, res) => {
  const { name, phone, car_make, car_model, car_year } = req.body
  const db = getDb()

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })

  db.prepare(`
    UPDATE customers SET
      name = ?, phone = ?, car_make = ?, car_model = ?, car_year = ?
    WHERE id = ?
  `).run(
    name ?? customer.name,
    phone ?? customer.phone,
    car_make ?? customer.car_make,
    car_model ?? customer.car_model,
    car_year ?? customer.car_year,
    req.params.id
  )

  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id))
})

// GET /api/customers/:id/pending-sms — messages queued but Twilio not configured
router.get('/:id/pending-sms', requireAuth, (req, res) => {
  const db = getDb()
  const pending = db.prepare(`
    SELECT * FROM sms_queue WHERE customer_id = ? AND status = 'pending' ORDER BY scheduled_for ASC
  `).all(req.params.id)
  res.json(pending)
})

module.exports = router
