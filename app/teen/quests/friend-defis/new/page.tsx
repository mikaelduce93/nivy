/**
 * Wave 2B / canon §10 — Friend défi creation form.
 * Server component: loads the teen's friends and renders the client form.
 *
 * Submit hits POST /api/teen/friend-challenges → SECURITY DEFINER RPC
 * `create_friend_challenge_v2` (canon §2). XP escrow runs server-side.
 */
import { redirect } from "next/navigation"
import Link from "next/link"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
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

      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Lancer un défi</h1>
        <p className="text-sm text-muted-foreground">
          Choisis un adversaire, un type de défi, ton enjeu en XP. La mise est
          débitée à la création; ton adversaire est débité à l&apos;acceptation;
          le pot va au gagnant.
        </p>
      </header>

      {friends.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
          <p className="text-sm text-zinc-400">
            Aucun ami pour le moment. Ajoute des amis avant de lancer un défi.
          </p>
          <Button asChild className="mt-4">
            <Link href="/teen/friends">Ajouter des amis</Link>
          </Button>
        </div>
      ) : (
        <NewFriendDefiForm friends={friends} />
      )}
    </div>
  )
}
