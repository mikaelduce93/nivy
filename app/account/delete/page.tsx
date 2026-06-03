import type { Metadata } from "next"

import { DeleteClient } from "./delete-client"

export const metadata: Metadata = { title: "Supprimer mon compte" }

// Refonte V1.5 (#108) — suppression de compte (droit à l'effacement, CNDP loi 09-08).
// V2 (#144 / A8) — habillage kit charte + câblage réel de POST /api/me/data-delete.
export default function AccountDeletePage() {
  return <DeleteClient />
}
