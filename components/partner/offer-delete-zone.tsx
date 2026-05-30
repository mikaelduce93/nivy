"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * OfferDeleteZone — danger zone réellement câblée (#167).
 *
 * Iso-fonctionnel : `DELETE /api/partner/offers/[id]` (contrat inchangé, RLS
 * `partner_id` côté serveur, aucun payload). Remplace l'ancien bouton mort
 * « Supprimer » sans onClick.
 */
export function OfferDeleteZone({
  offerId,
  offerTitle,
}: {
  offerId: string
  offerTitle: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/partner/offers/${offerId}`, {
        method: "DELETE",
      })
      const result = await response.json()
      if (response.ok && result.success) {
        toast.success("Offre supprimée")
        router.push("/partner/offers")
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors de la suppression")
        setDeleting(false)
      }
    } catch {
      toast.error("Une erreur est survenue")
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-coral bg-coral/5 p-5">
      <div>
        <p className="font-display font-bold text-ink">Supprimer ce deal</p>
        <p className="text-xs text-mute">
          Action irréversible. L&apos;offre sera définitivement supprimée.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="text-coral"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Supprimer
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-2 border-ink bg-paper shadow-stkr-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-extrabold text-ink">
              Supprimer ce deal ?
            </DialogTitle>
            <DialogDescription className="text-mute">
              «&nbsp;{offerTitle}&nbsp;» sera définitivement supprimée. Cette
              action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Suppression…
                </>
              ) : (
                <>
                  <Trash2 className="size-4" aria-hidden="true" />
                  Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OfferDeleteZone
