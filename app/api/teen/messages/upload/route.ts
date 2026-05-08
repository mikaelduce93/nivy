/**
 * POST /api/teen/messages/upload — Wave 2A DM attachment upload.
 *
 * Body (multipart/form-data): `file` (image jpeg/png/webp/heic, max 5 MB).
 * Returns: { path, signedUrl, expiresIn }.
 *
 * Path layout: <senderUid>/<uuid>.<ext> in private bucket `dm-attachments`.
 * Storage RLS gates SELECT to sender or recipient — public URL never used.
 *
 * Canon: docs/canon/social-feed.locked.md §4 'Attachment policy — LOCKED'.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const form = await request.formData().catch(() => null)
  if (!form) {
    return NextResponse.json({ error: "multipart/form-data requis" }, { status: 400 })
  }
  const file = form.get("file")
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file requis" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 5 MB)" },
      { status: 413 }
    )
  }
  const mime = (file as File).type || "application/octet-stream"
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: "Format non supporté (jpeg/png/webp/heic uniquement)" },
      { status: 415 }
    )
  }

  const ext =
    mime === "image/jpeg"
      ? "jpg"
      : mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : "heic"
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from("dm-attachments")
    .upload(path, file, {
      contentType: mime,
      upsert: false,
    })
  if (upErr) {
    console.error("[teen/messages/upload] failed:", upErr)
    return NextResponse.json({ error: "Erreur d'upload" }, { status: 500 })
  }

  // Signed URL with 5-minute TTL.
  const { data: signed, error: signErr } = await supabase.storage
    .from("dm-attachments")
    .createSignedUrl(path, 300)
  if (signErr) {
    return NextResponse.json({ error: "Erreur signature" }, { status: 500 })
  }

  return NextResponse.json({
    path,
    mime,
    size_bytes: file.size,
    signedUrl: signed?.signedUrl ?? null,
    expiresIn: 300,
  })
}
