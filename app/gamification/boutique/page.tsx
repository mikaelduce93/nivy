// REDIRECT: /gamification/boutique is consolidated into the canonical shop at
// /teen/wallet?tab=shop (rewards-currency-unifier — see docs/economy.md).
// The shop-client and reward_categories + get_shop_rewards data model are still
// the canonical SOURCE for the wallet shop tab; only the URL is unified.
import { redirect } from "next/navigation"

export default function BoutiqueRedirect() {
  redirect("/teen/wallet?tab=shop")
}
