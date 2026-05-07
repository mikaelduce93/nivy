import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ListChecks } from "lucide-react"
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
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32 max-w-2xl">
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent/chores">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <ListChecks className="h-7 w-7 text-emerald-400" />
            Nouvelle corvée
          </h1>
          <p className="text-zinc-400 mt-1">
            Définissez la mission, la récompense et la fréquence.
          </p>
        </div>

        {teens.length === 0 ? (
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
            <CardContent className="py-12 text-center">
              <p className="text-zinc-400 mb-6">
                Vous devez d'abord lier un teen à votre compte.
              </p>
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Link href="/parent/teens/add">Ajouter un Teen</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Détails de la corvée</CardTitle>
            </CardHeader>
            <CardContent>
              <ChoreForm teens={teens as Array<{ teen_id: string; teen_name: string }>} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
