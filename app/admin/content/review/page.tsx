/**
 * Wave 3 — TICKET-008 · G3-C: Pedagogical reviewer admin queue.
 *
 * AI-generated content (code LIKE 'DAILY_%', written by the daily cron
 * app/api/cron/generate-daily-content) with is_active=false is queued here
 * for human review before going live to teens. Admin can inspect the payload
 * and Approve (flip is_active=true) or Reject (archive: code re-prefixed
 * REJECTED_, stays inactive; rejection logged in audit_log).
 *
 * Audit 2026-07-11 Q1: this page used to filter on 'AI_%', a prefix nothing
 * ever wrote, while the cron published straight to is_active=true — the queue
 * was permanently empty and AI content reached minors unreviewed. The
 * convention is now DAILY_ on both sides.
 *
 * G3-C (volume tooling):
 *   - quiz queue got multi-select + bulk approve/reject (<ReviewQueue> →
 *     POST /api/admin/content/review/batch, max 200 ids);
 *   - mission_templates queue added (the cron also writes DAILY_ missions
 *     with is_active=false; until now they accumulated with no review UI);
 *   - "Actifs jamais revus" legacy section: live DAILY_ quizzes with no
 *     human-approval trace, with bulk deactivate back into the queue.
 *
 * Server component: queries `educational_quizzes` / `mission_templates`
 * directly via service-role. Mutations live in:
 *   - POST /api/admin/content/review/:id     (unit, quiz only — pre-G3-C)
 *   - POST /api/admin/content/review/batch   (bulk + missions + deactivate)
 */
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { ReviewQueue } from "./review-queue"
import type { PendingQuiz } from "./review-quiz-row"
import type { PendingMission } from "./review-mission-row"
import { LegacyActiveQuizzes, type LegacyActiveQuiz } from "./legacy-active-quizzes"
import { StatCard } from "@/components/admin/stat-card"
import { NivEmpty } from "@/components/brand"

export const dynamic = "force-dynamic"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])

/** Cap on the "active never reviewed" scan (see heuristic note below). */
const LEGACY_SCAN_LIMIT = 500

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
        <h1 className="mb-2 text-2xl font-bold text-ink">Modération · Contenu IA</h1>
        <p className="text-destructive">Accès refusé — rôle administrateur requis.</p>
      </main>
    )
  }

  // 2. Fetch pending AI-generated quizzes (is_active=false AND code LIKE 'DAILY_%')
  // Rejected rows are re-prefixed REJECTED_ by the review API, so they leave
  // this queue for good. Service-role client bypasses RLS; cast to a tolerant
  // shape because the generated supabase types may not yet reflect
  // cohort_key/language columns.
  const { data: rawPending, error } = await sr
    .from("educational_quizzes")
    .select(
      "id, code, title, subject, description, difficulty, grade_level, cohort_key, language, questions, quality_score, created_at",
    )
    .eq("is_active", false)
    .like("code", "DAILY_%")
    .order("created_at", { ascending: true })
    .limit(100)

  const pending = ((rawPending ?? []) as unknown as PendingQuiz[])

  // 3. Fetch pending AI-generated missions — same convention as quizzes
  // (schema: gamification-system/database/migrations/003_missions_system.sql).
  const { data: rawMissions, error: missionsError } = await sr
    .from("mission_templates")
    .select(
      "id, code, name, description, mission_type, category, objective_type, objective_target, xp_reward, difficulty, created_at",
    )
    .eq("is_active", false)
    .like("code", "DAILY_%")
    .order("created_at", { ascending: true })
    .limit(100)

  const pendingMissions: PendingMission[] = rawMissions ?? []

  // 4. Legacy section — « Actifs jamais revus » (G3-C, PO tool).
  //
  // Heuristic: code LIKE 'DAILY_%' AND is_active=true, MINUS ids that carry an
  // audit_log entry action='content.review.approve' /
  // resource_type='educational_quizzes' (both the unit and the batch approve
  // routes write that entry) — so quizzes approved through the review UI
  // post-fix are correctly excluded, leaving (in practice) the rows the cron
  // auto-published before the 2026-07-11 fail-closed fix.
  //
  // Documented limits of the heuristic:
  //   - a quiz whose approval audit INSERT failed (the routes don't check that
  //     insert's error) shows up here even though a human approved it;
  //   - a quiz activated outside the review UI (direct SQL/seed) shows up here
  //     — arguably correct: no human review trace exists;
  //   - if audit_log is ever purged, previously-approved quizzes reappear;
  //   - the scan is capped at LEGACY_SCAN_LIMIT active rows (flagged in UI).
  // Nothing is deactivated automatically — the bulk action below is explicit.
  const { data: rawActive } = await sr
    .from("educational_quizzes")
    .select("id, code, title, subject, created_at")
    .eq("is_active", true)
    .like("code", "DAILY_%")
    .order("created_at", { ascending: true })
    .limit(LEGACY_SCAN_LIMIT)

  const activeQuizzes: LegacyActiveQuiz[] = rawActive ?? []
  let approvedIds = new Set<string>()
  if (activeQuizzes.length > 0) {
    // audit_log is not in the generated Database types (see unit route which
    // also writes to it untyped) — cast the result.
    const { data: auditRows } = await sr
      .from("audit_log")
      .select("resource_id")
      .eq("action", "content.review.approve")
      .eq("resource_type", "educational_quizzes")
      .in(
        "resource_id",
        activeQuizzes.map((q) => q.id),
      )
    approvedIds = new Set(
      ((auditRows ?? []) as Array<{ resource_id: string | null }>)
        .map((r) => r.resource_id)
        .filter((id): id is string => typeof id === "string"),
    )
  }
  const neverReviewed = activeQuizzes.filter((q) => !approvedIds.has(q.id))
  const legacyScanTruncated = activeQuizzes.length >= LEGACY_SCAN_LIMIT

  // Counters: AI content by status (quiz + missions).
  const { data: aiCounters } = await sr
    .from("educational_quizzes")
    .select("is_active")
    .like("code", "DAILY_%")
    .returns<Array<{ is_active: boolean | null }>>()
  const { data: missionCounters } = await sr
    .from("mission_templates")
    .select("is_active")
    .like("code", "DAILY_%")
    .returns<Array<{ is_active: boolean | null }>>()
  const stats = {
    pending: aiCounters?.filter((c) => c.is_active === false).length ?? 0,
    approved: aiCounters?.filter((c) => c.is_active === true).length ?? 0,
    missionsPending: missionCounters?.filter((c) => c.is_active === false).length ?? 0,
    total: (aiCounters?.length ?? 0) + (missionCounters?.length ?? 0),
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
        <p className="eyebrow tracking-[0.16em]">Contenu · IA</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
          Revue du <em className="font-semibold italic text-pink">contenu IA</em>
        </h1>
        <p className="mt-2 text-sm text-mute">
          Approuvez les quiz et missions pédagogiquement valides avant leur
          passage en live. Chaque décision (unitaire ou en masse) est tracée et
          historisée.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Quiz en attente" value={stats.pending} tone="gold" />
        <StatCard label="Missions en attente" value={stats.missionsPending} tone="gold" />
        <StatCard label="Quiz actifs (live)" value={stats.approved} tone="lime" />
        <StatCard label="Actifs jamais revus" value={neverReviewed.length} tone="coral" />
        <StatCard label="Total IA générés" value={stats.total} tone="teal" hint="quiz + missions" />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold text-ink">
          File quiz en attente ({pending.length})
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

        <ReviewQueue target="quiz" items={pending} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold text-ink">
          File missions en attente ({pendingMissions.length})
        </h2>

        {missionsError && (
          <p className="mb-3 rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Erreur de chargement : {missionsError.message}
          </p>
        )}

        {pendingMissions.length === 0 && !missionsError && (
          <NivEmpty
            mood="calm"
            title="File au clair"
            description="Aucune mission IA en attente de revue pédagogique."
          />
        )}

        <ReviewQueue target="mission" items={pendingMissions} />
      </section>

      <section>
        <h2 className="mb-1 font-semibold text-ink">
          Actifs jamais revus ({neverReviewed.length})
        </h2>
        <p className="mb-3 text-sm text-mute">
          Quiz IA actuellement live sans trace d&apos;approbation humaine dans
          l&apos;audit — en pratique, ceux publiés automatiquement avant le
          correctif du 11/07. Un quiz approuvé hors de cette interface (SQL
          direct) apparaît aussi ici. La désactivation les renvoie dans la file
          de revue ci-dessus ; rien n&apos;est désactivé automatiquement.
          {legacyScanTruncated &&
            ` Liste limitée aux ${LEGACY_SCAN_LIMIT} plus anciens quiz actifs.`}
        </p>
        <LegacyActiveQuizzes items={neverReviewed} />
      </section>
    </main>
  )
}
