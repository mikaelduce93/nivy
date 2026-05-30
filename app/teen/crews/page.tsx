import type { Metadata } from "next"
import { CrewsClient } from "./crews-client"

export const metadata: Metadata = {
  title: "Mon crew",
}

// Refonte V1.5 (#103) — hub crews teen (débloque la cible du redirect
// /gamification/crews). Lit /api/teen/crew.
export default function TeenCrewsPage() {
  return <CrewsClient />
}
