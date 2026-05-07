import { createClient } from "@/lib/supabase/server"

export type UserRole = "parent" | "teen" | "ambassador" | "admin" | "super_admin" | "moderator" | "support" | "partner" | "mentor" | "unknown"

export interface UserRoleInfo {
  role: UserRole
  subRole?: string // Pour admin: super_admin, admin, moderator, support
  profileId: string
  email: string
  fullName: string
  // Données spécifiques selon le rôle
  teenData?: {
    id: string
    level: number
    title: string
    titleIcon: string
    coins: number
    parentId?: string
    avatar_url?: string
  }
  parentData?: {
    subscriptionTier: string
    teenCount: number
  }
  ambassadorData?: {
    commissionRate: number
    status: string
  }
  partnerData?: {
    id: string
    companyName: string
    partnerType: string
  }
  mentorData?: {
    id: string
    status: string
    kycStatus: string
    expertiseTags: string[]
    rating: number | null
    sessionsCount: number
  }
  adminData?: {
    role: string
    permissions: Record<string, boolean>
  }
}

export async function getUserRole(): Promise<UserRoleInfo | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Récupérer le profil de base
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle()

  if (profileError || !profile) return null

  const baseInfo: UserRoleInfo = {
    role: profile.role as UserRole || "unknown",
    profileId: profile.id,
    email: profile.email,
    fullName: profile.full_name || "",
  }

  // Enrichir selon le rôle
  try {
    switch (profile.role) {
      case "teen": {
        const { data: teenData } = await supabase
          .from("teen_full_profile")
          .select("*")
          .eq("id", user.id)
          .limit(1)
          .maybeSingle()

        if (teenData) {
          baseInfo.teenData = {
            id: teenData.id || user.id,
            level: teenData.level || 1,
            title: teenData.title || "Rookie",
            titleIcon: teenData.title_icon || "🌱",
            coins: teenData.coins_balance || 0,
            parentId: teenData.primary_parent_id,
          }
        }
        break
      }

      case "parent": {
      // Récupérer l'abonnement et le nombre de teens.
      //
      // Source of truth: parent_subscription_view (migration 063), which
      // joins family_subscriptions.owner_id -> user_subscriptions ->
      // subscription_plans.tier. The previous implementation queried
      // `family_subscriptions.tier` / `parent_id` / `status` — none of
      // those columns exist on that table, so the query silently failed
      // and every parent was rendered as "free". See P2.3 inventory.
      const { data: subscription } = await supabase
        .from("parent_subscription_view")
        .select("tier")
        .eq("parent_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle()

      const { count: teenCount } = await supabase
        .from("parent_teen_links")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", user.id)
        .eq("status", "active")

      baseInfo.parentData = {
        subscriptionTier: subscription?.tier || "free",
        teenCount: teenCount || 0,
      }
      break
      }

      case "ambassador": {
      const { data: ambassadorData } = await supabase
        .from("ambassadors")
        .select("commission_rate, status")
        .eq("profile_id", user.id)
        .single()

      if (ambassadorData) {
        baseInfo.ambassadorData = {
          commissionRate: ambassadorData.commission_rate || 0,
          status: ambassadorData.status || "pending",
        }
      }
      break
      }

      case "partner": {
      const { data: partnerData } = await supabase
        .from("partners")
        .select("id, company_name, partner_type")
        .eq("email", profile.email)
        .single()

      if (partnerData) {
        baseInfo.partnerData = {
          id: partnerData.id,
          companyName: partnerData.company_name,
          partnerType: partnerData.partner_type,
        }
      }
      break
      }

      case "mentor": {
        const { data: mentorData } = await supabase
          .from("mentors")
          .select("id, status, kyc_status, expertise_tags, rating, sessions_count")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle()

        if (mentorData) {
          baseInfo.mentorData = {
            id: mentorData.id,
            status: mentorData.status || "pending",
            kycStatus: mentorData.kyc_status || "pending",
            expertiseTags: mentorData.expertise_tags || [],
            rating: mentorData.rating,
            sessionsCount: mentorData.sessions_count || 0,
          }
        }
        break
      }

      case "admin": {
        const { data: adminRole } = await supabase
          .from("admin_roles")
          .select("role, permissions")
          .eq("profile_id", user.id)
          .single()

        if (adminRole) {
          baseInfo.subRole = adminRole.role
          baseInfo.adminData = {
            role: adminRole.role,
            permissions: adminRole.permissions || {},
          }
        }
        break
      }
    }
  } catch (error) {
    console.error("Error enriching user role info:", error)
  }

  return baseInfo
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "teen":
      return "/teen"
    case "parent":
      return "/parent"
    case "ambassador":
      return "/ambassador"
    case "partner":
      return "/partner"
    case "mentor":
      return "/mentor/dashboard"
    case "admin":
      return "/admin"
    default:
      return "/dashboard" // Fallback
  }
}

export function canAccessRoute(userRole: UserRole, path: string): boolean {
  // Routes par rôle
  const roleRoutes: Record<UserRole, string[]> = {
    teen: ["/teen", "/events", "/gamification", "/profile"],
    parent: ["/parent", "/events", "/profile", "/mes-"],
    ambassador: ["/ambassador", "/profile"],
    partner: ["/partner", "/profile"],
    mentor: ["/mentor", "/profile"],
    admin: ["/admin", "/profile"],
    super_admin: ["/admin", "/profile"],
    moderator: ["/admin", "/profile"],
    support: ["/admin", "/profile"],
    unknown: ["/profile"],
  }

  const allowedPrefixes = roleRoutes[userRole] || []
  return allowedPrefixes.some((prefix) => path.startsWith(prefix))
}
