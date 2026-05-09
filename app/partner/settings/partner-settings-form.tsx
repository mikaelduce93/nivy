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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Informations entreprise</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label htmlFor="settings-company-name" className="text-zinc-300">
              Nom de l&apos;entreprise *
            </Label>
            <Input
              id="settings-company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={120}
              minLength={2}
              required
              className="bg-zinc-950 border-zinc-800 text-white mt-1"
            />
          </div>
          <div>
            <Label htmlFor="settings-sub-category" className="text-zinc-300">
              Sous-catégorie (optionnel)
            </Label>
            <Input
              id="settings-sub-category"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              maxLength={60}
              className="bg-zinc-950 border-zinc-800 text-white mt-1"
              placeholder="ex: clothing, cafe, gym, language…"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="settings-phone" className="text-zinc-300">
                Téléphone
              </Label>
              <Input
                id="settings-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                autoComplete="tel"
                className="bg-zinc-950 border-zinc-800 text-white mt-1"
                placeholder="+212 6XX-XXXXXX"
              />
            </div>
            <div>
              <Label htmlFor="settings-website" className="text-zinc-300">
                Site web
              </Label>
              <Input
                id="settings-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                maxLength={200}
                autoComplete="url"
                className="bg-zinc-950 border-zinc-800 text-white mt-1"
                placeholder="https://www.example.com"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="settings-description" className="text-zinc-300">
              Description publique
            </Label>
            <Textarea
              id="settings-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              className="bg-zinc-950 border-zinc-800 text-white mt-1"
              placeholder="Présente brièvement ton activité…"
            />
            <p className="text-xs text-zinc-500 mt-1">
              {description.length} / 2000 caractères
            </p>
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
