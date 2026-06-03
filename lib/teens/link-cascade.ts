/**
 * V11 #301 — factored parent↔teen linking cascade (B6).
 *
 * Single source of truth for moving `parent_teen_links` to `active` (or
 * creating a `pending` request), with notifications written to the REAL tables
 * (`user_notifications` title/body/is_read/data + `audit_log`) — never the
 * non-existent `notifications`/`activity_logs`. Reused by:
 *   - B3 `/api/parent/link-teen/scan` (parent scans teen QR → active)
 *   - B5 `/api/teen/link-parent` (teen consumes parent code → active)
 *   - the legacy parent-request path (`/api/parent/teens` POST → pending)
 *
 * Atomicity: the link row is upserted on the (parent_id, teen_id) unique index
 * (migration 160) so concurrent calls converge on one row. Notifications/audit
 * are best-effort follow-ups (non-fatal), matching the existing cascade style.
 *
 * Server-only — expects a service-role client (parent_teen_links and
 * user_notifications have no client INSERT policy).
 */
import "server-only"

export type LinkChannel =
  | "qr_teen_to_parent"
  | "code_parent_to_teen"
  | "parent_request"
  | "email_validation"

type ServiceClient = { from: (table: string) => any }

export interface LinkCascadeInput {
  parentId: string
  teenId: string
  status?: "active" | "pending"
  channel: LinkChannel
  /** Who triggered the action (for audit_log.actor_id). Defaults to parentId. */
  actorId?: string
  actorRole?: "parent" | "teen"
}

export type LinkCascadeResult =
  | { ok: true; status: "active" | "pending"; alreadyActive: boolean; linkId: string }
  | { ok: false; reason: string }

export async function linkParentTeen(
  sr: ServiceClient,
  input: LinkCascadeInput,
): Promise<LinkCascadeResult> {
  const status = input.status ?? "active"
  const { parentId, teenId, channel } = input

  // 0. Short-circuit if already active (idempotent, avoids redundant notifs).
  const { data: existing } = await sr
    .from("parent_teen_links")
    .select("id, status")
    .eq("parent_id", parentId)
    .eq("teen_id", teenId)
    .maybeSingle()

  if (existing?.status === "active") {
    return { ok: true, status: "active", alreadyActive: true, linkId: existing.id }
  }

  // 1. Atomic upsert on the (parent_id, teen_id) unique index (mig 160).
  const { data: link, error: upsertErr } = await sr
    .from("parent_teen_links")
    .upsert(
      { parent_id: parentId, teen_id: teenId, status, created_at: new Date().toISOString() },
      { onConflict: "parent_id,teen_id" },
    )
    .select("id, status")
    .single()

  if (upsertErr || !link) {
    return { ok: false, reason: upsertErr?.message ?? "link_upsert_failed" }
  }

  // 2. Resolve names (best-effort) for friendlier notification copy.
  const [{ data: teenRow }, { data: parentRow }] = await Promise.all([
    sr.from("teens").select("first_name, pseudo").eq("id", teenId).maybeSingle(),
    sr.from("profiles").select("full_name").eq("id", parentId).maybeSingle(),
  ])
  const teenLabel = teenRow?.pseudo || teenRow?.first_name || "ton ado"
  const parentLabel = parentRow?.full_name || "Ton parent"

  // 3. Notifications on the REAL table (user_notifications).
  const notifs =
    status === "active"
      ? [
          {
            user_id: teenId,
            title: "Compte lié à ton parent ✅",
            body: `${parentLabel} est maintenant lié à ton compte.`,
            is_read: false,
            data: { type: "parent_link_active", parent_id: parentId, channel },
          },
          {
            user_id: parentId,
            title: "Liaison confirmée",
            body: `Tu es maintenant lié à ${teenLabel}.`,
            is_read: false,
            data: { type: "teen_link_active", teen_id: teenId, channel },
          },
        ]
      : [
          {
            user_id: teenId,
            title: "Demande de liaison parentale",
            body: `${parentLabel} souhaite se lier à ton compte.`,
            is_read: false,
            data: { type: "parent_link_request", parent_id: parentId, channel },
          },
        ]

  const { error: notifErr } = await sr.from("user_notifications").insert(notifs)
  if (notifErr) console.error("[link-cascade] user_notifications insert failed:", notifErr.message)

  // 4. Audit (singular table).
  const { error: auditErr } = await sr.from("audit_log").insert({
    actor_id: input.actorId ?? parentId,
    actor_role: input.actorRole ?? "parent",
    action: `parent_teen_link.${status}`,
    resource_type: "parent_teen_link",
    resource_id: link.id,
    target_user_id: teenId,
    description: `Parent-teen link ${status} via ${channel}`,
    metadata: { parent_id: parentId, teen_id: teenId, channel },
  })
  if (auditErr) console.error("[link-cascade] audit_log insert failed:", auditErr.message)

  return { ok: true, status: link.status, alreadyActive: false, linkId: link.id }
}
