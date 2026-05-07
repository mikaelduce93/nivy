"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react"

interface MentorSessionActionsProps {
  sessionId: string
  mentorName?: string
  teenName?: string
  amountDh?: number
  amountCoins?: number
  isIntro?: boolean
  compact?: boolean
}

export function MentorSessionActions({
  sessionId,
  mentorName,
  teenName,
  amountDh,
  amountCoins,
  isIntro,
  compact = false,
}: MentorSessionActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null)
  const [reason, setReason] = useState("")

  const open = (action: "approve" | "reject") => {
    setPendingAction(action)
    setReason("")
    setShowModal(true)
  }

  const confirm = async () => {
    if (!pendingAction) return
    setLoading(pendingAction)
    try {
      const url =
        pendingAction === "approve"
          ? `/api/parent/mentor-sessions/${sessionId}/approve`
          : `/api/parent/mentor-sessions/${sessionId}/deny`
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          pendingAction === "reject"
            ? JSON.stringify({ reason: reason || null })
            : JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "Action échouée")
      }
      toast.success(
        pendingAction === "approve"
          ? "Session approuvée — coins débités"
          : "Session refusée"
      )
      setShowModal(false)
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className={`flex ${compact ? "gap-1" : "gap-2"}`}>
        <Button
          size={compact ? "icon" : "sm"}
          variant="outline"
          className={`${compact ? "h-8 w-8" : "h-9"} border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50`}
          onClick={() => open("reject")}
          disabled={loading !== null}
          title="Refuser"
        >
          {loading === "reject" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : compact ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-1" />
              Refuser
            </>
          )}
        </Button>
        <Button
          size={compact ? "icon" : "sm"}
          className={`${compact ? "h-8 w-8" : "h-9"} bg-emerald-500 hover:bg-emerald-600 text-white`}
          onClick={() => open("approve")}
          disabled={loading !== null}
          title="Approuver"
        >
          {loading === "approve" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : compact ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Approuver
            </>
          )}
        </Button>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction === "approve" ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  Confirmer l&apos;approbation
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Confirmer le refus
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {pendingAction === "approve"
                ? "Cette action débitera les coins du teen et autorisera la session."
                : "La session sera refusée et le teen sera notifié."}
              {teenName && (
                <span className="block mt-1 text-zinc-300">Teen : {teenName}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 space-y-1">
            <p className="font-medium text-white">
              Session avec {mentorName ?? "mentor"}
            </p>
            <p className="text-sm text-zinc-400">
              {isIntro ? (
                <span className="text-emerald-400">Session d&apos;intro gratuite</span>
              ) : (
                <span className="text-emerald-400 font-bold">
                  {amountDh ?? 0} DH
                  {amountCoins ? ` (${amountCoins} coins)` : ""}
                </span>
              )}
            </p>
          </div>

          {pendingAction === "reject" && (
            <div className="space-y-2">
              <Label className="text-zinc-300">Raison du refus (optionnel)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquez pourquoi vous refusez cette session..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[80px]"
                maxLength={500}
              />
              <p className="text-xs text-zinc-500">
                Cette raison sera communiquée au teen.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={loading !== null}
              className="border-zinc-700 text-zinc-300"
            >
              Annuler
            </Button>
            <Button
              onClick={confirm}
              disabled={loading !== null}
              className={
                pendingAction === "approve"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : pendingAction === "approve" ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {pendingAction === "approve" ? "Approuver" : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
