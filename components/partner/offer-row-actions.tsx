"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Pencil, Trash2, Loader2 } from "lucide-react"
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
 * OfferRowActions — actions par offre dans la liste partenaire (#167).
 *
 * Iso-fonctionnel : la suppression appelle `DELETE /api/partner/offers/[id]`
 * (contrat inchangé, RLS `partner_id` côté serveur, aucun payload). Le lien
 * « Modifier » pointe vers la page d'édition existante.
 *
 * Note : un toggle on/off `is_active` autonome n'est pas exposé ici. Le seul
 * endpoint mutant (`PATCH`) force `is_active=false` + re-modération et exige le
 * payload complet de l'offre (absent de la liste). Le mettre en bascule donnerait
 * un contrôle mensonger — la (re)mise en ligne passe par l'édition + modération.
 */
export function OfferRowActions({
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
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors de la suppression")
      }
    } catch {
      toast.error("Une erreur est survenue")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link
          href={`/partner/offers/${offerId}/edit`}
          aria-label={`Modifier l'offre ${offerTitle}`}
        >
          <Pencil className="size-4" aria-hidden="true" />
          Modifier
        </Link>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label={`Supprimer l'offre ${offerTitle}`}
        className="text-coral"
      >
        <Trash2 className="size-4" aria-hidden="true" />
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

export default OfferRowActions
