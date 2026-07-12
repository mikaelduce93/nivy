/**
 * Packs de recharge parentale — #351 (tokenomics-coherence).
 *
 * La table serveur `topup_packages` (migration 177) est la source AUTORITAIRE.
 * Ce module fournit :
 *   - le type partagé,
 *   - un fallback = miroir exact du seed 177 (résilience si la table est
 *     illisible, et carte de débit côté route API),
 *   - le plafond légal par opération.
 *
 * Règles de conformité (verrouillées) : 1 DH = 100 coins STRICT, aucun bonus
 * non adossé à du DH (invariant d'escrow), 50–200 DH/opération (plancher =
 * réglage live xp_payment_settings.min_topup_dh ; plafond = BAM Circular
 * 6/W/2017, palier faiblement KYC).
 */

export interface TopupPackage {
  id: string
  coins: number
  bonus: number
  price: number
  popular: boolean
}

/** Miroir du seed migration 177. La DB reste la source autoritaire. */
export const TOPUP_PACKAGES: TopupPackage[] = [
  { id: "pack_50", coins: 5000, bonus: 0, price: 50, popular: false },
  { id: "pack_100", coins: 10000, bonus: 0, price: 100, popular: true },
  { id: "pack_150", coins: 15000, bonus: 0, price: 150, popular: false },
  { id: "pack_200", coins: 20000, bonus: 0, price: 200, popular: false },
]

/** Plafond par opération (BAM Circular 6/W/2017, palier faiblement KYC). */
export const PARENT_TOPUP_MAX_DH = 200
