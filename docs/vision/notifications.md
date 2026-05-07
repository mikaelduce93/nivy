# Notifications System — Vision vs. Reality

> Audit date: 2026-05-07 · Source: live Supabase project `imchornjvmgmaovhypco`, code in `lib/notifications/`, `app/api/notifications/`, `lib/emails.ts`, `lib/resend.ts`, migration `016_gamified_notifications.sql`.

## 1. Intent (Product Vision)

Nivy is a multi-actor platform (teen, parent, ambassador, partner, admin) where ~10 event families must reach users on the right channel at the right moment without producing fatigue: parental approval requests, top-up confirmations, défi/streak reminders, friend wishes, event countdowns, ambassador commissions, birthday wishes, daily quiz reminders, partner sales, admin alerts. The vision spans **five channels** — web push (PWA via VAPID/`web-push`), mobile push (FCM/APNS through the future React Native app), transactional email, SMS (Moroccan-friendly provider), and an in-app inbox / bell — plus **WhatsApp** as an exploratory rail for Morocco. Per-user **per-channel preferences**, **quiet hours**, **digest aggregation**, **smart cooldowns**, **localization (fr / ar / darija / en)**, and **multi-recipient fan-out** (a teen action notifying every linked parent simultaneously) are part of the intended product.

## 2. Reality (What Exists in Code & DB)

The notifications domain is partly built, partly stubbed, and partly broken in a way nobody has caught yet. The DB layer is the most complete piece. Migration `016_gamified_notifications.sql` ships a coherent schema with five tables: `notification_templates` (19 rows seeded, slugs like `badge_earned`, `event_reminder`, `friend_request`, `streak_milestone`), `notification_triggers` (16 rows wiring trigger events to templates with `delay_minutes`/`cooldown_minutes`/`max_per_day`/`use_smart_timing`), `user_notifications` (the in-app inbox; 0 rows), `notification_preferences` (per-user toggles plus `quiet_hours_start/_end`, `digest_enabled`, `max_daily_push`, `sounds_enabled`, `vibration_enabled` — 0 rows, no defaults populated), and `notification_analytics` (0 rows, no writers found). `push_subscriptions` exists with the canonical web-push columns (`endpoint`, `p256dh`, `auth`, `device_type`, `browser`, `is_active`, `last_used_at`).

On the channel side: **email via Resend is the only fully wired rail**. `lib/resend.ts` initializes the client only when `RESEND_API_KEY` is set (graceful no-op otherwise), and `lib/emails.ts` exposes ten typed senders covering booking confirmation, event reminder, welcome, payment confirmation, parental approval request, approval result, coin top-up, VIP pass activation, birthday confirmation, ambassador commission, and partner offer redeemed. Five of these use real React Email templates from `emails/*.tsx`; the rest are inline HTML strings in French only — **no localization layer**. `docs/RESEND_CONFIGURATION.md` documents the env vars and graceful-degradation behaviour.

**Web push is half-wired and currently broken in production.** `app/api/notifications/push/send/route.ts` is a complete server using `web-push`, VAPID keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`), and the `push_subscriptions` table — including 410/404 cleanup of expired endpoints. The client hook `lib/hooks/notifications/use-push.ts` requests permission, subscribes via `pushManager`, and POSTs to `/api/notifications/push/subscribe`. `components/pwa/service-worker-registration.tsx` calls `navigator.serviceWorker.register("/sw.js", …)` — **but `/public/sw.js` does not exist** (verified). There is also no `public/manifest.json` and no `icons/badge-72x72.png` referenced as the default badge. The `push_subscriptions` table is empty as a result.

The in-app inbox has a **table-name schism**: `app/api/notifications/route.ts` reads/writes a table literally named `notifications` (not in the DB), while migration 016 created `user_notifications` with a richer schema (`title`, `body`, `emoji`, `is_read`, `is_clicked`, `is_dismissed`, `xp_reward`, `coin_reward`, `group_key`, `scheduled_for`, `expires_at`). `components/notifications/notification-bell.tsx` polls `/api/notifications` every 30 s and will silently return zero rows. There is a separate `gamification-system/components/notifications/notification-center.tsx` documented as a deliberately distinct boundary.

`lib/notifications/triggers.ts` contains placeholder cron logic (`checkStreakDanger`, `checkDailyRewards`, `checkLeaderboardChanges`) that calls `web-push` directly using the legacy `subscription` JSON column shape, not the canonical `endpoint/p256dh/auth` columns the API route uses — **a second schema mismatch**. No SMS provider (Twilio / CMI / local), no FCM/APNS, no WhatsApp, and no `device_tokens` table exist.

## 3. Gap Analysis

- **Service worker missing**: `/public/sw.js` is not in the repo; web push cannot deliver even if a user subscribes.
- **API/table mismatch**: `app/api/notifications/route.ts` targets `public.notifications` (does not exist) instead of `public.user_notifications` (the real inbox).
- **Push schema mismatch**: `triggers.ts` reads a `subscription` jsonb column; the live table uses `endpoint`/`p256dh`/`auth`.
- **Preferences not honored**: no code path reads `notification_preferences` before sending; `quiet_hours_*`, `max_daily_push`, `digest_enabled` are dead columns today.
- **No localization**: all email subjects/bodies are hard-coded French; templates table has `title_template`/`body_template` but no per-locale variants and no rendering helper.
- **Multi-recipient parental approval**: `sendApprovalRequest` accepts a single `to` address; nothing iterates `parent_links` to fan-out to all linked parents.
- **No SMS/WhatsApp/FCM rails**: zero dependencies on Twilio, SendGrid, Firebase Admin, or `expo-notifications` (verified via grep).
- **Trigger orchestrator absent**: `notification_triggers` rows exist but no service consumes them; `delay_minutes`, `cooldown_minutes`, `use_smart_timing`, `max_per_day` are unused.
- **Analytics empty**: `notification_analytics` has no writers; delivery/open/click rates are not tracked.
- **No PWA manifest**: `/public/manifest.json` missing; iOS Safari web push (16.4+) won't work without proper PWA install.

## 4. Open Questions

- **Parental approval default channel**: push (instant but requires PWA install + permission) or SMS (more reliable on Moroccan feature phones)? Email as fallback only?
- **Quiet hours**: per-teen schedule (column exists) or platform-wide nighttime window (e.g., 22h-7h Africa/Casablanca)?
- **Digest consolidation**: should `low`/`normal` priority items be queued for a daily digest email when `digest_enabled = true` and `digest_time` matches?
- **Multi-parent fan-out**: notify both linked parents in parallel, or only the "primary" custodian flagged in `parent_links`?
- **WhatsApp Business**: in-scope for V1 (Morocco-relevant) or post-MVP?
- **Localization**: store per-locale rows in `notification_templates` (slug+locale composite) or use an i18n keyset with runtime interpolation?
- **Service worker strategy**: ship a minimal hand-written `sw.js` first, or adopt `next-pwa` / `serwist` for cache + push together?

## 5. Source Files & Tables Referenced

Code paths:
- `C:\Users\Shadow\Desktop\NIVY\lib\notifications\triggers.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\notifications\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\notifications\push\send\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\notifications\push\subscribe\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\hooks\notifications\use-push.ts`
- `C:\Users\Shadow\Desktop\NIVY\components\notifications\notification-bell.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\pwa\service-worker-registration.tsx`
- `C:\Users\Shadow\Desktop\NIVY\lib\resend.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\emails.ts`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\016_gamified_notifications.sql`
- `C:\Users\Shadow\Desktop\NIVY\docs\RESEND_CONFIGURATION.md`

DB tables (live, project `imchornjvmgmaovhypco`):
- `public.notification_templates` (19 rows, seeded slugs across achievement/challenge/event/reward/social/system)
- `public.notification_triggers` (16 rows wiring events to templates)
- `public.user_notifications` (0 rows — canonical inbox, NOT the `notifications` name the API expects)
- `public.notification_preferences` (0 rows, no defaults — quiet_hours/digest/max_daily_push columns unused)
- `public.notification_analytics` (0 rows)
- `public.push_subscriptions` (0 rows — endpoint/p256dh/auth columns)

## 6. Recommended Next Steps

1. Write `public/sw.js` (push event listener + notificationclick handler) and `public/manifest.json`; verify `pushManager.subscribe` round-trip writes a row to `push_subscriptions`.
2. Fix `app/api/notifications/route.ts` to target `user_notifications` and align columns (`is_read` not `read`, `body` not `message`).
3. Reconcile `triggers.ts` with the canonical `push_subscriptions` shape and the `/api/notifications/push/send` endpoint.
4. Build a thin orchestrator: `lib/notifications/dispatch.ts` that loads `notification_preferences`, applies quiet hours + cooldown + max_daily_push, fans out across enabled channels, and logs to `notification_analytics`.
5. Add multi-parent fan-out in `sendApprovalRequest` by joining on `parent_links`.
6. Decide SMS provider for Morocco and document config; add a `device_tokens` table when the React Native app lands.
7. Introduce locale-aware template rendering (extra `locale` column on `notification_templates` or sibling i18n table).
