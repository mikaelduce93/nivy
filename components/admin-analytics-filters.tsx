'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Filter, Download } from 'lucide-react'

interface AnalyticsFiltersProps {
  onFilterChange: (filters: {
    dateRange: { start: string; end: string }
    eventId?: string
    city?: string
  }) => void
  onExport: () => void
}

export function AdminAnalyticsFilters({ onFilterChange, onExport }: AnalyticsFiltersProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [city, setCity] = useState('')

  const handleApplyFilters = () => {
    onFilterChange({
      dateRange: { start: startDate, end: endDate },
      city: city || undefined,
    })
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-bold text-white">Filtres & Export</h3>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div>
          <label className="text-sm text-zinc-400 mb-2 block">Date début</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 mb-2 block">Date fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 mb-2 block">Ville</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
          >
            <option value="">Toutes</option>
            <option value="Casablanca">Casablanca</option>
            <option value="Rabat">Rabat</option>
            <option value="Marrakech">Marrakech</option>
            <option value="Tanger">Tanger</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <Button
            onClick={handleApplyFilters}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Filter className="w-4 h-4 mr-2" />
            Appliquer
          </Button>
          <Button
            onClick={onExport}
            variant="outline"
            className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  )
}
