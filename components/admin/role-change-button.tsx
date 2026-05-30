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
            className="h-8 w-8 p-0 text-mute hover:text-ink"
          >
            <Settings className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="border-ink text-ink-2 hover:border-lime/50 hover:text-lime"
          >
            <Settings className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-ink">
        <DialogHeader>
          <DialogTitle className="text-ink">Modifier le rôle</DialogTitle>
          <DialogDescription className="text-mute">
            Changez le rôle de {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <label className="text-sm text-ink-2">Nouveau rôle</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="bg-card border-ink text-ink">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-ink">
                {roleOptions.map((role) => (
                  <SelectItem
                    key={role.value}
                    value={role.value}
                    className="text-ink hover:bg-muted focus:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <span>{role.label}</span>
                      {role.value === currentRole && (
                        <span className="text-xs text-lime">(actuel)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-mute">
              {roleOptions.find(r => r.value === selectedRole)?.description}
            </p>
          </div>

          {selectedRole !== currentRole && (
            <div className="p-4 bg-gold/10 border border-gold/20 rounded-xl">
              <p className="text-sm text-gold">
                Attention: Changer le rôle affectera immédiatement les accès de cet utilisateur.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-ink text-ink-2"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || selectedRole === currentRole}
              className="flex-1 bg-lime hover:bg-lime text-ink"
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
