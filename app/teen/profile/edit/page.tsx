import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ProfileEditForm } from "@/components/teen/profile-edit-form"

async function getProfile(profileId: string) {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single()

  if (error) {
    console.error("Error fetching profile:", error)
    return null
  }

  return profile
}

export default async function EditProfilePage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const profile = await getProfile(userInfo.profileId)

  // Le pseudo (≈ username) vit sur teens.pseudo, pas sur profiles.
  let pseudo = ""
  if (userInfo.teenData?.id) {
    const supabase = await createClient()
    const { data: teen } = await supabase
      .from("teens")
      .select("pseudo")
      .eq("id", userInfo.teenData.id)
      .maybeSingle()
    pseudo = (teen?.pseudo as string | null) ?? ""
  }

  return (
    <div className="min-h-screen">
      <div className="container-tight py-12 max-w-2xl space-y-8">
        {/* Back button */}
        <Button variant="ghost" asChild className="text-mute hover:text-ink">
          <Link href="/teen/profile">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au profil
          </Link>
        </Button>

        {/* Header éditorial */}
        <header className="space-y-2">
          <span className="eyebrow tracking-[0.16em] text-pink">Ton profil</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Modifier ton <em className="font-semibold italic text-pink">profil</em>
          </h1>
          <p className="text-mute">Personnalise ton profil Nivy</p>
        </header>

        {/* Edit Form */}
        <StickerCard className="p-6">
          <ProfileEditForm
            profileId={userInfo.profileId}
            initialData={{
              fullName: profile?.full_name || "",
              username: pseudo,
              avatarUrl: profile?.avatar_url || "",
            }}
          />
        </StickerCard>
      </div>
    </div>
  )
}
