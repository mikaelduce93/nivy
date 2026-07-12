import { redirect } from "next/navigation"

/**
 * /teen/games/battle/[id] → /teen/battles/[id] (redirect pur, G4).
 *
 * Les notifications SQL du train G4 (create_battle/resolve_battle, mig 182)
 * pointent `action_url = '/teen/games/battle/{id}'` alors que le salon vit
 * sur /teen/battles/[id]. Les URLs SQL sont corrigées en parallèle — ce
 * redirect est la ceinture pour les notifications DÉJÀ émises en base.
 * Aucune garde ici : auth, validation d'UUID et RLS sont faites par la page
 * cible.
 */
export default async function BattleDeepLinkRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/teen/battles/${id}`)
}
