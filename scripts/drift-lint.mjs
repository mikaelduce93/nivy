#!/usr/bin/env node
/**
 * drift-lint — garde-fou « drift schéma & catch muet » (V7 #255).
 *
 * Jumeau de `scripts/suspense-lint.mjs` (même contrat CLI, même mécanique
 * baseline : on tolère l'existant et on bloque le net-new).
 *
 * ── LE PROBLÈME ────────────────────────────────────────────────────────────
 * La table `profiles` live ne contient que l'identité auth
 * {id,email,full_name,avatar_url,role,created_at,updated_at,is_onboarded,
 * is_deletion_pending}. Lire `profiles.pseudo` / `.level` / `.xp` / `.username`
 * / `.coins` / `.parent_id` / `.is_muted` / `.muted_until`, ou la table totalement
 * inexistante `user_profiles`, lève une erreur Postgres (42703 / 42P01) — c'est le
 * drift qui a causé le bug « Error fetching user crew: {} » (audit 2026-06-03).
 * Et un `catch {}` vide avale le SQLSTATE, rendant ce genre de panne invisible.
 *
 * ── LES RÈGLES ─────────────────────────────────────────────────────────────
 *   DRIFT-001  référence à la table fantôme `user_profiles` (n'existe pas live).
 *   DRIFT-002  lecture/écriture d'une colonne fantôme de `profiles`
 *              (pseudo|level|xp|username|coins|parent_id|is_muted|muted_until),
 *              soit en accès `profiles.<col>`, soit en embed `profiles:<fk>(...<col>...)`,
 *              soit dans un `.select/.eq/.update(...)` à ≤10 lignes d'un `.from('profiles')`.
 *              Sources réelles : pseudo→teens.pseudo, level→user_xp.current_level,
 *              total_xp→user_xp.total_xp, coins→user_coins.balance,
 *              parent_id→teens.parent_id/parent_teen_links.
 *   DRIFT-003  `catch {}` / `catch (e) {}` vide (panne DB avalée sans log).
 *              Préférer `logDbError(scope, error)` (lib/observability/log-db-error.ts).
 *
 * ── SCOPE (V7) ─────────────────────────────────────────────────────────────
 * app/teen/** et gamification-system/features/** (.ts/.tsx). L'extension à tout
 * le repo + l'intégration CI sont suivies par V8 #265.
 *
 * Baseline file:   docs/compliance/drift-baseline.json
 * Modes:
 *   (default)         scan staged files, FAIL on violations (pre-commit).
 *   --all             scan full scope, print counts by rule — exit 0 (informational).
 *   --baseline-write  scan full scope, regenerate the baseline — exit 0.
 *   --enforce         CI gate: FAIL on (1) net-new (file,rule) pair, (2) count > baseline.
 *
 * Bypass per-file: `// drift-allow: <rationale>` anywhere in the file.
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { sep } from 'node:path'

const BASELINE_PATH = 'docs/compliance/drift-baseline.json'

const GHOST_TABLE = /\buser_profiles\b/
const GHOST_COLS = '(?:pseudo|level|xp|username|coins|parent_id|is_muted|muted_until)'
const GHOST_PROP = new RegExp(`\\bprofiles\\s*\\??\\.\\s*${GHOST_COLS}\\b`)
const GHOST_EMBED = new RegExp(`profiles\\s*:\\s*\\w+\\s*\\([^)]*\\b${GHOST_COLS}\\b[^)]*\\)`)
const FROM_PROFILES = /\.from\(\s*['"]profiles['"]\s*\)/
const SELECT_LIKE = new RegExp(`\\.(?:select|eq|update|insert)\\([^)]*\\b${GHOST_COLS}\\b`)
const EMPTY_CATCH = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/
const ALLOW_INLINE = /drift-allow:/

const RULES = {
  'DRIFT-001': 'référence à la table fantôme `user_profiles` (inexistante live → 42P01).',
  'DRIFT-002': 'colonne fantôme de `profiles` (pseudo/level/xp/username/coins/parent_id/is_muted/muted_until → 42703). Source réelle: teens / user_xp / user_coins.',
  'DRIFT-003': 'catch {} vide : la panne DB est avalée sans log. Utiliser logDbError(scope, error).',
}

function shouldScanFile(file) {
  const norm = file.split(sep).join('/')
  if (!/\.(ts|tsx)$/.test(norm)) return false
  if (/\.d\.ts$/.test(norm)) return false
  return norm.startsWith('app/teen/') || norm.startsWith('gamification-system/features/')
}

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' })
  return out.split('\n').filter((f) => f && shouldScanFile(f))
}

function getAllFiles() {
  const all = execSync('git ls-files', { encoding: 'utf8' })
  return all.split('\n').filter((f) => f && shouldScanFile(f))
}

function readFileSafe(file) {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

// Returns array of { ruleId, line } violations for one file, or [].
function scanFile(file) {
  const src = readFileSafe(file)
  if (!src) return []
  if (ALLOW_INLINE.test(src)) return []
  const lines = src.split('\n')
  const out = []
  // Track distance from the last `.from('profiles')` for the windowed select rule.
  let sinceFromProfiles = Infinity
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    if (GHOST_TABLE.test(ln)) out.push({ ruleId: 'DRIFT-001', line: i + 1 })
    if (GHOST_PROP.test(ln) || GHOST_EMBED.test(ln)) out.push({ ruleId: 'DRIFT-002', line: i + 1 })
    if (FROM_PROFILES.test(ln)) sinceFromProfiles = 0
    if (sinceFromProfiles <= 10 && SELECT_LIKE.test(ln)) out.push({ ruleId: 'DRIFT-002', line: i + 1 })
    if (EMPTY_CATCH.test(ln)) out.push({ ruleId: 'DRIFT-003', line: i + 1 })
    sinceFromProfiles++
  }
  return out
}

function scanFiles(files) {
  const violations = []
  for (const file of files) {
    const norm = file.split(sep).join('/')
    for (const v of scanFile(norm)) {
      violations.push({ file: norm, ruleId: v.ruleId, line: v.line })
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
  for (const v of violations) map[v.ruleId] = (map[v.ruleId] || 0) + 1
  return map
}

function reportViolations(violations, header) {
  if (header) console.error(header)
  for (const v of violations) {
    console.error(`  [${v.ruleId}] ${v.file}:${v.line}`)
    console.error(`    ${RULES[v.ruleId]}`)
  }
}

function modeStaged() {
  const files = getStagedFiles()
  if (!files.length) {
    console.log('drift-lint: no staged files in scope.')
    return 0
  }
  const violations = scanFiles(files)
  if (!violations.length) {
    console.log(`drift-lint: clean (${files.length} file(s) scanned).`)
    return 0
  }
  reportViolations(violations, `drift-lint: ${violations.length} violation(s) in staged files.\n`)
  console.error('\nBypass: add `// drift-allow: <rationale>` in the file.')
  return 1
}

function modeAllInformational() {
  const files = getAllFiles()
  const violations = scanFiles(files)
  const byRule = aggregateByRule(violations)
  console.log(`drift-lint: ${violations.length} violation(s) across ${files.length} file(s) (informational).`)
  console.log('\nBy rule:')
  for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${count}`)
  }
  for (const v of violations) console.log(`  - ${v.file}:${v.line} [${v.ruleId}]`)
  return 0
}

function modeBaselineWrite() {
  const files = getAllFiles()
  const violations = scanFiles(files)
  const baseline = {
    generated_at: new Date().toISOString().slice(0, 10),
    audit_source: 'V7 #255 (drift profiles/user_profiles + empty-catch guard)',
    total_violations: violations.length,
    files_in_scope: files.length,
    violations_by_rule: aggregateByRule(violations),
    violations_by_file_rule: aggregateByFileRule(violations),
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf8')
  console.log(`drift-lint: baseline written to ${BASELINE_PATH}`)
  console.log(`  total: ${violations.length} violations across ${Object.keys(baseline.violations_by_file_rule).length} files`)
  return 0
}

function modeEnforce() {
  if (!existsSync(BASELINE_PATH)) {
    console.error('drift-lint: baseline missing — run `npm run lint:drift:baseline` first.')
    return 2
  }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  const baselineFR = baseline.violations_by_file_rule || {}
  const files = getAllFiles()
  const currentFR = aggregateByFileRule(scanFiles(files))

  const newViolations = []
  const regressions = []
  for (const [file, rules] of Object.entries(currentFR)) {
    for (const [ruleId, count] of Object.entries(rules)) {
      const baseCount = baselineFR[file]?.[ruleId] ?? 0
      if (baseCount === 0) newViolations.push({ file, ruleId, count })
      else if (count > baseCount) regressions.push({ file, ruleId, baseline: baseCount, current: count })
    }
  }

  if (newViolations.length === 0 && regressions.length === 0) {
    console.log('drift-enforce: gate PASSED. 0 regressions, 0 net-new.')
    return 0
  }
  if (newViolations.length) {
    console.error(`drift-enforce: ${newViolations.length} NET-NEW violation(s):`)
    for (const v of newViolations) console.error(`  + ${v.file} [${v.ruleId}] (${v.count}) — ${RULES[v.ruleId]}`)
  }
  if (regressions.length) {
    console.error(`\ndrift-enforce: ${regressions.length} REGRESSION(s):`)
    for (const r of regressions) console.error(`  ↑ ${r.file} [${r.ruleId}] ${r.baseline} → ${r.current}`)
  }
  console.error('\nGate FAILED. Corriger le drift (teens/user_xp/user_coins), logger via logDbError, ou `// drift-allow: <rationale>`.')
  return 1
}

function main() {
  switch (process.argv[2]) {
    case '--all': return modeAllInformational()
    case '--baseline-write': return modeBaselineWrite()
    case '--enforce': return modeEnforce()
    default: return modeStaged()
  }
}

process.exit(main())
