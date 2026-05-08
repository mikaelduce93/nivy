#!/usr/bin/env node
/**
 * Wave 1B — One-shot CIN privacy migration.
 *
 * Re-uploads any legacy CIN files stored in the public `documents` bucket to
 * the private `cin-scans` bucket and rewrites every reference (e_signatures,
 * documents.file_url) to the new storage path.
 *
 * THIS SCRIPT IS MANUAL OPS — do NOT add to a cron. Run once after deploying
 * Wave 1B and confirm the report before deleting the originals.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-cin-to-private.mjs
 *
 * Optional flags:
 *   --dry-run   Don't write — print the plan only.
 *   --delete    After successful re-upload, remove the original public files.
 *
 * Idempotent: re-running after partial success is safe — already-private
 * paths are skipped.
 */

import process from "node:process"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  )
  process.exit(1)
}

const DRY_RUN = process.argv.includes("--dry-run")
const DELETE_ORIGINALS = process.argv.includes("--delete")

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function isLegacyPublicUrl(value) {
  if (typeof value !== "string") return false
  // Legacy values were public URLs that included `/storage/v1/object/public/`.
  return value.includes("/storage/v1/object/public/documents/")
}

function extractDocumentsPath(publicUrl) {
  // Pull the storage object path out of a Supabase public URL.
  const marker = "/storage/v1/object/public/documents/"
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}

async function reUploadToPrivate(documentsPath) {
  // Download from public `documents` bucket then upload to private `cin-scans`.
  const { data: blob, error: dlErr } = await admin.storage
    .from("documents")
    .download(documentsPath)

  if (dlErr || !blob) {
    return { ok: false, error: dlErr?.message ?? "download_failed" }
  }

  const { error: upErr } = await admin.storage
    .from("cin-scans")
    .upload(documentsPath, blob, { cacheControl: "3600", upsert: false })

  if (upErr && !upErr.message?.includes("already exists")) {
    return { ok: false, error: upErr.message }
  }

  return { ok: true, newPath: documentsPath }
}

async function main() {
  const stats = {
    e_signatures_scanned: 0,
    e_signatures_migrated: 0,
    documents_scanned: 0,
    documents_migrated: 0,
    skipped: 0,
    errors: 0,
  }

  // 1. e_signatures.cin_url
  const { data: signatures, error: sigErr } = await admin
    .from("e_signatures")
    .select("id, cin_url")
  if (sigErr) {
    console.error("Failed to read e_signatures:", sigErr.message)
    process.exit(2)
  }

  for (const row of signatures ?? []) {
    stats.e_signatures_scanned += 1
    if (!row.cin_url) continue
    if (!isLegacyPublicUrl(row.cin_url)) {
      stats.skipped += 1
      continue
    }
    const path = extractDocumentsPath(row.cin_url)
    if (!path) {
      stats.skipped += 1
      continue
    }
    if (DRY_RUN) {
      console.log(`[dry-run] e_signatures.${row.id}: ${row.cin_url} -> ${path}`)
      continue
    }
    const result = await reUploadToPrivate(path)
    if (!result.ok) {
      console.error(
        `e_signatures.${row.id}: re-upload failed: ${result.error}`
      )
      stats.errors += 1
      continue
    }
    const { error: updErr } = await admin
      .from("e_signatures")
      .update({ cin_url: result.newPath })
      .eq("id", row.id)
    if (updErr) {
      console.error(
        `e_signatures.${row.id}: DB update failed: ${updErr.message}`
      )
      stats.errors += 1
      continue
    }
    if (DELETE_ORIGINALS) {
      await admin.storage.from("documents").remove([path])
    }
    stats.e_signatures_migrated += 1
  }

  // 2. documents.file_url where document_type='identity'
  const { data: docs, error: docErr } = await admin
    .from("documents")
    .select("id, file_url, document_type")
    .eq("document_type", "identity")
  if (docErr) {
    console.error("Failed to read documents:", docErr.message)
    process.exit(3)
  }

  for (const row of docs ?? []) {
    stats.documents_scanned += 1
    if (!row.file_url) continue
    if (!isLegacyPublicUrl(row.file_url)) {
      stats.skipped += 1
      continue
    }
    const path = extractDocumentsPath(row.file_url)
    if (!path) {
      stats.skipped += 1
      continue
    }
    if (DRY_RUN) {
      console.log(`[dry-run] documents.${row.id}: ${row.file_url} -> ${path}`)
      continue
    }
    const result = await reUploadToPrivate(path)
    if (!result.ok) {
      console.error(`documents.${row.id}: re-upload failed: ${result.error}`)
      stats.errors += 1
      continue
    }
    const { error: updErr } = await admin
      .from("documents")
      .update({ file_url: result.newPath })
      .eq("id", row.id)
    if (updErr) {
      console.error(`documents.${row.id}: DB update failed: ${updErr.message}`)
      stats.errors += 1
      continue
    }
    if (DELETE_ORIGINALS) {
      await admin.storage.from("documents").remove([path])
    }
    stats.documents_migrated += 1
  }

  console.log("CIN privacy migration complete:")
  console.log(JSON.stringify(stats, null, 2))
  if (stats.errors > 0) process.exit(4)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
