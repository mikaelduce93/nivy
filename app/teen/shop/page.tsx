// REDIRECT: /teen/shop now redirects to /teen/wallet?tab=shop
import { redirect } from "next/navigation"

export default function ShopPage() {
  redirect("/teen/wallet?tab=shop")
}
