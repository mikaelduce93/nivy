"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Settings, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface RoleChangeButtonProps {
  userId: string
  currentRole: string
  userName: string
  compact?: boolean
}

const roleOptions = [
  { value: "user", label: "Utilisateur", description: "Accès standard" },
  { value: "teen", label: "Teen", description: "Compte adolescent" },
  { value: "parent", label: "Parent", description: "Compte parent" },
  { value: "partner", label: "Partenaire", description: "Partenaire commercial" },
  { value: "ambassador", label: "Ambassadeur", description: "Programme ambassadeur" },
  { value: "support", label: "Support", description: "Support client" },
  { value: "moderator", label: "Modérateur", description: "Modération contenu" },
  { value: "admin", label: "Admin", description: "Administration" },
  { value: "super_admin", label: "Super Admin", description: "Accès complet" },
]

export function RoleChangeButton({
  userId,
  currentRole,
  userName,
  compact = false
}: RoleChangeButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState(currentRole)

  const handleSave = async () => {
    if (selectedRole === currentRole) {
      setOpen(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          newRole: selectedRole,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Rôle de ${userName} mis à jour`)
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour")
      }
    } catch (error) {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400"
          >
            <Settings className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Modifier le rôle</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Changez le rôle de {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <label className="text-sm text-zinc-300">Nouveau rôle</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {roleOptions.map((role) => (
                  <SelectItem
                    key={role.value}
                    value={role.value}
                    className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                  >
                    <div className="flex items-center gap-2">
                      <span>{role.label}</span>
                      {role.value === currentRole && (
                        <span className="text-xs text-emerald-400">(actuel)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">
              {roleOptions.find(r => r.value === selectedRole)?.description}
            </p>
          </div>

          {selectedRole !== currentRole && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-sm text-amber-400">
                Attention: Changer le rôle affectera immédiatement les accès de cet utilisateur.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-zinc-700 text-zinc-300"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || selectedRole === currentRole}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
