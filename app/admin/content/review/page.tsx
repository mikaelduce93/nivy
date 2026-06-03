/**
 * Wave 3 — TICKET-008: Pedagogical reviewer admin queue.
 *
 * AI-generated quizzes (code LIKE 'AI_%') with is_active=false are queued
 * here for human review before going live to teens. Admin can inspect the
 * full questions JSON and Approve (flip is_active=true) or Reject (keep
 * is_active=false; log rejection in admin_audit_logs).
 *
 * Server component: queries `educational_quizzes` directly via service-role.
 * Mutations live in: POST /api/admin/content/review/:id (action: approve|reject).
 */
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { ReviewQuizRow } from "./review-quiz-row"
import { StatCard } from "@/components/admin/stat-card"
import { NivEmpty } from "@/components/brand"

export const dynamic = "force-dynamic"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])

interface PendingQuiz {
  id: string
  code: string
  title: string
  subject: string
  description: string | null
  difficulty: string | null
  grade_level: string | null
  cohort_key: string | null
  language: string | null
  questions: unknown
  quality_score: number | null
  created_at: string | null
}

export default async function AdminContentReviewPage() {
  // 1. Auth + admin gate
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
        <h1 className="mb-2 text-2xl font-bold text-ink">Modération · Quiz IA</h1>
        <p className="text-destructive">Accès refusé — rôle administrateur requis.</p>
      </main>
    )
  }

  // 2. Fetch pending AI-generated quizzes (is_active=false AND code LIKE 'AI_%')
  // Service-role client bypasses RLS; cast to a tolerant shape because the
  // generated supabase types may not yet reflect cohort_key/language columns.
  const { data: rawPending, error } = await sr
    .from("educational_quizzes")
    .select(
      "id, code, title, subject, description, difficulty, grade_level, cohort_key, language, questions, quality_score, created_at",
    )
    .eq("is_active", false)
    .like("code", "AI_%")
    .order("created_at", { ascending: true })
    .limit(100)

  const pending = ((rawPending ?? []) as unknown as PendingQuiz[])

  // Counters: AI quizzes by status
  const { data: aiCounters } = await sr
    .from("educational_quizzes")
    .select("is_active")
    .like("code", "AI_%")
    .returns<Array<{ is_active: boolean | null }>>()
  const stats = {
    pending: aiCounters?.filter((c) => c.is_active === false).length ?? 0,
    approved: aiCounters?.filter((c) => c.is_active === true).length ?? 0,
    total: aiCounters?.length ?? 0,
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline"
        >
          ← Retour
        </Link>
      </div>

      <header className="mb-8">
        <p className="eyebrow tracking-[0.16em]">Contenu · Quiz IA</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
          Revue des <em className="font-semibold italic text-pink">quiz IA</em>
        </h1>
        <p className="mt-2 text-sm text-mute">
          Approuvez les quiz pédagogiquement valides avant leur passage en live.
          Chaque rejet est tracé et historisé.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="En attente" value={stats.pending} tone="gold" />
        <StatCard label="Approuvés (live)" value={stats.approved} tone="lime" />
        <StatCard label="Total IA générés" value={stats.total} tone="teal" />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-ink">
          File en attente ({pending.length})
        </h2>

        {error && (
          <p className="mb-3 rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Erreur de chargement : {error.message}
          </p>
        )}

        {pending.length === 0 && !error && (
          <NivEmpty
            mood="calm"
            title="File au clair"
            description="Aucun quiz IA en attente de revue pédagogique."
          />
        )}

        <ul className="space-y-3">
          {pending.map((q) => (
            <ReviewQuizRow key={q.id} quiz={q} />
          ))}
        </ul>
      </section>
    </main>
  )
}
