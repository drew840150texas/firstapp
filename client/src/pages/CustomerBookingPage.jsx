import { useState } from 'react'
import BookingForm from '../components/BookingForm'
import TimeSlotCalendar from '../components/TimeSlotCalendar'
import api from '../utils/api'

const STEPS = { FORM: 'form', CALENDAR: 'calendar', DONE: 'done' }

export default function CustomerBookingPage() {
  const [step, setStep] = useState(STEPS.FORM)
  const [formData, setFormData] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmMsg, setConfirmMsg] = useState('')

  function handleFormNext(data) {
    setFormData(data)
    setStep(STEPS.CALENDAR)
  }

  async function handleSlotConfirm(slot) {
    setSelectedSlot(slot)
    setSubmitting(true)
    setError('')
    try {
      await api.post('/bookings', { ...formData, appointment_date: slot.iso })
      setConfirmMsg(`Your appointment on ${slot.label} is booked! We'll send a confirmation text to ${formData.phone}.`)
      setStep(STEPS.DONE)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-700 to-blue-900">
      {/* Header */}
      <header className="px-4 pt-10 pb-6 text-center">
        <div className="text-4xl mb-2">🔧</div>
        <h1 className="text-3xl font-bold text-white">MyMech</h1>
        <p className="text-blue-200 text-sm mt-1">Book your appointment below</p>
      </header>

      <div className="px-4 pb-12 max-w-lg mx-auto">
        {/* Step indicator */}
        {step !== STEPS.DONE && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {[STEPS.FORM, STEPS.CALENDAR].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step === s ? 'bg-white text-blue-700' : 'bg-blue-500/40 text-blue-200'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-sm ${step === s ? 'text-white font-medium' : 'text-blue-300'}`}>
                  {s === STEPS.FORM ? 'Your Info' : 'Pick a Time'}
                </span>
                {i < 1 && <span className="text-blue-400 mx-1">→</span>}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-100 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {step === STEPS.FORM && (
          <BookingForm onNext={handleFormNext} />
        )}

        {step === STEPS.CALENDAR && (
          <div>
            <button
              onClick={() => setStep(STEPS.FORM)}
              className="text-blue-200 hover:text-white text-sm mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            <TimeSlotCalendar onConfirm={handleSlotConfirm} submitting={submitting} />
          </div>
        )}

        {step === STEPS.DONE && (
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're booked!</h2>
            <p className="text-gray-600 mb-6">{confirmMsg}</p>
            <button
              onClick={() => {
                setStep(STEPS.FORM)
                setFormData(null)
                setSelectedSlot(null)
                setError('')
              }}
              className="text-blue-600 font-medium text-sm underline"
            >
              Book another appointment
            </button>
          </div>
        )}
      </div>

      <footer className="text-center text-blue-300 text-xs pb-6">
        <a href="/login" className="underline hover:text-white">Mechanic login</a>
      </footer>
    </div>
  )
}
