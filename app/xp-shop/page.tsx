// REDIRECT: /xp-shop is consolidated into the canonical shop at /teen/wallet?tab=shop
// (rewards-currency-unifier — see docs/economy.md). The xp_shop_items data model
// is no longer used by any UI but the table is preserved (no DB migration in
// this pass). The canonical shop reads from `reward_categories` + RPC
// `get_shop_rewards`.
import { redirect } from "next/navigation"

export default function XpShopPage() {
  redirect("/teen/wallet?tab=shop")
}
