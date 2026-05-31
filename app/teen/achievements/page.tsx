// #201 Stop the lies — la surface canonique des achievements/badges est
// /teen/wallet?tab=badges (l'onglet `?tab=achievements` du profil n'existe pas).
import { permanentRedirect } from "next/navigation"

export const metadata = { robots: { index: false, follow: false } }

export default function AchievementsPage() {
  permanentRedirect("/teen/wallet?tab=badges")
}
