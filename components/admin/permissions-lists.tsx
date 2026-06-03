"use client"

import * as React from "react"
import { StickerCard } from "@/components/ui/sticker-card"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { RoleChangeButton } from "@/components/admin/role-change-button"

type AdminRow = {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

type UserRow = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
}

interface PermissionsListsProps {
  admins: AdminRow[]
  allUsers: UserRow[]
  /** Libellé FR du rôle pour la pill (calculé côté serveur). */
  roleLabel: Record<string, string>
}

/**
 * PermissionsLists — bascule sticker entre « Équipe admin » et « Tous les
 * utilisateurs ». Présentation seule : les lignes réutilisent `RoleChangeButton`
 * (fetch PATCH /api/admin/permissions inchangé).
 */
export function PermissionsLists({ admins, allUsers, roleLabel }: PermissionsListsProps) {
  const [tab, setTab] = React.useState<"admins" | "users">("admins")

  const RolePill = ({ role }: { role: string }) => (
    <span className="rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
      {roleLabel[role] || role}
    </span>
  )

  return (
    <div className="space-y-4">
      <StickerTabs
        ariaLabel="Listes d'accès"
        value={tab}
        onValueChange={(v) => setTab(v as "admins" | "users")}
        tabs={[
          { value: "admins", label: "Équipe admin", badge: admins.length },
          { value: "users", label: "Utilisateurs", badge: allUsers.length },
        ]}
      />

      {tab === "admins" ? (
        <StickerCard className="gap-3 p-6">
          {admins.length > 0 ? (
            admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between rounded-xl border-2 border-ink bg-white p-4 shadow-stkr-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-ink bg-paper-2 font-display font-extrabold text-ink">
                    {admin.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{admin.full_name}</p>
                    <p className="font-mono text-xs text-mute">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RolePill role={admin.role} />
                  <RoleChangeButton
                    userId={admin.id}
                    currentRole={admin.role}
                    userName={admin.full_name ?? ""}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-mute">Aucun admin pour le moment.</p>
          )}
        </StickerCard>
      ) : (
        <StickerCard className="gap-2 p-6">
          {allUsers.length > 0 ? (
            allUsers.slice(0, 10).map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl border-2 border-ink bg-white p-3 shadow-stkr-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-paper-2 font-display font-bold text-ink">
                    {user.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{user.full_name || "Sans nom"}</p>
                    <p className="font-mono text-xs text-mute">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RolePill role={user.role || "user"} />
                  <RoleChangeButton
                    userId={user.id}
                    currentRole={user.role || "user"}
                    userName={user.full_name ?? ""}
                    compact
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-mute">Aucun utilisateur trouvé.</p>
          )}
        </StickerCard>
      )}
    </div>
  )
}

export default PermissionsLists
