"use client"

/**
 * <OrderDeliveredCelebrate>
 * --------------------------
 * Wave 3 / TICKET-022. The /teen/food/order/[id] page is server-rendered;
 * this tiny client gate fires the unified <Celebrate> burst the first time
 * the user lands on the page after the order has flipped to "delivered".
 *
 * Dedupe key: sessionStorage `food-celebrated:<orderId>`. We don't want a
 * refresh — or a polling re-fetch via router.refresh() — to fire a second
 * burst on the same order.
 */

import * as React from "react"
import { Celebrate } from "@/components/ui/celebrate"
import { useAnnounce } from "@/components/a11y/announce-region"

interface Props {
  orderId: string
  status: string
}

export function OrderDeliveredCelebrate({ orderId, status }: Props) {
  const [trigger, setTrigger] = React.useState(false)
  // Wave 3 / TICKET-050 — paired SR announcement on the same trigger.
  const announce = useAnnounce()

  React.useEffect(() => {
    if (status !== "delivered") return
    if (typeof window === "undefined") return
    const key = `food-celebrated:${orderId}`
    try {
      if (window.sessionStorage.getItem(key)) return
      window.sessionStorage.setItem(key, "1")
    } catch {
      // sessionStorage may be unavailable (private mode) — fail-open and
      // celebrate; the worst case is a duplicate burst, not a regression.
    }
    setTrigger(true)
    announce("Commande livrée!")
  }, [orderId, status, announce])

  return (
    <Celebrate
      trigger={trigger}
      variant="confetti"
      onComplete={() => setTrigger(false)}
    />
  )
}
