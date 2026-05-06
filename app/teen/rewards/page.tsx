// REDIRECT: /teen/rewards now redirects to /teen/wallet?tab=shop (wired in-ecosystem shop, mirrors /teen/shop).
import { redirect } from "next/navigation"

export default function RewardsPage() {
  redirect("/teen/wallet?tab=shop")
}
