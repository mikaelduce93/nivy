/**
 * Audit 2026-07-11 D3 — admin validation queue for teen physical-challenge
 * proof submissions.
 *
 * Server component: lists `teen_physical_challenge_progress` rows sitting at
 * `completed=true, validated=false` (the state produced by the teen
 * "complete + proof" flow in /api/teen/sport/challenges). Hydrates the teen
 * and challenge rows, and generates 15-min signed URLs for the proof media
 * stored in the PRIVATE `defi-proofs` bucket (same mechanism as
 * app/admin/proofs).
 *
 * Mutations live in POST /api/admin/sport-challenges/:id/validate
 * (approve → flips validated=true + credits XP via add_xp_to_user;
 *  reject → resets the submission so the teen can retry).
 */
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { SportChallengeValidationRow } from "./validation-row"
import { NivEmpty } from "@/components/brand"
import { StatCard } from "@/components/admin/stat-card"
import BackButton from "@/components/admin/BackButton"

export const dynamic = "force-dynamic"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])
const SIGNED_URL_TTL_SECONDS = 60 * 15

export default async function AdminDefisSportifsPage() {
  // 1. Auth + admin gate (same pattern as app/admin/proofs).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !ADMIN_ROLES.has(role.role)) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-ink">Défis sportifs</h1>
        <p className="text-destructive">Accès refusé — rôle administrateur requis.</p>
      </main>
    )
  }

  // 2. Pending submissions (teen marked complete with proof, XP on hold).
  const { data: pending } = await sr
    .from("teen_physical_challenge_progress")
    .select(
      "id, teen_id, challenge_id, current_value, objective_value, completed_at, proof_url, proof_type, started_at"
    )
    .eq("completed", true)
    .eq("validated", false)
    .order("completed_at", { ascending: true })
    .limit(50)

  // Counters
  const { count: pendingCount } = await sr
    .from("teen_physical_challenge_progress")
    .select("id", { count: "exact", head: true })
    .eq("completed", true)
    .eq("validated", false)
  const { count: validatedCount } = await sr
    .from("teen_physical_challenge_progress")
    .select("id", { count: "exact", head: true })
    .eq("validated", true)

  // 3. Hydrate teen + challenge rows in batch.
  const pendingRows = pending ?? []
  const teenIds = [...new Set(pendingRows.map((p) => p.teen_id))]
  const challengeIds = [...new Set(pendingRows.map((p) => p.challenge_id))]

  const teensById = new Map<
    string,
    { id: string; first_name: string | null; last_name: string | null; pseudo: string | null }
  >()
  if (teenIds.length) {
    const { data: teens } = await sr
      .from("teens")
      .select("id, first_name, last_name, pseudo")
      .in("id", teenIds)
    for (const t of teens ?? []) teensById.set(t.id, t)
  }

  const challengesById = new Map<
    string,
    {
      id: string
      name: string
      xp_reward: number | null
      objective_value: number
      objective_unit: string | null
      sport_category: string | null
      difficulty: string | null
    }
  >()
  if (challengeIds.length) {
    const { data: challenges } = await sr
      .from("physical_challenges")
      .select("id, name, xp_reward, objective_value, objective_unit, sport_category, difficulty")
      .in("id", challengeIds)
    for (const c of challenges ?? []) challengesById.set(c.id, c)
  }

  // 4. Sign proof media (PRIVATE bucket → 15-min signed URLs, as in /admin/proofs).
  const rows = await Promise.all(
    pendingRows.map(async (p) => {
      let proofSignedUrl: string | null = null
      if (p.proof_url) {
        if (p.proof_url.startsWith("http")) {
          // Legacy rows may hold a full URL already.
          proofSignedUrl = p.proof_url
        } else {
          const { data: signed } = await sr.storage
            .from("defi-proofs") // canon-allow: defi-proofs IS canonical for physical_challenges (canon §3 reserves it).
            .createSignedUrl(p.proof_url, SIGNED_URL_TTL_SECONDS)
          proofSignedUrl = signed?.signedUrl ?? null
        }
      }

      const teen = teensById.get(p.teen_id) ?? null
      const challenge = challengesById.get(p.challenge_id) ?? null

      return {
        id: p.id,
        completed_at: p.completed_at,
        current_value: p.current_value,
        objective_value: p.objective_value,
        proof_type: p.proof_type,
        proofSignedUrl,
        teenLabel: teen
          ? teen.pseudo || [teen.first_name, teen.last_name].filter(Boolean).join(" ") || teen.id
          : p.teen_id,
        challengeName: challenge?.name ?? "(défi supprimé)",
        challengeMeta: challenge
          ? [challenge.sport_category, challenge.difficulty].filter(Boolean).join(" · ")
          : null,
        xpReward: challenge?.xp_reward ?? 50,
        objectiveUnit: challenge?.objective_unit ?? null,
      }
    })
  )

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <BackButton href="/admin" />

      <header className="mb-8">
        <span className="eyebrow tracking-[0.16em] text-mute">Modération · Défis sportifs</span>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">
          Preuves de défis <em className="font-semibold italic text-pink">physiques</em>
        </h1>
        <p className="mt-1 text-sm text-mute">
          Valide les preuves soumises par les ados — l&apos;XP n&apos;est crédité qu&apos;après ton
          approbation. Les médias privés sont signés 15 min.
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2">
        <StatCard label="En attente" value={pendingCount ?? 0} tone="gold" />
        <StatCard label="Validés (total)" value={validatedCount ?? 0} tone="lime" />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-extrabold tracking-tight text-ink">
          File en attente ({rows.length})
        </h2>

        {rows.length === 0 ? (
          <NivEmpty
            mood="proud"
            title="File vide, tout est validé"
            description="Aucune preuve de défi physique en attente de validation."
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <SportChallengeValidationRow key={r.id} row={r} />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
