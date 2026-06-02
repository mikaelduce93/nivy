#!/usr/bin/env node
/**
 * responsive-lint — garde-fou « linter de responsivité » (V5 #222).
 *
 * Jumeau de `scripts/hierarchy-lint.mjs` (même contrat CLI, même mécanique
 * baseline), dédié aux régressions responsive relevées par l'audit
 * 2026-06-01. Il NE réécrit rien : il **tolère l'existant** (baseline) et
 * **bloque le net-new**.
 *
 * Baseline file:   docs/compliance/responsive-baseline.json
 * Modes:
 *   (default)         scan staged files, FAIL on net-new in added lines (pre-commit).
 *   --all             scan full tree, print counts by rule — exit 0 (informational).
 *   --baseline-write  scan full tree, regenerate the baseline — exit 0.
 *   --enforce         CI gate: FAIL on (1) net-new (file,rule) pair, (2) count > baseline.
 *
 * Bypass per-line: `// canon-allow: <rationale>` on the offending line.
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const BASELINE_PATH = 'docs/compliance/responsive-baseline.json'

const RESP_RULES = [
  {
    id: 'RESP-001',
    // fixed px width >= 360 in w-[Npx] or min-w-[Npx], unless the same line
    // also carries a responsive width variant (sm:/md:/lg:w-) or a max-w.
    test: (text) => {
      const m = text.match(/\b(?:min-)?w-\[(\d+)px\]/)
      if (!m) return false
      if (parseInt(m[1], 10) < 360) return false
      if (/\b(?:sm|md|lg):w-/.test(text)) return false
      if (/\bmax-w/.test(text)) return false
      return true
    },
    message:
      'fixed pixel width can overflow narrow viewports — add a responsive/max-width variant or // canon-allow.',
  },
  {
    id: 'RESP-002',
    // grid-cols-N (any breakpoint prefix) with N >= 3, unless the same
    // line/className also declares a mobile base (grid-cols-1 / grid-cols-2).
    test: (text) => {
      const matches = text.match(/\bgrid-cols-(\d+)\b/g)
      if (!matches) return false
      const hasMobileBase = /\bgrid-cols-(?:1|2)\b/.test(text)
      if (hasMobileBase) return false
      return matches.some((m) => parseInt(m.replace('grid-cols-', ''), 10) >= 3)
    },
    message:
      'grid-cols-{3+} without a mobile base (grid-cols-1/2 sm:...) crushes columns on mobile.',
  },
  {
    id: 'RESP-003',
    // fixed/sticky bottom-0 surface without dock clearance / safe-area padding.
    // md:hidden surfaces are the dock itself (mobile-only) and exempt.
    test: (text) => {
      if (!/\b(?:fixed|sticky)\b/.test(text)) return false
      if (!/\bbottom-0\b/.test(text)) return false
      if (/pb-dock|bottom-dock|pb-safe|env\(safe-area-inset-bottom\)|md:hidden/.test(text)) return false
      return true
    },
    message:
      'fixed/sticky bottom-0 surface may overlap the mobile dock / iOS home indicator — add dock clearance (pb-dock / bottom-dock) or safe-area padding.',
  },
]

const ALLOW_INLINE = /canon-allow:/

// Scope : écrans + composants applicatifs (app/ + components/), hors primitives.
const SCOPE = [/^app\//, /^components\//]
const EXCLUDE = [
  /^components\/ui\//, // primitives shadcn — hors responsivité d'écran
  /^components\/examples\//, /^app\/examples\//,
  /^docs\//, /^scripts\//, /^tests\//, /^node_modules\//,
]

function shouldScanFile(file) {
  if (EXCLUDE.some((re) => re.test(file))) return false
  if (!SCOPE.some((re) => re.test(file))) return false
  return /\.(tsx|jsx)$/.test(file)
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
    return readFileSync(file, 'utf8').split('\n').map((text, i) => ({ lineNum: i + 1, text }))
  } catch {
    return []
  }
}

function scanFiles(files, opts = {}) {
  const { stagedOnly = false } = opts
  const violations = []
  for (const file of files) {
    const lines = stagedOnly ? getAddedLines(file) : getAllLines(file)
    if (!lines.length) continue
    for (const { lineNum, text } of lines) {
      if (ALLOW_INLINE.test(text)) continue
      for (const rule of RESP_RULES) {
        if (rule.test(text)) {
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
  for (const v of violations) map[v.ruleId] = (map[v.ruleId] || 0) + 1
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
    console.log('responsive-lint: no staged files in scope.')
    return 0
  }
  const violations = scanFiles(files, { stagedOnly: true })
  if (!violations.length) {
    console.log(`responsive-lint: clean (${files.length} file${files.length === 1 ? '' : 's'} scanned).`)
    return 0
  }
  reportViolations(violations, `responsive-lint: ${violations.length} violation${violations.length === 1 ? '' : 's'} in net-new code.\n`)
  console.error('\nBypass: add `// canon-allow: <rationale>` on the offending line.')
  return 1
}

function modeAllInformational() {
  const files = getAllFiles()
  const violations = scanFiles(files)
  const byRule = aggregateByRule(violations)
  console.log(`responsive-lint: ${violations.length} violation${violations.length === 1 ? '' : 's'} across ${files.length} file${files.length === 1 ? '' : 's'} (informational).`)
  console.log('\nBy rule:')
  for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${count}`)
  }
  return 0
}

function modeBaselineWrite() {
  const files = getAllFiles()
  const violations = scanFiles(files)
  const baseline = {
    generated_at: new Date().toISOString().slice(0, 10),
    audit_source: 'docs/audits/audit-2026-06-01/ (V5 #222 responsivité)',
    total_violations: violations.length,
    files_in_scope: files.length,
    violations_by_rule: aggregateByRule(violations),
    violations_by_file_rule: aggregateByFileRule(violations),
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf8')
  console.log(`responsive-lint: baseline written to ${BASELINE_PATH}`)
  console.log(`  total: ${violations.length} violations across ${Object.keys(baseline.violations_by_file_rule).length} files`)
  return 0
}

function modeEnforce() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(`responsive-lint: baseline missing — run \`npm run lint:responsive:baseline\` first.`)
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
    console.log(`responsive-enforce: gate PASSED. 0 regressions, 0 net-new.`)
    return 0
  }

  if (newViolations.length) {
    console.error(`responsive-enforce: ${newViolations.length} NET-NEW violation${newViolations.length === 1 ? '' : 's'}:`)
    for (const v of newViolations) console.error(`  + ${v.file} [${v.ruleId}] (${v.count})`)
  }
  if (regressions.length) {
    console.error(`\nresponsive-enforce: ${regressions.length} REGRESSION${regressions.length === 1 ? '' : 's'}:`)
    for (const r of regressions) console.error(`  ↑ ${r.file} [${r.ruleId}] ${r.baseline} → ${r.current}`)
  }
  console.error('\nGate FAILED. Fix the new code, or regenerate the baseline (`npm run lint:responsive:baseline`), or `// canon-allow: <rationale>`.')
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
