import { redirect } from "next/navigation"
// Refonte V1.5 (#101) — namespace food → réutilise le CRUD menu existant.
export default function FoodMenuRedirect() {
  redirect("/partner/restaurant/menu")
}
