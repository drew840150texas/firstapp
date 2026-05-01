import { format, parseISO } from 'date-fns'

const STATUS_STYLES = {
  pending:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  accepted: 'bg-blue-100 text-blue-800 border-blue-200',
  complete: 'bg-green-100 text-green-800 border-green-200',
  declined: 'bg-gray-100 text-gray-600 border-gray-200',
}

const STATUS_LABELS = {
  pending:  'Pending',
  accepted: 'Upcoming',
  complete: 'Complete',
  declined: 'Declined',
}

export default function BookingCard({ booking: b, actionId, onAccept, onDecline, onComplete }) {
  const busy = actionId === b.id
  const car = [b.car_year, b.car_make, b.car_model].filter(Boolean).join(' ') || 'Vehicle unknown'
  let dateLabel = '—'
  try {
    dateLabel = format(parseISO(b.appointment_date), 'EEE, MMM d · h:mm a')
  } catch {}

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-gray-900 truncate">{b.name}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[b.status]}`}>
              {STATUS_LABELS[b.status]}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{car}</p>
        </div>
        <a
          href={`tel:${b.phone}`}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"
          title="Call customer"
        >
          <PhoneIcon />
        </a>
      </div>

      {/* Details */}
      <div className="px-4 pb-3 space-y-1.5 border-t border-gray-50 pt-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <CalendarIcon />
          <span>{dateLabel}</span>
        </div>
        {b.issue_description && (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <span className="mt-0.5">📝</span>
            <span className="line-clamp-2">{b.service_summary || b.issue_description}</span>
          </div>
        )}
        <a
          href={`/dashboard/customers/${b.customer_id}`}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          View customer profile →
        </a>
      </div>

      {/* Action buttons */}
      {b.status === 'pending' && (
        <div className="flex border-t border-gray-100">
          <button
            disabled={busy}
            onClick={onDecline}
            className="flex-1 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors border-r border-gray-100"
          >
            {busy ? '...' : 'Decline'}
          </button>
          <button
            disabled={busy}
            onClick={onAccept}
            className="flex-1 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            {busy ? '...' : 'Accept ✓'}
          </button>
        </div>
      )}

      {b.status === 'accepted' && (
        <div className="border-t border-gray-100">
          <button
            disabled={busy}
            onClick={onComplete}
            className="w-full py-3 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50 transition-colors"
          >
            {busy ? 'Saving...' : 'Mark Job Complete ✓'}
          </button>
        </div>
      )}
    </div>
  )
}

function PhoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
