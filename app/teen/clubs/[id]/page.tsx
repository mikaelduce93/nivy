/**
 * /teen/clubs/[id] — Club detail (issue #239).
 *
 * Server component: loads the club, its active members (joined to teen names),
 * and its sessions. Renders:
 * - members roster
 * - sessions list
 * - ClubActions (client): « Rejoindre » (shows cotisation cost) for non-members,
 *   and for the owner an « Ajouter une session » form.
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"
import { ClubActions } from "./actions-client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClubDetailPage({ params }: PageProps) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const { id } = await params
  const supabase = await createClient()
  const teenId = userInfo.profileId

  const { data: club } = await supabase
    .from("teen_clubs")
    .select(
      "id, name, description, cotisation_coins, max_members, owner_id, is_active"
    )
    .eq("id", id)
    .maybeSingle()

  if (!club) notFound()

  const { data: memberRows } = await supabase
    .from("club_members")
    .select(
      "id, teen_id, status, joined_at, teens:teen_id (id, first_name, last_name)"
    )
    .eq("club_id", id)
    .eq("status", "active")

  type MemberWithTeen = {
    id: string
    teen_id: string
    status: string
    joined_at: string | null
    teens: { id: string; first_name: string | null; last_name: string | null } | null
  }
  const members = (memberRows ?? []) as unknown as MemberWithTeen[]

  const { data: sessionRows } = await supabase
    .from("club_sessions")
    .select("id, title, starts_at, location")
    .eq("club_id", id)
    .order("starts_at", { ascending: true })

  type SessionRow = {
    id: string
    title: string | null
    starts_at: string | null
    location: string | null
  }
  const sessions = (sessionRows ?? []) as SessionRow[]

  const isOwner = club.owner_id === teenId
  const isMember = members.some((m) => m.teen_id === teenId)

  const memberName = (m: MemberWithTeen) =>
    [m.teens?.first_name, m.teens?.last_name].filter(Boolean).join(" ").trim() ||
    (m.teen_id === club.owner_id ? "Organisateur" : "Membre")

  const fmtDate = (iso: string | null) => {
    if (!iso) return "Date à venir"
    try {
      return new Date(iso).toLocaleString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 pt-6 md:p-8">
      <div>
        <Link
          href="/teen/clubs"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Clubs
        </Link>
      </div>

      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-pink/20">
          <Users className="h-7 w-7 text-ink" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="eyebrow tracking-[0.16em]">
            Club{isOwner ? " · tu es l'organisateur" : ""}
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {club.name}
          </h1>
          {club.description ? (
            <p className="mt-1 text-sm text-mute">{club.description}</p>
          ) : null}
          <p className="mt-1 font-mono text-xs text-mute">
            {members.length}/{club.max_members ?? "—"} membres · cotisation{" "}
            {club.cotisation_coins ?? 0} coins ⊙
          </p>
        </div>
      </div>

      {/* Join / add-session controls */}
      <ClubActions
        clubId={club.id}
        cotisationCoins={club.cotisation_coins ?? 0}
        isOwner={isOwner}
        isMember={isMember}
      />

      {/* Members */}
      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Membres
        </h2>
        <StickerCard className="divide-y-2 divide-ink/10 p-0">
          {members.length === 0 ? (
            <p className="p-4 text-sm text-mute">Aucun membre pour l&apos;instant.</p>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <p className="truncate text-sm font-bold text-ink">
                  {memberName(m)}
                  {m.teen_id === club.owner_id ? (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-pink">
                      organisateur
                    </span>
                  ) : null}
                </p>
              </div>
            ))
          )}
        </StickerCard>
      </section>

      {/* Sessions */}
      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Sessions
        </h2>
        <StickerCard className="divide-y-2 divide-ink/10 p-0">
          {sessions.length === 0 ? (
            <p className="p-4 text-sm text-mute">
              Aucune session programmée pour l&apos;instant.
            </p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="flex flex-col gap-0.5 p-4">
                <p className="truncate text-sm font-bold text-ink">
                  {s.title || "Session"}
                </p>
                <p className="font-mono text-xs text-mute">
                  {fmtDate(s.starts_at)}
                  {s.location ? ` · ${s.location}` : ""}
                </p>
              </div>
            ))
          )}
        </StickerCard>
      </section>
    </div>
  )
}
