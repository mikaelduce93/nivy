/**
 * Skins Niv — récompenses de niveau (G2-A, décision PO 2026-07-11).
 *
 * Les skins ne coûtent RIEN (ni XP ni coins) : ils se débloquent en montant
 * de niveau. Les anciens « prix XP » mock de app/teen/avatar/avatar-client.tsx
 * (500 / 1 200 / 2 500) sont convertis en niveaux via la courbe UI
 * (lib/gamification/level-curve.ts, arrondi au niveau supérieur).
 *
 * Le skin équipé est persisté dans `avatars.skin` (même mécanisme que
 * `avatars.mood`, via POST /api/teen/avatar { action: "set_skin" }).
 *
 * Module pur — importé par le client (page avatar) ET par la route API
 * (garde serveur anti-triche sur le niveau).
 */

import { unlockLevelForXpCost } from "./level-curve"

export interface NivSkin {
  id: string
  label: string
  unlockLevel: number
}

export const NIV_SKINS: NivSkin[] = [
  // Offert par le starter pack onboarding.
  { id: "hoodie-pink", label: "Hoodie Pink", unlockLevel: 1 },
  // Ex-prix XP 500 → niveau 4.
  { id: "varsity", label: "Varsity", unlockLevel: unlockLevelForXpCost(500) },
  // Ex-prix XP 1 200 → niveau 5.
  { id: "streetwear", label: "Streetwear", unlockLevel: unlockLevelForXpCost(1200) },
  // Ex-prix XP 2 500 → niveau 7.
  { id: "neon-night", label: "Neon Night", unlockLevel: unlockLevelForXpCost(2500) },
]

export function getSkinById(id: string): NivSkin | undefined {
  return NIV_SKINS.find((s) => s.id === id)
}
