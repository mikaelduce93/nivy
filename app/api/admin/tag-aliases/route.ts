/**
 * Polish-E — Admin: tag-normalize unmapped queue actions.
 *
 * POST /api/admin/tag-aliases
 *
 * Body (JSON):
 *   {
 *     alias:        string,                       // free-text tag to act on
 *     action:       'approve_existing'            // alias → existing canonical
 *                 | 'approve_new'                 // add NEW tag to taxonomy + alias→itself
 *                 | 'reject',                     // record reject (no substitution)
 *     canonical_tag?: string,                     // required for both approve_*
 *     notes?:       string,                       // optional rationale
 *   }
 *
 * Behaviour:
 *   * `approve_existing` — `canonical_tag` MUST already exist in
 *     `interest_taxonomy` (active). Upserts a `tag_aliases` row with
 *     status='approved' so the next tag-normalize cron substitutes
 *     `alias → canonical_tag` instead of dropping it.
 *
 *   * `approve_new` — adds `canonical_tag` to `interest_taxonomy` if
 *     missing (is_active=true), then upserts the alias mapping. Note:
 *     this DOES extend the canonical taxonomy; we never touch existing
 *     rows (the 50-tag seed is preserved verbatim).
 *
 *   * `reject` — upserts a `tag_aliases` row with status='rejected'.
 *     The cron treats rejected the same as 'no mapping' → tag is
 *     dropped, and we won't re-surface it as a fresh queue entry on
 *     the next run (admins can filter rejected out).
 *
 * Auth: admin / super_admin / moderator only (via admin_roles).
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])
const VALID_ACTIONS = new Set(["approve_existing", "approve_new", "reject"])

// Canonical tags use the snake_case `category_descriptor` shape (e.g.
// `lifestyle_fitness`, `music_pop`). Keep new entries within that
// budget so the recommender's tag-vector codepaths don't choke.
const CANONICAL_TAG_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/
const MAX_TAG_LEN = 64
const MAX_ALIAS_LEN = 128

interface Body {
  alias?: unknown
  action?: unknown
  canonical_tag?: unknown
  notes?: unknown
}

export async function POST(req: Request) {
  // 1. Auth + admin gate
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json(
      { success: false, error: "unauthenticated" },
      { status: 401 },
    )
  }

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !ADMIN_ROLES.has(role.role as string)) {
    return NextResponse.json(
      { success: false, error: "forbidden" },
      { status: 403 },
    )
  }

  // 2. Parse + validate body
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_json" },
      { status: 400 },
    )
  }

  const aliasRaw = typeof body.alias === "string" ? body.alias.trim() : ""
  const action = typeof body.action === "string" ? body.action : ""
  const canonicalRaw =
    typeof body.canonical_tag === "string" ? body.canonical_tag.trim() : ""
  const notes =
    typeof body.notes === "string" && body.notes.trim().length > 0
      ? body.notes.trim().slice(0, 500)
      : null

  if (!aliasRaw || aliasRaw.length > MAX_ALIAS_LEN) {
    return NextResponse.json(
      { success: false, error: "invalid_alias" },
      { status: 400 },
    )
  }
  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json(
      { success: false, error: "invalid_action" },
      { status: 400 },
    )
  }

  // For approve_*, canonical_tag is required.
  let canonical: string | null = null
  if (action === "approve_existing" || action === "approve_new") {
    if (!canonicalRaw || canonicalRaw.length > MAX_TAG_LEN) {
      return NextResponse.json(
        { success: false, error: "invalid_canonical_tag" },
        { status: 400 },
      )
    }
    if (!CANONICAL_TAG_RE.test(canonicalRaw)) {
      return NextResponse.json(
        {
          success: false,
          error: "invalid_canonical_tag_shape",
          hint: "must match snake_case e.g. lifestyle_fitness",
        },
        { status: 400 },
      )
    }
    canonical = canonicalRaw
  }

  const nowIso = new Date().toISOString()

  // 3. Action dispatch
  if (action === "approve_existing") {
    // Verify canonical exists + is active.
    const { data: tax, error: taxErr } = await sr
      .from("interest_taxonomy")
      .select("tag, is_active")
      .eq("tag", canonical!)
      .maybeSingle()
    if (taxErr) {
      return NextResponse.json(
        { success: false, error: taxErr.message },
        { status: 500 },
      )
    }
    if (!tax || tax.is_active === false) {
      return NextResponse.json(
        { success: false, error: "canonical_tag_not_in_taxonomy" },
        { status: 400 },
      )
    }
  } else if (action === "approve_new") {
    // Insert canonical into taxonomy if missing; never touch existing rows.
    const { data: existing, error: exErr } = await sr
      .from("interest_taxonomy")
      .select("tag")
      .eq("tag", canonical!)
      .maybeSingle()
    if (exErr) {
      return NextResponse.json(
        { success: false, error: exErr.message },
        { status: 500 },
      )
    }
    if (!existing) {
      const { error: insErr } = await sr
        .from("interest_taxonomy")
        .insert({ tag: canonical!, is_active: true })
      if (insErr) {
        return NextResponse.json(
          { success: false, error: `taxonomy_insert_failed: ${insErr.message}` },
          { status: 500 },
        )
      }
    }
  }

  // 4. Upsert tag_aliases row.
  const status = action === "reject" ? "rejected" : "approved"
  // For reject the canonical_tag column still must be non-null (FK +
  // NOT NULL). We fall back to the alias itself; it has no semantic
  // meaning in the rejected case (the cron only consults approved rows).
  // If the alias somehow collides with a canonical entry, use any
  // existing canonical instead — but for now `interest_taxonomy.tag`
  // values are constrained snake_case so this is exceedingly rare.
  let canonicalForDb = canonical
  if (status === "rejected") {
    // Pick any active canonical to satisfy FK; payload is meaningless.
    if (!canonicalForDb) {
      const { data: any1 } = await sr
        .from("interest_taxonomy")
        .select("tag")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle()
      canonicalForDb = (any1?.tag as string | undefined) ?? null
    }
    if (!canonicalForDb) {
      return NextResponse.json(
        { success: false, error: "taxonomy_empty" },
        { status: 500 },
      )
    }
  }

  const { data: upserted, error: upErr } = await sr
    .from("tag_aliases")
    .upsert(
      {
        alias: aliasRaw,
        canonical_tag: canonicalForDb!,
        status,
        created_by: user.id,
        decided_by: user.id,
        decided_at: nowIso,
        notes,
        updated_at: nowIso,
      },
      { onConflict: "alias" },
    )
    .select("id, alias, canonical_tag, status")
    .maybeSingle()
  if (upErr) {
    return NextResponse.json(
      { success: false, error: `upsert_failed: ${upErr.message}` },
      { status: 500 },
    )
  }

  // 5. Audit
  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: `tag_aliases.${action}`,
    target_type: "tag_alias",
    target_id: upserted?.id ?? null,
    payload: {
      alias: aliasRaw,
      canonical_tag: canonicalForDb,
      status,
      notes,
    },
  })

  return NextResponse.json({
    success: true,
    action,
    row: upserted,
  })
}
