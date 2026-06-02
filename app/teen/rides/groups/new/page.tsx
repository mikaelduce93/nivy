/**
 * /teen/rides/groups/new — Create a group ride (V6, issue #235).
 *
 * Server component: resolves the teen's friends list (via get_friends RPC +
 * the teens table, the existing friends source) and hands it to the client
 * form for the invite picker. Charte paper hero + NivCoach.
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { H1 } from "@/components/ui/headings"
import { NivCoach } from "@/components/brand"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CreateGroupRideForm, type FriendOption } from "./create-form"

export const dynamic = "force-dynamic"

export default async function NewGroupRidePage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const supabase = await createClient()
  const teenId = userInfo.profileId

  // Friends source = get_friends RPC (friend_id rows) + teens table for names.
  // Same source the existing /teen/friends feature uses (see friends/handlers.ts).
  let friends: FriendOption[] = []
  const { data: friendRows } = await supabase.rpc("get_friends", { p_teen_id: teenId })
  const friendIds = ((friendRows ?? []) as Array<{ friend_id?: string }>)
    .map((f) => f?.friend_id)
    .filter(Boolean) as string[]

  if (friendIds.length > 0) {
    const { data: details } = await supabase
      .from("teens")
      .select("id, first_name, last_name, avatar_url")
      .in("id", friendIds)
    friends = ((details ?? []) as Array<{
      id: string
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
    }>).map((d) => ({
      id: d.id,
      name: [d.first_name, d.last_name].filter(Boolean).join(" ").trim() || "Ami",
      avatar_url: d.avatar_url,
    }))
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 pt-6 md:p-8">
      <div>
        <Link
          href="/teen/rides/groups"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Sorties
        </Link>
      </div>
      <div>
        <p className="eyebrow tracking-[0.16em] mb-1">Mobilité</p>
        <H1 className="font-display text-4xl font-extrabold tracking-tight">
          Crée une <em className="font-semibold italic text-pink">sortie</em>
        </H1>
        <p className="mt-2 text-sm text-mute">
          Invite tes amis : plus vous êtes nombreux, plus la remise est grande. Tu
          choisiras le trajet et finaliseras une fois le groupe formé.
        </p>
      </div>
      <NivCoach
        mood="happy"
        message="Donne un nom à ta sortie et coche les amis à inviter. Ils reçoivent une invitation à accepter — tu finalises le trajet et le partage de la note ensuite."
      />
      <CreateGroupRideForm friends={friends} />
    </div>
  )
}
