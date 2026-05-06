import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { getUserVipTier } from "@/gamification-system/features/vip-system/actions"
import { createClient } from "@/lib/supabase/server"
import { VipCardClient } from "./vip-card-client"

export default async function VipCardPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id
  if (!teenId) {
    redirect("/teen")
  }

  const [vipTier, profile] = await Promise.all([
    getUserVipTier(teenId).catch(() => null),
    (async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from("teens")
        .select("created_at, total_xp")
        .eq("id", teenId)
        .maybeSingle()
      return data
    })().catch(() => null),
  ])

  const userXP = vipTier?.lifetimeXp ?? profile?.total_xp ?? 0
  const tierSlug = (vipTier?.tier || "bronze").toLowerCase()
  const memberSince = profile?.created_at ?? null

  return <VipCardClient userXP={userXP} tierSlug={tierSlug} memberSince={memberSince} />
}
