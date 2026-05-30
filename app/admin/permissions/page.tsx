import { getAdminInfo, checkAdminPermission } from "@/lib/auth/admin-permissions"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ShieldCheck,
  Users,
  Crown,
  UserCog,
  ArrowLeft,
  Search,
  Filter,
  Plus
} from "lucide-react"
import Link from "next/link"
import { RoleChangeButton } from "@/components/admin/role-change-button"

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
      description: "Accès complet à toutes les fonctionnalités",
      color: "from-destructive/20 to-coral/20",
      borderColor: "border-destructive/30",
      textColor: "text-destructive",
      icon: Crown,
      count: admins.filter((a: any) => a.role === "super_admin").length
    },
    {
      name: "Admin",
      value: "admin",
      description: "Gestion complète sauf permissions",
      color: "from-pink/20 to-pink/20",
      borderColor: "border-pink/30",
      textColor: "text-pink",
      icon: ShieldCheck,
      count: admins.filter((a: any) => a.role === "admin").length
    },
    {
      name: "Modérateur",
      value: "moderator",
      description: "Modération du contenu et utilisateurs",
      color: "from-teal/20 to-teal/20",
      borderColor: "border-teal/30",
      textColor: "text-teal",
      icon: UserCog,
      count: admins.filter((a: any) => a.role === "moderator").length
    },
    {
      name: "Support",
      value: "support",
      description: "Accès au support client",
      color: "from-lime/20 to-lime/20",
      borderColor: "border-lime/30",
      textColor: "text-lime",
      icon: Users,
      count: admins.filter((a: any) => a.role === "support").length
    }
  ]

  const getRoleBadge = (role: string) => {
    const roleInfo = roles.find(r => r.value === role)
    if (!roleInfo) return "bg-muted text-mute"
    return `bg-gradient-to-r ${roleInfo.color} ${roleInfo.textColor}`
  }

  const getRoleLabel = (role: string) => {
    const roleInfo = roles.find(r => r.value === role)
    return roleInfo?.name || role
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink">Gestion des Permissions</h1>
            <p className="text-mute">Gérez les rôles et accès des utilisateurs</p>
          </div>
          <Button className="bg-lime hover:bg-lime text-ink">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter Admin
          </Button>
        </div>

        {/* Role Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {roles.map((role) => (
            <Card key={role.value} className={`bg-gradient-to-br ${role.color} ${role.borderColor} bg-card`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${role.textColor} font-medium`}>{role.name}</p>
                    <p className="text-3xl font-black text-ink">{role.count}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-full bg-card flex items-center justify-center`}>
                    <role.icon className={`h-6 w-6 ${role.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Permissions Matrix */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink mb-8">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-pink" />
              Matrice des Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ink">
                    <th className="text-left py-3 px-4 text-mute font-medium">Permission</th>
                    {roles.map((role) => (
                      <th key={role.value} className="text-center py-3 px-4">
                        <span className={`text-xs font-medium ${role.textColor}`}>{role.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Voir dashboard", permissions: [true, true, true, true] },
                    { name: "Gérer utilisateurs", permissions: [true, true, true, false] },
                    { name: "Gérer events", permissions: [true, true, true, false] },
                    { name: "Gérer partenaires", permissions: [true, true, false, false] },
                    { name: "Voir statistiques", permissions: [true, true, true, true] },
                    { name: "Gérer permissions", permissions: [true, false, false, false] },
                    { name: "Supprimer données", permissions: [true, true, false, false] },
                    { name: "Accès API", permissions: [true, true, false, false] },
                    { name: "Support tickets", permissions: [true, true, true, true] },
                  ].map((row, index) => (
                    <tr key={index} className="border-b border-ink">
                      <td className="py-3 px-4 text-ink">{row.name}</td>
                      {row.permissions.map((hasPermission, i) => (
                        <td key={i} className="text-center py-3 px-4">
                          {hasPermission ? (
                            <span className="inline-block h-4 w-4 rounded-full bg-lime" />
                          ) : (
                            <span className="inline-block h-4 w-4 rounded-full bg-muted" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Admin Users List */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-ink flex items-center gap-2">
              <UserCog className="h-5 w-5 text-lime" />
              Équipe Administrative
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-ink text-ink-2">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="border-ink text-ink-2">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {admins.length > 0 ? (
              <div className="space-y-3">
                {admins.map((admin: any) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-ink hover:border-ink transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-lime to-teal flex items-center justify-center text-ink font-bold">
                        {admin.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-ink">{admin.full_name}</p>
                        <p className="text-xs text-mute">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${getRoleBadge(admin.role)}`}>
                        {getRoleLabel(admin.role)}
                      </span>
                      <RoleChangeButton
                        userId={admin.id}
                        currentRole={admin.role}
                        userName={admin.full_name}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserCog className="h-16 w-16 mx-auto mb-4 text-ink" />
                <h3 className="text-xl font-bold text-ink mb-2">Aucun admin</h3>
                <p className="text-mute">Ajoutez des administrateurs pour commencer</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Users with Role Selector */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <Users className="h-5 w-5 text-teal" />
              Tous les Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allUsers.length > 0 ? (
              <div className="space-y-2">
                {allUsers.slice(0, 10).map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-card border border-ink"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-card flex items-center justify-center text-mute font-medium">
                        {user.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-ink text-sm">{user.full_name || "Sans nom"}</p>
                        <p className="text-xs text-mute">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-card text-mute">
                        {user.role || "user"}
                      </span>
                      <RoleChangeButton
                        userId={user.id}
                        currentRole={user.role || "user"}
                        userName={user.full_name}
                        compact
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-mute py-8">Aucun utilisateur trouvé</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
