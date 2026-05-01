import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { format, parseISO } from 'date-fns'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/customers')
      .then(r => setCustomers(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    `${c.car_make} ${c.car_model}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-4 pt-4 max-w-lg mx-auto">
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">👤</div>
          <p className="font-medium">{search ? 'No matching customers' : 'No customers yet'}</p>
        </div>
      ) : (
        <div className="space-y-2 pb-4">
          {filtered.map(c => (
            <Link
              key={c.id}
              to={`/dashboard/customers/${c.id}`}
              className="block bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{c.name}</span>
                    {c.opted_out ? (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Opted out</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[c.car_year, c.car_make, c.car_model].filter(Boolean).join(' ') || 'No vehicle on file'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.phone}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-xs text-gray-500">{c.total_appointments} service{c.total_appointments !== 1 ? 's' : ''}</p>
                  {c.last_appointment && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last: {format(parseISO(c.last_appointment), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}
