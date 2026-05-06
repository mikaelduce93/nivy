"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, UserCheck, Clock, Loader2, Trophy } from "lucide-react"
import { toast } from "sonner"
import { searchUsers, sendFriendRequest } from "@/gamification-system/features/leaderboard/actions"

interface SearchResult {
  id: string
  pseudo: string
  avatar_url: string | null
  level: number
  total_xp: number
  is_friend: boolean
  has_pending_request: boolean
}

interface FriendSearchProps {
  teenId: string
}

export function FriendSearch({ teenId }: FriendSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [sendingTo, setSendingTo] = useState<string | null>(null)

  const handleSearch = async () => {
    if (query.length < 2) {
      toast.error("Entre au moins 2 caractères")
      return
    }

    startTransition(async () => {
      const result = await searchUsers(query, teenId, 10)
      if (result.success) {
        setResults(result.data || [])
        setSearched(true)
      } else {
        toast.error((result as { error?: string }).error || "Erreur de recherche")
      }
    })
  }

  const handleSendRequest = async (toTeenId: string) => {
    setSendingTo(toTeenId)
    try {
      const result = await sendFriendRequest({
        fromTeenId: teenId,
        toTeenId: toTeenId,
      })
      if (result.success) {
        toast.success("Demande envoyée !")
        // Update local state to show pending
        setResults(prev =>
          prev.map(r =>
            r.id === toTeenId ? { ...r, has_pending_request: true } : r
          )
        )
      } else {
        toast.error((result as { error?: string }).error || "Erreur lors de l'envoi")
      }
    } catch (error) {
      toast.error("Une erreur est survenue")
    } finally {
      setSendingTo(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un membre par pseudo..."
            className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isPending || query.length < 2}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Rechercher"
          )}
        </Button>
      </div>

      {/* Results */}
      {searched && (
        <div className="space-y-2">
          {results.length > 0 ? (
            results.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-emerald-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                    {user.pseudo?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{user.pseudo}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Trophy className="h-3 w-3" />
                      <span>Niv. {user.level}</span>
                      <span>•</span>
                      <span>{user.total_xp.toLocaleString()} XP</span>
                    </div>
                  </div>
                </div>
                <div>
                  {user.is_friend ? (
                    <span className="flex items-center gap-2 text-emerald-400 text-sm font-medium px-3 py-2 bg-emerald-500/10 rounded-lg">
                      <UserCheck className="h-4 w-4" />
                      Ami
                    </span>
                  ) : user.has_pending_request ? (
                    <span className="flex items-center gap-2 text-orange-400 text-sm font-medium px-3 py-2 bg-orange-500/10 rounded-lg">
                      <Clock className="h-4 w-4" />
                      En attente
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(user.id)}
                      disabled={sendingTo === user.id}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      {sendingTo === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Ajouter
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
              <p className="text-zinc-500">Aucun membre trouvé pour "{query}"</p>
              <p className="text-xs text-zinc-600 mt-1">Essaie avec un autre pseudo</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
