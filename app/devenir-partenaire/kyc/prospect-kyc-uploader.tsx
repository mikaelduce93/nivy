"use client"

/**
 * Wave 3B.3 — prospect (unauthenticated) KYC uploader.
 *
 * Calls /api/partner/kyc/upload-with-token to get a signed upload token, then
 * uploads to the private kyc-documents bucket. Token consumes single-use.
 */

import { useRef, useState } from "react"
import { Loader2, Upload, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

const DOC_TYPES = [
  { value: "rc", label: "RC — Registre du commerce" },
  { value: "ice", label: "ICE" },
  { value: "patente", label: "Patente" },
  { value: "cnss", label: "CNSS" },
  { value: "statuts", label: "Statuts de la société" },
  { value: "pouvoir", label: "Pouvoir de signature" },
  { value: "cin", label: "CIN (représentant)" },
  { value: "passport", label: "Passeport" },
  { value: "rib", label: "RIB" },
  { value: "attestation_assurance", label: "Attestation d'assurance" },
  { value: "casier_judiciaire", label: "Casier judiciaire" },
  { value: "diplome", label: "Diplôme" },
  { value: "licence_federale", label: "Licence fédérale" },
  { value: "autorisation_municipale", label: "Autorisation municipale" },
] as const

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
const MAX_BYTES = 10 * 1024 * 1024

export function ProspectKycUploader({ token }: { token: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState<string>("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!docType) {
      toast.error("Choisis le type de document avant d'uploader.")
      e.target.value = ""
      return
    }
    if (!ALLOWED_MIMES.includes(file.type)) {
      toast.error("Format non supporté (JPEG, PNG, WebP, PDF).")
      e.target.value = ""
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("Fichier trop lourd (max 10 MB).")
      e.target.value = ""
      return
    }

    setBusy(true)
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "")
      const signRes = await fetch("/api/partner/kyc/upload-with-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          doc_type: docType,
          content_type: file.type,
          ext,
        }),
      })
      const sign = await signRes.json().catch(() => ({}))
      if (!signRes.ok || !sign?.success) {
        throw new Error(sign?.error ?? "Lien KYC invalide")
      }
      const supabase = createClient()
      const { error: upErr } = await supabase.storage
        .from(sign.bucket as string)
        .uploadToSignedUrl(sign.path, sign.token, file, { contentType: file.type })
      if (upErr) {
        throw new Error("Upload échoué : " + upErr.message)
      }
      setDone(sign.path)
      toast.success("Document envoyé. Le lien KYC a été consommé.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur upload")
    } finally {
      setBusy(false)
      e.target.value = ""
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-lime/30 bg-lime/10 p-6 text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 text-lime mx-auto" />
        <p className="font-semibold text-lime">Document envoyé</p>
        <p className="text-xs text-mute">
          L&apos;équipe Nivy va le revoir. Tu seras contacté par email pour la suite.
        </p>
        <p className="text-[11px] text-mute font-mono break-all">{done}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-ink bg-card p-5 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prospect-kyc-doc" className="text-ink-2">
          Type de document
        </Label>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger id="prospect-kyc-doc" className="bg-background border-ink text-ink">
            <SelectValue placeholder="Choisis un type…" />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_MIMES.join(",")}
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy || !docType}
        className="bg-teal hover:bg-teal text-ink font-bold w-full"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Envoi…
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Choisir un fichier
          </>
        )}
      </Button>
      <p className="text-[11px] text-mute">
        Bucket privé · jamais d&apos;URL publique · admin lit via lien signé 15 min · 10 MB max.
      </p>
    </div>
  )
}
