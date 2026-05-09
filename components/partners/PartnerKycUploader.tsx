"use client"

/**
 * Wave 3A.5 — partner KYC uploader (canon §4.6, §6 F12).
 *
 * 1. POST /api/partner/kyc/upload returns { path, token, doc_id, bucket }.
 * 2. Client uploads via supabase.storage.uploadToSignedUrl (private bucket).
 * 3. KYC row is inserted server-side at step 1; the upload is the only piece
 *    that touches storage from the client.
 *
 * Hard rule: never `getPublicUrl`. Only signed reads — admin-only.
 */

import { useRef, useState } from "react"
import { Loader2, Upload, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

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

export function PartnerKycUploader() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState<string>("")
  const [busy, setBusy] = useState(false)

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

      // 1) Sign upload via canonical Wave 3A endpoint.
      const signRes = await fetch("/api/partner/kyc/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_type: docType,
          content_type: file.type,
          ext,
        }),
      })
      const sign = await signRes.json().catch(() => ({}))
      if (!signRes.ok || !sign?.success) {
        throw new Error(sign?.error ?? "sign-upload échoué")
      }

      // 2) Upload directly to private bucket via signed token.
      const supabase = createClient()
      const { error: upErr } = await supabase.storage
        .from(sign.bucket as string)
        .uploadToSignedUrl(sign.path, sign.token, file, { contentType: file.type })
      if (upErr) {
        throw new Error("upload échoué : " + upErr.message)
      }

      toast.success("Document envoyé. En attente de validation modérateur.")
      router.refresh()
      setDocType("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur upload")
    } finally {
      setBusy(false)
      e.target.value = ""
    }
  }

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" />
          Ajouter un document KYC
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Stockage privé · seuls toi et l&apos;équipe Nivy peuvent voir le fichier · 10 MB max ·
          JPEG / PNG / WebP / PDF.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kyc-doc-type" className="text-zinc-300">
          Type de document
        </Label>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger id="kyc-doc-type" className="bg-zinc-950 border-zinc-700 text-white">
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
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full"
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
      <p className="text-[11px] text-zinc-500 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        Bucket privé · jamais d&apos;URL publique · admin lit via lien signé 15 min.
      </p>
    </div>
  )
}
