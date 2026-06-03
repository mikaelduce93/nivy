/**
 * /teen/clubs — Teen-organized clubs hub (issue #239).
 *
 * Lists the active clubs (teen_clubs WHERE is_active) and offers a
 * « Créer un club » form. Reads teen_clubs server-side (RLS lets the teen read
 * active clubs), matching the direct-Supabase pattern of the rides groups hub.
 * Charte paper : StickerCard + pills mono. FR copy.
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach, NivEmpty } from "@/components/brand"
import Link from "next/link"
import { Users } from "lucide-react"
import { CreateClubForm } from "./create-form"

export const dynamic = "force-dynamic"

interface Club {
  id: string
  name: string
  description: string | null
  cotisation_coins: number | null
  max_members: number | null
  owner_id: string
}

export default async function TeenClubsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const supabase = await createClient()
  const teenId = userInfo.profileId

  const { data } = await supabase
    .from("teen_clubs")
    .select("id, name, description, cotisation_coins, max_members, owner_id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  const clubs = (data ?? []) as Club[]

  return (
    <div className="container mx-auto max-w-3xl space-y-8 p-4 pt-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-pink/20">
          <Users className="h-7 w-7 text-ink" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="eyebrow tracking-[0.16em]">Collectif</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Vos <em className="font-semibold italic text-pink">clubs</em>
          </h1>
          <p className="mt-1 text-sm text-mute">
            Crée un club, fixe une cotisation et organise des sessions avec tes
            amis.
          </p>
        </div>
      </div>

      <NivCoach
        mood="happy"
        message="Lance ton club : donne-lui un nom, une cotisation en coins et une taille max. Les membres paient la cotisation en rejoignant, et toi tu programmes les sessions."
      />

      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Créer un club
        </h2>
        <CreateClubForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Clubs actifs
        </h2>
        {clubs.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucun club pour l'instant"
            description="Crée le premier club ci-dessus pour rassembler tes amis autour d'une activité régulière."
          />
        ) : (
          <div className="space-y-3">
            {clubs.map((c) => (
              <ClubRow key={c.id} club={c} isOwner={c.owner_id === teenId} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ClubRow({ club, isOwner }: { club: Club; isOwner: boolean }) {
  return (
    <Link href={`/teen/clubs/${club.id}`} className="block">
      <StickerCard variant="hover" className="gap-0 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 break-words text-sm font-bold text-ink">
              {club.name}
            </p>
            {club.description ? (
              <p className="mt-0.5 line-clamp-2 break-words text-xs text-mute">
                {club.description}
              </p>
            ) : null}
            <div className="mt-1 font-mono text-xs text-mute">
              {[
                `cotisation ${club.cotisation_coins ?? 0} coins ⊙`,
                `max ${club.max_members ?? "—"}`,
                isOwner ? "tu es l'organisateur" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          {isOwner ? (
            <span className="inline-flex shrink-0 items-center rounded-full border-2 border-ink bg-gold/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
              Organisateur
            </span>
          ) : null}
        </div>
      </StickerCard>
    </Link>
  )
}
