import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import api from '../utils/api'

const STATUS_STYLES = {
  pending:  'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  declined: 'bg-gray-100 text-gray-500',
}

const SMS_STATUS_STYLES = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  sent:    'bg-green-50 text-green-700 border-green-200',
  failed:  'bg-red-50 text-red-700 border-red-200',
  skipped: 'bg-gray-50 text-gray-500 border-gray-200',
}

const MSG_TYPE_LABELS = {
  confirmation: 'Booking confirmation',
  reminder:     '24h reminder',
  followup_2:   'Day 2 check-in',
  followup_30:  'Day 30 satisfaction',
  followup_60:  'Day 60 maintenance',
  followup_90:  'Day 90 re-booking',
}

export default function CustomerProfilePage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('history')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/customers/${id}`)
      .then(r => {
        setData(r.data)
        setEditForm({
          name: r.data.customer.name,
          phone: r.data.customer.phone,
          car_year: r.data.customer.car_year || '',
          car_make: r.data.customer.car_make || '',
          car_model: r.data.customer.car_model || '',
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      await api.patch(`/customers/${id}`, editForm)
      const r = await api.get(`/customers/${id}`)
      setData(r.data)
      setEditing(false)
    } catch {}
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return <div className="p-4 text-center text-gray-500">Customer not found.</div>

  const { customer: c, appointments, smsHistory } = data
  const car = [c.car_year, c.car_make, c.car_model].filter(Boolean).join(' ')
  const completed = appointments.filter(a => a.status === 'complete')

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      {/* Back */}
      <Link to="/dashboard/customers" className="text-blue-600 text-sm flex items-center gap-1 mb-4">
        ← All Customers
      </Link>

      {/* Customer header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Phone</label>
                <input value={editForm.phone} onChange={e => setEditForm(f => ({...f, phone: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Year</label>
                <input value={editForm.car_year} onChange={e => setEditForm(f => ({...f, car_year: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Make</label>
                <input value={editForm.car_make} onChange={e => setEditForm(f => ({...f, car_make: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Model</label>
                <input value={editForm.car_model} onChange={e => setEditForm(f => ({...f, car_model: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(false)} className="flex-1 border border-gray-300 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50">Cancel</button>
              <button disabled={saving} onClick={handleSave} className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{c.name}</h2>
                {c.opted_out ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Opted out</span> : null}
              </div>
              <p className="text-gray-500 text-sm mt-0.5">{c.phone}</p>
              {car && <p className="text-gray-600 text-sm mt-1">🚗 {car}</p>}
              <p className="text-xs text-gray-400 mt-2">
                {completed.length} completed service{completed.length !== 1 ? 's' : ''} · Customer since {format(parseISO(c.created_at), 'MMM yyyy')}
              </p>
            </div>
            <button onClick={() => setEditing(true)} className="text-blue-600 text-sm font-medium hover:underline">Edit</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white mb-4 shadow-sm">
        {[['history', 'Service History'], ['sms', 'SMS Log']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'history' && (
        <div className="space-y-3">
          {appointments.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No appointments on record.</p>
          ) : appointments.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-800">
                  {format(parseISO(a.appointment_date), 'EEE, MMM d, yyyy · h:mm a')}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[a.status]}`}>
                  {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-gray-600">{a.service_summary || a.issue_description || '—'}</p>
              {a.completed_at && (
                <p className="text-xs text-gray-400 mt-1">Completed {format(parseISO(a.completed_at), 'MMM d, yyyy')}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'sms' && (
        <div className="space-y-3">
          {smsHistory.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No SMS messages on record.</p>
          ) : smsHistory.map(s => (
            <div key={s.id} className={`bg-white rounded-2xl border shadow-sm px-4 py-3 ${SMS_STATUS_STYLES[s.status] || ''}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {MSG_TYPE_LABELS[s.message_type] || s.message_type}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SMS_STATUS_STYLES[s.status]}`}>
                  {s.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{s.message_body}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>Scheduled: {format(parseISO(s.scheduled_for), 'MMM d, yyyy h:mm a')}</span>
                {s.sent_at && <span>Sent: {format(parseISO(s.sent_at), 'MMM d')}</span>}
              </div>
              {s.error_message && (
                <p className="text-xs text-red-500 mt-1">Error: {s.error_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
