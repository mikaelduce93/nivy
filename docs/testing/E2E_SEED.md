# E2E seed & CI wiring (#75)

The Playwright suite (`tests/e2e/*.spec.ts`) has two tiers of test:

1. **Credential-free** — redirects, 401/400 contract checks. Run with no seed.
2. **Seeded** — the cross-account flows (top-up, approvals, partner scan,
   quiz/shop/checkout). These `test.skip` unless credentials **and** the
   service-role DB env are present, so they are safe in a bare CI.

## Unlocking the seeded tier

```bash
# 1. Seed the standard accounts + E2E fixtures into the target Supabase.
npm run seed:beta          # seed:test-accounts + seed:e2e-data + seed:beta-pivots

# 2. Point the test process at the same project + expose the seeded logins.
export NEXT_PUBLIC_SUPABASE_URL=...        # dev/preview project (never prod)
export SUPABASE_SERVICE_ROLE_KEY=...       # arrange/assert helper (tests/fixtures/db.ts)
export E2E_USE_SEEDED_DEFAULTS=1           # unlocks teen.amine / parent.test / retail.partner

# 3. Run.
npm run test:e2e
```

`tests/fixtures/db.ts` also hydrates these vars from `.env.local` if present, so
a developer with a configured `.env.local` can just `export E2E_USE_SEEDED_DEFAULTS=1`.

## What `seed:e2e-data` provisions for #75

- the standard accounts (parent.test → teen.amine link, signed e-signature),
- teen.amine's active `vip_cards` row (the QR subject),
- **an active, approved `partner_offers` row owned by retail.partner** — required
  because `apply_partner_offer` authorizes the caller via `partner_staff` and only
  redeems offers belonging to that partner.

The specs resolve teen/parent/partner ids, the partner's offer, the VIP card and
the QR HMAC seed at runtime from the service-role client — no extra env ids needed.

## CI job sketch

```yaml
- run: npm ci
- run: npm run build
- run: npm run seed:beta
  env: { SEED_ALLOW_PRODUCTION: "0" }      # seeders refuse teensparty.ma anyway
- run: npm run test:e2e
  env:
    E2E_USE_SEEDED_DEFAULTS: "1"
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.E2E_SERVICE_ROLE_KEY }}
```

Mutating specs (checkout submit, top-up) change row state — re-run `seed:e2e-data`
between runs, or target a throwaway Supabase preview branch. The scanner spec is
re-runnable: each run signs a fresh nonce, and the seeded offer has no usage caps.
