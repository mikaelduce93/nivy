"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Niv } from "@/components/brand"
import { toast } from "sonner"
import { Download, UserX, Loader2 } from "lucide-react"

/**
 * Conformité CNDP (#177) — export DSAR + anonymisation pour un utilisateur.
 * Branche les endpoints existants :
 *   - GET  /api/admin/users/:id/export    (inline ou signed_url)
 *   - POST /api/admin/users/:id/anonymize (irréversible → modal de confirmation)
 * Aucune route inventée ; logique serveur inchangée.
 */
export function UserAdminActions({ userId, userLabel }: { userId: string; userLabel: string }) {
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [anonymizing, setAnonymizing] = useState(false)
  const [confirmText, setConfirmText] = useState("")

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/export`)
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || "Export refusé")
      }
      if (json.mode === "signed_url" && json.download_url) {
        window.open(json.download_url, "_blank", "noopener,noreferrer")
        toast.success("Export prêt — téléchargement ouvert dans un nouvel onglet.")
      } else {
        const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `export-cndp-${userId}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success("Export CNDP téléchargé.")
      }
    } catch (e: any) {
      toast.error(e?.message || "L'export a échoué. Réessaie ?")
    } finally {
      setExporting(false)
    }
  }

  const handleAnonymize = async () => {
    setAnonymizing(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/anonymize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Anonymisation admin (CNDP)" }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json?.error || "Anonymisation refusée")
      }
      toast.success("Utilisateur anonymisé.")
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message || "L'anonymisation a échoué.")
    } finally {
      setAnonymizing(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={handleExport} disabled={exporting}>
        {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
        Exporter (CNDP)
      </Button>

      <AlertDialog onOpenChange={(open) => !open && setConfirmText("")}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="text-coral" disabled={anonymizing}>
            {anonymizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
            Anonymiser
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl border-2 border-ink bg-white">
          <AlertDialogHeader>
            <div className="mb-2 flex items-start gap-3">
              <Niv mood="calm" size={56} className="shrink-0" />
              <div>
                <AlertDialogTitle>Anonymiser cet utilisateur ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Action irréversible (Loi 09-08 / CNDP) : l'email et le nom de{" "}
                  <span className="font-semibold text-ink">{userLabel}</span> seront masqués.
                  Tape <span className="font-mono font-bold text-ink">ANONYMISER</span> pour confirmer.
                </AlertDialogDescription>
              </div>
            </div>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ANONYMISER"
              className="rounded-xl border-2 border-ink bg-white"
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-2 border-ink bg-white">Retour</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "ANONYMISER"}
              className="border-2 border-ink bg-coral text-ink hover:bg-coral"
              onClick={handleAnonymize}
            >
              Confirmer l'anonymisation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
