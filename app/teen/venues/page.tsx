/**
 * /teen/venues — Partner venues list (V6, issue #238).
 *
 * Lists partner venues (partners WHERE partner_type='venue', active) read
 * server-side, matching the direct-Supabase pattern of
 * app/teen/partenaires/page.tsx. From a venue's detail page the teen can form a
 * group and reserve a slot together for a size discount. Charte paper :
 * StickerCard + pills mono.
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import Link from "next/link"
import { MapPin, ArrowRight } from "lucide-react"

export const dynamic = "force-dynamic"

interface VenueRow {
  id: string
  company_name: string
  description: string | null
  sub_category: string | null
}

export default async function TeenVenuesPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const supabase = await createClient()

  const { data } = await supabase
    .from("partners")
    .select("id, company_name, description, sub_category")
    .eq("partner_type", "venue")
    .eq("status", "active")
    .order("company_name", { ascending: true })
  const venues = (data ?? []) as VenueRow[]

  return (
    <div className="container mx-auto space-y-8 pt-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-pink/20">
          <MapPin className="h-7 w-7 text-ink" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="eyebrow tracking-[0.16em]">Écosystème</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Lieux <em className="font-semibold italic text-pink">partenaires</em>
          </h1>
          <p className="mt-1 text-sm text-mute">
            Réserve un créneau à plusieurs : plus vous êtes nombreux, plus la
            remise est grande et la note partagée.
          </p>
        </div>
      </div>

      {venues.length === 0 ? (
        <NivEmpty
          mood="happy"
          title="Bientôt plein de lieux"
          description="On signe de nouveaux lieux partenaires chaque semaine. Reviens vite pour réserver un créneau avec tes amis."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => (
            <Link
              key={v.id}
              href={`/teen/venues/${v.id}`}
              className="block rounded-2xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
              aria-label={`Ouvrir le lieu ${v.company_name}`}
            >
              <StickerCard variant="hover" className="h-full gap-3 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-accent-soft">
                    <MapPin className="h-5 w-5 text-ink" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display font-bold leading-tight text-ink">
                      {v.company_name}
                    </h3>
                    {v.sub_category && (
                      <p className="truncate font-mono text-xs text-mute">{v.sub_category}</p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-mute" aria-hidden />
                </div>
                {v.description && (
                  <p className="line-clamp-2 break-words text-sm text-mute">{v.description}</p>
                )}
              </StickerCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
