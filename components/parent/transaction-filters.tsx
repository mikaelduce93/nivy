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
    <div className="mb-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtres</span>
        </div>

        {/* Teen Filter */}
        <Select value={selectedTeen} onValueChange={setSelectedTeen}>
          <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Tous les teens" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all" className="text-white hover:bg-zinc-700">
              Tous les teens
            </SelectItem>
            {teens.map((teen: any) => (
              <SelectItem
                key={teen.teen_id}
                value={teen.teen_id}
                className="text-white hover:bg-zinc-700"
              >
                {teen.teen_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all" className="text-white hover:bg-zinc-700">
              Tous les types
            </SelectItem>
            <SelectItem value="booking" className="text-white hover:bg-zinc-700">
              Réservations
            </SelectItem>
            <SelectItem value="coins" className="text-white hover:bg-zinc-700">
              Coins
            </SelectItem>
            <SelectItem value="shop" className="text-white hover:bg-zinc-700">
              Boutique
            </SelectItem>
            <SelectItem value="discount" className="text-white hover:bg-zinc-700">
              Réductions
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Period Filter */}
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Toutes les dates" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all" className="text-white hover:bg-zinc-700">
              Toutes les dates
            </SelectItem>
            <SelectItem value="today" className="text-white hover:bg-zinc-700">
              Aujourd'hui
            </SelectItem>
            <SelectItem value="week" className="text-white hover:bg-zinc-700">
              Cette semaine
            </SelectItem>
            <SelectItem value="month" className="text-white hover:bg-zinc-700">
              Ce mois
            </SelectItem>
            <SelectItem value="quarter" className="text-white hover:bg-zinc-700">
              Ce trimestre
            </SelectItem>
            <SelectItem value="year" className="text-white hover:bg-zinc-700">
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
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4 mr-1" />
            Effacer
          </Button>
        )}
      </div>
    </div>
  )
}
