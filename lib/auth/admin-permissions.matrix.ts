/**
 * Admin permission matrix — PURE DATA module.
 *
 * This file MUST NOT import any server-only module (`@/lib/supabase/server`,
 * `next/headers`, …). It holds only the static capability matrix, its derived
 * types and a pure lookup helper, so it can be safely pulled into a client
 * bundle (e.g. `components/layouts/admin-sidebar.tsx`) without dragging
 * `next/headers` along and breaking the prod `/admin` build (issue #21).
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

export const VALID_ADMIN_SUB_ROLES: readonly AdminSubRole[] = [
  "super_admin",
  "admin",
  "moderator",
  "support",
] as const

// Vérifier si un rôle a une permission spécifique
export function roleHasPermission(role: AdminSubRole, permission: AdminPermission): boolean {
  const allowedRoles = ADMIN_PERMISSIONS[permission] as readonly AdminSubRole[]
  return allowedRoles?.includes(role) ?? false
}
