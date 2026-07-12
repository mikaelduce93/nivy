import { notFound, redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { GAME_DEFAULTS, isPlayableSlug } from "@/lib/games/catalog"
import { getCreditedTodayForSlug, getPlayableCatalogRows } from "@/lib/games/server"
import { GamePlayClient } from "./play-client"

export const dynamic = "force-dynamic"

/**
 * Page de jeu solo — SPEC-G4 §7 (Quiz Rush / Memory / Vrai-Faux Sprint).
 *
 * Seuls les 3 slugs jouables de la vague G4-B3 existent ici ; tout autre slug
 * → 404. Si l'infra (mig 181/182) n'est pas en base, le client affiche
 * « bientôt » — même contrat honnête que la page catalogue.
 */
export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/auth/redirect")

  const { slug } = await params
  if (!isPlayableSlug(slug)) notFound()

  const [{ available, creditedToday }, catalogRows] = await Promise.all([
    getCreditedTodayForSlug(slug),
    getPlayableCatalogRows(),
  ])
  const row = catalogRows.find((r) => r.slug === slug)
  const defaults = GAME_DEFAULTS[slug]
  // Ligne catalogue désactivée par l'admin = le jeu repasse « bientôt » ;
  // ligne absente (mig 183 pas encore passée) = défauts du code.
  const activeOk = row ? row.is_active : true

  return (
    <GamePlayClient
      slug={slug}
      name={row?.name || defaults.name}
      emoji={defaults.emoji}
      description={row?.description || defaults.description}
      baseXp={row?.base_xp ?? defaults.baseXp}
      secondsPerItem={defaults.secondsPerItem}
      available={available && activeOk}
      initialCreditedToday={creditedToday}
    />
  )
}
