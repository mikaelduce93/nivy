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

  // Get all admin/staff users
  const { data: admins, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["admin", "super_admin", "moderator", "support"])
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching admins:", error)
    return []
  }

  return admins || []
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
      color: "from-red-500/20 to-orange-500/20",
      borderColor: "border-red-500/30",
      textColor: "text-red-400",
      icon: Crown,
      count: admins.filter((a: any) => a.role === "super_admin").length
    },
    {
      name: "Admin",
      value: "admin",
      description: "Gestion complète sauf permissions",
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-500/30",
      textColor: "text-purple-400",
      icon: ShieldCheck,
      count: admins.filter((a: any) => a.role === "admin").length
    },
    {
      name: "Modérateur",
      value: "moderator",
      description: "Modération du contenu et utilisateurs",
      color: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/30",
      textColor: "text-blue-400",
      icon: UserCog,
      count: admins.filter((a: any) => a.role === "moderator").length
    },
    {
      name: "Support",
      value: "support",
      description: "Accès au support client",
      color: "from-emerald-500/20 to-green-500/20",
      borderColor: "border-emerald-500/30",
      textColor: "text-emerald-400",
      icon: Users,
      count: admins.filter((a: any) => a.role === "support").length
    }
  ]

  const getRoleBadge = (role: string) => {
    const roleInfo = roles.find(r => r.value === role)
    if (!roleInfo) return "bg-zinc-500/20 text-zinc-400"
    return `bg-gradient-to-r ${roleInfo.color} ${roleInfo.textColor}`
  }

  const getRoleLabel = (role: string) => {
    const roleInfo = roles.find(r => r.value === role)
    return roleInfo?.name || role
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Gestion des Permissions</h1>
            <p className="text-zinc-400">Gérez les rôles et accès des utilisateurs</p>
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter Admin
          </Button>
        </div>

        {/* Role Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {roles.map((role) => (
            <Card key={role.value} className={`bg-gradient-to-br ${role.color} ${role.borderColor} bg-zinc-900`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${role.textColor} font-medium`}>{role.name}</p>
                    <p className="text-3xl font-black text-white">{role.count}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-full bg-zinc-900/50 flex items-center justify-center`}>
                    <role.icon className={`h-6 w-6 ${role.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Permissions Matrix */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-400" />
              Matrice des Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Permission</th>
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
                    <tr key={index} className="border-b border-zinc-800/50">
                      <td className="py-3 px-4 text-white">{row.name}</td>
                      {row.permissions.map((hasPermission, i) => (
                        <td key={i} className="text-center py-3 px-4">
                          {hasPermission ? (
                            <span className="inline-block h-4 w-4 rounded-full bg-emerald-500" />
                          ) : (
                            <span className="inline-block h-4 w-4 rounded-full bg-zinc-700" />
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
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <UserCog className="h-5 w-5 text-emerald-400" />
              Équipe Administrative
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300">
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
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                        {admin.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{admin.full_name}</p>
                        <p className="text-xs text-zinc-400">{admin.email}</p>
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
                <UserCog className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
                <h3 className="text-xl font-bold text-white mb-2">Aucun admin</h3>
                <p className="text-zinc-400">Ajoutez des administrateurs pour commencer</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Users with Role Selector */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Tous les Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allUsers.length > 0 ? (
              <div className="space-y-2">
                {allUsers.slice(0, 10).map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-medium">
                        {user.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{user.full_name || "Sans nom"}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
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
              <p className="text-center text-zinc-500 py-8">Aucun utilisateur trouvé</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
