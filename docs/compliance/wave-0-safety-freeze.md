# Wave 0 — Safety Freeze (2026-05-08)

**Status:** ACTIVE. **Source:** `docs/compliance/16-implementation-roadmap.md` Wave 0.

This wave adds CI/lint/pre-commit guards that BLOCK regressions on the canon violations identified by the 2026-05-08 compliance audit. **No product behavior is changed.** All app code paths, routes, components, RPCs, and APIs remain identical to before Wave 0.

## Founder rulings stamped (2026-05-08)

These resolve the audit's blocking unresolved decisions. They are now part of the canon and reflected in `docs/canon/INDEX.locked.md` + `docs/compliance/17-founder-decisions-required.md`.

| ID | Ruling |
|---|---|
| F1 | **Parent-invited teen only at launch.** Self-signup deferred to V1.4. |
| F2 | **Driver = first-class `profiles.role`.** Driver workspace `/driver/**` peer to mentor. |
| F3 | **Influencer folds into ambassador.** `/devenir-influenceur` candidature dropped. |
| F5 | **Manual top-up only at launch.** `PSP_AUTO_TOPUP_ENABLED=false`. Cash Plus week +2. |
| audit | **`audit_log` (singular) is canonical.** `admin_audit_logs` is deprecated. |

## What was added (zero feature impact)

### 1. ESLint canon rules block (`eslint.config.mjs`)

A new file-scoped block applies `no-restricted-syntax` (level: WARN) + `no-restricted-imports` (WARN) on `app/`, `components/`, `lib/`, `hooks/`. Existing baseline violations are tracked but don't fail CI — net-new violations show up in IDE + lint output.

Coverage:

| Rule ID family | What it blocks |
|---|---|
| `CANON-XP-*` | Phantom RPCs `add_user_xp` / `deduct_user_xp` / `get_user_xp` |
| `CANON-NOTIF-*` | Reads/writes to deprecated `notifications` and `activity_logs` tables |
| `CANON-AUDIT-*` | References to deprecated `admin_audit_logs` (canonical = `audit_log`) |
| `CANON-AUTH-001` (ESLint scope) | `supabase.auth.signUp()` outside `/auth/sign-up` paths |
| `CANON-PROFILES-001` (ESLint scope) | Direct INSERT/UPSERT on `profiles` table outside admin tools |
| `CANON-ALERT-*` | `window.alert()` / `window.confirm()` as success notifications |
| `CANON-MOTION-001` | Raw `framer-motion` imports (must use `@/components/ui/motion` proxy) |
| `CANON-AI-*` | Hardcoded model literals (`claude-3-sonnet-*`, `gpt-3.5`, `gpt-4`) |
| `CANON-SHOP-*` | Deprecated tables/RPCs `shop_items`, `token_rewards`, `transfer_tokens` |
| `CANON-BUCKET-001` | Writes to deprecated `defi-proofs` bucket (canonical = `chore-evidence`) |
| `CANON-MONEY-PK` | `.from("user_xp"\|"user_coins")` — flag `user_id` filter (canonical = `teen_id`) |
| `CANON-PII-AI` | `profiles.full_name` selected (forbidden in AI prompt context) |

Allowlist: surgical file-scope overrides for the few legitimate sites (the `Motion` proxy itself, `app/auth/sign-up/**`, admin user-creation tools, seeding scripts).

### 2. Pre-commit canon scanner (`scripts/canon-precommit.mjs`)

A cross-platform Node script that greps STAGED files (`git diff --cached`) for the same patterns. **HARD GATE**: returns non-zero exit on any violation in net-new code. Bypass via `// canon-allow: <rationale>` per-line, or `git commit --no-verify` (CI still flags it).

Scope: scans only `app/`, `components/`, `lib/`, `hooks/`. Excludes `scripts/`, `docs/`, `gamification-system/database/migrations/`, `tests/`.

### 3. NPM scripts (CI gate is non-bypassable)

```json
"lint:canon":          "node scripts/canon-precommit.mjs --enforce",
"lint:canon:all":      "node scripts/canon-precommit.mjs --all",
"lint:canon:baseline": "node scripts/canon-precommit.mjs --baseline-write",
"lint:canon:staged":   "node scripts/canon-precommit.mjs"
```

- `npm run lint:canon` — **CI hard gate.** Compares full-tree scan to `docs/compliance/canon-baseline.json`. Fails on (1) any (file, ruleId) NOT in baseline = net-new violation, (2) any (file, ruleId) where current count > baseline = regression. Exit 1 ⇒ CI red.
- `npm run lint:canon:all` — informational full-tree scan. Always exits 0. Used to inspect baseline.
- `npm run lint:canon:baseline` — regenerates `docs/compliance/canon-baseline.json` after a wave fix lands. Commit the updated baseline in the same PR as the fix.
- `npm run lint:canon:staged` — pre-commit local hook. Scans `git diff --cached` for net-new violations.

### 4. Baseline file (`docs/compliance/canon-baseline.json`)

Stores the 320 baseline violations as `{ file → { ruleId → count } }`. Fixed waves shrink this file; the gate ensures it never grows without an explicit founder-approved baseline regen.

### 5. CI workflow (`.github/workflows/canon-compliance.yml`)

Runs on every PR and push to `main`:

```yaml
- npm run lint:canon       # canon enforce — hard gate
- npm run typecheck        # TypeScript clean
- npm run lint             # ESLint (warn-level canon, error-level a11y/hooks)
```

The gate is non-bypassable from the local machine — even if a developer skips the local pre-commit hook, the PR cannot merge without the CI gate green.

## Current baseline (counted today)

`npm run lint:canon` reports **320 violations across 11 rule families** in app code:

| Rule | Count | Disposition |
|---|---|---|
| `CANON-MOTION-001` raw framer-motion | 160 | Wave 4 codemod target (existing audit covered) |
| `CANON-AUDIT-001/002` admin_audit_logs | 90 | Wave 1B (audit log rewrite — 28 producers) |
| `CANON-NOTIF-001/002` notifications/activity_logs | 45 | Wave 1B (6 endpoints + reads) |
| `CANON-BUCKET-001` defi-proofs | 6 | Wave 1A (one-line fix) |
| `CANON-XP-001..003` phantom XP RPCs | 6 | Wave 1B ECON-FIX-1 |
| `CANON-ALERT-001` window.alert | 4 | Wave 2 (social-feed truth) |
| `CANON-SHOP-001..003` shop_items / token_rewards | 6 | Wave 4 economy sunset |
| `CANON-AUTH-001` (auth.signUp scope) | 1 | Wave 1A AUTH-FIX-2 |
| `CANON-AI-001/002` hardcoded models | 2 | Wave 1C AI-FIX-1 |

These are **existing** violations identified by the compliance audit. Wave 0 doesn't fix them — it prevents NEW ones from being added while Wave 1+ fixes the baseline.

## How the gate works

### Local (developer)

Optional: enable a git hook in your local clone:

```bash
# Bash / Mac / Linux / WSL / Git Bash
echo 'npm run lint:canon:staged' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

```powershell
# PowerShell (Windows)
@'
#!/bin/sh
npm run lint:canon:staged
'@ | Out-File -FilePath .git/hooks/pre-commit -Encoding ascii
```

Or run manually before each commit:

```bash
npm run lint:canon:staged
```

### CI (recommended)

Add to your PR workflow:

```yaml
- name: Canon compliance gate
  run: npm run lint:canon
```

When ratcheting becomes useful (post Wave 1A), the script can be extended with a `--diff-from-main` mode that scans only PR-introduced lines.

### Bypass

Three escape hatches, in order of preference:

1. **Inline allowlist** — add `// canon-allow: <rationale>` on the offending line. Visible in code review, indexable. Use only for genuine canon exceptions (e.g., one-shot migration scripts, intentional legacy bridge during a rename).
2. **`git commit --no-verify`** — local bypass. CI still catches.
3. **Edit eslint.config.mjs** — for true canon updates, modify the canon block AND update the corresponding `.locked.md` file in the same PR.

## Verification

```bash
npm run lint:canon              # Full-tree scan — confirms baseline
npm run lint:canon:staged       # Staged-only — confirms PR clean
npm run lint                    # ESLint runs canon rules at WARN level
npx tsc --noEmit                # TypeScript still compiles cleanly
```

## What this does NOT do

- Does NOT fix any existing canon violation.
- Does NOT modify routes, RPCs, tables, or APIs.
- Does NOT change UI behavior.
- Does NOT affect runtime performance.
- Does NOT change auth, money, parent, or partner flows.

Wave 1 is what fixes the baseline. Wave 0 just keeps it from getting worse during the work.

## Files changed

```
docs/canon/INDEX.locked.md                 — stamped F1, F2, F3, F5, audit_log DECIDED 2026-05-08
docs/compliance/17-founder-decisions-required.md  — same stamps
docs/compliance/wave-0-safety-freeze.md    — this file (NEW)
eslint.config.mjs                          — added canon rules block + allowlist overrides
package.json                               — added lint:canon + lint:canon:staged scripts
scripts/canon-precommit.mjs                — pre-commit / CI scanner (NEW)
```

## Next step

Wave 1A — Identity. Sequenced (NOT parallel):
- AUTH-FIX-1 — `profiles.role` enum CHECK migration (DB)
- AUTH-FIX-2 — `validate-teen` calls `auth.admin.createUser`
- AUTH-FIX-3 — `parent/teens/create` calls `auth.admin.createUser`
- AUTH-FIX-3bis — `/auth/redirect` truth table covers mentor + driver

Founder approval to proceed required before Wave 1A starts.
