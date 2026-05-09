# Release blockers — Pre-launch hold list

> Updated 2026-05-09 (Wave 2B). This file enumerates blockers that MUST be cleared before any production deployment, public launch, or production user testing. Local/dev work continues unaffected.

## ACTIVE — secrets rotation (deferred to END of remediation)

**Status:** OPEN — scheduled for the END of all canon-compliance waves, not before.

**Founder ruling (2026-05-09):** rotation NOW provides no security benefit while we are still iterating. The exposed credentials remain in active use across local dev, MCP tooling, and Vercel dev/preview envs. Rotating mid-stream would burn dashboard friction (re-paste keys into N places, re-test cron auth, re-test service-role-bound routes) without changing the threat model — the keys remain exposed until the moment of rotation regardless of when we cut over.

The single rotation event happens AFTER:
- Wave 3 (Partner Ecosystem Truth)
- Wave 4 (Canon cleanup + remaining domain hardening)
- Final pre-launch verification pass

The credentials currently committed to / referenced in this repo and the live Supabase project must be rotated. Several were exposed during ops conversations and to AI assistants.

| Secret | Current state | Required action | Where to rotate |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Live, exposed | Reset key | Supabase dashboard → Project Settings → API → Reset service role key |
| `OPENAI_API_KEY` | Live, exposed | Rotate key | https://platform.openai.com/api-keys → revoke + new key |
| `CRON_SECRET` | Generated locally for dev only | Push fresh value to Vercel envs + redeploy | Vercel project → Settings → Environment Variables |

Steps for the founder (no code change required):

1. **Rotate `SUPABASE_SERVICE_ROLE_KEY`**
   - Supabase dashboard → API → "Reset service_role key".
   - Copy the new value into `.env.local` (replacing the old line).
   - Push the new value to Vercel: project Settings → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY`.

2. **Rotate `OPENAI_API_KEY`**
   - OpenAI dashboard → revoke the current `sk-proj-…` key.
   - Issue a new key, scope it to the Nivy project only.
   - Update `.env.local` and Vercel env.

3. **Regenerate + push `CRON_SECRET`**
   - Generate a fresh URL-safe random secret (32+ bytes).
   - Update `.env.local` and Vercel env.
   - Verify all `app/api/cron/**` routes reject requests without the bearer header.

4. **Redeploy** the Vercel project after all three secrets are updated; smoke-test:
   - `/api/cron/*` returns 401 without header, 200 with header.
   - Supabase service-role-bound routes (`createServiceRoleClient`) succeed.
   - AI surfaces (`avatar-coach`, agent action) succeed end-to-end.

5. **Confirm rotation** by editing this file: change Status from `OPEN` to `DONE 2026-MM-DD` and remove the secret values from any local `.env*` history if you committed them previously (`git filter-repo` if needed).

Until step 5 is recorded, **no production deployment is permitted**.

---

## Other launch gates (per `docs/compliance/16-implementation-roadmap.md`)

The roadmap retains additional Wave 3 / Wave 4 gates. None of them are secrets-related, but several are P0:

- `/admin/scripts-sql` super_admin gate (Wave 1C — DONE).
- Parent approvals cascade RPCs (Wave 1C — DONE).
- Social feed/comments/reports/blocks pipeline (Wave 2A — DONE).
- Gamification truth: phantom RPCs, savings withdrawn, sport challenge no-fake-success, /gamification/* zone redirects (Wave 2B — DONE 2026-05-09).
- Partner ecosystem KYC + commission lifecycle (Wave 3 — OPEN).
- Mentor + driver onboarding (Wave 3 — OPEN).
- Admin finances tabs + 6 finance RPCs (Wave 3 — OPEN).
- CMI/Stripe HASH enforcement + idempotency (Wave 1B — DONE — re-verify before launch).
- Privacy/CNDP DSAR pipeline (Wave 4 — OPEN).
