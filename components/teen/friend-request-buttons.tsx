"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { acceptFriendRequest, rejectFriendRequest } from "@/gamification-system/features/leaderboard/actions"

interface FriendRequestButtonsProps {
  connectionId: string
  teenId: string
}

export function FriendRequestButtons({ connectionId, teenId }: FriendRequestButtonsProps) {
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null)
  const [handled, setHandled] = useState(false)

  const handleAccept = async () => {
    setLoading("accept")
    try {
      const result = await acceptFriendRequest(connectionId, teenId)
      if (result.success) {
        toast.success("Demande acceptée !")
        setHandled(true)
      } else {
        toast.error((result as { error?: string }).error || "Erreur lors de l'acceptation")
      }
    } catch (error) {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading("reject")
    try {
      const result = await rejectFriendRequest(connectionId, teenId)
      if (result.success) {
        toast.success("Demande refusée")
        setHandled(true)
      } else {
        toast.error((result as { error?: string }).error || "Erreur lors du refus")
      }
    } catch (error) {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(null)
    }
  }

  if (handled) {
    return (
      <span className="text-xs text-zinc-500 px-3 py-1 bg-zinc-800 rounded-full">
        Traité
      </span>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={handleAccept}
        disabled={loading !== null}
        className="h-8 w-8 p-0 bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        {loading === "accept" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleReject}
        disabled={loading !== null}
        className="h-8 w-8 p-0 border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
      >
        {loading === "reject" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
