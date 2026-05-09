"use client"

/**
 * Wave 2B — terminal "Récupérer mes coins" affordance for an achieved
 * savings goal. Wraps POST /api/teen/savings/goals/:id/withdraw which calls
 * the canonical withdraw_from_goal RPC. After success the goal flips to
 * status='withdrawn' and the locked coins return to user_coins_spendable.
 */

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Coins, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function GoalWithdrawButton({
  goalId,
  lockedCoins,
}: {
  goalId: string
  lockedCoins: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/teen/savings/goals/${goalId}/withdraw`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destination: "spendable" }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.success) {
          throw new Error(data?.error ?? `HTTP ${res.status}`)
        }
        toast.success(`+${data.coins_released ?? lockedCoins} coins disponibles`)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur")
      }
    })
  }

  return (
    <Button
      onClick={handleClick}
      disabled={pending}
      size="sm"
      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Coins className="h-4 w-4 mr-2" />
      )}
      Récupérer mes {lockedCoins} coins
    </Button>
  )
}
