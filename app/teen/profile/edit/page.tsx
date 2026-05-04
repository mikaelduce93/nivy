import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User } from "lucide-react"
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container-tight py-12 max-w-2xl">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-muted-foreground hover:text-foreground">
          <Link href="/teen/profile">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au profil
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground">Modifier le profil</h1>
          <p className="text-muted-foreground">Personnalise ton profil Teen Club</p>
        </div>

        {/* Edit Form */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Informations du profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileEditForm
              profileId={userInfo.profileId}
              initialData={{
                fullName: profile?.full_name || "",
                username: profile?.username || "",
                bio: profile?.bio || "",
                avatarUrl: profile?.avatar_url || "",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
