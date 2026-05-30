"use client"

/**
 * Wave 3B.3 — partner settings form (canon D2 fix).
 *
 * Editable fields: company_name, sub_category, phone, website, description.
 * Locked fields (read-only on server, never sent): partner_type, status,
 * email, KYC. Patches /api/partner/settings.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

export interface PartnerSettings {
  id: string
  email: string
  partner_type: string
  status: string
  company_name: string
  sub_category: string | null
  phone: string | null
  website: string | null
  description: string | null
  business_hours: Record<string, unknown> | null
  updated_at: string | null
}

export function PartnerSettingsForm({ partner }: { partner: PartnerSettings }) {
  const router = useRouter()
  const [companyName, setCompanyName] = useState(partner.company_name ?? "")
  const [subCategory, setSubCategory] = useState(partner.sub_category ?? "")
  const [phone, setPhone] = useState(partner.phone ?? "")
  const [website, setWebsite] = useState(partner.website ?? "")
  const [description, setDescription] = useState(partner.description ?? "")
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (companyName.trim().length < 2) {
      toast.error("Le nom de l'entreprise doit faire au moins 2 caractères.")
      return
    }
    if (website.trim() && !/^https?:\/\//i.test(website.trim())) {
      toast.error("URL du site web invalide (commence par http:// ou https://).")
      return
    }

    setBusy(true)
    try {
      const res = await fetch("/api/partner/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim(),
          sub_category: subCategory.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          description: description.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? `Erreur sauvegarde (${res.status})`)
        return
      }
      toast.success("Paramètres enregistrés")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <StickerCard className="gap-4 p-6">
      <h2 className="font-display text-lg font-extrabold">Informations entreprise</h2>
      <form onSubmit={onSubmit} className="space-y-5">
        <FieldInput
          id="settings-company-name"
          label="Nom de l'entreprise *"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          maxLength={120}
          minLength={2}
          required
        />
        <FieldInput
          id="settings-sub-category"
          label="Sous-catégorie (optionnel)"
          value={subCategory}
          onChange={(e) => setSubCategory(e.target.value)}
          maxLength={60}
          placeholder="ex : fringues, café, gym, langues…"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FieldInput
            id="settings-phone"
            label="Téléphone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
            autoComplete="tel"
            prefix="🇲🇦 +212"
            placeholder="6XX-XXXXXX"
          />
          <FieldInput
            id="settings-website"
            label="Site web"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            maxLength={200}
            autoComplete="url"
            placeholder="https://www.example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-description" className="eyebrow tracking-[0.16em]">
            Description publique
          </label>
          <Textarea
            id="settings-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={4}
            className="border-2 border-input text-ink focus-visible:border-ink focus-visible:ring-0"
            placeholder="Présente brièvement ton activité…"
          />
          <p className="text-xs text-mute">{description.length} / 2000 caractères</p>
        </div>
        <Button type="submit" variant="pink" disabled={busy} className="shadow-stkr-md">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </form>
    </StickerCard>
  )
}
