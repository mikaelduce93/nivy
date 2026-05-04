/**
 * TOKEN COMPONENTS
 * ================
 * Composants pour la gestion des tokens et récompenses
 *
 * Composants:
 * - TokenWallet: Portefeuille complet avec soldes, historique et transferts
 * - TokenBalanceWidget: Widget compact pour afficher les soldes
 * - DailyBonusCard: Carte de bonus quotidien avec streak
 * - TokenRewardsShop: Boutique de récompenses complète
 * - FeaturedRewardsWidget: Widget des récompenses vedettes
 *
 * Usage:
 * ```tsx
 * import {
 *   TokenWallet,
 *   TokenBalanceWidget,
 *   DailyBonusCard,
 *   TokenRewardsShop,
 *   FeaturedRewardsWidget,
 * } from "@/components/tokens"
 * ```
 */

// Token Wallet
export {
  TokenWallet,
  TokenBalanceWidget,
  DailyBonusCard,
} from "./token-wallet"

// Token Rewards
export {
  TokenRewardsShop,
  FeaturedRewardsWidget,
} from "./token-rewards"
