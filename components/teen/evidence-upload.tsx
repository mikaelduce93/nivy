"use client"

/**
 * <EvidenceUpload> — Wave 1 cross-cutting component (FRONTEND_REDO).
 *
 * Generic uploader for teen-submitted proof to PRIVATE Supabase Storage
 * buckets (`defi-proofs`, `kyc-documents`, …). Used by:
 *   - parent-custom-chores → photo of completed chore (chore_completion)
 *   - physical challenges → photo/video proof (defi_proof)
 *
 * Flow (signed-URL pattern — we never expose the service-role key client-side):
 *   1. User picks a file → client-side mime + size validation
 *   2. POST /api/teen/evidence/sign-upload → server verifies the caller owns
 *      the resource and returns a signed upload token + path. Path is always
 *      prefixed with `auth.uid()::text/` to satisfy storage RLS.
 *   3. Client uploads the file via supabase.storage.uploadToSignedUrl()
 *   4. POST /api/teen/evidence/record → server writes the path to the
 *      canonical column (parent_chore_completions.evidence_url for chores;
 *      teen_physical_challenge_progress.proof_url for defis).
 *   5. UI shows success + a thumbnail (signed-read URL, 5 min TTL).
 *
 * NB: Bucket policies (already deployed under Wave A) require the path to
 * start with `auth.uid()::text/`. The component passes ownerId to the server,
 * but the server overrides it with the authenticated user's id — defence in
 * depth so a forged ownerId cannot escape RLS.
 */

import { useRef, useState } from "react"
import { Camera, Loader2, CheckCircle2, X, Upload } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export type EvidenceBucket = "defi-proofs" | "kyc-documents"
export type EvidenceResourceType = "chore_completion" | "defi_proof"

export interface EvidenceUploadProps {
  bucket: EvidenceBucket
  /** teen_id used as the storage folder prefix (must equal auth.uid()). */
  ownerId: string
  resourceType: EvidenceResourceType
  /** FK target — chore id, challenge progress id, etc. */
  resourceId: string
  maxSizeMB?: number
  acceptMimeTypes?: string[]
  /** Called with the storage path after a successful end-to-end upload. */
  onComplete?: (path: string) => void
  /** Optional CTA label override. */
  label?: string
  className?: string
}

const DEFAULT_MIMES = ["image/jpeg", "image/png", "image/webp", "video/mp4"]
const DEFAULT_MAX_MB = 10

type Phase = "idle" | "validating" | "signing" | "uploading" | "recording" | "done" | "error"

export function EvidenceUpload({
  bucket,
  ownerId,
  resourceType,
  resourceId,
  maxSizeMB = DEFAULT_MAX_MB,
  acceptMimeTypes = DEFAULT_MIMES,
  onComplete,
  label,
  className,
}: EvidenceUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [storedPath, setStoredPath] = useState<string | null>(null)

  const acceptAttr = acceptMimeTypes.join(",")

  const reset = () => {
    setPhase("idle")
    setErrorMsg(null)
    setThumbUrl(null)
    setStoredPath(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const fail = (msg: string) => {
    setPhase("error")
    setErrorMsg(msg)
    toast.error(msg)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhase("validating")
    setErrorMsg(null)

    // ---- Client-side validation -------------------------------------
    if (!acceptMimeTypes.includes(file.type)) {
      fail(`Type de fichier non supporté (${file.type || "inconnu"})`)
      return
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      fail(`Fichier trop lourd (max ${maxSizeMB} MB)`)
      return
    }

    try {
      // ---- 1. Request signed upload URL ----------------------------
      setPhase("signing")
      const ext = (file.name.split(".").pop() || file.type.split("/").pop() || "bin")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 5)

      const signRes = await fetch("/api/teen/evidence/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket,
          ownerId,
          resourceType,
          resourceId,
          ext,
          contentType: file.type,
          size: file.size,
        }),
      })
      const signJson = await signRes.json().catch(() => ({}))
      if (!signRes.ok || !signJson?.success) {
        fail(signJson?.error || "Impossible d'obtenir l'URL d'upload")
        return
      }

      const { path, token } = signJson as { path: string; token: string }

      // ---- 2. Upload to storage via signed URL ----------------------
      setPhase("uploading")
      const supabase = createClient()
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(path, token, file, { contentType: file.type })
      if (upErr) {
        fail("Upload échoué : " + upErr.message)
        return
      }

      // ---- 3. Record path on the canonical resource ----------------
      setPhase("recording")
      const recRes = await fetch("/api/teen/evidence/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket,
          path,
          resourceType,
          resourceId,
        }),
      })
      const recJson = await recRes.json().catch(() => ({}))
      if (!recRes.ok || !recJson?.success) {
        fail(recJson?.error || "Enregistrement échoué")
        return
      }

      // ---- 4. Generate short-TTL signed read URL for thumbnail -----
      try {
        const { data: signedRead } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 300)
        if (signedRead?.signedUrl) setThumbUrl(signedRead.signedUrl)
      } catch {
        // Thumbnail is best-effort; absence is not a failure.
      }

      setStoredPath(path)
      setPhase("done")
      toast.success("Preuve envoyée")
      onComplete?.(path)
    } catch (err) {
      console.error("[evidence-upload] unexpected", err)
      fail("Erreur réseau")
    }
  }

  const isWorking =
    phase === "validating" || phase === "signing" || phase === "uploading" || phase === "recording"

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptAttr}
        capture="environment"
        className="hidden"
        onChange={handleFile}
        disabled={isWorking}
      />

      {phase === "done" && storedPath ? (
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt="Preuve envoyée"
              className="w-14 h-14 rounded-xl object-cover border border-white/10"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-300">Preuve envoyée</p>
            <p className="text-[11px] text-zinc-500 truncate font-mono">{storedPath}</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white"
            aria-label="Renvoyer une autre preuve"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isWorking}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl",
            "bg-zinc-900/60 border border-white/10 text-sm font-bold",
            "hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {isWorking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {phase === "signing"
                  ? "Préparation…"
                  : phase === "uploading"
                  ? "Envoi en cours…"
                  : phase === "recording"
                  ? "Enregistrement…"
                  : "Validation…"}
              </span>
            </>
          ) : phase === "error" ? (
            <>
              <Upload className="w-4 h-4 text-red-400" />
              <span className="text-red-300">{errorMsg || "Réessayer"}</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>{label || "Ajouter une preuve (photo / vidéo)"}</span>
            </>
          )}
        </button>
      )}

      {phase !== "done" && (
        <p className="mt-2 text-[10px] text-zinc-500">
          Max {maxSizeMB} MB · Formats : {acceptMimeTypes.map((m) => m.split("/")[1]).join(", ")}.
          Stocké de façon privée — seuls toi et tes parents peuvent le voir.
        </p>
      )}
    </div>
  )
}

export default EvidenceUpload
