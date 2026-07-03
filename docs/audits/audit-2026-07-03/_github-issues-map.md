# GitHub open-issue map (snapshot 2026-07-03)

## V12 — Hotfix beta (milestone #13, epic #316)
- #317 Double page-transition: framer-motion AnimatePresence in root template crashes /auth/redirect ("Rendered more hooks")
- #318 Seed parent VIP subscription pivots (sidebar shows "Free" instead of Silver/Gold/Platinum)
- #319 Missing alt on teen avatars on /parent dashboard (6 next/image console errors)
- #320 HTTP-level ring-fence /admin/scripts-sql & /admin/permissions (200 misleading via loading.tsx)

## V13 — Sécurité & drift résiduels (milestone #14, epic #321)
- #322 Drift-lint: purge 11 DRIFT-002 false positives (no residual profiles.pseudo)
- #323 Residual bookings.parent_id drift in check-in export (export-pdf fixed V9 #270)
- #324 Circles moderation on real schema: circle_messages.user_id phantom breaks delete/report
- #325 parent_teen_links uniqueness (parent_id, teen_id) already exists (mig 160) — full vs partial

## V14 — Parcours d'action end-to-end (milestone #15, epic #326)
- #327 Executable smoke of connected runbook (top-up, purchase_reward, approvals, quest)
- #328 Partner scanner E2E loop (teen tokenize → scan → persisted redemption) + fixtures + persistence assertion
- #329 Remove orphan token components (transfer + daily-claim dead) + decide teen-to-teen transfer
- #330 Pre-fill moderation_queue (fixture + real reports) to test /admin/moderation inbox E2E

## V15 — Features produit manquantes (milestone #16, epic #331)
- #332 Rebuild admin sport_clubs CRUD + public detail /clubs/[slug]
- #333 Wire real driver intake (application + KYC upload) + decide /driver UI (F2/F42)
- #334 Wire coach/teacher applications (partner_staff) + partner sidebar by role + Awards link
- #335 Build /admin/support (tickets + SLA) or remove support subrole from enum (F8)
- #336 Prepare real DH top-up rail (cash_settlements/payment_logs, PSP webhooks frozen) pending e-money license F25
- #337 Deliver pathways/milestones content (F47) + finalize internships/pathways detail pages

## V16 — Pré-lancement public (milestone #17, epic #338)
- #339 Rotate secrets (Supabase service_role, OpenAI, CRON_SECRET)
- #340 Measure real Web Vitals in prod build + Lighthouse + freeze thresholds
- #341 a11y axe/Playwright sweep + fix violations
- #342 Wire missing critical E2E (Stripe test payment, QR event check-in) + run in CI
- #343 Sentry alerts + verify/keep vercel.json crons + monitoring runbook

## V10 — home refonte (milestone #11, epic #276) — WORK COMMITTED, likely just needs closing
- #277-289 (13 issues): purge fake social proof, ado-first home, /parents, /partenaires landings, funnel unify, escrow, etc.
- NOTE: MEMORY says these were implemented & committed (5 commits, verified 13 agents). Cross-check code before treating as open work.
