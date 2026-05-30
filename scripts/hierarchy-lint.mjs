#!/usr/bin/env node
/**
 * hierarchy-lint — garde-fou « linter de hiérarchie » (refonte V2 #126).
 *
 * Jumeau de `scripts/canon-precommit.mjs` (même contrat CLI, même mécanique
 * baseline), dédié au chantier audit §3.7 « hiérarchie plate ». Il NE réécrit
 * rien : il **tolère l'existant** (baseline) et **bloque le net-new**.
 *
 * Règle de revue : voir docs/refonte/REVUE-HIERARCHIE.md (la règle 1-2-3).
 *
 * Baseline file:   docs/compliance/hierarchy-baseline.json
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

const BASELINE_PATH = 'docs/compliance/hierarchy-baseline.json'

const HIER_RULES = [
  {
    id: 'HIER-001',
    pattern: /\bfont-black\b/,
    message:
      'titre `font-black` interdit — eyebrow mono UPPERCASE + `<h1>` Bricolage (`font-display`) avec `<em>` rose (charte F3).',
  },
  {
    id: 'HIER-002',
    pattern: /\b(?:sm:|md:|lg:|xl:)?grid-cols-4\b/,
    message:
      'mur de 4 stat-cards équipondérées suspecté — 1 `<StatHero>` (F2) dominant + des `<StickerCard>` (F1) secondaires. (informationnel — `// canon-allow:` si grille légitime).',
  },
  {
    id: 'HIER-003',
    pattern: /\b(EnergyOrb|GlassCard|BentoCard|BentoGrid|ParallaxContainer|ParallaxLayer|MouseParallax)\b/,
    message:
      'primitive bannie (glass/orb/bento/parallax) — remplacer par `<StickerCard>`/`<StatHero>`/`<MeshBackground>` (kit F).',
  },
]

const ALLOW_INLINE = /canon-allow:/

// Scope : composants d'écran + clients de page (là où vit la hiérarchie).
const SCOPE = [/^components\//, /^app\/.*-client\.tsx$/]
const EXCLUDE = [
  /^components\/ui\//, // primitives shadcn — hors hiérarchie d'écran
  /^components\/examples\//,
  /^docs\//, /^scripts\//, /^tests\//, /^\.claude\//, /^node_modules\//,
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
      for (const rule of HIER_RULES) {
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
    console.log('hierarchy-lint: no staged files in scope.')
    return 0
  }
  const violations = scanFiles(files, { stagedOnly: true })
  if (!violations.length) {
    console.log(`hierarchy-lint: clean (${files.length} file${files.length === 1 ? '' : 's'} scanned).`)
    return 0
  }
  reportViolations(violations, `hierarchy-lint: ${violations.length} violation${violations.length === 1 ? '' : 's'} in net-new code.\n`)
  console.error('\nBypass: add `// canon-allow: <rationale>` on the offending line.')
  return 1
}

function modeAllInformational() {
  const files = getAllFiles()
  const violations = scanFiles(files)
  const byRule = aggregateByRule(violations)
  console.log(`hierarchy-lint: ${violations.length} violation${violations.length === 1 ? '' : 's'} across ${files.length} file${files.length === 1 ? '' : 's'} (informational).`)
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
    audit_source: 'docs/refonte/03-AUDIT-UI-UX-PAR-ECRAN.md §3.7 (hiérarchie plate)',
    total_violations: violations.length,
    files_in_scope: files.length,
    violations_by_rule: aggregateByRule(violations),
    violations_by_file_rule: aggregateByFileRule(violations),
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf8')
  console.log(`hierarchy-lint: baseline written to ${BASELINE_PATH}`)
  console.log(`  total: ${violations.length} violations across ${Object.keys(baseline.violations_by_file_rule).length} files`)
  return 0
}

function modeEnforce() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(`hierarchy-lint: baseline missing — run \`npm run lint:hierarchy:baseline\` first.`)
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
    console.log(`hierarchy-enforce: gate PASSED. 0 regressions, 0 net-new.`)
    return 0
  }

  if (newViolations.length) {
    console.error(`hierarchy-enforce: ${newViolations.length} NET-NEW violation${newViolations.length === 1 ? '' : 's'}:`)
    for (const v of newViolations) console.error(`  + ${v.file} [${v.ruleId}] (${v.count})`)
  }
  if (regressions.length) {
    console.error(`\nhierarchy-enforce: ${regressions.length} REGRESSION${regressions.length === 1 ? '' : 's'}:`)
    for (const r of regressions) console.error(`  ↑ ${r.file} [${r.ruleId}] ${r.baseline} → ${r.current}`)
  }
  console.error('\nGate FAILED. Fix the new code, or regenerate the baseline (`npm run lint:hierarchy:baseline`), or `// canon-allow: <rationale>`.')
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
