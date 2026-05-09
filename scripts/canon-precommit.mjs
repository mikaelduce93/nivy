#!/usr/bin/env node
/**
 * Canon compliance gate (Wave 0 — Safety Freeze).
 *
 * Source of truth: docs/canon/INDEX.locked.md + docs/compliance/16-implementation-roadmap.md.
 * Baseline file:   docs/compliance/canon-baseline.json
 *
 * Modes:
 *   (default)         pre-commit: scan staged diff (git diff --cached) — FAIL on any violation in net-new lines.
 *   --all             informational full-tree scan — exit 0 even with violations.
 *   --baseline-write  scan full tree, regenerate docs/compliance/canon-baseline.json — exit 0.
 *   --enforce         CI gate: scan full tree, compare to baseline — FAIL on:
 *                       (1) any (file, ruleId) pair NOT in baseline (= net-new violation)
 *                       (2) any (file, ruleId) where current count > baseline count (= regression)
 *                     Existing baseline violations are tolerated until Wave 1+ fixes them.
 *
 * Bypass per-line: `// canon-allow: <rationale>` on the offending line.
 * Bypass per-commit: `git commit --no-verify` (CI still flags it).
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const BASELINE_PATH = 'docs/compliance/canon-baseline.json'

const CANON_RULES = [
  // [CANON-XP] phantom RPCs
  { id: 'CANON-XP-001', pattern: /\badd_user_xp\b/, message: 'phantom RPC `add_user_xp` — use `add_xp_to_user` (canon: economy-payments §7).' },
  { id: 'CANON-XP-002', pattern: /\bdeduct_user_xp\b/, message: 'phantom RPC `deduct_user_xp` — use canonical spend_* RPC family.' },
  { id: 'CANON-XP-003', pattern: /\bget_user_xp\b/, message: 'phantom RPC `get_user_xp` — read `user_xp.total_xp` directly.' },
  // [CANON-NOTIF] deprecated tables
  { id: 'CANON-NOTIF-001', pattern: /\.from\(["']notifications["']\)/, message: '`notifications` deprecated — use `user_notifications`.' },
  { id: 'CANON-NOTIF-002', pattern: /\.from\(["']activity_logs["']\)/, message: '`activity_logs` deprecated — use `user_notifications` or `audit_log`.' },
  { id: 'CANON-NOTIF-003', pattern: /INSERT\s+INTO\s+notifications\b/i, message: 'SQL INSERT INTO `notifications` — table deprecated.' },
  { id: 'CANON-NOTIF-004', pattern: /INSERT\s+INTO\s+activity_logs\b/i, message: 'SQL INSERT INTO `activity_logs` — table deprecated.' },
  // [CANON-AUDIT] audit_log singular wins (DECIDED 2026-05-08)
  { id: 'CANON-AUDIT-001', pattern: /\.from\(["']admin_audit_logs["']\)/, message: '`admin_audit_logs` deprecated — canonical is `audit_log` (singular).' },
  { id: 'CANON-AUDIT-002', pattern: /["']admin_audit_logs["']/, message: '`admin_audit_logs` literal — canonical is `audit_log`.' },
  // [CANON-ALERT]
  { id: 'CANON-ALERT-001', pattern: /\bwindow\.alert\s*\(/, message: '`window.alert()` forbidden — use sonner toast().' },
  { id: 'CANON-ALERT-002', pattern: /\bwindow\.confirm\s*\(/, message: '`window.confirm()` forbidden — use ResponsiveModal.' },
  { id: 'CANON-ALERT-003', pattern: /\bwindow\.prompt\s*\(/, message: '`window.prompt()` forbidden — use Dialog with form input.' },
  // [CANON-MOTION]
  {
    id: 'CANON-MOTION-001',
    pattern: /^(?:import|from)\s+(?:[^'"]*\s+from\s+)?['"]framer-motion['"]/,
    message: 'raw `framer-motion` import — use `@/components/ui/motion` proxy.',
    allowFiles: [/components[\\/]ui[\\/]motion\.tsx$/, /components[\\/]ui[\\/]motion[\\/]/, /lib[\\/]motion[\\/]/],
  },
  // [CANON-AI-MODEL]
  { id: 'CANON-AI-001', pattern: /["']claude-3-(sonnet|haiku|opus)[^"']*["']/, message: 'hardcoded deprecated Claude model — use `process.env.CLAUDE_MODEL_ID`.' },
  { id: 'CANON-AI-002', pattern: /["']gpt-(3\.5|4)["']/, message: 'hardcoded OpenAI model — use `process.env.OPENAI_MODEL_ID`.' },
  // [CANON-SHOP]
  { id: 'CANON-SHOP-001', pattern: /\.from\(["']shop_items["']\)/, message: '`shop_items` deprecated — use `shop_rewards` + `purchase_reward`.' },
  { id: 'CANON-SHOP-002', pattern: /\.from\(["']token_rewards["']\)/, message: '`token_rewards` deprecated — use `shop_rewards`.' },
  { id: 'CANON-SHOP-003', pattern: /["']transfer_tokens["']/, message: '`transfer_tokens` deprecated — security hole, bypasses parents.' },
  // [CANON-BUCKET]
  { id: 'CANON-BUCKET-001', pattern: /["']defi-proofs["']/, message: '`defi-proofs` bucket deprecated — use `chore-evidence` (private).' },
  // [CANON-AUTH-SIGNUP]
  {
    id: 'CANON-AUTH-001',
    pattern: /\bsupabase\s*\.\s*auth\s*\.\s*signUp\s*\(/,
    message: '`supabase.auth.signUp()` outside canonical sign-up flow.',
    allowFiles: [
      /app[\\/]auth[\\/]sign-up[\\/]/,
      /app[\\/]api[\\/]auth[\\/]sign-up[\\/]/,
      /app[\\/]api[\\/]admin[\\/]users[\\/]/,
      /lib[\\/]auth[\\/]admin-create-user\.ts$/,
      /lib[\\/]supabase[\\/]admin\.ts$/,
    ],
  },
  // [CANON-PROFILES-INSERT]
  {
    id: 'CANON-PROFILES-001',
    pattern: /\.from\(["']profiles["']\)\s*\.\s*insert/,
    message: 'direct INSERT INTO `profiles` — only `handle_new_user` trigger or admin tools.',
    allowFiles: [/app[\\/]api[\\/]admin[\\/]users[\\/]/, /lib[\\/]auth[\\/]admin-create-user\.ts$/, /scripts[\\/]seed-/],
  },
  // [CANON-AI-PII] Wave 1B — PII forbidden in AI prompts/contexts.
  // Scope-limited via `onlyFiles`: only flag files in lib/ai/** or
  // app/api/agent/**. Other surfaces may legitimately read full_name.
  {
    id: 'CANON-AI-PII-001',
    pattern: /\b(full_name|first_name|last_name)\b/,
    message: 'PII reference (full_name / first_name / last_name) on AI/agent path — use `pseudo` + `age_bucket` via `safeAiContext`.',
    onlyFiles: [/^lib[\\/]ai[\\/]/, /^app[\\/]api[\\/]agent[\\/]/],
    // The scrubber itself enumerates these keys to drop them.
    allowFiles: [/lib[\\/]ai[\\/]safe-context\.ts$/],
  },
  // [CANON-CIN-PUBLIC] Wave 1B — CIN must never use getPublicUrl.
  {
    id: 'CANON-CIN-001',
    pattern: /\.from\(['"]cin-scans['"]\)[\s\S]*?\.getPublicUrl\(/,
    message: 'CIN must use createSignedUrl (private bucket). See lib/storage/cin-signed-url.ts.',
  },
]

const ALLOW_INLINE = /canon-allow:/

const APP_SCOPE = /^(app|components|lib|hooks)\//
const EXCLUDE = [
  /^docs\//, /^scripts\//, /^gamification-system\/database\//, /^supabase\/migrations\//,
  /^tests\//, /\.compliance\./, /^\.agents\//, /^\.claude\//, /^node_modules\//,
]

function shouldScanFile(file) {
  if (EXCLUDE.some((re) => re.test(file))) return false
  if (!APP_SCOPE.test(file)) return false
  return /\.(ts|tsx|js|jsx)$/.test(file)
}

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' })
  return out.split('\n').filter((f) => f && shouldScanFile(f))
}

function getAllFiles() {
  const all = execSync('git ls-files', { encoding: 'utf8' })
  return all.split('\n').filter((f) => f && shouldScanFile(f))
}

function getAddedLines(file) {
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

function isInRuleScope(rule, file) {
  if (!rule.onlyFiles) return true
  return rule.onlyFiles.some((re) => re.test(file))
}

function scanFiles(files, opts = {}) {
  const { stagedOnly = false } = opts
  const violations = []
  for (const file of files) {
    const lines = stagedOnly ? getAddedLines(file) : getAllLines(file)
    if (!lines.length) continue
    for (const { lineNum, text } of lines) {
      if (ALLOW_INLINE.test(text)) continue
      for (const rule of CANON_RULES) {
        if (!isInRuleScope(rule, file)) continue
        if (shouldAllowFile(rule, file)) continue
        if (rule.pattern.test(text)) {
          violations.push({ file, line: lineNum, ruleId: rule.id, message: rule.message, text: text.trim().slice(0, 120) })
        }
      }
    }
  }
  return violations
}

function aggregateByFileRule(violations) {
  const map = {}
  for (const v of violations) {
    if (!map[v.file]) map[v.file] = {}
    map[v.file][v.ruleId] = (map[v.file][v.ruleId] || 0) + 1
  }
  return map
}

function aggregateByRule(violations) {
  const map = {}
  for (const v of violations) {
    map[v.ruleId] = (map[v.ruleId] || 0) + 1
  }
  return map
}

function reportViolations(violations, header) {
  if (header) console.error(header)
  for (const v of violations) {
    console.error(`  [${v.ruleId}] ${v.file}:${v.line}`)
    console.error(`    ${v.message}`)
    console.error(`    > ${v.text}`)
  }
}

function modeStaged() {
  const files = getStagedFiles()
  if (!files.length) {
    console.log('canon-precommit: no staged files in scope.')
    return 0
  }
  const violations = scanFiles(files, { stagedOnly: true })
  if (!violations.length) {
    console.log(`canon-precommit: clean (${files.length} file${files.length === 1 ? '' : 's'} scanned).`)
    return 0
  }
  reportViolations(violations, `canon-precommit: ${violations.length} violation${violations.length === 1 ? '' : 's'} in net-new code.\n`)
  console.error('\nBypass: add `// canon-allow: <rationale>` on the offending line, or `git commit --no-verify` (CI still flags).')
  return 1
}

function modeAllInformational() {
  const files = getAllFiles()
  const violations = scanFiles(files)
  const byRule = aggregateByRule(violations)
  console.log(`canon-precommit: ${violations.length} violation${violations.length === 1 ? '' : 's'} across ${files.length} file${files.length === 1 ? '' : 's'} (informational).`)
  console.log('\nBy rule:')
  for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${count}`)
  }
  return 0
}

function modeBaselineWrite() {
  const files = getAllFiles()
  const violations = scanFiles(files)
  const byRule = aggregateByRule(violations)
  const byFileRule = aggregateByFileRule(violations)
  const baseline = {
    generated_at: new Date().toISOString().slice(0, 10),
    audit_source: 'docs/compliance/* (Wave 0 — Safety Freeze)',
    total_violations: violations.length,
    files_in_scope: files.length,
    violations_by_rule: byRule,
    violations_by_file_rule: byFileRule,
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf8')
  console.log(`canon-precommit: baseline written to ${BASELINE_PATH}`)
  console.log(`  total: ${violations.length} violations across ${Object.keys(byFileRule).length} files`)
  return 0
}

function modeEnforce() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(`canon-precommit: baseline missing — run \`npm run lint:canon:baseline\` first.`)
    return 2
  }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  const baselineFR = baseline.violations_by_file_rule || {}

  const files = getAllFiles()
  const violations = scanFiles(files)
  const currentFR = aggregateByFileRule(violations)

  const newViolations = []
  const regressions = []
  const improvements = []

  // (1) any (file, ruleId) NOT in baseline = net-new
  // (2) any (file, ruleId) where current > baseline = regression
  for (const [file, rules] of Object.entries(currentFR)) {
    for (const [ruleId, count] of Object.entries(rules)) {
      const baselineCount = baselineFR[file]?.[ruleId] ?? 0
      if (baselineCount === 0) {
        newViolations.push({ file, ruleId, count })
      } else if (count > baselineCount) {
        regressions.push({ file, ruleId, baseline: baselineCount, current: count })
      }
    }
  }

  // Track improvements (informational)
  for (const [file, rules] of Object.entries(baselineFR)) {
    for (const [ruleId, baselineCount] of Object.entries(rules)) {
      const current = currentFR[file]?.[ruleId] ?? 0
      if (current < baselineCount) {
        improvements.push({ file, ruleId, baseline: baselineCount, current })
      }
    }
  }

  if (improvements.length) {
    console.log(`canon-enforce: ${improvements.length} improvement${improvements.length === 1 ? '' : 's'} since baseline:`)
    for (const i of improvements) {
      console.log(`  ↓ ${i.file} [${i.ruleId}] ${i.baseline} → ${i.current}`)
    }
    console.log('')
  }

  if (newViolations.length === 0 && regressions.length === 0) {
    console.log(`canon-enforce: gate PASSED. ${violations.length} baseline violations tracked, 0 regressions, 0 net-new.`)
    return 0
  }

  if (newViolations.length) {
    console.error(`canon-enforce: ${newViolations.length} NET-NEW violation${newViolations.length === 1 ? '' : 's'} (file/rule pair not in baseline):`)
    for (const v of newViolations) {
      console.error(`  + ${v.file} [${v.ruleId}] (${v.count} occurrence${v.count === 1 ? '' : 's'})`)
    }
  }

  if (regressions.length) {
    console.error(`\ncanon-enforce: ${regressions.length} REGRESSION${regressions.length === 1 ? '' : 's'} (count exceeds baseline):`)
    for (const r of regressions) {
      console.error(`  ↑ ${r.file} [${r.ruleId}] ${r.baseline} → ${r.current}`)
    }
  }

  console.error('\nGate FAILED. Either fix the new code, or — if intentional — regenerate the baseline:')
  console.error('  npm run lint:canon:baseline      (regenerate after fixing)')
  console.error('  // canon-allow: <rationale>      (per-line escape hatch)')
  return 1
}

function main() {
  const arg = process.argv[2]
  switch (arg) {
    case '--all':            return modeAllInformational()
    case '--baseline-write': return modeBaselineWrite()
    case '--enforce':        return modeEnforce()
    default:                 return modeStaged()
  }
}

process.exit(main())
