import { checkAdminPermission } from "@/lib/auth/admin-permissions"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StatCard } from "@/components/admin/stat-card"
import { StickerCard } from "@/components/ui/sticker-card"
import { CheckRound } from "@/components/ui/check-round"
import { PermissionsLists } from "@/components/admin/permissions-lists"
import BackButton from "@/components/admin/BackButton"
import { ShieldCheck, Users, Crown, UserCog } from "lucide-react"

async function getAdminUsers() {
  const supabase = await createClient()

  // Wave 1A.5 — AUTH-011: profiles.role is exclusively 'admin' for admin
  // users. Sub-role lives on admin_roles.role. The previous
  // `.in("role", ["admin","super_admin","moderator","support"])` query is
  // structurally invalid post-mig-094 (the CHECK constraint rejects the
  // last three values). Read the join from admin_roles instead.
  const { data: rows, error } = await supabase
    .from("admin_roles")
    .select(
      "role, profile:profiles!admin_roles_profile_id_fkey(id, full_name, email, created_at)"
    )
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching admins:", error)
    return []
  }

  // Flatten so the existing render logic that reads `admin.role`,
  // `admin.full_name`, etc. keeps working — but now `role` carries the
  // sub-role from admin_roles, not the (always 'admin') profiles.role.
  return (rows || [])
    .map((r) => {
      const profile = (r as { profile: unknown }).profile as
        | { id: string; full_name: string | null; email: string | null; created_at: string | null }
        | null
      if (!profile) return null
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        created_at: profile.created_at,
        role: (r as { role: string }).role,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
}

async function getAllUsers() {
  const supabase = await createClient()

  // Get all users for potential role changes
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching users:", error)
    return []
  }

  return users || []
}

export default async function AdminPermissionsPage() {
  // Only super_admin can access permissions management
  const canManagePermissions = await checkAdminPermission("system.permissions")

  if (!canManagePermissions) {
    redirect("/admin")
  }

  const admins = await getAdminUsers()
  const allUsers = await getAllUsers()

  const roles = [
    {
      name: "Super Admin",
      value: "super_admin",
      tone: "coral" as const, // charte : accent coral (plus de rouge hors-palette)
      icon: <Crown className="h-5 w-5" />,
      count: admins.filter((a: any) => a.role === "super_admin").length,
    },
    {
      name: "Admin",
      value: "admin",
      tone: "paper" as const,
      icon: <ShieldCheck className="h-5 w-5" />,
      count: admins.filter((a: any) => a.role === "admin").length,
    },
    {
      name: "Modérateur",
      value: "moderator",
      tone: "teal" as const,
      icon: <UserCog className="h-5 w-5" />,
      count: admins.filter((a: any) => a.role === "moderator").length,
    },
    {
      name: "Support",
      value: "support",
      tone: "lime" as const,
      icon: <Users className="h-5 w-5" />,
      count: admins.filter((a: any) => a.role === "support").length,
    },
  ]

  const roleLabel: Record<string, string> = roles.reduce(
    (acc, r) => ({ ...acc, [r.value]: r.name }),
    {} as Record<string, string>
  )

  // Matrice STATIQUE / ILLUSTRATIVE — les droits réels sont calculés serveur
  // (lib/auth/admin-permissions). Ce tableau documente la grille indicative ;
  // le rendre dynamique est hors périmètre iso de cette refonte.
  const matrix = [
    { name: "Voir dashboard", permissions: [true, true, true, true] },
    { name: "Gérer utilisateurs", permissions: [true, true, true, false] },
    { name: "Gérer events", permissions: [true, true, true, false] },
    { name: "Gérer partenaires", permissions: [true, true, false, false] },
    { name: "Voir statistiques", permissions: [true, true, true, true] },
    { name: "Gérer permissions", permissions: [true, false, false, false] },
    { name: "Supprimer données", permissions: [true, true, false, false] },
    { name: "Accès API", permissions: [true, true, false, false] },
    { name: "Support tickets", permissions: [true, true, true, true] },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        <BackButton href="/admin" label="Retour au dashboard" />

        {/* Header */}
        <header className="mb-8 space-y-2">
          <p className="eyebrow">Système · Accès</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Gestion des <em className="font-semibold italic text-pink">permissions</em>
          </h1>
          <p className="text-mute">Gérez les rôles et accès des utilisateurs.</p>
        </header>

        {/* Role Overview */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {roles.map((role) => (
            <StatCard
              key={role.value}
              label={role.name}
              value={role.count}
              tone={role.tone}
              icon={role.icon}
            />
          ))}
        </div>

        {/* Permissions Matrix — statique/illustrative */}
        <StickerCard className="mb-8 gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-pink" />
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                Matrice des permissions
              </h2>
            </div>
            <span className="rounded-full border-2 border-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
              Indicative
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="px-4 py-3 text-left">
                    <span className="eyebrow tracking-[0.14em] text-mute">Permission</span>
                  </th>
                  {roles.map((role) => (
                    <th key={role.value} className="px-4 py-3 text-center">
                      <span className="eyebrow tracking-[0.12em] text-mute">{role.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, index) => (
                  <tr key={index} className="border-b-2 border-ink/10">
                    <td className="px-4 py-3 text-ink">{row.name}</td>
                    {row.permissions.map((hasPermission, i) => (
                      <td key={i} className="px-4 py-3">
                        <span className="flex justify-center">
                          {hasPermission ? (
                            <CheckRound checked disabled aria-label="Autorisé" />
                          ) : (
                            <span
                              aria-label="Non autorisé"
                              className="inline-block h-6 w-6 rounded-full border-2 border-ink/25 bg-paper-2"
                            />
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StickerCard>

        {/* Listes (équipe admin / utilisateurs) */}
        <PermissionsLists admins={admins} allUsers={allUsers} roleLabel={roleLabel} />
      </div>
    </div>
  )
}
