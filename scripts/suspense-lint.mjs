#!/usr/bin/env node
/**
 * suspense-lint — garde-fou « CSR bailout » (V5 #216).
 *
 * Jumeau de `scripts/hierarchy-lint.mjs` (même contrat CLI, même mécanique
 * baseline : on tolère l'existant et on bloque le net-new).
 *
 * ── LE PROBLÈME (Next 16 App Router) ───────────────────────────────────────
 * Un composant `"use client"` qui lit `useSearchParams()` ou `usePathname()`
 * SANS ancêtre `<Suspense>` (et sans `export const dynamic`) fait basculer
 * TOUTE la route en CSR au build :
 *     Error: missing-suspense-with-csr-bailout
 * En prod cela se traduit par une page blanche / un crash AppRouter résolu
 * uniquement par un refresh — un bug latent invisible en dev.
 *
 * ── LE FIX (pattern Inner + <Suspense>) ────────────────────────────────────
 * Extraire le corps qui lit le hook dans un composant *Inner*, et l'envelopper
 * dans une frontière `<Suspense>` au niveau de la page :
 *
 *     function FooInner() {
 *       const searchParams = useSearchParams()
 *       // ...
 *     }
 *
 *     export default function FooPage() {
 *       return (
 *         <Suspense fallback={null}>
 *           <FooInner />
 *         </Suspense>
 *       )
 *     }
 *
 * Référence canonique : app/auth/sign-up/page.tsx (et app/partenaires/merci).
 * Quand le hook vit dans un `*-client.tsx`, la page serveur sœur l'enveloppe
 * dans `<Suspense>` (cf. app/teen/wallet/page.tsx) — c'est aussi couvert.
 *
 * ── LA RÈGLE (SUSPENSE-001) ────────────────────────────────────────────────
 * Un fichier .tsx sous app/ qui (a) contient `"use client"` ET (b) lit
 * `useSearchParams(` ou `usePathname(` est FLAGGÉ, SAUF si l'une de ces
 * conditions tient :
 *   1. le MÊME fichier contient `<Suspense` (il enveloppe son propre Inner), OU
 *   2. le MÊME fichier contient `export const dynamic`, OU
 *   3. un layout sœur/ancêtre (app/<dirs>/layout.tsx en remontant) contient
 *      `<Suspense`, OU
 *   4. le hook est dans un `*-client.tsx` dont la `page.tsx` sœur (même dossier)
 *      enveloppe un client dans `<Suspense`.
 *
 * Baseline file:   docs/compliance/suspense-baseline.json
 * Modes:
 *   (default)         scan staged files, FAIL on net-new in added lines (pre-commit).
 *   --all             scan full tree, print counts by rule — exit 0 (informational).
 *   --baseline-write  scan full tree, regenerate the baseline — exit 0.
 *   --enforce         CI gate: FAIL on (1) net-new (file,rule) pair, (2) count > baseline.
 *
 * Bypass per-file: `// suspense-allow: <rationale>` anywhere in the file.
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'

const BASELINE_PATH = 'docs/compliance/suspense-baseline.json'

const RULE_ID = 'SUSPENSE-001'
const RULE_MESSAGE =
  'composant "use client" lit useSearchParams()/usePathname() sans frontière <Suspense> — Next App Router bascule la route en CSR (missing-suspense-with-csr-bailout). Extraire un Inner + <Suspense fallback>. Cf. app/auth/sign-up/page.tsx.'

const USE_CLIENT = /["']use client["']/
const HOOK = /\b(?:useSearchParams|usePathname)\s*\(/
const HAS_SUSPENSE = /<Suspense\b/
const HAS_DYNAMIC = /export\s+const\s+dynamic\b/
const ALLOW_INLINE = /suspense-allow:/

// Scope : uniquement les fichiers .tsx sous app/ (c'est là que vit le bailout).
function shouldScanFile(file) {
  const norm = file.split(sep).join('/')
  if (!norm.startsWith('app/')) return false
  return /\.tsx$/.test(norm)
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

// Heuristic : walk up from the file's dir to app/ and check each layout.tsx
// for a <Suspense> boundary. Returns true as soon as one is found.
function layoutChainHasSuspense(file) {
  const norm = file.split(sep).join('/')
  let dir = dirname(norm)
  // Climb until we leave app/.
  while (dir && dir !== '.' && (dir === 'app' || dir.startsWith('app/'))) {
    const layout = join(dir, 'layout.tsx').split(sep).join('/')
    const src = readFileSafe(layout)
    if (src && HAS_SUSPENSE.test(src)) return true
    if (dir === 'app') break
    dir = dirname(dir)
  }
  return false
}

// Heuristic : if the hook lives in a child `*-client.tsx`, check whether the
// sibling `page.tsx` (same dir) wraps a client in <Suspense>.
function siblingPageWrapsInSuspense(file) {
  const norm = file.split(sep).join('/')
  if (!/-client\.tsx$/.test(norm)) return false
  const page = join(dirname(norm), 'page.tsx').split(sep).join('/')
  const src = readFileSafe(page)
  return !!(src && HAS_SUSPENSE.test(src))
}

function isCovered(file, src) {
  if (HAS_SUSPENSE.test(src)) return true // own Suspense (wraps its own Inner)
  if (HAS_DYNAMIC.test(src)) return true // opted into dynamic rendering
  if (layoutChainHasSuspense(file)) return true // ancestor layout boundary
  if (siblingPageWrapsInSuspense(file)) return true // page.tsx wraps the client
  return false
}

// Returns the 1-based line numbers where the hook is read (for reporting),
// or null if the file is not a violation candidate / is covered.
function scanFile(file) {
  const src = readFileSafe(file)
  if (!src) return null
  if (ALLOW_INLINE.test(src)) return null
  if (!USE_CLIENT.test(src)) return null
  if (!HOOK.test(src)) return null
  if (isCovered(file, src)) return null

  const lines = []
  const arr = src.split('\n')
  for (let i = 0; i < arr.length; i++) {
    if (HOOK.test(arr[i])) lines.push(i + 1)
  }
  return lines.length ? lines : [1]
}

function scanFiles(files) {
  const violations = []
  for (const file of files) {
    const norm = file.split(sep).join('/')
    const lines = scanFile(norm)
    if (lines) {
      violations.push({ file: norm, ruleId: RULE_ID, lines, count: 1 })
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
    console.error(`  [${v.ruleId}] ${v.file}:${v.lines.join(',')}`)
    console.error(`    ${RULE_MESSAGE}`)
  }
}

function modeStaged() {
  const files = getStagedFiles()
  if (!files.length) {
    console.log('suspense-lint: no staged files in scope.')
    return 0
  }
  const violations = scanFiles(files)
  if (!violations.length) {
    console.log(`suspense-lint: clean (${files.length} file${files.length === 1 ? '' : 's'} scanned).`)
    return 0
  }
  reportViolations(violations, `suspense-lint: ${violations.length} violation${violations.length === 1 ? '' : 's'} in staged files.\n`)
  console.error('\nBypass: add `// suspense-allow: <rationale>` in the file.')
  return 1
}

function modeAllInformational() {
  const files = getAllFiles()
  const violations = scanFiles(files)
  const byRule = aggregateByRule(violations)
  console.log(`suspense-lint: ${violations.length} violation${violations.length === 1 ? '' : 's'} across ${files.length} file${files.length === 1 ? '' : 's'} (informational).`)
  console.log('\nBy rule:')
  for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${count}`)
  }
  for (const v of violations) console.log(`  - ${v.file}:${v.lines.join(',')}`)
  return 0
}

function modeBaselineWrite() {
  const files = getAllFiles()
  const violations = scanFiles(files)
  const baseline = {
    generated_at: new Date().toISOString().slice(0, 10),
    audit_source: 'V5 #216 (useSearchParams CSR bailout guard)',
    total_violations: violations.length,
    files_in_scope: files.length,
    violations_by_rule: aggregateByRule(violations),
    violations_by_file_rule: aggregateByFileRule(violations),
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf8')
  console.log(`suspense-lint: baseline written to ${BASELINE_PATH}`)
  console.log(`  total: ${violations.length} violations across ${Object.keys(baseline.violations_by_file_rule).length} files`)
  return 0
}

function modeEnforce() {
  if (!existsSync(BASELINE_PATH)) {
    console.error('suspense-lint: baseline missing — run `npm run lint:suspense:baseline` first.')
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
      const baselineCount = baselineFR[file]?.[ruleId] ?? 0
      if (baselineCount === 0) newViolations.push({ file, ruleId, count })
      else if (count > baselineCount) regressions.push({ file, ruleId, baseline: baselineCount, current: count })
    }
  }

  if (newViolations.length === 0 && regressions.length === 0) {
    console.log('suspense-enforce: gate PASSED. 0 regressions, 0 net-new.')
    return 0
  }

  if (newViolations.length) {
    console.error(`suspense-enforce: ${newViolations.length} NET-NEW violation${newViolations.length === 1 ? '' : 's'}:`)
    for (const v of newViolations) console.error(`  + ${v.file} [${v.ruleId}] (${v.count})`)
  }
  if (regressions.length) {
    console.error(`\nsuspense-enforce: ${regressions.length} REGRESSION${regressions.length === 1 ? '' : 's'}:`)
    for (const r of regressions) console.error(`  ↑ ${r.file} [${r.ruleId}] ${r.baseline} → ${r.current}`)
  }
  console.error('\nGate FAILED. Wrap the client in <Suspense> (Inner pattern, cf. app/auth/sign-up/page.tsx), add `export const dynamic`, or `// suspense-allow: <rationale>`.')
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
