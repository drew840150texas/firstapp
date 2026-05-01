import { useState, useEffect } from 'react'
import { addDays, format, isSameDay, isWeekend, startOfDay, isSunday } from 'date-fns'
import api from '../utils/api'

const HOURS = [9,10,11,12,13,14,15,16,17]

function formatHour(h) {
  if (h === 12) return '12:00 PM'
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}

function getAvailableDates() {
  const dates = []
  let d = addDays(new Date(), 1)
  while (dates.length < 14) {
    if (!isSunday(d)) dates.push(new Date(d))
    d = addDays(d, 1)
  }
  return dates
}

export default function TimeSlotCalendar({ onConfirm, submitting }) {
  const [dates] = useState(getAvailableDates)
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!selectedDate) return
    setSlots([])
    setSelectedSlot(null)
    setLoadingSlots(true)

    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    api.get(`/bookings/available?date=${dateStr}`)
      .then(r => setSlots(r.data))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [selectedDate])

  function buildIso(date, hour) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(hour).padStart(2, '0')
    return `${y}-${m}-${d}T${h}:00:00.000Z`
  }

  function handleConfirm() {
    if (!selectedDate || !selectedSlot) return
    const iso = buildIso(selectedDate, selectedSlot.hour)
    const label = `${format(selectedDate, 'EEEE, MMMM d')} at ${formatHour(selectedSlot.hour)}`
    onConfirm({ iso, label })
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Choose a date & time</h2>
      <p className="text-sm text-gray-500 -mt-3">Mon–Sat · 9 AM–6 PM · Next 2 weeks</p>

      {/* Date picker */}
      <div className="overflow-x-auto -mx-1">
        <div className="flex gap-2 pb-1 px-1">
          {dates.map(d => {
            const active = selectedDate && isSameDay(d, selectedDate)
            const weekend = isWeekend(d)
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDate(d)}
                className={`flex-shrink-0 flex flex-col items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : weekend
                    ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                <span className="text-xs font-normal">{format(d, 'EEE')}</span>
                <span className="text-base font-bold">{format(d, 'd')}</span>
                <span className="text-xs font-normal">{format(d, 'MMM')}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Available times for {format(selectedDate, 'EEEE, MMMM d')}
          </p>
          {loadingSlots ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(slot => (
                <button
                  key={slot.hour}
                  disabled={!slot.available}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    !slot.available
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                      : selectedSlot?.hour === slot.hour
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-800 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedDate && (
        <p className="text-center text-gray-400 text-sm py-4">← Select a date to see available times</p>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!selectedSlot || submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-base transition-colors"
      >
        {submitting ? 'Booking...' : selectedSlot ? `Book ${formatHour(selectedSlot.hour)}` : 'Select a time above'}
      </button>
    </div>
  )
}
