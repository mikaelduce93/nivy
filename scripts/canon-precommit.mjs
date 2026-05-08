#!/usr/bin/env node
/**
 * Canon pre-commit guard (Wave 0 — Safety Freeze).
 *
 * Greps STAGED files for canon-forbidden patterns (added lines only — uses
 * `git diff --cached`). Exits non-zero on any violation in net-new code.
 *
 * Source of truth: docs/canon/INDEX.locked.md + docs/compliance/16-implementation-roadmap.md.
 *
 * Bypass (rare, justified): add `// canon-allow: <rationale>` on the line that
 * triggers the rule, OR pass `--no-verify` to git commit (logged via CI later).
 *
 * Usage:
 *   node scripts/canon-precommit.mjs           # auto-runs against staged diff
 *   node scripts/canon-precommit.mjs --all     # scans the whole tree (CI fallback)
 */

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const CANON_RULES = [
  // [CANON-XP] phantom RPCs
  {
    id: 'CANON-XP-001',
    pattern: /\badd_user_xp\b/,
    message: 'phantom RPC `add_user_xp` — use `add_xp_to_user` (canon: economy-payments §7).',
  },
  {
    id: 'CANON-XP-002',
    pattern: /\bdeduct_user_xp\b/,
    message: 'phantom RPC `deduct_user_xp` — use canonical spend_* RPC family (canon: economy-payments §7).',
  },
  {
    id: 'CANON-XP-003',
    pattern: /\bget_user_xp\b/,
    message: 'phantom RPC `get_user_xp` — read `user_xp.total_xp` directly (canon: economy-payments §1).',
  },
  // [CANON-NOTIF] deprecated tables
  {
    id: 'CANON-NOTIF-001',
    pattern: /\.from\(["']notifications["']\)/,
    message: '`notifications` is deprecated — use `user_notifications` (canon: parent-control §8, INDEX #5).',
  },
  {
    id: 'CANON-NOTIF-002',
    pattern: /\.from\(["']activity_logs["']\)/,
    message: '`activity_logs` is deprecated — use `user_notifications` or `audit_log` (canon: parent-control §8).',
  },
  {
    id: 'CANON-NOTIF-003',
    pattern: /INSERT\s+INTO\s+notifications\b/i,
    message: 'SQL `INSERT INTO notifications` — table is deprecated. Use `user_notifications`.',
  },
  {
    id: 'CANON-NOTIF-004',
    pattern: /INSERT\s+INTO\s+activity_logs\b/i,
    message: 'SQL `INSERT INTO activity_logs` — table is deprecated.',
  },
  // [CANON-AUDIT] audit_log singular wins (DECIDED 2026-05-08)
  {
    id: 'CANON-AUDIT-001',
    pattern: /\.from\(["']admin_audit_logs["']\)/,
    message: '`admin_audit_logs` is deprecated — canonical is `audit_log` (singular). Canon: admin-moderation §4, DECIDED 2026-05-08.',
  },
  {
    id: 'CANON-AUDIT-002',
    pattern: /["']admin_audit_logs["']/,
    message: '`admin_audit_logs` literal — canonical table is `audit_log` (singular). Canon: admin-moderation §4.',
  },
  // [CANON-ALERT] window.alert / window.confirm
  {
    id: 'CANON-ALERT-001',
    pattern: /\bwindow\.alert\s*\(/,
    message: '`window.alert()` is forbidden. Use sonner `toast()` for notifications. Canon: design-system §11.',
  },
  {
    id: 'CANON-ALERT-002',
    pattern: /\bwindow\.confirm\s*\(/,
    message: '`window.confirm()` is forbidden. Use ResponsiveModal. Canon: design-system §11.',
  },
  // [CANON-MOTION] raw framer-motion imports
  {
    id: 'CANON-MOTION-001',
    pattern: /^(?:import|from)\s+(?:[^'"]*\s+from\s+)?['"]framer-motion['"]/,
    message: 'raw `framer-motion` import — use `@/components/ui/motion` proxy. Canon: INDEX #4, design-system §3.',
    allowFiles: [/components[\\/]ui[\\/]motion\.tsx$/, /components[\\/]ui[\\/]motion[\\/]/, /lib[\\/]motion[\\/]/],
  },
  // [CANON-AI-MODEL] hardcoded deprecated model literals
  {
    id: 'CANON-AI-001',
    pattern: /["']claude-3-(sonnet|haiku|opus)[^"']*["']/,
    message: 'hardcoded deprecated Claude model. Use `process.env.CLAUDE_MODEL_ID` (default `claude-sonnet-4-6`). Canon: personalization-ai §8.',
  },
  {
    id: 'CANON-AI-002',
    pattern: /["']gpt-(3\.5|4)["']/,
    message: 'hardcoded OpenAI model literal. Use `process.env.OPENAI_MODEL_ID`. Canon: personalization-ai §8.',
  },
  // [CANON-SHOP] deprecated shop rails
  {
    id: 'CANON-SHOP-001',
    pattern: /\.from\(["']shop_items["']\)/,
    message: '`shop_items` is deprecated. Use canonical `shop_rewards` + `purchase_reward` RPC. Canon: economy-payments §3.',
  },
  {
    id: 'CANON-SHOP-002',
    pattern: /\.from\(["']token_rewards["']\)/,
    message: '`token_rewards` is deprecated. Use `shop_rewards`. Canon: economy-payments §3.',
  },
  {
    id: 'CANON-SHOP-003',
    pattern: /["']transfer_tokens["']/,
    message: '`transfer_tokens` RPC is deprecated (security hole — bypasses parents). Canon: economy-payments §5.',
  },
  // [CANON-BUCKET]
  {
    id: 'CANON-BUCKET-001',
    pattern: /["']defi-proofs["']/,
    message: '`defi-proofs` bucket is deprecated. Use `chore-evidence` (private). Canon: gamification §3.',
  },
  // [CANON-AUTH-SIGNUP] auth.signUp outside canonical paths
  {
    id: 'CANON-AUTH-001',
    pattern: /\bsupabase\s*\.\s*auth\s*\.\s*signUp\s*\(/,
    message: '`supabase.auth.signUp()` outside the canonical sign-up flow. Use `/auth/sign-up` route or `supabase.auth.admin.createUser()`. Canon: auth-onboarding FORBIDDEN #3.',
    allowFiles: [
      /app[\\/]auth[\\/]sign-up[\\/]/,
      /app[\\/]api[\\/]auth[\\/]sign-up[\\/]/,
      /app[\\/]api[\\/]admin[\\/]users[\\/]/,
      /lib[\\/]auth[\\/]admin-create-user\.ts$/,
      /lib[\\/]supabase[\\/]admin\.ts$/,
    ],
  },
  // [CANON-PROFILES-INSERT] direct insert into profiles
  {
    id: 'CANON-PROFILES-001',
    pattern: /\.from\(["']profiles["']\)\s*\.\s*insert/,
    message: 'direct INSERT INTO `profiles` — only `handle_new_user` trigger or approved admin tools may create profile rows. Canon: auth-onboarding FORBIDDEN #1.',
    allowFiles: [
      /app[\\/]api[\\/]admin[\\/]users[\\/]/,
      /lib[\\/]auth[\\/]admin-create-user\.ts$/,
      /scripts[\\/]seed-/,
    ],
  },
]

const ALLOW_INLINE = /canon-allow:/

// Application code scope only — exclude tooling, docs, migrations, audit reports.
const APP_SCOPE = /^(app|components|lib|hooks)\//
const EXCLUDE = [
  /^docs\//,
  /^scripts\//,
  /^gamification-system\/database\//,
  /^supabase\/migrations\//,
  /^tests\//,
  /\.compliance\./,
  /^\.agents\//,
  /^\.claude\//,
  /^node_modules\//,
]

function shouldScanFile(file) {
  if (EXCLUDE.some((re) => re.test(file))) return false
  if (!APP_SCOPE.test(file)) return false
  return /\.(ts|tsx|js|jsx)$/.test(file)
}

function getStagedFiles(scanAll) {
  if (scanAll) {
    const all = execSync('git ls-files', { encoding: 'utf8' })
    return all.split('\n').filter((f) => f && shouldScanFile(f))
  }
  const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' })
  return out.split('\n').filter((f) => f && shouldScanFile(f))
}

function getAddedLines(file) {
  // Get added lines from staged diff (lines starting with "+", excluding "+++")
  try {
    const diff = execSync(`git diff --cached -U0 -- "${file}"`, { encoding: 'utf8' })
    const lines = []
    let lineNum = 0
    let inHunk = false
    for (const line of diff.split('\n')) {
      const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (hunkMatch) {
        lineNum = parseInt(hunkMatch[1], 10) - 1
        inHunk = true
        continue
      }
      if (!inHunk) continue
      if (line.startsWith('+++') || line.startsWith('---')) continue
      if (line.startsWith('+')) {
        lineNum++
        lines.push({ lineNum, text: line.slice(1) })
      } else if (line.startsWith(' ')) {
        lineNum++
      }
    }
    return lines
  } catch {
    return []
  }
}

function getAllLines(file) {
  try {
    const content = readFileSync(file, 'utf8')
    return content.split('\n').map((text, i) => ({ lineNum: i + 1, text }))
  } catch {
    return []
  }
}

function shouldAllowFile(rule, file) {
  if (!rule.allowFiles) return false
  return rule.allowFiles.some((re) => re.test(file))
}

function main() {
  const scanAll = process.argv.includes('--all')
  const files = getStagedFiles(scanAll)
  if (!files.length) {
    console.log('canon-precommit: no staged files (or --all with empty repo).')
    return 0
  }

  const violations = []
  for (const file of files) {
    const lines = scanAll ? getAllLines(file) : getAddedLines(file)
    if (!lines.length) continue
    for (const { lineNum, text } of lines) {
      if (ALLOW_INLINE.test(text)) continue
      for (const rule of CANON_RULES) {
        if (shouldAllowFile(rule, file)) continue
        if (rule.pattern.test(text)) {
          violations.push({ file, line: lineNum, ruleId: rule.id, message: rule.message, text: text.trim().slice(0, 120) })
        }
      }
    }
  }

  if (!violations.length) {
    console.log(`canon-precommit: clean (${files.length} file${files.length === 1 ? '' : 's'} scanned).`)
    return 0
  }

  console.error(`canon-precommit: ${violations.length} violation${violations.length === 1 ? '' : 's'} in net-new code.\n`)
  for (const v of violations) {
    console.error(`  [${v.ruleId}] ${v.file}:${v.line}`)
    console.error(`    ${v.message}`)
    console.error(`    > ${v.text}\n`)
  }
  console.error('Bypass (rare, justified): add `// canon-allow: <rationale>` on the offending line, then re-stage.')
  console.error('Or commit with `--no-verify` (CI will still flag it later).')
  return 1
}

process.exit(main())
