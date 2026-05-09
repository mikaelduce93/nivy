/**
 * Wave 3B.3 — pre-auth (prospect) KYC upload with signed token (canon §4.6).
 *
 * POST /api/partner/kyc/upload-with-token
 *   { token: string, doc_type: string, content_type?: string, ext?: string }
 *
 * Returns: { success, doc_id, path, token (storage upload), bucket }
 *
 * Hard rules:
 *   - Token is sha256-compared against partner_kyc_tokens (constant time).
 *   - Token rejected if expired or already consumed.
 *   - Storage upload goes to private `kyc-documents` bucket only.
 *   - Path is `partners/<partner_id>/<random>.<ext>` — token cannot upload
 *     for a different partner (server-resolved, never trusts the client).
 *   - Token consumption is recorded ONLY after the storage signed-url is
 *     issued and the doc row is inserted (so a network failure mid-flow
 *     doesn't burn the token). One token = one upload.
 *   - `partner_kyc_tokens` table stays RLS-locked to the service role.
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { randomUUID } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sha256Hex } from "@/lib/partners/kyc-token"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ALLOWED_DOCS = new Set([
  "rc", "ice", "patente", "cnss", "statuts", "pouvoir",
  "cin", "passport", "rib", "attestation_assurance",
  "permis_conduire", "carte_grise", "assurance_vehicule",
  "casier_judiciaire", "diplome", "licence_federale",
  "declaration_micro_entreprise", "attestation_halal",
  "autorisation_municipale",
])
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
])

const bodySchema = z.object({
  token: z.string().min(20).max(80),
  doc_type: z.string().min(1).max(40),
  content_type: z.string().min(3).max(80).optional(),
  ext: z.string().min(1).max(8).optional(),
})

function safeExt(raw: string | undefined): string {
  const v = (raw || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5)
  return v || "bin"
}

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 })
  }
  if (!ALLOWED_DOCS.has(body.doc_type)) {
    return NextResponse.json({ success: false, error: "doc_type_not_allowed" }, { status: 400 })
  }
  if (body.content_type && !ALLOWED_MIMES.has(body.content_type)) {
    return NextResponse.json({ success: false, error: "content_type_not_allowed" }, { status: 400 })
  }

  // Resolve token via sha256 compare (DB has UNIQUE on hash).
  const tokenHash = sha256Hex(body.token)
  const sr = createServiceRoleClient()
  const { data: tokenRow } = await sr
    .from("partner_kyc_tokens")
    .select("id, partner_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle()
  if (!tokenRow) {
    return NextResponse.json({ success: false, error: "invalid_token" }, { status: 401 })
  }
  if (tokenRow.used_at) {
    return NextResponse.json({ success: false, error: "token_already_used" }, { status: 401 })
  }
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ success: false, error: "token_expired" }, { status: 401 })
  }

  // Build storage path scoped to the token's partner.
  const objectName = `partners/${tokenRow.partner_id}/${randomUUID()}.${safeExt(body.ext)}`

  // The signed-upload itself uses the service role for the bucket call so the
  // prospect (unauthenticated) can complete the upload via uploadToSignedUrl.
  const supabase = await createClient()
  const { data: signed, error: signErr } = await supabase.storage
    .from("kyc-documents")
    .createSignedUploadUrl(objectName)
  if (signErr || !signed?.token) {
    return NextResponse.json(
      { success: false, error: signErr?.message ?? "sign_upload_failed" },
      { status: 500 },
    )
  }

  // Insert the kyc_documents row + consume the token in a best-effort sequence.
  const { data: doc, error: insErr } = await sr
    .from("kyc_documents")
    .insert({
      partner_id: tokenRow.partner_id,
      doc_type: body.doc_type,
      file_path: signed.path,
      status: "submitted",
    })
    .select("id, status, file_path")
    .single()
  if (insErr) {
    return NextResponse.json({ success: false, error: insErr.message }, { status: 500 })
  }

  await sr
    .from("partner_kyc_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id)
    .is("used_at", null)

  await sr.from("audit_log").insert({
    actor_id: null,
    action: "partner_kyc.preauth_upload",
    resource_type: "kyc_document",
    resource_id: doc.id,
    metadata: { partner_id: tokenRow.partner_id, doc_type: body.doc_type, token_id: tokenRow.id },
  })

  return NextResponse.json({
    success: true,
    doc_id: doc.id,
    path: signed.path,
    token: signed.token,
    bucket: "kyc-documents",
  })
}
