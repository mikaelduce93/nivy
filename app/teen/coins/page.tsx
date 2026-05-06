import { redirect } from "next/navigation"

/**
 * /teen/coins is merged into the wallet hub.
 * Per docs/economy.md §2.2, user_coins table is not yet wired;
 * the wallet already shows coins balance (currently 0) via walletData.coins.
 * Keeping a separate coins page with totalCoins=1250 would contradict the wallet.
 */
export default function CoinsPage() {
  redirect("/teen/wallet")
}
