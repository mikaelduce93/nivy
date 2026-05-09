"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PauseCircle, PlayCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  allowanceId: string
  isPaused: boolean
}

export function AllowanceRowActions({ allowanceId, isPaused }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Wave 4B — sonner toast replaces alert(); destructive Delete uses a
  // proper Dialog instead of native confirm() (canon §0 forbidden).
  async function call(path: string, body?: unknown, method: "POST" | "DELETE" = "POST") {
    setBusy(path)
    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Erreur")
      } else {
        router.refresh()
        if (method === "DELETE") setDeleteOpen(false)
      }
    } finally {
      setBusy(null)
    }
  }

  const oneWeekFromNow = new Date()
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {isPaused ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => call(`/api/parent/allowances/${allowanceId}/resume`)}
          >
            <PlayCircle className="w-4 h-4 mr-1" aria-hidden /> Reprendre
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() =>
              call(`/api/parent/allowances/${allowanceId}/pause`, {
                until: oneWeekFromNow.toISOString(),
              })
            }
          >
            <PauseCircle className="w-4 h-4 mr-1" aria-hidden /> Pause 1 sem
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          disabled={busy !== null}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-1" aria-hidden /> Supprimer
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!busy) setDeleteOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette allowance ?</DialogTitle>
            <DialogDescription>
              L&apos;allowance sera arrêtée définitivement. Aucun versement futur ne sera
              déclenché. Tu peux toujours en créer une nouvelle.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={busy !== null}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={busy !== null}
              onClick={() => call(`/api/parent/allowances/${allowanceId}`, undefined, "DELETE")}
            >
              {busy ? "Suppression…" : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
