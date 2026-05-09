/**
 * Wave 4B — Promise-returning confirm helper backed by sonner toast.
 *
 * Replaces the native browser confirm (canon §0 forbidden — no native dialogs).
 * Returns true if the user clicks the action button, false otherwise.
 *
 * Usage:
 *   if (!(await confirmToast({ message: "Supprimer ?" }))) return
 */

"use client"

import { toast } from "sonner"

export interface ConfirmToastOptions {
  message: string
  description?: string
  actionLabel?: string
  cancelLabel?: string
  destructive?: boolean
  durationMs?: number
}

export function confirmToast({
  message,
  description,
  actionLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  durationMs = 8000,
}: ConfirmToastOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const settle = (v: boolean) => {
      if (settled) return
      settled = true
      resolve(v)
    }
    const id = toast(message, {
      description,
      duration: durationMs,
      action: {
        label: actionLabel,
        onClick: () => settle(true),
      },
      cancel: {
        label: cancelLabel,
        onClick: () => settle(false),
      },
      onDismiss: () => settle(false),
      onAutoClose: () => settle(false),
      className: destructive ? "border border-red-500/40" : undefined,
    })
    // The toast id reference is unused but kept for parity with the sonner API.
    void id
  })
}
