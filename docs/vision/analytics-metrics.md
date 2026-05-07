# Analytics & Metrics — Vision vs. Reality

> Audit date: 2026-05-07 · Source: live Supabase project `imchornjvmgmaovhypco`, code in `app/admin/analytics/`, `app/api/admin/`, `lib/analytics/`, `lib/monitoring/analytics.ts`, `gamification-system/features/stats-dashboard/`.

## 1. Intent (Product Vision)

Nivy must observe a five-audience platform with very different KPI lenses so the operator can decide what to ship next, what to harden, and what to bill. The intended scorecard spans **Product** (DAU / WAU / MAU, D1/D7/D30 retention, sticky factor DAU/MAU, quiz completion rate, défi/challenge completion rate, average XP per teen per week, sessions per day, average session duration), **Money** (top-ups per month, ARPU, AOV, escrow holdings live in coins, refund rate, payment success rate per provider — Stripe/CMI/mobile money/XP), **Partners** (offer redemptions, commission paid, scanner/QR usage, offer CTR, validation latency), **Ambassadors** (filleuls signed, conversion to first booking, commission earned, tier distribution), **Compliance** (e-signature conversion funnel, parental authorization response time SLA, audit log volume, CNDP-relevant data flows), **AI** (generation success rate, validator pass rate, cost per generated quiz/coach reply, hallucination flagging rate), and **Notifications** (send rate per channel, open rate, click-through, opt-out rate, deliverability per provider). The vision also assumes per-audience dashboards (teen `/stats`, parent overview, partner console, ambassador back-office, admin global) and a CSV / Looker / Metabase export rail so that finance, growth, and CNDP audits can pull exports without engineering.

## 2. Reality (What Exists in Code & DB)

The analytics surface is a patchwork of three loosely-connected layers: a shallow Vercel Analytics integration on the front, a partial admin reporting page wired directly to operational tables (no aggregation layer), and a gamification-stats schema designed for personal dashboards but barely populated.

**Front-end instrumentation**. `lib/monitoring/analytics.ts` defines a typed `trackEvent(name, data)` wrapper around `window.va('event', …)` (`@vercel/analytics`, mounted via `<Analytics />` in `app/layout.tsx`) and exposes 17 typed helpers — `trackSignUp`, `trackLogin`, `trackBookingStarted`, `trackBookingCompleted`, `trackPaymentInitiated`, `trackPaymentCompleted`, `trackPaymentFailed`, `trackTeenAdded`, `trackPassSubscribed`, `trackChallengeCompleted`, `trackAchievementUnlocked`, `trackSearch`, `trackFilterApplied`, `trackShare`, `trackContactFormSubmitted`, `trackNewsletterSubscribed`, `reportWebVitals`. There is **no PostHog, Mixpanel, Amplitude or Segment integration** — repo grep returns zero hits in product code (only docs reference them). Sentry is wired separately for errors / web vitals via `components/monitoring/sentry-*`. The Vercel pipe is fire-and-forget: events are not stored in our DB and cannot be joined with `profiles` or `bookings` for cohort analysis.

**Admin dashboards**. `app/admin/analytics/page.tsx` is the global KPI page. It does **client-side aggregation in a server component** — pulls *all* rows from `bookings`, `events`, `profiles` and reduces in JS into 12-month revenue/booking series, category and city distributions, and user-growth charts. It also calls `activity_logs` (a table that **does not exist in the live DB**, confirmed by a `relation does not exist` error) so the "active users today" KPI silently returns 0. `<RealtimeKPIs>` re-fetches via `/api/admin/kpis` (same pattern, same broken `activity_logs` reference). `app/api/admin/scorecard/route.ts` powers `app/admin/gamification/scorecard/page.tsx` and is honest about it: it reads `user_sessions` and `xp_ledger` to compute DAU and `socialActionRate` only, returns 0 with `status: 'partial'|'unavailable'` for retention, MAU, sticky factor, sessions/day, session duration, quests/week, conversion rate. The dedicated CSV exporter `app/api/admin/analytics/export/route.ts` selects `bookings` joined with `events/children/profiles` and emits a flat CSV — this is the **only export rail today**.

**Aggregation tables (gamification stack)**. Migration `012_user_stats_dashboard.sql` ships a real aggregation schema: `user_lifetime_stats` (1 row), `user_monthly_stats` (0 rows), `user_daily_activity` (1 row) with an RPC `update_daily_activity(p_user_id, p_activity_type, p_amount)` consumed by `gamification-system/features/stats-dashboard/actions.ts`. `crew_weekly_stats` (0 rows), `notification_analytics` (0 rows), `content_performance_metrics` (0 rows), `user_share_stats` / `user_sharing_stats` (0 rows each), `daily_game_scores` (0 rows), `event_check_ins` (0 rows). Three log streams exist — `challenge_progress_log`, `crew_activity_log`, `mission_progress_log`, `content_generation_logs`, `vip_benefits_log`, `mini_game_sessions` — but none are aggregated by a cron job. **No materialized views exist** (`pg_matviews` in public schema = empty). The five public views are leaderboards (`v_leaderboard_all_time`, `v_leaderboard_monthly`, `v_leaderboard_weekly`) plus `parent_teens_overview` and `teen_full_profile` — none of them serve KPI dashboards.

**Per-audience reality**. Teens have a designed `/profile` and `/stats` flow backed by `user_lifetime_stats` + `user_monthly_stats` + `user_daily_activity` (`gamification-system/features/stats-dashboard/actions.ts`, `gamification-system/features/user-stats-dashboard/` — note the latter directory does **not** exist; the active feature is `stats-dashboard`). Parents have no analytics page (only `parent_teens_overview` JSON). Partners have no console-side analytics page in the audited code. Ambassadors: the back-office references commissions but has no funnel chart wired. Admin = the only audience with a real dashboard, and it is incomplete.

## 3. Gap Analysis

- **No event sink**: `trackEvent` flushes to Vercel Analytics only; product events are not joinable with relational data, blocking cohort retention, funnel, and AARRR analysis.
- **`activity_logs` is referenced but does not exist** in the live DB — `app/admin/analytics/page.tsx` and `app/api/admin/kpis/route.ts` both compute "active users today" against a missing table; the value is always 0.
- **No retention computation**: scorecard explicitly returns `d1/d7/d30 = 0` with `status: 'partial'`. There is no first-seen / last-seen materialization, no nightly retention job.
- **No materialized views**: every chart re-aggregates from base tables on every request — will not survive at scale and cannot be stale-tolerant.
- **Aggregation tables empty**: `user_monthly_stats`, `crew_weekly_stats`, `content_performance_metrics`, `notification_analytics`, `daily_game_scores`, `user_share_stats`, `user_sharing_stats` all have 0 rows — no scheduled aggregator (no Supabase cron, no Edge Function found) populates them.
- **No per-audience dashboards** for parent / partner / ambassador; only admin and teen exist, and the teen one depends on `update_daily_activity` being called from every relevant action — which is not wired everywhere.
- **No 3rd-party analytics SaaS or self-hosted OSS**: no PostHog (OSS or Cloud), Mixpanel, Amplitude, Segment, GA4, Plausible, or Umami integration. Only Vercel Analytics + Sentry.
- **CSV export covers bookings only**: no exports for XP economy, partner redemptions, ambassador commissions, e-sig conversions, AI cost.
- **Notification analytics dead**: `notification_analytics` has no writers (cross-referenced with the notifications vision doc).
- **No real-time vs batch policy**: all data is computed on-read; no 15-min / hourly / daily aggregation cadence is defined or scheduled.
- **CNDP risk**: Vercel Analytics receives anonymized teen behavioral pings (page views, custom events) from Moroccan minors — no DPIA or opt-out flow gates this rail today, and the cookie banner does not segregate analytics consent.

## 4. Open Questions

- **Self-hosted analytics (PostHog OSS) or SaaS (Mixpanel)?** PostHog OSS keeps teen behavioral data on-platform (CNDP-friendly) but adds infra; Mixpanel Cloud is faster to ship but exports minor data abroad.
- **Real-time vs batch**: do KPIs need to be live (Supabase Realtime + materialized views refreshed every 15 min) or daily (nightly cron building `daily_kpi_snapshot`)? The admin page polls; teen `/stats` is on-demand.
- **Privacy: any teen behavioral data sent off-platform?** Vercel Analytics is currently always on; should it be gated behind CNDP-grade consent, or replaced by a self-hosted sink?
- **Partner analytics SLA**: monthly CSV export emailed automatically, real-time partner console, or quarterly reconciliation review with a CSM?
- **Where do we land aggregations?** Materialized views refreshed via `pg_cron`, Supabase Edge Function on a schedule, or a small Node worker on Vercel Cron?
- **Do we surface AI cost per quiz / per coach turn to the admin dashboard, or only inside `content_generation_logs`?**
- **Ambassador funnel**: do we measure filleul conversion at sign-up, at first booking, or at first paid top-up? Each implies a different schema.
- **Scorecard publication cadence**: weekly product review (Snapchat-style D1>45%, Sticky>50%) or monthly?
- **CSV vs. Looker vs. Metabase**: do we ship a Metabase instance pointed at the read replica, or stick to ad-hoc CSV exports until volumes justify BI tooling?

## 5. Source Files & Tables Referenced

Code paths:
- `C:\Users\Shadow\Desktop\NIVY\app\admin\analytics\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\admin\analytics\loading.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\admin\gamification\scorecard\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\api\admin\scorecard\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\admin\kpis\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\admin\analytics\export\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\admin\accounting\export\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\analytics\scorecard.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\monitoring\analytics.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\layout.tsx` (mounts `<Analytics />` from `@vercel/analytics`)
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\features\stats-dashboard\actions.ts`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\012_user_stats_dashboard.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\013_annual_wrapped.sql`
- `C:\Users\Shadow\Desktop\NIVY\components\admin\realtime-kpis.tsx`

DB tables (live, project `imchornjvmgmaovhypco`):
- `public.user_lifetime_stats` (1 row)
- `public.user_monthly_stats` (0 rows — empty aggregation target)
- `public.user_daily_activity` (1 row, fed by `update_daily_activity` RPC)
- `public.crew_weekly_stats` (0 rows)
- `public.notification_analytics` (0 rows — no writers, see notifications vision)
- `public.content_performance_metrics` (0 rows)
- `public.user_share_stats` / `public.user_sharing_stats` (0 rows each — schema duplication smell)
- `public.daily_game_scores` (0 rows)
- `public.event_check_ins` (0 rows)
- `public.content_generation_logs`, `public.challenge_progress_log`, `public.mission_progress_log`, `public.crew_activity_log`, `public.vip_benefits_log`, `public.mini_game_sessions` (raw event log streams; no aggregator consumes them)
- `public.user_sessions`, `public.xp_ledger` (read by `/api/admin/scorecard`)
- `public.bookings`, `public.events`, `public.profiles` (read by `/admin/analytics`)
- Views: `v_leaderboard_all_time`, `v_leaderboard_monthly`, `v_leaderboard_weekly`, `parent_teens_overview`, `teen_full_profile`
- Materialized views: **none in `public`** (`pg_matviews` empty)
- Missing: `public.activity_logs` (referenced by code but not present)

DB queries executed during this audit:
1. `SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%stat%' OR tablename ILIKE '%metric%' OR tablename ILIKE '%analytic%' OR tablename ILIKE '%event%' OR tablename ILIKE '%daily%' OR tablename ILIKE '%lifetime%')` — returned 16 candidate tables.
2. `SELECT COUNT(*)` across `user_lifetime_stats`, `user_monthly_stats`, `user_daily_activity`, `notification_analytics`, `content_performance_metrics`, `crew_weekly_stats`, `user_share_stats`, `user_sharing_stats`, `daily_game_scores`, `event_check_ins` — confirmed all aggregation targets are empty except `user_lifetime_stats` (1) and `user_daily_activity` (1).
3. `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='VIEW'` — five views, all leaderboard/profile, none KPI.
4. `SELECT matviewname FROM pg_matviews WHERE schemaname='public'` — empty (no materialized views).
5. `SELECT tablename FROM pg_tables WHERE … '%log%' OR '%session%' OR '%audit%'` — six raw log streams identified.
6. Attempted `SELECT COUNT(*) FROM activity_logs` — failed with `relation "public.activity_logs" does not exist`, confirming the dead reference in the admin analytics page.

## 6. Next Steps (Decision Log Inputs)

1. **Pick an event sink** (PostHog OSS self-hosted on a Hetzner box, vs. Mixpanel Cloud) and migrate `lib/monitoring/analytics.ts` behind a single `track()` adapter so swapping providers is one file. This unlocks retention, funnels, and per-audience cohorts.
2. **Create `public.activity_logs`** (or rename the references to `user_daily_activity` / `user_sessions`) so DAU/MAU stop silently returning 0 in the admin dashboard.
3. **Schedule a nightly aggregator** (Supabase Edge Function + `pg_cron` at 02:00 Africa/Casablanca) populating `user_monthly_stats`, `crew_weekly_stats`, `content_performance_metrics`, `notification_analytics`, plus a new `daily_kpi_snapshot` table fueling admin charts.
4. **Materialize per-audience KPIs**: `mv_admin_global_kpis` (refresh every 15 min), `mv_partner_offer_perf` (hourly), `mv_ambassador_funnel` (daily) — replace JS reduce-on-read with `SELECT * FROM mv_…`.
5. **Ship per-audience dashboards** — parent `/parent/insights`, partner `/partner/analytics`, ambassador `/ambassador/funnel`. Reuse `<AnalyticsChart>` lazy component.
6. **Export rail v2**: extend `/api/admin/analytics/export` with route segments per domain (xp, partners, ambassadors, e-sig, ai-cost) emitting both CSV and JSON. Plan for a Metabase v1 once aggregation tables are reliably populated.
7. **CNDP gate**: split cookie banner into "essentiel / analytics / marketing" and gate `<Analytics />` mount on consent. Document in `docs/legal/`.
8. **Define KPI ownership and cadence**: weekly Snapchat-style scorecard (Product), monthly Money review, quarterly Partner & Ambassador reviews — written into `/admin/scorecard`.
