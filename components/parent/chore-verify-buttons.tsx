"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function ChoreVerifyButtons({
  choreId,
  completionId,
}: {
  choreId: string
  completionId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)

  const send = async (approved: boolean) => {
    setLoading(approved ? "approve" : "reject")
    try {
      const reason = approved
        ? null
        : window.prompt("Motif du refus (optionnel):") || "Refusé par le parent"
      const res = await fetch(`/api/parent/chores/${choreId}/verify-completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completion_id: completionId,
          approved,
          rejection_reason: reason,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (approved && data.payout?.paid) {
          toast.success(
            `Validé · ${data.payout.amount_dh} DH (+${data.payout.amount_coins} coins) versés`
          )
        } else if (approved) {
          toast.success("Validé. Récompense en attente d'autres validations.")
        } else {
          toast.success("Refusé")
        }
        router.refresh()
      } else {
        toast.error(data.error || "Erreur")
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => send(true)}
        disabled={loading !== null}
        className="bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        {loading === "approve" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Check className="h-4 w-4 mr-1" />
            Valider
          </>
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => send(false)}
        disabled={loading !== null}
        className="border-red-500/40 text-red-400 hover:bg-red-500/10"
      >
        {loading === "reject" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <X className="h-4 w-4 mr-1" />
            Refuser
          </>
        )}
      </Button>
    </div>
  )
}
