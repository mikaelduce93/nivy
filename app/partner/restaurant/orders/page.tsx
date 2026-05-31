/**
 * @deprecated → /partner/food/orders
 *
 * Refonte V2 (#171) — la page réelle vit désormais sous `food/orders`. Cette
 * route legacy est conservée (la sidebar et d'anciens liens pointent encore
 * ici) et redirige vers le namespace `food`. Le client `OrdersFeedClient` et
 * les endpoints `/api/partner/restaurant/orders/...` restent inchangés.
 */
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function PartnerRestaurantOrdersPage() {
  redirect("/partner/food/orders")
}
