# Ops Runbook 01 — Secret Rotation (Zero-Downtime)

**Audience:** Founder (sole on-call operator).
**Goal:** Rotate any production secret in under 30 minutes, with zero user-facing downtime, and a verified rollback path at every step.
**Trigger:** Pre-launch policy (D.1 audit flagged that `.env.local` had live secrets readable on disk during the audit session — they MUST be rotated before any public launch). Also use this runbook for routine rotation (every 90 days) or any suspected compromise.

> **Read first:** `lib/supabase/service-role.ts` (canonical service-role client), `lib/ai/content-generator.ts` (post-Wave 1 F4 — model IDs configurable, defaults `gpt-4o-mini` / `claude-sonnet-4-6`), `lib/ai/providers/openai.ts`, `lib/ai/providers/claude.ts`, `vercel.json` (cron schedules, no secrets).

---

## 0. Secret inventory (read once, memorise)

Identified via `grep -r "process.env" lib/ app/ --include="*.ts" --include="*.tsx"`.

| Secret | Used by (canonical) | Blast radius | Rotation class |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/service-role.ts` (createServiceRoleClient), `lib/config/app-config.ts` | All RLS-bypass writes (push triggers, system bots, migration runners, `/api/admin/audit-log`, every cron route) | **High** — full DB |
| `OPENAI_API_KEY` | `lib/ai/provider.ts`, `lib/ai/providers/openai.ts`, `app/api/agent/action/route.ts`, `app/api/teen/avatar-coach/route.ts` | AI content generation, avatar coach, daily content cron | **Medium** |
| `ANTHROPIC_API_KEY` | `lib/ai/providers/claude.ts`, `app/api/teen/avatar-coach/route.ts` | Same as OpenAI when `AI_PROVIDER=claude` | **Medium** |
| `CRON_SECRET` | All 19 routes under `app/api/cron/*` | Vercel cron auth (Bearer header) | **High** — protects all schedulers |
| `VAPID_PRIVATE_KEY` + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `lib/notifications/push.ts`, `app/api/cron/notification-fan-out/route.ts` | Web Push delivery | **Special** — see §6 |
| `RESEND_API_KEY` | `app/api/admin/anniversaires/[id]/route.ts`, `app/api/payments/xp/route.ts`, `app/api/payments/cmi/callback/route.ts` | Transactional email | **Medium** |
| `CMI_*`, `INWI_API_KEY`, `ORANGE_API_KEY`, `STRIPE_SECRET_KEY` | `lib/payments/*` | Payments | Out of scope (separate runbook) |
| `SENTRY_DSN` | `lib/monitoring/sentry.ts` | Error monitoring | Low (no PII risk) |

**Anchor rule:** rotate ONE secret at a time, 15 minutes apart. If you batch them and a smoke test fails, you cannot tell which key broke things.

---

## 1. Pre-flight checks (5 min, MANDATORY before any rotation)

Run all five — abort and reschedule if any fails.

### 1.1 No in-flight admin work via service role

```bash
# Snapshot recent admin activity. If anything in the last 60s, wait it out.
curl -s -H "Cookie: <your admin session cookie>" \
  "https://nivy.app/api/admin/audit-log?limit=20" | jq '.data[] | {action, created_at}'
```

If you see entries newer than 30 seconds, wait 2 minutes and re-check. Service-role writes during a key swap can fail silently (the client object is created per-request, so in-flight requests hold the OLD key in closure).

### 1.2 No in-flight Vercel deploy

```bash
vercel ls nivy --scope=<team> | head -5
# Look at the top row. Status MUST be "Ready". Not "Building", not "Queued".
```

### 1.3 No active cron window

Check `vercel.json`. Avoid these UTC minutes:
- `*/5 * * * *` — `notification-fan-out` (every 5 min, all the time)
- `30 * * * *` — `friend-challenge-resolve` (every hour at :30)

**Rule:** start rotation at minute `:32` of the hour to maximise the gap before either fires next.

### 1.4 Identify ALL references to the secret you're rotating

```bash
grep -rn "SUPABASE_SERVICE_ROLE_KEY" --include="*.ts" --include="*.tsx" .
# Expect ~3 hits: lib/supabase/service-role.ts, lib/config/app-config.ts, possibly scripts/
```

If you see hits in `app/` or anywhere outside the canonical helpers, STOP. The codebase invariant (documented in `lib/supabase/service-role.ts` header) is that `SUPABASE_SERVICE_ROLE_KEY` is read ONLY from `createServiceRoleClient()`. Direct callers will not pick up the new key cleanly.

### 1.5 Confirm rollback artefact exists

Before rotating, save the CURRENT value to a local secrets vault entry (1Password / Bitwarden):

```bash
vercel env pull .env.production.backup --environment=production --scope=<team>
# Move .env.production.backup OUT of the repo dir immediately:
mv .env.production.backup ~/secure/nivy-env-backup-$(date -u +%Y%m%dT%H%M%SZ).env
```

This is your rollback artefact. Without it, you cannot revert.

---

## 2. SUPABASE_SERVICE_ROLE_KEY rotation (15 min, zero downtime)

**Why this is zero-downtime:** Supabase issues a NEW service-role JWT while the OLD one stays valid for a 24-hour grace window. During that window both keys work, so we can swap Vercel env and redeploy without losing a single request.

### Step 1 — Roll the key in Supabase Dashboard (2 min)

1. Open https://supabase.com/dashboard/project/<project-ref>/settings/api
2. Under **Project API keys** → **service_role** click **Roll**.
3. Confirm the warning dialog. The dashboard now shows the **new** key. Copy it immediately to clipboard.
4. The old key remains valid for 24h by default — do NOT extend that window, we'll explicitly disable in Step 6.

### Step 2 — Update Vercel env vars (3 min)

For each environment (production, preview, development):

```bash
# Remove the existing variable so the CLI doesn't error on duplicate.
vercel env rm SUPABASE_SERVICE_ROLE_KEY production --yes
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# (paste the NEW key when prompted, hit Enter)

vercel env rm SUPABASE_SERVICE_ROLE_KEY preview --yes
vercel env add SUPABASE_SERVICE_ROLE_KEY preview

vercel env rm SUPABASE_SERVICE_ROLE_KEY development --yes
vercel env add SUPABASE_SERVICE_ROLE_KEY development
```

Verify:

```bash
vercel env ls | grep SUPABASE_SERVICE_ROLE_KEY
# Should show three rows, all "Updated 0s ago"
```

### Step 3 — Update local `.env.local` (1 min)

On the founder's machine:

```bash
# Replace the line in place. Use a text editor — never echo secrets to shell history.
code .env.local
# Edit SUPABASE_SERVICE_ROLE_KEY=<new value>, save.
```

Confirm shell history did not capture it: `history | grep -i service_role` should be empty.

### Step 4 — Trigger Vercel redeploy (3 min)

```bash
vercel --prod
# Wait for the build to finish — typically 90-120s.
```

Vercel serverless functions only pick up new env vars on a fresh deploy. Until this redeploy lands, production is still using the OLD key (which is fine — it's still valid for 24h).

### Step 5 — Smoke test within 30s of deploy ready (2 min)

In two terminals, run in parallel:

```bash
# Terminal A — service-role-using endpoint (admin audit-log uses createServiceRoleClient)
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Cookie: <admin session>" \
  "https://nivy.app/api/admin/audit-log?limit=1"
# Expect: 200

# Terminal B — AI smoke (validates OpenAI/Claude path is intact)
# NOTE: /api/dev/ai-smoke returns 404 in production by design. Use preview env:
curl -s "https://nivy-preview.vercel.app/api/dev/ai-smoke?provider=openai" | jq .ok
# Expect: true
```

If audit-log returns 401 (unauthenticated) instead of 500, that's the wrong session cookie — refresh and retry. A genuine key failure shows as 500 with `"unauthenticated"` from the service-role client throw on line 25 of `lib/supabase/service-role.ts`.

### Step 6 — Disable old key early (1 min)

After the smoke window passes (default: wait 1 hour to be safe; can be reduced to 15 min if traffic is low), go back to the Supabase dashboard:

- **Project Settings → API → service_role → Revoke previous key**

This shrinks the compromise window from 24h (default grace) to ~1h. The audit policy requires this because the OLD key was readable on disk during the audit session.

### Rollback (if Step 5 fails)

```bash
# 1. Restore previous Vercel env values from your backup artefact:
cat ~/secure/nivy-env-backup-*.env | grep SUPABASE_SERVICE_ROLE_KEY
# 2. Repeat Step 2 with the OLD value for production / preview / development.
# 3. Redeploy:
vercel --prod
# 4. Re-enable old key in Supabase dashboard if you already revoked it
#    (Supabase keeps revoked keys recoverable for ~7 days).
```

Do NOT roll a NEW key as rollback — that defeats the rollback. Restore the previous value, diagnose, then re-attempt rotation.

---

## 3. OPENAI_API_KEY rotation (10 min, zero downtime)

OpenAI keys are independent strings (no JWT rotation flow). The pattern is: create new, deploy, drain old, revoke old.

### Step 1 — Create the new key (2 min)

1. https://platform.openai.com/api-keys → **Create new secret key**
2. Name it `nivy-prod-2026-05-08` (use today's date).
3. Scope: **Restricted** if available. Permissions needed: `model.request` only (no fine-tune, no files write).
4. Copy the `sk-...` value immediately — OpenAI shows it once.

### Step 2 — Update Vercel env (3 min)

```bash
vercel env rm OPENAI_API_KEY production --yes && vercel env add OPENAI_API_KEY production
vercel env rm OPENAI_API_KEY preview --yes    && vercel env add OPENAI_API_KEY preview
vercel env rm OPENAI_API_KEY development --yes && vercel env add OPENAI_API_KEY development
```

Update local `.env.local` the same way as §2 Step 3.

### Step 3 — Redeploy (2 min)

```bash
vercel --prod
```

### Step 4 — Smoke test (1 min)

```bash
# Use preview (ai-smoke is 404 in prod):
curl -s "https://nivy-preview.vercel.app/api/dev/ai-smoke?provider=openai" | jq
# Expect: { ok: true, results: [{ ok: true, latencyMs: <2000, ... }] }
```

If `ok: false` and the error mentions `Incorrect API key provided`, the env var didn't propagate — re-run Step 2 paying attention to whitespace.

### Step 5 — Wait 5 min for in-flight to drain (5 min)

Model calls are bounded at `max_tokens: 2000` and typically complete in ≤30s. The `/api/agent/action` route can chain a few. 5 minutes is conservative. Do NOT skip — revoking too early throws mid-quiz-generation and the validator falls through to fallback content (degraded quality, not an outage, but visible).

### Step 6 — Revoke old key (1 min)

OpenAI dashboard → API keys → old key → **Revoke**.

### Rollback

If revoke was premature, OpenAI keys are recoverable for ~5 minutes after deletion via dashboard. After that they're gone forever — rotate again. Restore the OLD `sk-...` to Vercel env (paste from your local backup) and redeploy.

---

## 4. CRON_SECRET rotation (10 min)

`CRON_SECRET` is the Bearer token Vercel cron sends to all 19 cron routes. It is checked via `process.env.CRON_SECRET` at the top of every handler in `app/api/cron/*`.

### Step 1 — Generate a new secret (1 min)

```bash
openssl rand -hex 32
# Copy the 64-char output.
```

### Step 2 — Update Vercel env (3 min)

```bash
vercel env rm CRON_SECRET production --yes && vercel env add CRON_SECRET production
vercel env rm CRON_SECRET preview --yes    && vercel env add CRON_SECRET preview
```

(No development env needed — local dev doesn't run cron.)

### Step 3 — Redeploy (2 min)

```bash
vercel --prod
```

Vercel cron uses the env value at the time of trigger, not at deploy. Once the new value is in env AND the deploy is ready, the next cron tick uses the new secret automatically.

### Step 4 — Verify with manual cron call (3 min)

```bash
NEW_SECRET="<paste new value>"
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $NEW_SECRET" \
  "https://nivy.app/api/cron/ride-curfew-check"
# Expect: 200

# Negative test — old secret should fail:
OLD_SECRET="<paste OLD value from backup>"
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $OLD_SECRET" \
  "https://nivy.app/api/cron/ride-curfew-check"
# Expect: 401
```

If the negative test returns 200, the env didn't update — go back to Step 2.

### Step 5 — Wait one full cron tick

Wait until the next `*/5 * * * *` boundary so `notification-fan-out` runs at least once with the new secret. Check Vercel dashboard → Functions → recent invocations for that route → status 200.

### Rollback

Restore previous CRON_SECRET to Vercel env from your backup artefact, redeploy. Cron will resume on the next tick.

---

## 5. ANTHROPIC_API_KEY rotation (10 min)

Identical shape to §3. Substitute:
- Dashboard: https://console.anthropic.com/settings/keys
- Env var: `ANTHROPIC_API_KEY`
- Smoke: `curl ".../api/dev/ai-smoke?provider=claude"` (preview env only)
- Avatar coach also uses this key — `app/api/teen/avatar-coach/route.ts` reads `process.env.ANTHROPIC_API_KEY` directly, so it picks up the new value on next request.

Drain window: 5 minutes (Anthropic streaming responses are bounded by `max_tokens: 2000` in `claude.ts`).

---

## 6. VAPID keys (push notifications) — DO NOT rotate

**Do not include VAPID in routine rotations.** Web Push subscriptions are cryptographically bound to the public VAPID key the browser saw at subscribe time. Rotating `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`:

- Invalidates EVERY existing `push_subscriptions` row.
- Forces every teen to revoke + re-grant browser push permission, which iOS Safari only allows once per install.
- Likely permanent loss of push reach for ~30-50% of the active base.

**If compromise is suspected** (private key leaked, e.g. in a public commit):
1. Accept the loss. Generate new keys with `web-push generate-vapid-keys`.
2. Update `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` in Vercel env (all 3 environments).
3. Redeploy.
4. Truncate `push_subscriptions` table — the old rows will only generate failed sends and clutter logs.
5. Send a one-off in-app notification banner asking teens to re-enable push.
6. File a post-mortem in `docs/vision/audit-prelaunch/`.

---

## 7. Post-rotation verification checklist (5 min, run after EVERY rotation)

Tick all boxes. If any fails, roll back.

- [ ] All 19 cron routes still return 200 with the (current) `CRON_SECRET`. Loop:
  ```bash
  for r in assign-missions evolve-teen-profiles disburse-allowances marketplace-escrow-release \
           ride-curfew-check notification-fan-out generate-daily-content birthday-greetings \
           quiz-seen-history-prune partner-payout-monthly weekly-leaderboard-rollup tag-normalize \
           mentor-recording-retention friend-challenge-resolve parent-chore-rollover \
           recommendation-metrics-rollup feed-seed notifications purge-documents; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CRON_SECRET" \
      "https://nivy.app/api/cron/$r")
    echo "$code  $r"
  done
  ```
  Expect `200` (or `405` for routes that only expose POST — both prove auth works).
- [ ] Service-role endpoint works: `GET /api/admin/audit-log?limit=1` → 200 with admin cookie.
- [ ] AI cron generates a quiz manually: trigger `POST /api/cron/generate-daily-content` from Vercel dashboard (Functions → invoke). Check `content_generation_logs` table for a row created in the last 60s with `status='completed'`.
- [ ] Push subscribe + send roundtrip: from a logged-in teen account on the founder's phone, subscribe to push, then trigger `POST /api/notifications/test`. Notification arrives within 5s.
- [ ] Audit log records the rotation: insert a manual row marking the event:
  ```sql
  INSERT INTO admin_audit_logs (user_id, action, target_type, metadata)
  VALUES ('<founder uuid>', 'secret.rotate',
          '<which secret>', '{"runbook":"01","window_minutes":<n>}'::jsonb);
  ```

---

## 8. Schedule recommendation

**Best window: Sunday 03:00 Casablanca (UTC+1)** — empirically the lowest-activity hour per analytics dashboards (school-night low + post-Saturday-late-evening dropoff).

**Cadence:**
- Routine rotation: every 90 days, all four secrets (Supabase service role, OpenAI, Anthropic, CRON) on the same Sunday window.
- Rotate ONE secret at a time, **15 minutes apart**. Start order:
  1. 03:00 — `CRON_SECRET` (lowest blast radius, validates the env-update flow first).
  2. 03:15 — `OPENAI_API_KEY`.
  3. 03:30 — `ANTHROPIC_API_KEY`.
  4. 03:45 — `SUPABASE_SERVICE_ROLE_KEY` (highest blast radius, last so earlier failures don't cascade).
- Total window: ~75 min including Step 7 verification.

**Pre-announce nothing** — every step is zero-downtime. Announcing a maintenance window invites observation and reduces user trust unnecessarily. If something fails, the §7 checklist catches it within minutes and rollback is bounded at <5 min per secret.

**Block these dates:**
- 24h before/after any product launch.
- Ramadan iftar window (sunset ±2h) — cron load is spiky around then.
- The weekend of any partner-payout-monthly run (1st of month, 04:00 UTC).

---

## Appendix A — `vercel env` cheat sheet

```bash
vercel env ls                           # List all envs
vercel env pull .env.local              # Sync local from Vercel
vercel env add NAME production          # Add (interactive paste)
vercel env rm  NAME production --yes    # Remove
vercel env add NAME preview             # Repeat per environment
```

Always rotate **production**, **preview**, and **development** together. A mismatched preview env breaks PR previews silently and the founder won't notice until a contractor next opens a PR.

## Appendix B — Why we don't use Vercel "Encrypted Sensitive" flag for these

Vercel's "Sensitive" flag prevents the env value from being read back via CLI/API after creation. That breaks our backup-before-rotate step (§1.5). The runbook depends on `vercel env pull` giving us a working rollback artefact. If we ever switch to Sensitive, replace §1.5 with manual export from each dashboard at rotation time.
