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
    <div className="bg-card rounded-2xl p-6 border border-ink mb-8">
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-5 h-5 text-teal" />
        <h3 className="text-lg font-bold text-ink">Filtres & Export</h3>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div>
          <label className="text-sm text-mute mb-2 block">Date début</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-card border border-ink rounded-lg px-4 py-2 text-ink"
          />
        </div>

        <div>
          <label className="text-sm text-mute mb-2 block">Date fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-card border border-ink rounded-lg px-4 py-2 text-ink"
          />
        </div>

        <div>
          <label className="text-sm text-mute mb-2 block">Ville</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-card border border-ink rounded-lg px-4 py-2 text-ink"
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
            className="flex-1 bg-teal hover:bg-teal text-ink"
          >
            <Filter className="w-4 h-4 mr-2" />
            Appliquer
          </Button>
          <Button
            onClick={onExport}
            variant="outline"
            className="bg-card border-ink text-ink hover:bg-muted"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  )
}
