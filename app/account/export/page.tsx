import type { Metadata } from "next"

import { ExportClient } from "./export-client"

export const metadata: Metadata = { title: "Exporter mes données" }

// Refonte V1.5 (#108) — export des données personnelles (droit d'accès, CNDP loi 09-08).
// V2 (#144 / A8) — habillage kit charte + câblage réel de POST /api/me/data-export.
export default function AccountExportPage() {
  return <ExportClient />
}
