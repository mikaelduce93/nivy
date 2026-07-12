import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { levelProgressForXp } from "@/lib/gamification/level-curve"
import { AvatarClient } from "./avatar-client"

export const metadata: Metadata = {
  title: "Mon avatar Niv",
}

// Refonte V1.5 (#103) — personnalisation de l'avatar/coach Niv (skins, humeur).
// G2-A (décision PO 2026-07-11) — skins = récompenses de niveau (gratuites) :
// on charge côté serveur le niveau réel (courbe UI, source teen_full_profile
// .total_xp comme le wallet) + l'état persisté `avatars.skin` / `avatars.mood`.
export default async function TeenAvatarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let level = 1
  let initialSkin: string | null = null
  let initialMood: string | null = null

  if (user) {
    const [{ data: avatar }, { data: profile }] = await Promise.all([
      supabase
        .from("avatars")
        .select("skin, mood")
        .eq("teen_id", user.id)
        .maybeSingle<{ skin: string | null; mood: string | null }>(),
      supabase
        .from("teen_full_profile")
        .select("total_xp")
        .eq("id", user.id)
        .limit(1)
        .maybeSingle(),
    ])

    level = levelProgressForXp(profile?.total_xp ?? 0).level
    initialSkin = avatar?.skin ?? null
    initialMood = avatar?.mood ?? null
  }

  return <AvatarClient level={level} initialSkin={initialSkin} initialMood={initialMood} />
}
