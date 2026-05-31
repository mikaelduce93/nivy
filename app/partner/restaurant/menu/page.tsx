/**
 * @deprecated → /partner/food/menu
 *
 * Refonte V2 (#171) — la page réelle vit désormais sous `food/menu`. Cette
 * route legacy est conservée (la sidebar et d'anciens liens pointent encore
 * ici) et redirige vers le namespace `food`. Le client `MenuManagerClient` et
 * les endpoints `/api/partner/restaurant/menu/...` restent inchangés.
 */
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function PartnerRestaurantMenuPage() {
  redirect("/partner/food/menu")
}
