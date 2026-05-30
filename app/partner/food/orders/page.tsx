import { redirect } from "next/navigation"
// Refonte V1.5 (#101) — namespace food → réutilise le flux commandes existant.
export default function FoodOrdersRedirect() {
  redirect("/partner/restaurant/orders")
}
