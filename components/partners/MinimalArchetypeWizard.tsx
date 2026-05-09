"use client"

/**
 * Wave 3B.1 — minimal intake wizard for the new partner archetypes.
 *
 * Used by /devenir-{food,dj,organisateur,createur,anniv-host}. Captures the
 * required canon fields (company info + contact + password + optional
 * description) and posts to /api/partners/wizard/submit with the right
 * partner_type. Type-specific child rows (menu, packages, locations) are
 * deferred to /partner/settings or to Wave 3B.2 dashboard onboarding.
 *
 * Intentionally narrow — same pipeline as the 4 legacy commerce forms,
 * just without the multi-step product-config flow. The canonical wizard
 * accepts loose `*_details` payloads via zod-strip-extra; we send minimal
 * payload here and let admin/partner top up later.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { submitPartnerWizard, type WizardPartnerType } from "@/lib/partners/wizard-submit"
import { PartnerPasswordPanel, isPasswordValid } from "@/components/partners/PartnerPasswordPanel"

interface Props {
  partnerType: WizardPartnerType
  archetypeLabel: string
  /** Optional preset metadata that becomes part of the wizard payload. */
  metadata?: Record<string, unknown>
  successHref?: string
}

export function MinimalArchetypeWizard({
  partnerType,
  archetypeLabel,
  metadata,
  successHref = "/partenaires/merci",
}: Props) {
  const router = useRouter()
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [description, setDescription] = useState("")
  const [contactPersonName, setContactPersonName] = useState("")
  const [contactPersonPhone, setContactPersonPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const ready =
    !!companyName &&
    !!email &&
    !!phone &&
    !!contactPersonName &&
    isPasswordValid(password, confirmPassword)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ready) {
      toast.error("Tous les champs requis doivent être remplis.")
      return
    }
    setBusy(true)
    try {
      const result = await submitPartnerWizard({
        partner_type: partnerType,
        company_name: companyName,
        email,
        password,
        phone,
        website: website || null,
        description: description || null,
        contact_person_name: contactPersonName,
        contact_person_phone: contactPersonPhone || null,
        // type-specific buckets the canonical wizard accepts.
        ...(metadata ? { venue_details: metadata as Record<string, unknown> } : {}),
      })
      if (!result.ok) {
        toast.error(result.error ?? "Erreur lors de la soumission")
        return
      }
      toast.success("Demande envoyée. KYC + activation admin requise avant la connexion.")
      router.push(`${successHref}?ref=${result.partner_id ?? ""}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white">Inscription {archetypeLabel}</CardTitle>
        <CardDescription className="text-zinc-400">
          Quelques informations suffisent. Tu pourras compléter ton profil après l&apos;activation
          admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="archetype-company" className="text-zinc-300">
                Nom de l&apos;entreprise / structure *
              </Label>
              <Input
                id="archetype-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="archetype-email" className="text-zinc-300">
                Email professionnel *
              </Label>
              <Input
                id="archetype-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="bg-zinc-950 border-zinc-800 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="archetype-phone" className="text-zinc-300">
                Téléphone *
              </Label>
              <Input
                id="archetype-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                className="bg-zinc-950 border-zinc-800 text-white mt-1"
                placeholder="+212 6XX-XXXXXX"
              />
            </div>
            <div>
              <Label htmlFor="archetype-website" className="text-zinc-300">
                Site web (optionnel)
              </Label>
              <Input
                id="archetype-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                autoComplete="url"
                className="bg-zinc-950 border-zinc-800 text-white mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="archetype-description" className="text-zinc-300">
              Description (optionnel)
            </Label>
            <Textarea
              id="archetype-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-white mt-1 min-h-20"
              maxLength={2000}
              placeholder="Ce que tu proposes, ton expertise, ta zone d'intervention…"
            />
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <h3 className="text-base font-semibold text-white mb-4">Contact principal</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="archetype-contact-name" className="text-zinc-300">
                  Nom complet *
                </Label>
                <Input
                  id="archetype-contact-name"
                  value={contactPersonName}
                  onChange={(e) => setContactPersonName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1"
                />
              </div>
              <div>
                <Label htmlFor="archetype-contact-phone" className="text-zinc-300">
                  Téléphone (optionnel)
                </Label>
                <Input
                  id="archetype-contact-phone"
                  type="tel"
                  value={contactPersonPhone}
                  onChange={(e) => setContactPersonPhone(e.target.value)}
                  autoComplete="tel"
                  className="bg-zinc-950 border-zinc-800 text-white mt-1"
                />
              </div>
            </div>
          </div>

          <PartnerPasswordPanel
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
          />

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Cette demande sera revue par l&apos;équipe Nivy. Tu recevras un email d&apos;invitation
            après l&apos;activation. Pas de connexion immédiate.
          </div>

          <Button
            type="submit"
            disabled={busy || !ready}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi…
              </>
            ) : (
              <>
                Envoyer ma demande
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
