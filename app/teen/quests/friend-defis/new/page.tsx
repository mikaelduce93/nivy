/**
 * Wave 2B / canon §10 — Friend défi creation form.
 * Server component: loads the teen's friends and renders the client form.
 *
 * Submit hits POST /api/teen/friend-challenges → SECURITY DEFINER RPC
 * `create_friend_challenge_v2` (canon §2). #206 — défis entre amis pour
 * l'honneur : aucune mise/escrow XP, aucun transfert d'XP entre ados.
 */
import { redirect } from "next/navigation"
import Link from "next/link"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { NivCoach, NivEmpty } from "@/components/brand"
import { ArrowLeft } from "lucide-react"
import { NewFriendDefiForm, type FriendOption } from "./new-friend-defi-form"

export const dynamic = "force-dynamic"

export default async function NewFriendDefiPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/auth/redirect")

  const supabase = await createClient()
  const teenId = userInfo.profileId

  // Pull accepted friends — both directions of the friendship table.
  const { data: friendRows } = await supabase
    .from("friendships")
    .select("user_id, friend_user_id, status")
    .or(`user_id.eq.${teenId},friend_user_id.eq.${teenId}`)
    .eq("status", "accepted")
    .limit(50)

  const friendIds = Array.from(
    new Set(
      (friendRows ?? []).map((r: any) =>
        r.user_id === teenId ? r.friend_user_id : r.user_id,
      ),
    ),
  ).filter(Boolean)

  let friends: FriendOption[] = []
  if (friendIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, pseudo, avatar_url")
      .in("id", friendIds)
    friends = (profiles ?? []).map((p: any) => ({
      id: p.id as string,
      pseudo: (p.pseudo as string | null) ?? "Anonyme",
      avatar_url: (p.avatar_url as string | null) ?? null,
    }))
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/teen/quests/friend-defis">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Link>
        </Button>
      </div>

      <header className="space-y-3">
        <span className="eyebrow tracking-[0.16em] text-pink">Lancer un défi</span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Défie ton <em className="font-semibold italic text-pink">crew</em>
        </h1>
        <p className="text-sm text-mute">
          Choisis un adversaire et un type de défi. Pas de mise, pas de transfert
          d&apos;XP — le gagnant prend la couronne, c&apos;est tout.
        </p>
      </header>

      <NivCoach
        mood="hype"
        message="Yallah, défie ton crew et prends la couronne !"
      />

      {friends.length === 0 ? (
        <NivEmpty
          mood="calm"
          title="Aucun ami pour le moment"
          description="Ajoute des amis avant de lancer un défi."
          action={
            <Button variant="pink" asChild>
              <Link href="/teen/friends">Ajouter des amis</Link>
            </Button>
          }
        />
      ) : (
        <NewFriendDefiForm friends={friends} />
      )}
    </div>
  )
}
