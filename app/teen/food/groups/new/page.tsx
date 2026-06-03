/**
 * /teen/food/groups/new — Create a group food order (V6, issue #236).
 *
 * Server component: resolves the teen's friends list (via get_friends RPC +
 * the teens table, the existing friends source) and hands it to the client
 * form for the invite picker. The restaurant + items are picked later, at
 * finalize time on the detail page. Charte paper hero + NivCoach.
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { H1 } from "@/components/ui/headings"
import { NivCoach } from "@/components/brand"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CreateGroupFoodForm, type FriendOption } from "./create-form"

export const dynamic = "force-dynamic"

export default async function NewGroupFoodPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const supabase = await createClient()
  const teenId = userInfo.profileId

  // Friends source = get_friends RPC (friend_id rows) + teens table for names.
  // Same source the existing /teen/friends feature uses.
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
          href="/teen/food/groups"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Commandes
        </Link>
      </div>
      <div>
        <p className="eyebrow tracking-[0.16em] mb-1">Food à plusieurs</p>
        <H1 className="font-display text-4xl font-extrabold tracking-tight">
          Crée une <em className="font-semibold italic text-pink">commande</em>
        </H1>
        <p className="mt-2 text-sm text-mute">
          Invite tes amis : plus vous êtes nombreux, plus la remise est grande. Tu
          choisiras le resto et le menu une fois le groupe formé.
        </p>
      </div>
      <NivCoach
        mood="happy"
        message="Donne un nom à ta commande et coche les amis à inviter. Ils reçoivent une invitation à accepter — tu choisis le resto et finalises le menu ensuite."
      />
      <CreateGroupFoodForm friends={friends} />
    </div>
  )
}
