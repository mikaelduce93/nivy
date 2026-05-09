# Security debt — explicit risk register

> Updated 2026-05-09. This file enumerates security debt that is **knowingly carried** during canon-compliance remediation. Every item is "risk accepted temporarily" — none of these are "fine to leave forever". The register is the single source of truth for "what is owed before public launch".

## Operating posture (founder ruling 2026-05-09)

- **Local development**: ALLOWED.
- **Local testing with test data only**: ALLOWED.
- **Vercel preview deploys for internal review**: ALLOWED, no real users.
- **Staging deploy with real users**: BLOCKED until rotation.
- **Public launch**: BLOCKED until rotation.
- **Real / sensitive data ingest** (parent CIN uploads, real CMI top-ups, real teen accounts beyond founder's): BLOCKED until rotation.
- **New secret printed in logs / chat / commits**: PROHIBITED — see hard rules below.

## Pending rotations

| Secret | Reason debt exists | Mandatory rotation event | Status |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Was visible in this repo's `.env.local` and shared with AI tooling. | Before public launch / any production user. | OPEN — rotate at end of remediation |
| `OPENAI_API_KEY` | Same exposure surface as service-role key. | Before public launch. | OPEN — rotate at end of remediation |
| `CRON_SECRET` | Generated for local dev only; not yet pushed to Vercel envs as the canonical cron bearer. | Before public launch + redeploy with the new value. | OPEN — rotate at end of remediation |

Rotation procedure is documented in `docs/compliance/release-blockers.md`.

## Hard rules (apply NOW, before rotation)

These are enforced in code review and CI. Violations are a P0.

1. **No `cat .env.local`** — and no equivalent (`type`, `Get-Content`, `awk` over the file). The audit tool is `node --env-file=.env.local scripts/check-env-presence.mjs`.
2. **No grep / Select-String over `.env.local` for real values.** You may grep for *key names* but never their values.
3. **No print of an env var value, ever.** Not via `console.log(process.env.X)`, not via `echo $X`, not via debugging diff output, not via "just for a sec". Use `[REDACTED]` placeholders.
4. **No partial value leakage.** Do not print value lengths, first/last characters, prefixes (`sk-…` truncations), checksums, or fingerprints. Binary status only: PRESENT / MISSING / EMPTY.
5. **No env values in commit messages, PR bodies, code comments, doc files, AI prompts, or screenshots.** If a secret appears in any of these, it counts as a leak event and triggers immediate rotation.
6. **No `.env.local` checked into git.** Confirm via `.gitignore`. If a secret is committed in any branch (even reverted), it counts as leaked.
7. **No service-role key in client code or in any file under `app/(public)`, `components/`, or `lib/` that ships to the browser.** Server-only — `lib/supabase/service-role.ts` and consumers thereof.
8. **No raw signed URLs longer than 30 minutes for KYC/CIN.** TTL ladder from `lib/storage/cin-signed-url.ts` is canonical (5 min parent / 15 min admin / 30 min hard cap).
9. **AI prompts go through `lib/ai/safe-context.ts`.** No `full_name`, `first_name`, `last_name`, CIN content, or DM content in any prompt body — the scrubber owns the allow-list (see canon-rule `CANON-AI-PII-001`).
10. **Public buckets are forbidden for evidence/proofs/KYC.** `defi-proofs`, `chore-evidence`, `kyc-documents`, `cin-scans` are all PRIVATE; consumers use signed URLs.

## Audit cadence

- Every wave commit: `npm run lint:canon` (CI gate) + `node --env-file=.env.local scripts/check-env-presence.mjs --strict` (local sanity).
- Pre-rotation event (end of remediation): full security advisor scan via Supabase MCP `get_advisors` + manual review of this file.
- Post-rotation: re-run advisor scan; record completion in `release-blockers.md`.

## Why we are not rotating now

Per founder ruling 2026-05-09, mid-stream rotation provides no security benefit. The exposed credentials remain in active use across local dev, MCP tooling, and Vercel dev/preview envs. Rotating now means:

- N dashboard updates (Supabase, OpenAI, Vercel) per rotated key.
- Re-test of every cron endpoint, every service-role-bound route, every AI surface.
- The keys remain exposed until the moment of cutover regardless of timing — only the cutover is what matters.

The single rotation event is scheduled AFTER:
- Wave 3 (Partner Ecosystem Truth).
- Wave 4 (Canon cleanup).
- Final pre-launch verification pass.

Until that event, the operating posture above applies. The debt is real and tracked here.
