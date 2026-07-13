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
      // total_xp vit dans user_xp (pas teens) ; created_at (member since) dans teens.
      const [{ data: teen }, { data: xp }] = await Promise.all([
        supabase.from("teens").select("created_at").eq("id", teenId).maybeSingle(),
        supabase.from("user_xp").select("total_xp").eq("teen_id", teenId).maybeSingle(),
      ])
      return { created_at: teen?.created_at ?? null, total_xp: xp?.total_xp ?? null }
    })().catch(() => null),
  ])

  const userXP = vipTier?.lifetimeXp ?? profile?.total_xp ?? 0
  // #66 — default to the real entry tier 'standard' (vip_tiers.tier_level 0,
  // matching getUserVipTier's own default), not 'bronze'.
  const tierSlug = (vipTier?.tier || "standard").toLowerCase()
  const memberSince = profile?.created_at ?? null

  return <VipCardClient userXP={userXP} tierSlug={tierSlug} memberSince={memberSince} />
}
