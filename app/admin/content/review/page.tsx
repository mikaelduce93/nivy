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
        <h1 className="mb-2 text-2xl font-bold text-white">Modération · Quiz IA</h1>
        <p className="text-red-400">Accès refusé — rôle administrateur requis.</p>
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
          className="text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
        >
          ← Retour
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Modération · Quiz générés par IA</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Approuvez les quiz pédagogiquement valides. Les rejets sont loggés
          dans <code className="rounded bg-zinc-800 px-1">admin_audit_logs</code>.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-3 gap-3">
        <StatCard label="En attente" value={stats.pending} tone="yellow" />
        <StatCard label="Approuvés (live)" value={stats.approved} tone="green" />
        <StatCard label="Total IA générés" value={stats.total} tone="blue" />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-white">
          File en attente ({pending.length})
        </h2>

        {error && (
          <p className="mb-3 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            Erreur de chargement : {error.message}
          </p>
        )}

        {pending.length === 0 && !error && (
          <p className="rounded border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-400">
            Aucun quiz IA en attente de revue pédagogique.
          </p>
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

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "yellow" | "green" | "red" | "blue"
}) {
  const palette: Record<typeof tone, string> = {
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    green: "border-green-500/30 bg-green-500/10 text-green-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  }
  return (
    <div className={`rounded border p-3 ${palette[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}
