import { useState } from 'react'

const CAR_MAKES = [
  'Acura','Audi','BMW','Buick','Cadillac','Chevrolet','Chrysler','Dodge',
  'Ford','GMC','Honda','Hyundai','Infiniti','Jeep','Kia','Lexus','Lincoln',
  'Mazda','Mercedes-Benz','Mitsubishi','Nissan','Ram','Subaru','Tesla',
  'Toyota','Volkswagen','Volvo','Other',
]

export default function BookingForm({ onNext }) {
  const [form, setForm] = useState({
    name: '', phone: '', car_year: '', car_make: '', car_model: '', issue_description: '',
  })
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    else if (!/^\+?[\d\s\-().]{10,}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number'
    if (!form.issue_description.trim()) e.issue_description = 'Please describe the issue'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const cleaned = {
      ...form,
      phone: form.phone.replace(/\s+/g, '').replace(/[()-]/g, ''),
    }
    onNext(cleaned)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Tell us about yourself</h2>

      <Field label="Full Name *" error={errors.name}>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Jane Smith"
          className={inputClass(errors.name)}
        />
      </Field>

      <Field label="Phone Number *" error={errors.phone}>
        <input
          type="tel"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="(555) 867-5309"
          className={inputClass(errors.phone)}
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Year" error={errors.car_year}>
          <input
            type="text"
            value={form.car_year}
            onChange={e => set('car_year', e.target.value)}
            placeholder="2019"
            maxLength={4}
            className={inputClass(errors.car_year)}
          />
        </Field>
        <Field label="Make">
          <select
            value={form.car_make}
            onChange={e => set('car_make', e.target.value)}
            className={inputClass()}
          >
            <option value="">Select</option>
            {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Model">
          <input
            type="text"
            value={form.car_model}
            onChange={e => set('car_model', e.target.value)}
            placeholder="Camry"
            className={inputClass()}
          />
        </Field>
      </div>

      <Field label="What's going on? *" error={errors.issue_description}>
        <textarea
          value={form.issue_description}
          onChange={e => set('issue_description', e.target.value)}
          placeholder="Describe the issue, noise, warning light, etc."
          rows={3}
          className={inputClass(errors.issue_description) + ' resize-none'}
        />
      </Field>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-base transition-colors"
      >
        Pick a Time →
      </button>
    </form>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

function inputClass(error) {
  return `w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 transition-colors ${
    error
      ? 'border-red-400 focus:ring-red-300'
      : 'border-gray-300 focus:ring-blue-500'
  }`
}
