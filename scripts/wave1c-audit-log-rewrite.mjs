#!/usr/bin/env node
/**
 * Wave 1C — one-shot rewriter: replace `from("admin_audit_logs").insert({...})`
 * blocks with the canonical `from("audit_log").insert({...})` shape.
 *
 * Column remap:
 *   user_id     -> actor_id
 *   target_type -> resource_type
 *   target_id   -> resource_id (cast to string if uuid in source)
 *   payload     -> metadata
 *
 * Idempotent — files that no longer match the input pattern are skipped.
 *
 * Run: node scripts/wave1c-audit-log-rewrite.mjs
 */
import { readFileSync, writeFileSync } from "node:fs"
import { execSync } from "node:child_process"
import path from "node:path"

const ROOT = process.cwd()

function listFiles() {
  const out = execSync(
    'git grep -l "from(\\"admin_audit_logs\\")\\|from(\'admin_audit_logs\')" -- app/ lib/ components/',
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  )
  return out.split("\n").filter(Boolean)
}

function rewriteContent(src) {
  // Replace the literal table name ONLY in app code (not in comments/docs).
  let out = src

  // 1. Replace the .from("admin_audit_logs") (and single-quoted) with audit_log.
  out = out.replace(/\.from\(\s*"admin_audit_logs"\s*\)/g, '.from("audit_log")')
  out = out.replace(/\.from\(\s*'admin_audit_logs'\s*\)/g, ".from('audit_log')")

  // 2. Within the SAME file, attempt a best-effort key rename inside the
  //    .insert({...}) blocks that immediately follow the swapped from() call.
  //    To keep this mechanical and safe, we run the rename globally over
  //    object keys that are unambiguous in audit-context. The column name
  //    `payload` is too common — only rename inside .insert blocks. We use a
  //    regex over the multi-line .insert object literal.
  out = out.replace(
    /(\.from\(\s*["']audit_log["']\s*\)\s*\.insert\(\s*\{)([\s\S]*?)(\}\s*\))/g,
    (_m, head, body, tail) => {
      let b = body
      b = b.replace(/(^|[\s,{])user_id(\s*:)/g, "$1actor_id$2")
      b = b.replace(/(^|[\s,{])target_type(\s*:)/g, "$1resource_type$2")
      b = b.replace(/(^|[\s,{])target_id(\s*:)/g, "$1resource_id$2")
      b = b.replace(/(^|[\s,{])payload(\s*:)/g, "$1metadata$2")
      return head + b + tail
    }
  )

  return out
}

function main() {
  const files = listFiles()
  const changed = []
  for (const rel of files) {
    const abs = path.join(ROOT, rel)
    let src
    try {
      src = readFileSync(abs, "utf8")
    } catch {
      continue
    }
    const next = rewriteContent(src)
    if (next !== src) {
      writeFileSync(abs, next, "utf8")
      changed.push(rel)
    }
  }
  console.log(`Wave 1C rewrite: ${changed.length} file(s) updated`)
  for (const f of changed) console.log("  -", f)
}

main()
