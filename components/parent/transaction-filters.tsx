"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Filter, X } from "lucide-react"

interface TransactionFiltersProps {
  teens: any[]
}

export function TransactionFilters({ teens }: TransactionFiltersProps) {
  const [selectedTeen, setSelectedTeen] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all")

  const hasFilters = selectedTeen !== "all" || selectedType !== "all" || selectedPeriod !== "all"

  const clearFilters = () => {
    setSelectedTeen("all")
    setSelectedType("all")
    setSelectedPeriod("all")
  }

  return (
    <div className="mb-6 p-4 bg-card rounded-xl border border-ink">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-mute">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtres</span>
        </div>

        {/* Teen Filter */}
        <Select value={selectedTeen} onValueChange={setSelectedTeen}>
          <SelectTrigger className="w-[180px] bg-card border-ink text-ink">
            <SelectValue placeholder="Tous les teens" />
          </SelectTrigger>
          <SelectContent className="bg-card border-ink">
            <SelectItem value="all" className="text-ink hover:bg-muted">
              Tous les teens
            </SelectItem>
            {teens.map((teen: any) => (
              <SelectItem
                key={teen.teen_id}
                value={teen.teen_id}
                className="text-ink hover:bg-muted"
              >
                {teen.teen_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px] bg-card border-ink text-ink">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent className="bg-card border-ink">
            <SelectItem value="all" className="text-ink hover:bg-muted">
              Tous les types
            </SelectItem>
            <SelectItem value="booking" className="text-ink hover:bg-muted">
              Réservations
            </SelectItem>
            <SelectItem value="coins" className="text-ink hover:bg-muted">
              Coins
            </SelectItem>
            <SelectItem value="shop" className="text-ink hover:bg-muted">
              Boutique
            </SelectItem>
            <SelectItem value="discount" className="text-ink hover:bg-muted">
              Réductions
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Period Filter */}
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px] bg-card border-ink text-ink">
            <SelectValue placeholder="Toutes les dates" />
          </SelectTrigger>
          <SelectContent className="bg-card border-ink">
            <SelectItem value="all" className="text-ink hover:bg-muted">
              Toutes les dates
            </SelectItem>
            <SelectItem value="today" className="text-ink hover:bg-muted">
              Aujourd'hui
            </SelectItem>
            <SelectItem value="week" className="text-ink hover:bg-muted">
              Cette semaine
            </SelectItem>
            <SelectItem value="month" className="text-ink hover:bg-muted">
              Ce mois
            </SelectItem>
            <SelectItem value="quarter" className="text-ink hover:bg-muted">
              Ce trimestre
            </SelectItem>
            <SelectItem value="year" className="text-ink hover:bg-muted">
              Cette année
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-mute hover:text-ink"
          >
            <X className="h-4 w-4 mr-1" />
            Effacer
          </Button>
        )}
      </div>
    </div>
  )
}
