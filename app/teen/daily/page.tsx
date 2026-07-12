import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getMyTeenSelf } from "@/features/teens"
import { DailyChallengesBoard } from "@/components/gamification/daily-challenges-board"

export const metadata: Metadata = { title: "Défis du jour" }

// G2-C (audit 2026-07-11, friction 7) — surface ado de complétion des quêtes
// quotidiennes, rapatriée sous le layout teen (nav 5 piliers,
// GamificationProvider) depuis l'ancien /daily au chrome public. Session ado
// directe : getMyTeenSelf() (self-scope teens.id = auth.uid()), pas de
// sélecteur multi-enfants. Le layout garantit déjà role === "teen" ; si le
// profil teen est introuvable (edge), on retombe sur l'accueil teen.
export default async function TeenDailyPage() {
  const self = await getMyTeenSelf()

  if (!self.success || !self.data) {
    redirect("/teen")
  }

  return <DailyChallengesBoard teenId={self.data.id} pseudo={self.data.pseudo} />
}
