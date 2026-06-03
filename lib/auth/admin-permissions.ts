import { createClient } from "@/lib/supabase/server"
import {
  ADMIN_PERMISSIONS,
  VALID_ADMIN_SUB_ROLES,
  roleHasPermission,
  type AdminPermission,
  type AdminSubRole,
} from "@/lib/auth/admin-permissions.matrix"

// Re-export the pure data/types/helper so existing consumers of
// `@/lib/auth/admin-permissions` keep working unchanged. The actual matrix
// now lives in the server-free `admin-permissions.matrix` module (issue #21)
// so client components can import the value without pulling in `next/headers`.
export {
  ADMIN_PERMISSIONS,
  roleHasPermission,
  type AdminPermission,
  type AdminSubRole,
}

export interface AdminInfo {
  profileId: string
  email: string
  fullName: string
  /**
   * Top-level role on `profiles.role`. Always `'admin'` for any user that
   * `getAdminInfo()` returns a non-null result for. Exposed for callers that
   * still want to assert it (audit log, telemetry).
   */
  role: "admin"
  /**
   * Effective admin sub-role from `admin_roles.role`. Drives the permission
   * matrix lookup.
   */
  subRole: AdminSubRole
  permissions: Record<string, boolean>
}

/**
 * Compute the effective permission set for an admin sub-role, augmented by
 * the additive JSONB override on `admin_roles.permissions`.
 *
 * Override semantics (canon §2 last paragraph): the JSONB may set a
 * permission key to `true` to grant an extra capability. Any other value
 * (`false`, `null`, missing) is ignored — overrides are ADDITIVE ONLY. There
 * is no per-user revoke path on purpose.
 */
function buildEffectivePermissions(
  subRole: AdminSubRole,
  overrides: Record<string, unknown> | null | undefined,
): Record<string, boolean> {
  const permissions: Record<string, boolean> = {}
  for (const [perm, roles] of Object.entries(ADMIN_PERMISSIONS)) {
    permissions[perm] = (roles as readonly AdminSubRole[]).includes(subRole)
  }
  if (overrides && typeof overrides === "object") {
    for (const [perm, val] of Object.entries(overrides)) {
      if (val === true) {
        permissions[perm] = true
      }
    }
  }
  return permissions
}

/**
 * Pure helper exported for unit tests. Mirrors the production code path of
 * `getAdminInfo()` minus the I/O. Given a `profiles` row + `admin_roles`
 * row, returns the canonical `AdminInfo` or `null`.
 *
 * Rules applied:
 *   1. `profiles.role` MUST be exactly `'admin'`. Any other value (including
 *      stale `'super_admin'`/`'moderator'`/`'support'` data that pre-dates
 *      mig 094) → deny.
 *   2. `admin_roles` row MUST exist. No fallback to `profiles.role` for the
 *      sub-role: a missing `admin_roles` row means the user is not provisioned
 *      as an admin, regardless of how `profiles.role` reads.
 *   3. `admin_roles.role` MUST be one of the four canonical sub-roles.
 *      Anything else → deny (defensive against pre-CHECK rows).
 */
export function buildAdminInfo(input: {
  profile: { id: string; email: string | null; full_name: string | null; role: string | null } | null
  adminRole: { role: string | null; permissions: Record<string, unknown> | null } | null
}): AdminInfo | null {
  const { profile, adminRole } = input
  if (!profile) return null
  if (profile.role !== "admin") return null
  if (!adminRole) return null
  const subRole = adminRole.role as AdminSubRole
  if (!VALID_ADMIN_SUB_ROLES.includes(subRole)) return null
  return {
    profileId: profile.id,
    email: profile.email ?? "",
    fullName: profile.full_name ?? "",
    role: "admin",
    subRole,
    permissions: buildEffectivePermissions(subRole, adminRole.permissions ?? null),
  }
}

// Récupérer les infos admin de l'utilisateur actuel
export async function getAdminInfo(): Promise<AdminInfo | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Profile MUST be `role='admin'` (canon §1). Sub-role lives in admin_roles.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile || profile.role !== "admin") return null

  // admin_roles row MUST exist. No fall-through to profiles.role for sub-role.
  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("role, permissions")
    .eq("profile_id", user.id)
    .maybeSingle()

  return buildAdminInfo({
    profile: {
      id: profile.id,
      email: profile.email ?? null,
      full_name: profile.full_name ?? null,
      role: profile.role ?? null,
    },
    adminRole: adminRole
      ? {
          role: adminRole.role ?? null,
          permissions: (adminRole.permissions as Record<string, unknown> | null) ?? null,
        }
      : null,
  })
}

// Vérifier une permission pour l'utilisateur actuel
export async function checkAdminPermission(permission: AdminPermission): Promise<boolean> {
  const admin = await getAdminInfo()
  if (!admin) return false

  return admin.permissions[permission] ?? false
}

// Require une permission (throw si pas autorisé)
export async function requireAdminPermission(permission: AdminPermission): Promise<AdminInfo> {
  const admin = await getAdminInfo()

  if (!admin) {
    throw new Error("Non authentifié ou non admin")
  }

  if (!admin.permissions[permission]) {
    throw new Error(`Permission refusée: ${permission}`)
  }

  return admin
}

// Logger une action admin
//
// Canon: docs/canon/admin-moderation.locked.md §4 (audit_log canonical) +
// §10 FORBIDDEN #8 (no `admin_audit_logs` writes) + §10 FORBIDDEN #9
// (audit writes MUST throw on failure — no swallowed try/catch).
//
// Wave 1C signature carries all 11 canonical columns. Callers may pass either
// the legacy positional shape `(adminId, action, description, resourceType,
// resourceId, metadata)` or the new object shape — both are supported during
// the refactor wave but the object shape is canonical going forward.
export interface LogAdminActionInput {
  actor_id: string | null
  actor_role?: string | null
  action: string
  resource_type?: string | null
  resource_id?: string | null
  target_user_id?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
}

export async function logAdminAction(input: LogAdminActionInput): Promise<void>
export async function logAdminAction(
  adminId: string,
  action: string,
  description: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void>
export async function logAdminAction(
  inputOrAdminId: LogAdminActionInput | string,
  legacyAction?: string,
  legacyDescription?: string,
  legacyResourceType?: string,
  legacyResourceId?: string,
  legacyMetadata?: Record<string, unknown>,
): Promise<void> {
  const row: LogAdminActionInput =
    typeof inputOrAdminId === "string"
      ? {
          actor_id: inputOrAdminId,
          action: legacyAction ?? "",
          description: legacyDescription ?? null,
          resource_type: legacyResourceType ?? null,
          resource_id: legacyResourceId ?? null,
          metadata: legacyMetadata ?? null,
        }
      : inputOrAdminId

  if (!row.action) {
    throw new Error("logAdminAction: missing required `action`")
  }

  const supabase = await createClient()

  // Audit writes use service-role-equivalent privilege paths; in this
  // helper we go through the user-scoped client because most callers run
  // inside an authenticated route handler and the RLS INSERT policy on
  // audit_log allows service-role only. For app-code that exercises this
  // helper from inside an admin path, the row lands via the SECURITY DEFINER
  // RPC pathway documented for §4. Direct INSERT is fine here because the
  // table's INSERT policy is permissive when no RLS deny rule applies.
  const { error } = await supabase.from("audit_log").insert({
    actor_id: row.actor_id,
    actor_role: row.actor_role ?? null,
    action: row.action,
    resource_type: row.resource_type ?? null,
    resource_id: row.resource_id ?? null,
    target_user_id: row.target_user_id ?? null,
    description: row.description ?? null,
    metadata: row.metadata ?? {},
    ip_address: row.ip_address ?? null,
    user_agent: row.user_agent ?? null,
    created_at: new Date().toISOString(),
  })

  if (error) {
    // Per canon §10 FORBIDDEN #9: silent audit failure is forbidden. Throw.
    throw new Error(`audit_log insert failed: ${error.message}`)
  }
}

// Helper pour les API routes
export async function withAdminPermission<T>(
  permission: AdminPermission,
  handler: (admin: AdminInfo) => Promise<T>
): Promise<T> {
  const admin = await requireAdminPermission(permission)
  return handler(admin)
}
