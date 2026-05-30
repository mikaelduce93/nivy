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
      <span className="text-xs text-mute px-3 py-1 bg-card rounded-full">
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
        className="h-8 w-8 p-0 bg-lime hover:bg-lime text-ink"
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
        className="h-8 w-8 p-0 border-ink text-mute hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10"
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
