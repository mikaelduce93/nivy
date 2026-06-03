/**
 * Espace mentor — disponibilités (état vide honnête).
 *
 * La gestion des créneaux récurrents n'est pas encore branchée côté données :
 * on affiche un état « bientôt disponible » sincère — jamais de faux créneaux.
 */
import { redirect } from "next/navigation"
import Link from "next/link"
import { getUserRole } from "@/lib/auth/get-user-role"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"

export const dynamic = "force-dynamic"

export default async function MentorAvailabilityPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "mentor") {
    return (
      <main className="space-y-6">
        <header>
          <p className="eyebrow tracking-[0.16em] text-pink">Disponibilités</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Mes disponibilités
          </h1>
        </header>
        <StickerCard className="items-center p-10 text-center">
          <p className="font-bold text-coral">Accès réservé aux mentors.</p>
        </StickerCard>
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="eyebrow tracking-[0.16em] text-pink">Disponibilités</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          Tes <em className="font-semibold italic text-pink">créneaux</em>
        </h1>
        <p className="mt-2 text-mute">
          Bientôt : un calendrier hebdo pour poser tes disponibilités récurrentes.
        </p>
      </header>

      <NivEmpty
        mood="calm"
        title="La gestion des créneaux arrive très bientôt"
        description="On finalise un calendrier hebdo pour que tu fixes tes disponibilités en deux clics. En attendant, gère tes rendez-vous depuis tes sessions."
        action={
          <Button asChild variant="pink">
            <Link href="/mentor/sessions">Voir mes sessions</Link>
          </Button>
        }
      />
    </main>
  )
}
