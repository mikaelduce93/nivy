import { createClient } from "@/lib/supabase/server"

// Définition des permissions par action
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
export type AdminRole = "super_admin" | "admin" | "moderator" | "support"

export interface AdminInfo {
  profileId: string
  email: string
  fullName: string
  role: AdminRole
  permissions: Record<string, boolean>
}

// Vérifier si un rôle a une permission spécifique
export function roleHasPermission(role: AdminRole, permission: AdminPermission): boolean {
  const allowedRoles = ADMIN_PERMISSIONS[permission] as readonly AdminRole[]
  return allowedRoles?.includes(role) ?? false
}

// Récupérer les infos admin de l'utilisateur actuel
export async function getAdminInfo(): Promise<AdminInfo | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Récupérer le profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single()

  if (!profile) return null

  // Vérifier que c'est un admin
  const adminRoles = ["super_admin", "admin", "moderator", "support"]
  if (!adminRoles.includes(profile.role)) return null

  // Récupérer les permissions custom depuis admin_roles si elles existent
  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("role, permissions")
    .eq("profile_id", user.id)
    .single()

  const role = (adminRole?.role || profile.role) as AdminRole

  // Calculer toutes les permissions basées sur le rôle
  const permissions: Record<string, boolean> = {}
  for (const [perm, roles] of Object.entries(ADMIN_PERMISSIONS)) {
    permissions[perm] = (roles as readonly AdminRole[]).includes(role)
  }

  // Fusionner avec les permissions custom
  if (adminRole?.permissions) {
    Object.assign(permissions, adminRole.permissions)
  }

  return {
    profileId: profile.id,
    email: profile.email,
    fullName: profile.full_name || "",
    role,
    permissions,
  }
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
export async function logAdminAction(
  adminId: string,
  action: string,
  description: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const supabase = await createClient()

  await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
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
