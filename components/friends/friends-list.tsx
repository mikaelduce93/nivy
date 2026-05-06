"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  UserPlus,
  Search,
  Heart,
  Star,
  MoreHorizontal,
  MessageCircle,
  UserMinus,
  Ban,
  Edit3,
  Check,
  X,
  ChevronRight,
  Sparkles,
  Clock,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Friend {
  id: string
  first_name: string
  last_name?: string
  avatar_url?: string
  friendship: {
    id: string
    level: number
    is_best_friend: boolean
    is_favorite: boolean
    nickname?: string
    accepted_at: string
    last_interaction_at?: string
  }
}

interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  message?: string
  status: string
  created_at: string
  sender?: {
    id: string
    first_name: string
    last_name?: string
    avatar_url?: string
  }
  receiver?: {
    id: string
    first_name: string
    last_name?: string
    avatar_url?: string
  }
  mutual_friends_count?: number
}

interface FriendSuggestion {
  id: string
  suggested_teen_id: string
  reason: string
  score: number
  suggested_teen?: {
    id: string
    first_name: string
    last_name?: string
    avatar_url?: string
  }
  mutual_friends_count?: number
}

interface FriendStats {
  total_friends: number
  pending_requests: number
  best_friends: number
}

/* ==========================================================================
   FRIEND CARD
   ========================================================================== */

interface FriendCardProps {
  friend: Friend
  onMessage: () => void
  onToggleFavorite: () => void
  onToggleBestFriend: () => void
  onRemove: () => void
  onBlock: () => void
  onSetNickname: (nickname: string) => void
}

function FriendCard({
  friend,
  onMessage,
  onToggleFavorite,
  onToggleBestFriend,
  onRemove,
  onBlock,
  onSetNickname,
}: FriendCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showNicknameInput, setShowNicknameInput] = useState(false)
  const [nickname, setNickname] = useState(friend.friendship.nickname || "")

  const displayName = friend.friendship.nickname || friend.first_name

  const handleSaveNickname = () => {
    onSetNickname(nickname)
    setShowNicknameInput(false)
  }

  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center overflow-hidden">
            {friend.avatar_url ? (
              <Image
                src={friend.avatar_url}
                alt={friend.first_name}
                fill
                sizes="56px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="text-xl text-white font-bold">
                {friend.first_name[0]}
              </span>
            )}
          </div>
          {/* Friendship level badge */}
          {friend.friendship.level > 1 && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-zinc-900">
              {friend.friendship.level}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white truncate">{displayName}</h3>
            {friend.friendship.is_best_friend && (
              <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
            )}
            {friend.friendship.is_favorite && (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          {friend.friendship.nickname && (
            <p className="text-sm text-zinc-500">{friend.first_name}</p>
          )}
          <p className="text-xs text-zinc-600">
            Ami depuis {new Date(friend.friendship.accepted_at).toLocaleDateString("fr-FR", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onMessage}
            size="sm"
            variant="outline"
            className="border-zinc-700"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>

          <div className="relative">
            <Button
              onClick={() => setShowMenu(!showMenu)}
              size="sm"
              variant="ghost"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden z-10"
                >
                  <button
                    onClick={() => {
                      onToggleBestFriend()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Heart className={cn(
                      "w-4 h-4",
                      friend.friendship.is_best_friend && "text-pink-500 fill-pink-500"
                    )} />
                    {friend.friendship.is_best_friend ? "Retirer meilleur ami" : "Meilleur ami"}
                  </button>
                  <button
                    onClick={() => {
                      onToggleFavorite()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Star className={cn(
                      "w-4 h-4",
                      friend.friendship.is_favorite && "text-yellow-500 fill-yellow-500"
                    )} />
                    {friend.friendship.is_favorite ? "Retirer favori" : "Ajouter favori"}
                  </button>
                  <button
                    onClick={() => {
                      setShowNicknameInput(true)
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Modifier surnom
                  </button>
                  <div className="border-t border-zinc-700" />
                  <button
                    onClick={() => {
                      onRemove()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <UserMinus className="w-4 h-4" />
                    Supprimer ami
                  </button>
                  <button
                    onClick={() => {
                      onBlock()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Bloquer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Nickname input */}
      <AnimatePresence>
        {showNicknameInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Surnom personnalise"
                maxLength={20}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              />
              <Button onClick={handleSaveNickname} size="sm" className="bg-cyan-500">
                <Check className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowNicknameInput(false)}
                size="sm"
                variant="outline"
                className="border-zinc-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

/* ==========================================================================
   REQUEST CARD
   ========================================================================== */

interface RequestCardProps {
  request: FriendRequest
  type: "received" | "sent"
  onAccept?: () => void
  onDecline?: () => void
  onCancel?: () => void
}

function RequestCard({ request, type, onAccept, onDecline, onCancel }: RequestCardProps) {
  const person = type === "received" ? request.sender : request.receiver

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return "Hier"
    if (days < 7) return `Il y a ${days} jours`
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800">
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center overflow-hidden">
          {person?.avatar_url ? (
            <Image
              src={person.avatar_url}
              alt={person.first_name}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-lg text-white font-bold">{person?.first_name?.[0]}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">
            {person?.first_name} {person?.last_name}
          </h4>
          {request.mutual_friends_count !== undefined && request.mutual_friends_count > 0 && (
            <p className="text-xs text-zinc-500">
              {request.mutual_friends_count} ami{request.mutual_friends_count > 1 ? "s" : ""} en commun
            </p>
          )}
          <p className="text-xs text-zinc-600">{timeAgo(request.created_at)}</p>
        </div>

        {type === "received" ? (
          <div className="flex gap-2">
            <Button
              onClick={onAccept}
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-blue-500"
            >
              <Check className="w-4 h-4 mr-1" />
              Accepter
            </Button>
            <Button
              onClick={onDecline}
              size="sm"
              variant="outline"
              className="border-zinc-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={onCancel}
            size="sm"
            variant="outline"
            className="border-zinc-700 text-zinc-400"
          >
            Annuler
          </Button>
        )}
      </div>

      {request.message && (
        <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg">
          <p className="text-sm text-zinc-400 italic">"{request.message}"</p>
        </div>
      )}
    </Card>
  )
}

/* ==========================================================================
   SUGGESTION CARD
   ========================================================================== */

interface SuggestionCardProps {
  suggestion: FriendSuggestion
  onAdd: () => void
  onDismiss: () => void
}

function SuggestionCard({ suggestion, onAdd, onDismiss }: SuggestionCardProps) {
  const person = suggestion.suggested_teen

  const reasonLabels: Record<string, string> = {
    mutual_friends: "Amis en commun",
    same_school: "Meme ecole",
    same_clubs: "Memes clubs",
    same_interests: "Interets communs",
  }

  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
          {person?.avatar_url ? (
            <Image
              src={person.avatar_url}
              alt={person.first_name}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-lg text-white font-bold">{person?.first_name?.[0]}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">
            {person?.first_name} {person?.last_name}
          </h4>
          <p className="text-xs text-purple-400">
            {reasonLabels[suggestion.reason] || suggestion.reason}
          </p>
          {suggestion.mutual_friends_count !== undefined && suggestion.mutual_friends_count > 0 && (
            <p className="text-xs text-zinc-500">
              {suggestion.mutual_friends_count} ami{suggestion.mutual_friends_count > 1 ? "s" : ""} en commun
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onAdd}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
          <Button
            onClick={onDismiss}
            size="sm"
            variant="ghost"
            className="text-zinc-500"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

/* ==========================================================================
   SEARCH RESULT CARD
   ========================================================================== */

interface SearchResult {
  id: string
  first_name: string
  last_name?: string
  avatar_url?: string
  is_friend: boolean
  pending_request?: {
    id: string
    is_sender: boolean
  }
  mutual_friends_count: number
}

interface SearchResultCardProps {
  result: SearchResult
  onSendRequest: () => void
  onCancelRequest: () => void
}

function SearchResultCard({ result, onSendRequest, onCancelRequest }: SearchResultCardProps) {
  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800">
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center overflow-hidden">
          {result.avatar_url ? (
            <Image
              src={result.avatar_url}
              alt={result.first_name}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-lg text-white font-bold">{result.first_name[0]}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">
            {result.first_name} {result.last_name}
          </h4>
          {result.mutual_friends_count > 0 && (
            <p className="text-xs text-zinc-500">
              {result.mutual_friends_count} ami{result.mutual_friends_count > 1 ? "s" : ""} en commun
            </p>
          )}
        </div>

        {result.is_friend ? (
          <span className="text-sm text-green-400 flex items-center gap-1">
            <Check className="w-4 h-4" />
            Ami
          </span>
        ) : result.pending_request ? (
          <Button
            onClick={onCancelRequest}
            size="sm"
            variant="outline"
            className="border-zinc-700 text-zinc-400"
          >
            <Clock className="w-4 h-4 mr-1" />
            En attente
          </Button>
        ) : (
          <Button
            onClick={onSendRequest}
            size="sm"
            className="bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        )}
      </div>
    </Card>
  )
}

/* ==========================================================================
   FRIENDS LIST
   ========================================================================== */

interface FriendsListProps {
  teenId: string
  onMessage?: (friendId: string) => void
}

export function FriendsList({ teenId, onMessage }: FriendsListProps) {
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "suggestions" | "search">("friends")
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [stats, setStats] = useState<FriendStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterFavorites, setFilterFavorites] = useState(false)

  const fetchFriends = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/teen/friends?teenId=${teenId}&type=list`)
      const data = await response.json()
      if (data.success) {
        setFriends(data.friends)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching friends:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRequests = async () => {
    try {
      const [receivedRes, sentRes] = await Promise.all([
        fetch(`/api/teen/friends?teenId=${teenId}&type=requests`),
        fetch(`/api/teen/friends?teenId=${teenId}&type=sent`),
      ])

      const [receivedData, sentData] = await Promise.all([
        receivedRes.json(),
        sentRes.json(),
      ])

      if (receivedData.success) setRequests(receivedData.requests)
      if (sentData.success) setSentRequests(sentData.requests)
    } catch (error) {
      console.error("Error fetching requests:", error)
    }
  }

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`/api/teen/friends?teenId=${teenId}&type=suggestions`)
      const data = await response.json()
      if (data.success) setSuggestions(data.suggestions)
    } catch (error) {
      console.error("Error fetching suggestions:", error)
    }
  }

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/teen/friends?teenId=${teenId}&type=search&query=${encodeURIComponent(query)}`)
      const data = await response.json()
      if (data.success) setSearchResults(data.results)
    } catch (error) {
      console.error("Error searching:", error)
    }
  }

  useEffect(() => {
    fetchFriends()
    fetchRequests()
    fetchSuggestions()
  }, [teenId])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (activeTab === "search") {
        searchUsers(searchQuery)
      }
    }, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, activeTab])

  const handleAction = async (action: string, params: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/teen/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teenId, action, ...params }),
      })

      if (response.ok) {
        fetchFriends()
        fetchRequests()
        fetchSuggestions()
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  // Filter friends
  const filteredFriends = friends.filter((f) => {
    if (filterFavorites && !f.friendship.is_favorite && !f.friendship.is_best_friend) {
      return false
    }
    if (searchQuery && activeTab === "friends") {
      const name = (f.friendship.nickname || f.first_name + " " + (f.last_name || "")).toLowerCase()
      return name.includes(searchQuery.toLowerCase())
    }
    return true
  })

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Amis</h2>
          {stats && (
            <p className="text-sm text-zinc-500">
              {stats.total_friends} ami{stats.total_friends > 1 ? "s" : ""}
              {stats.pending_requests > 0 && (
                <span className="text-cyan-400"> • {stats.pending_requests} demande{stats.pending_requests > 1 ? "s" : ""}</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "friends", label: "Amis", icon: Users },
          { id: "requests", label: "Demandes", icon: Bell, badge: (requests.length || 0) },
          { id: "suggestions", label: "Suggestions", icon: Sparkles },
          { id: "search", label: "Rechercher", icon: Search },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              activeTab === tab.id
                ? "bg-cyan-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-500 text-white">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search input */}
      {(activeTab === "friends" || activeTab === "search") && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "search" ? "Rechercher des utilisateurs..." : "Filtrer mes amis..."}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-12 pr-4 py-3 text-white"
          />
        </div>
      )}

      {/* Favorites filter */}
      {activeTab === "friends" && (
        <div className="flex gap-2">
          <button
            onClick={() => setFilterFavorites(false)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              !filterFavorites ? "bg-cyan-500 text-white" : "bg-zinc-800 text-zinc-400"
            )}
          >
            Tous
          </button>
          <button
            onClick={() => setFilterFavorites(true)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1",
              filterFavorites ? "bg-yellow-500 text-white" : "bg-zinc-800 text-zinc-400"
            )}
          >
            <Star className="w-3 h-3" />
            Favoris
          </button>
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
        {/* Friends list */}
        {activeTab === "friends" && (
          <>
            {filteredFriends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onMessage={() => onMessage?.(friend.id)}
                onToggleFavorite={() => handleAction("toggle_favorite", { targetTeenId: friend.id })}
                onToggleBestFriend={() => handleAction("toggle_best_friend", { targetTeenId: friend.id })}
                onRemove={() => handleAction("remove", { targetTeenId: friend.id })}
                onBlock={() => handleAction("block", { targetTeenId: friend.id })}
                onSetNickname={(nickname) => handleAction("set_nickname", { targetTeenId: friend.id, nickname })}
              />
            ))}
            {filteredFriends.length === 0 && (
              <Card className="p-8 bg-zinc-900 border-zinc-800 text-center">
                <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">
                  {filterFavorites ? "Aucun favori" : "Aucun ami"}
                </h3>
                <p className="text-zinc-400">
                  {filterFavorites
                    ? "Ajoute des amis en favoris pour les retrouver ici"
                    : "Recherche des utilisateurs pour les ajouter en ami !"}
                </p>
              </Card>
            )}
          </>
        )}

        {/* Requests */}
        {activeTab === "requests" && (
          <>
            {requests.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-400">Demandes recues</h3>
                {requests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    type="received"
                    onAccept={() => handleAction("accept", { requestId: req.id })}
                    onDecline={() => handleAction("decline", { requestId: req.id })}
                  />
                ))}
              </div>
            )}

            {sentRequests.length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-medium text-zinc-400">Demandes envoyees</h3>
                {sentRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    type="sent"
                    onCancel={() => handleAction("cancel", { requestId: req.id })}
                  />
                ))}
              </div>
            )}

            {requests.length === 0 && sentRequests.length === 0 && (
              <Card className="p-8 bg-zinc-900 border-zinc-800 text-center">
                <Bell className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Aucune demande</h3>
                <p className="text-zinc-400">Tu n'as pas de demande d'ami en attente</p>
              </Card>
            )}
          </>
        )}

        {/* Suggestions */}
        {activeTab === "suggestions" && (
          <>
            {suggestions.map((sug) => (
              <SuggestionCard
                key={sug.id}
                suggestion={sug}
                onAdd={() => handleAction("send_request", { targetTeenId: sug.suggested_teen_id })}
                onDismiss={() => handleAction("dismiss_suggestion", { targetTeenId: sug.suggested_teen_id })}
              />
            ))}
            {suggestions.length === 0 && (
              <Card className="p-8 bg-zinc-900 border-zinc-800 text-center">
                <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Pas de suggestions</h3>
                <p className="text-zinc-400">Ajoute plus d'amis pour recevoir des suggestions</p>
              </Card>
            )}
          </>
        )}

        {/* Search */}
        {activeTab === "search" && (
          <>
            {searchResults.map((result) => (
              <SearchResultCard
                key={result.id}
                result={result}
                onSendRequest={() => handleAction("send_request", { targetTeenId: result.id })}
                onCancelRequest={() => result.pending_request && handleAction("cancel", { requestId: result.pending_request.id })}
              />
            ))}
            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <Card className="p-8 bg-zinc-900 border-zinc-800 text-center">
                <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Aucun resultat</h3>
                <p className="text-zinc-400">Aucun utilisateur trouve pour "{searchQuery}"</p>
              </Card>
            )}
            {searchQuery.length < 2 && (
              <Card className="p-8 bg-zinc-900 border-zinc-800 text-center">
                <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Entre au moins 2 caracteres pour rechercher</p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   FRIENDS WIDGET
   ========================================================================== */

interface FriendsWidgetProps {
  teenId: string
  limit?: number
  onSeeAll?: () => void
}

export function FriendsWidget({ teenId, limit = 5, onSeeAll }: FriendsWidgetProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch(`/api/teen/friends?teenId=${teenId}&type=list`)
        const data = await response.json()
        if (data.success) {
          // Show favorites/best friends first
          const sorted = data.friends.sort((a: Friend, b: Friend) => {
            if (a.friendship.is_best_friend && !b.friendship.is_best_friend) return -1
            if (!a.friendship.is_best_friend && b.friendship.is_best_friend) return 1
            if (a.friendship.is_favorite && !b.friendship.is_favorite) return -1
            if (!a.friendship.is_favorite && b.friendship.is_favorite) return 1
            return 0
          })
          setFriends(sorted.slice(0, limit))
          setPendingCount(data.stats.pending_requests)
        }
      } catch (error) {
        console.error("Error fetching friends:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFriends()
  }, [teenId, limit])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-zinc-800 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          Amis
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-500 text-white">
              {pendingCount}
            </span>
          )}
        </h3>
        {onSeeAll && (
          <button onClick={onSeeAll} className="text-sm text-cyan-400 hover:underline">
            Voir tout
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="relative"
            title={friend.friendship.nickname || friend.first_name}
          >
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center overflow-hidden">
              {friend.avatar_url ? (
                <Image
                  src={friend.avatar_url}
                  alt={friend.first_name}
                  fill
                  sizes="40px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-sm text-white font-bold">{friend.first_name[0]}</span>
              )}
            </div>
            {friend.friendship.is_best_friend && (
              <Heart className="absolute -bottom-0.5 -right-0.5 w-4 h-4 text-pink-500 fill-pink-500" />
            )}
          </div>
        ))}
        {friends.length === 0 && (
          <p className="text-sm text-zinc-500">Aucun ami pour le moment</p>
        )}
      </div>
    </Card>
  )
}
