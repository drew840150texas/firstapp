import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import BookingCard from '../components/BookingCard'

const TABS = [
  { key: 'pending',  label: 'Pending' },
  { key: 'accepted', label: 'Upcoming' },
  { key: 'complete', label: 'Done' },
  { key: 'declined', label: 'Declined' },
]

export default function DashboardPage() {
  const [tab, setTab] = useState('pending')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [twilioStatus, setTwilioStatus] = useState(null)
  const [actionId, setActionId] = useState(null)
  const [completeModal, setCompleteModal] = useState(null)
  const [serviceSummary, setServiceSummary] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [bRes, tRes] = await Promise.all([
        api.get(`/bookings?status=${tab}`),
        api.get('/settings/twilio/status'),
      ])
      setBookings(bRes.data)
      setTwilioStatus(tRes.data)
    } catch {
      setError('Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { load() }, [load])

  async function handleAccept(id) {
    setActionId(id)
    try {
      await api.patch(`/bookings/${id}/status`, { status: 'accepted' })
      await load()
    } catch { setError('Could not accept booking.') }
    finally { setActionId(null) }
  }

  async function handleDecline(id) {
    if (!confirm('Decline this booking?')) return
    setActionId(id)
    try {
      await api.patch(`/bookings/${id}/status`, { status: 'declined' })
      await load()
    } catch { setError('Could not decline booking.') }
    finally { setActionId(null) }
  }

  async function handleComplete(id) {
    setActionId(id)
    try {
      await api.patch(`/bookings/${id}/complete`, { service_summary: serviceSummary.trim() || undefined })
      setCompleteModal(null)
      setServiceSummary('')
      await load()
    } catch { setError('Could not mark job complete.') }
    finally { setActionId(null) }
  }

  return (
    <div className="px-4 pt-4 max-w-lg mx-auto">
      {/* Twilio warning banner */}
      {twilioStatus && !twilioStatus.configured && twilioStatus.pendingCount > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Twilio not configured</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {twilioStatus.pendingCount} SMS message{twilioStatus.pendingCount !== 1 ? 's' : ''} are queued and waiting.{' '}
              <a href="/dashboard/settings" className="underline font-medium">Set up Twilio →</a>
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white mb-4 shadow-sm">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">No {tab} bookings</p>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {bookings.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              actionId={actionId}
              onAccept={() => handleAccept(b.id)}
              onDecline={() => handleDecline(b.id)}
              onComplete={() => { setCompleteModal(b); setServiceSummary(b.issue_description || '') }}
            />
          ))}
        </div>
      )}

      {/* Mark Complete modal */}
      {completeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Mark Job Complete</h3>
            <p className="text-sm text-gray-500">
              Confirm the work done on <span className="font-medium text-gray-700">{completeModal.name}'s</span> {[completeModal.car_year, completeModal.car_make, completeModal.car_model].filter(Boolean).join(' ') || 'vehicle'}.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service summary</label>
              <textarea
                value={serviceSummary}
                onChange={e => setServiceSummary(e.target.value)}
                placeholder="e.g. Oil change, replaced front brake pads, topped off fluids"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">This will be used in all follow-up SMS messages.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setCompleteModal(null); setServiceSummary('') }}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionId === completeModal.id}
                onClick={() => handleComplete(completeModal.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {actionId === completeModal.id ? 'Saving...' : 'Mark Complete ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
