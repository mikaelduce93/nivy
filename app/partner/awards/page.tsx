import type { Metadata } from "next"
import { AwardsClient } from "./awards-client"

export const metadata: Metadata = { title: "Attribuer de l'XP — Partenaire" }

// Refonte V1.5 (#99 P0) — UI d'attribution XP coach/prof (teacher-coach-xp §9).
export default function PartnerAwardsPage() {
  return <AwardsClient />
}
