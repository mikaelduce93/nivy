"use client"

/**
 * Wave 3A.5 — shared password panel for the four legacy partner wizard
 * forms (Retail / Venue / Club / Education). Renders a Step 1 panel with
 * password + confirm fields and inline validation hints.
 *
 * Canon §2 stage 2: the wizard collects a password; the canonical activation
 * route consumes it (or sends an invite link) when the admin approves.
 */

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"

export interface PartnerPasswordPanelProps {
  password: string
  setPassword: (v: string) => void
  confirmPassword: string
  setConfirmPassword: (v: string) => void
}

export function PartnerPasswordPanel({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
}: PartnerPasswordPanelProps) {
  return (
    <div className="border-t border-ink pt-6">
      <h3 className="text-lg font-semibold text-ink mb-2 flex items-center gap-2">
        <Lock className="w-5 h-5 text-teal" />
        Mot de passe partenaire
      </h3>
      <p className="text-xs text-mute mb-4">
        Choisis le mot de passe que tu utiliseras pour te connecter une fois ta demande
        approuvée par notre équipe. Min. 8 caractères.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="partner-password" className="text-ink-2">
            Mot de passe *
          </Label>
          <Input
            id="partner-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className="bg-background border-ink text-ink mt-1"
            placeholder="Min. 8 caractères"
          />
        </div>
        <div>
          <Label htmlFor="partner-password-confirm" className="text-ink-2">
            Confirmer le mot de passe *
          </Label>
          <Input
            id="partner-password-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className="bg-background border-ink text-ink mt-1"
            placeholder="Retape le mot de passe"
          />
        </div>
      </div>
      {password.length > 0 && password.length < 8 && (
        <p className="text-xs text-destructive mt-2">Minimum 8 caractères.</p>
      )}
      {confirmPassword.length > 0 && password !== confirmPassword && (
        <p className="text-xs text-destructive mt-2">Les mots de passe ne correspondent pas.</p>
      )}
    </div>
  )
}

/** Shared validation: password is set, ≥8 chars, and matches confirm. */
export function isPasswordValid(password: string, confirmPassword: string): boolean {
  return password.length >= 8 && password === confirmPassword
}
