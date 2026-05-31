// REDIRECT: /teen/crews → /teen/circles (écran canonique du concept crew).
// #154 — convergence des doublons crew : /teen/circles reste la cible du 308
// depuis /gamification/crews, /teen/crews y converge à son tour.
// permanentRedirect (308) + robots:noindex (à l'image de /gamification/crews).
import { permanentRedirect } from "next/navigation"

export const metadata = { robots: { index: false, follow: false } }

export default function TeenCrewsPage() {
  permanentRedirect("/teen/circles")
}
