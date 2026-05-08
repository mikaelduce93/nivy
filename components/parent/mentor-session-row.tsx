"use client"

import { useEffect, useRef, useState } from "react"
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
import { toast } from "sonner"
import {
  CheckCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import {
  FormField,
  FormLabel,
  FormError,
} from "@/components/ui/accessibility/form-field"
import { FormKeyboardAware } from "@/lib/hooks/use-keyboard-aware"
import { scrollToFirstError } from "@/lib/forms/scroll-to-error"

interface MentorSessionActionsProps {
  sessionId: string
  mentorName?: string
  teenName?: string
  amountDh?: number
  amountCoins?: number
  isIntro?: boolean
  compact?: boolean
}

const REASON_MAX = 500

type DenyErrors = { reason?: string }

function validateReason(reason: string): DenyErrors {
  const errors: DenyErrors = {}
  // Reason is optional, but if provided enforce a minimum-length and cap.
  const trimmed = reason.trim()
  if (trimmed.length > 0 && trimmed.length < 5)
    errors.reason = "Si tu donnes une raison, écris au moins 5 caractères."
  else if (reason.length > REASON_MAX)
    errors.reason = `Maximum ${REASON_MAX} caractères.`
  return errors
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
  const [success, setSuccess] = useState<"approve" | "reject" | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(
    null
  )
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<DenyErrors>({})
  const [touched, setTouched] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  const open = (action: "approve" | "reject") => {
    setPendingAction(action)
    setReason("")
    setErrors({})
    setTouched(false)
    setShowModal(true)
  }

  // Auto-focus the reason field when the reject dialog opens
  useEffect(() => {
    if (!showModal) return
    if (pendingAction !== "reject") return
    // Defer one tick so the dialog is in the DOM
    const t = window.setTimeout(() => {
      reasonRef.current?.focus()
    }, 30)
    return () => window.clearTimeout(t)
  }, [showModal, pendingAction])

  // Re-validate touched field on change
  useEffect(() => {
    if (!touched) return
    setErrors(validateReason(reason))
  }, [reason, touched])

  const confirm = async (e?: React.FormEvent) => {
    e?.preventDefault?.()
    if (!pendingAction) return

    if (pendingAction === "reject") {
      setTouched(true)
      const v = validateReason(reason)
      setErrors(v)
      if (v.reason) {
        scrollToFirstError(formRef.current, v)
        return
      }
    }

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
            ? JSON.stringify({ reason: reason.trim() || null })
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
      // Brief success state, then close + refresh
      setSuccess(pendingAction)
      window.setTimeout(() => {
        setShowModal(false)
        setSuccess(null)
        router.refresh()
      }, 600)
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

          <FormKeyboardAware
            ref={formRef}
            onSubmit={confirm}
            className="space-y-4"
            basePaddingBottom={0}
          >
            <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 space-y-1">
              <p className="font-medium text-white">
                Session avec {mentorName ?? "mentor"}
              </p>
              <p className="text-sm text-zinc-400">
                {isIntro ? (
                  <span className="text-emerald-400">
                    Session d&apos;intro gratuite
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold">
                    {amountDh ?? 0} DH
                    {amountCoins ? ` (${amountCoins} coins)` : ""}
                  </span>
                )}
              </p>
            </div>

            {pendingAction === "reject" && (
              <FormField
                name="reason"
                error={touched ? errors.reason : undefined}
              >
                <FormLabel className="text-zinc-300">
                  Raison du refus (optionnel)
                </FormLabel>
                <Textarea
                  ref={reasonRef}
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="Expliquez pourquoi vous refusez cette session..."
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[80px]"
                  maxLength={REASON_MAX}
                  aria-invalid={!!(touched && errors.reason)}
                />
                <p className="text-xs text-zinc-500">
                  Cette raison sera communiquée au teen.
                  <span className="ml-1 text-zinc-600">
                    ({reason.length}/{REASON_MAX})
                  </span>
                </p>
                <FormError />
              </FormField>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={loading !== null || success !== null}
                className="border-zinc-700 text-zinc-300"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading !== null || success !== null}
                aria-busy={loading !== null}
                className={
                  pendingAction === "approve"
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }
              >
                {success ? (
                  <CheckCircle2
                    className="h-4 w-4 mr-2 animate-in zoom-in-50 duration-300"
                    aria-hidden="true"
                  />
                ) : loading ? (
                  <Loader2
                    className="h-4 w-4 animate-spin mr-2"
                    aria-hidden="true"
                  />
                ) : pendingAction === "approve" ? (
                  <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
                {success
                  ? success === "approve"
                    ? "Approuvée"
                    : "Refusée"
                  : pendingAction === "approve"
                    ? "Approuver"
                    : "Refuser"}
              </Button>
            </DialogFooter>
          </FormKeyboardAware>
        </DialogContent>
      </Dialog>
    </>
  )
}
