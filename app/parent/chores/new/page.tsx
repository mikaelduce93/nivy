import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach, NivEmpty } from "@/components/brand"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ChoreForm } from "@/components/parent/chore-form"

async function getLinkedTeens(parentId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("parent_teens_overview")
    .select("*")
    .eq("parent_id", parentId)
  return data ?? []
}

export default async function NewChorePage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }
  const teens = await getLinkedTeens(userInfo.profileId)

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32 max-w-2xl">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent/chores">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>

        <div className="mb-8">
          <p className="eyebrow text-pink">Créer une mission</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            Nouvelle <em className="font-semibold italic text-pink">corvée</em>
          </h1>
          <p className="mt-2 text-mute">
            Définis la mission, la récompense et la fréquence.
          </p>
        </div>

        {teens.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucun teen lié pour l'instant"
            description="Lie d'abord un teen à ton compte pour lui créer des missions."
            action={
              <Button asChild>
                <Link href="/parent/teens/add">Ajouter un teen</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            <NivCoach
              mood="hype"
              message="Choisis la mission et la récompense — je motive ton ado à la boucler."
            />
            <StickerCard className="p-6">
              <ChoreForm teens={teens as Array<{ teen_id: string; teen_name: string }>} />
            </StickerCard>
          </div>
        )}
      </div>
    </div>
  )
}
