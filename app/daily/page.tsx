import { permanentRedirect } from "next/navigation"

export const metadata = { robots: { index: false, follow: false } }

// G2-C (audit 2026-07-11, friction 7) — l'ancienne page /daily (chrome public
// Navbar/Footer + sélecteur multi-enfants) est remplacée : la surface de
// complétion des quêtes quotidiennes vit désormais dans l'univers teen sous
// /teen/daily (composant partagé <DailyChallengesBoard>). Aucun flux parent
// réel n'existait ici : aucune surface parent ne linkait /daily, et la page
// était de toute façon inatteignable — next.config.mjs redirige /daily avant
// le filesystem (redirect #68, désormais pointé sur /teen/daily). Ce stub est
// la ceinture de sécurité si l'entrée next.config disparaît un jour.
export default function DailyLegacyPage() {
  permanentRedirect("/teen/daily")
}
