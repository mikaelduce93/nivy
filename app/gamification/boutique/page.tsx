// REDIRECT: /gamification/boutique is consolidated into the canonical shop at
// /teen/wallet?tab=shop (rewards-currency-unifier — see docs/economy.md).
// The canonical SOURCE for the wallet shop tab is app/teen/wallet/wallet-hub-client.tsx
// (via getRewards() — reward_categories + RPC get_shop_rewards); shop-client.tsx is orphaned.
// #184 — aligned with the wave: permanentRedirect (308) + robots:noindex.
// Kept dynamic (target carries the ?tab=shop query param).
import { permanentRedirect } from "next/navigation"

export const metadata = { robots: { index: false, follow: false } }

export default function BoutiqueRedirect() {
  permanentRedirect("/teen/wallet?tab=shop")
}
