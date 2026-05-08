import { createClient } from "@/lib/supabase/server"

/**
 * Admin permission matrix.
 *
 * Source of truth: docs/canon/roles-permissions.locked.md §2 capability matrix.
 *
 * Two enums are at play here and they MUST NOT be confused:
 *   - `profiles.role` — top-level identity. For any admin user this column
 *     is exclusively `'admin'` (canon §1, enforced by mig 094 CHECK).
 *   - `admin_roles.role` — admin sub-role: `super_admin | admin | moderator |
 *     support`. This is what the capability matrix below keys on.
 *
 * `admin_roles.permissions` JSONB is an ADDITIVE per-user override grant
 * (canon §2 last paragraph). It can grant extra permissions but MUST NEVER
 * revoke a baseline capability — there's no UI to manage a deny override.
 */
export const ADMIN_PERMISSIONS = {
  // Dashboard
  "dashboard.view": ["super_admin", "admin", "moderator", "support"],

  // Users
  "users.view": ["super_admin", "admin", "moderator", "support"],
  "users.edit": ["super_admin", "admin", "moderator"],
  "users.delete": ["super_admin", "admin"],
  "users.change_role": ["super_admin"],

  // Events
  "events.view": ["super_admin", "admin", "moderator", "support"],
  "events.create": ["super_admin", "admin", "moderator"],
  "events.edit": ["super_admin", "admin", "moderator"],
  "events.delete": ["super_admin", "admin"],
  "events.publish": ["super_admin", "admin"],

  // Partners
  "partners.view": ["super_admin", "admin", "moderator"],
  "partners.create": ["super_admin", "admin"],
  "partners.edit": ["super_admin", "admin"],
  "partners.delete": ["super_admin"],
  "partners.approve": ["super_admin", "admin"],

  // Ambassadors
  "ambassadors.view": ["super_admin", "admin", "moderator"],
  "ambassadors.approve": ["super_admin", "admin"],
  "ambassadors.reject": ["super_admin", "admin"],
  "ambassadors.manage_rewards": ["super_admin", "admin"],

  // Analytics
  "analytics.view": ["super_admin", "admin", "moderator"],
  "analytics.export": ["super_admin", "admin"],
  "analytics.financial": ["super_admin"],

  // Reservations
  "reservations.view": ["super_admin", "admin", "moderator", "support"],
  "reservations.checkin": ["super_admin", "admin", "moderator", "support"],
  "reservations.cancel": ["super_admin", "admin", "moderator"],
  "reservations.refund": ["super_admin", "admin"],

  // Content
  "content.view": ["super_admin", "admin", "moderator"],
  "content.generate": ["super_admin", "admin"],
  "content.publish": ["super_admin", "admin"],

  // System
  "system.logs": ["super_admin", "admin"],
  "system.settings": ["super_admin"],
  "system.sql": ["super_admin"],
  "system.migrations": ["super_admin"],
  "system.permissions": ["super_admin"],

  // Support
  "support.tickets": ["super_admin", "admin", "moderator", "support"],
  "support.reply": ["super_admin", "admin", "moderator", "support"],
} as const

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS

/**
 * Sub-role values that may live in `admin_roles.role`.
 *
 * IMPORTANT: these are NOT valid `profiles.role` values. The DB CHECK in
 * mig 094 rejects them (canon §1 + §6 FORBIDDEN #9 in roles-permissions).
 */
export type AdminSubRole = "super_admin" | "admin" | "moderator" | "support"

const VALID_ADMIN_SUB_ROLES: readonly AdminSubRole[] = [
  "super_admin",
  "admin",
  "moderator",
  "support",
] as const

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

// Vérifier si un rôle a une permission spécifique
export function roleHasPermission(role: AdminSubRole, permission: AdminPermission): boolean {
  const allowedRoles = ADMIN_PERMISSIONS[permission] as readonly AdminSubRole[]
  return allowedRoles?.includes(role) ?? false
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
// Canon: docs/canon/INDEX.locked.md cross-cut #7 + admin-moderation §4 —
// `audit_log` (singular) wins. The legacy `admin_audit_logs` table is
// deprecated and lint-banned (CANON-AUDIT-001/002).
export async function logAdminAction(
  adminId: string,
  action: string,
  description: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = await createClient()

  await supabase.from("audit_log").insert({
    actor_id: adminId,
    action,
    description,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata,
    ip_address: null, // Would need to get from request headers
    user_agent: null,
    created_at: new Date().toISOString(),
  })
}

// Helper pour les API routes
export async function withAdminPermission<T>(
  permission: AdminPermission,
  handler: (admin: AdminInfo) => Promise<T>
): Promise<T> {
  const admin = await requireAdminPermission(permission)
  return handler(admin)
}
