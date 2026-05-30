import { redirect } from "next/navigation"

export const metadata = {
  robots: { index: false, follow: false },
}

// V2 (#131 / Pilier H) — l'ancien /djs/candidature était un formulaire-piège de
// ~500 lignes qui ne soumettait rien (aucun fetch/insert). Le flux canonique de
// candidature DJ est /devenir-dj : on redirige côté serveur pour ne plus exposer
// un formulaire inerte.
export default function DJCandidatureRedirect() {
  redirect("/devenir-dj")
}
