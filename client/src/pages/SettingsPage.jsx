import { useState, useEffect } from 'react'
import api from '../utils/api'

export default function SettingsPage() {
  const [twilio, setTwilio] = useState({ twilio_account_sid: '', twilio_auth_token: '', twilio_phone_number: '' })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/settings/twilio'), api.get('/settings/twilio/status')])
      .then(([cfg, stat]) => {
        setTwilio({
          twilio_account_sid: cfg.data.twilio_account_sid || '',
          twilio_auth_token: cfg.data.twilio_auth_token || '',
          twilio_phone_number: cfg.data.twilio_phone_number || '',
        })
        setStatus(stat.data)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveTwilio(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await api.post('/settings/twilio', twilio)
      const stat = await api.get('/settings/twilio/status')
      setStatus(stat.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save Twilio settings.')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match.')
      return
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.')
      return
    }
    setPwSaving(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      setPwSuccess('Password updated successfully.')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password.')
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-4 pt-4 pb-10 max-w-lg mx-auto space-y-5">

      {/* Twilio status banner */}
      {status && (
        <div className={`rounded-2xl px-4 py-3 flex items-start gap-3 border ${
          status.configured
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-300'
        }`}>
          <span className="text-xl">{status.configured ? '✅' : '⚠️'}</span>
          <div>
            <p className={`text-sm font-semibold ${status.configured ? 'text-green-800' : 'text-amber-800'}`}>
              {status.configured ? 'Twilio is connected' : 'Twilio is not configured'}
            </p>
            {!status.configured && status.pendingCount > 0 && (
              <p className="text-xs text-amber-700 mt-0.5">
                {status.pendingCount} SMS message{status.pendingCount !== 1 ? 's' : ''} are queued and will send once connected.
              </p>
            )}
            {status.configured && status.pendingCount > 0 && (
              <p className="text-xs text-green-700 mt-0.5">
                {status.pendingCount} message{status.pendingCount !== 1 ? 's' : ''} pending in queue.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Twilio configuration */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">📱</span>
          <h2 className="text-base font-bold text-gray-900">Twilio SMS Settings</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Get your credentials from{' '}
          <span className="font-medium text-gray-700">console.twilio.com</span>.
          Your Twilio phone number must be SMS-capable.
        </p>

        <form onSubmit={handleSaveTwilio} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account SID</label>
            <input
              type="text"
              value={twilio.twilio_account_sid}
              onChange={e => setTwilio(t => ({ ...t, twilio_account_sid: e.target.value }))}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auth Token</label>
            <input
              type="password"
              value={twilio.twilio_auth_token}
              onChange={e => setTwilio(t => ({ ...t, twilio_auth_token: e.target.value }))}
              placeholder={twilio.twilio_auth_token ? '(saved — enter new value to change)' : 'Your auth token'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Twilio Phone Number</label>
            <input
              type="text"
              value={twilio.twilio_phone_number}
              onChange={e => setTwilio(t => ({ ...t, twilio_phone_number: e.target.value }))}
              placeholder="+15551234567"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {saved && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">✓ Twilio settings saved</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {saving ? 'Saving...' : 'Save Twilio Settings'}
          </button>
        </form>

        <div className="mt-4 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">Inbound SMS / STOP handling</p>
          <p>Configure your Twilio number's inbound webhook to:</p>
          <p className="font-mono bg-blue-100 rounded px-2 py-1 mt-1 break-all">
            https://yourdomain.com/api/webhooks/twilio
          </p>
          <p className="mt-1">This handles opt-outs automatically.</p>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔒</span>
          <h2 className="text-base font-bold text-gray-900">Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3">
          {[
            ['currentPassword', 'Current Password', 'current-password'],
            ['newPassword', 'New Password', 'new-password'],
            ['confirmPassword', 'Confirm New Password', 'new-password'],
          ].map(([field, label, autoComplete]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="password"
                autoComplete={autoComplete}
                value={pwForm[field]}
                onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
          ))}

          {pwError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">✓ {pwSuccess}</p>}

          <button
            type="submit"
            disabled={pwSaving}
            className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {pwSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* About */}
      <div className="text-center text-xs text-gray-400 pb-4">
        <p className="font-semibold text-gray-500">MyMech</p>
        <p>Independent mechanic management system</p>
      </div>
    </div>
  )
}
