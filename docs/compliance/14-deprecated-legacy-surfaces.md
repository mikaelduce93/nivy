# Deprecated / legacy surfaces

Generated 2026-05-08. Classifies every surface canon has marked deprecated, plus surfaces in code that contradict canon. Sources: `docs/canon/routing.locked.md` §2/§3, `docs/canon/INDEX.locked.md` cross-cutting deprecations, compliance MDs 03–13.

## Classification rules

- **KEEP**: still in canon, no action.
- **MERGE**: another canonical surface absorbs the functionality.
- **REDIRECT**: 308 to canonical (or 307 where temporary).
- **410 GONE**: send 410 + remove from sitemap (no replacement).
- **DELETE AFTER MIGRATION**: after data/users migrate.
- **KEEP-AS-VIEW**: SQL view aliasing the canonical table during cutover.

Never recommend DELETE before verifying: no internal links, no API consumers, no DB dependency, no SEO value, no user bookmark risk.

---

## Legacy routes (table)

Pulled from `routing.locked.md` §2 + §3, compliance/03 (auth funnels), compliance/05 (deprecation layer), compliance/07 (`/gamification/*` zone), compliance/12 (admin §9 deprecations).

| Path | Class | Replacement / merge target | Internal-link audit | DB dep | SEO | Action |
|---|---|---|---|---|---|---|
| `/gamification` | REDIRECT | `/teen` | links from `components/footer.tsx:238` | no | low | 308 (currently full hub renders, see CANON-ROUTE-001) |
| `/gamification/leaderboard` | REDIRECT | `/teen/leaderboard` | linked from `components/rewards/unified-rewards-display.tsx:236`, `app/teen/leaderboard/page.tsx:79` | no | no | 308 |
| `/gamification/collections` | REDIRECT | `/teen/profile?tab=achievements` (per F#5 routing §6) | linked from `components/dashboard/teen/header.tsx:87`, `components/dashboard/teen/sidebar.tsx:33` | no | no | 308; build canonical tab first |
| `/gamification/roue` | 410 GONE | (none — `wheel_streaks` trigger broken) | none | no | no | 410 + delete page |
| `/gamification/parcours` | 410 GONE | (none — static mock) | none | no | no | 410 + delete page |
| `/gamification/missions` | REDIRECT | `/teen/quests` | linked from `components/rewards/unified-rewards-display.tsx:230` | no | no | 308 (already correct) |
| `/gamification/defis` | REDIRECT | `/teen/quests/friend-defis` | none | no | no | 308 (already correct) |
| `/gamification/defis-physiques` | REDIRECT | `/teen/defis-physiques` (then to `/teen/quests?tab=body` per F11) | none | no | no | 308 (current) |
| `/gamification/aide-scolaire` | REDIRECT | `/teen/aide-scolaire` | none | no | no | 308 (already correct) |
| `/gamification/crews` | KEEP | `/teen/crews` (target missing) | none | no | no | KEEP redirect stub until target ships |
| `/gamification/boutique` | REDIRECT | `/teen/wallet?tab=shop` | none | no | no | 308 (already correct) |
| `/teen/challenges` | REDIRECT | `/teen/quests?tab=body` | none | no | no | 308 (currently re-exports `defis-physiques` — replace per CANON-GAME-004) |
| `/teen/achievements` | REDIRECT | `/teen/profile?tab=achievements` | none | no | no | 307 → 308 once tab built (CANON-ROUTE-008) |
| `/teen/map` | 410 GONE | none (deep-links migrated) | none | no | no | 410 |
| `/teen/passions` | REDIRECT | `/onboarding` | none | no | no | 308 (current target wrong: redirects to `/teen/quests?tab=creative` per CANON-ROUTE-009) |
| `/teen/rewards` | REDIRECT | `/teen/wallet?tab=shop` | none | no | no | 308 (correct) |
| `/teen/settings` | REDIRECT | `/teen/profile?tab=settings` | linked from `components/dashboard/teen/header.tsx:186`, `components/dashboard/teen/sidebar.tsx:39` | no | no | 308 (correct) |
| `/teen/shop` | REDIRECT | `/teen/wallet?tab=shop` | linked from `app/teen/shop/checkout/checkout-client.tsx:187,230`, `components/teen/shop-filters.tsx:74`, `components/dashboard/teen/sidebar.tsx:34` | no | no | 308 (correct) |
| `/teen/coins` | REDIRECT | `/teen/wallet` | linked from `components/dashboard/teen/header.tsx:90` | no | no | 308 (correct); also delete `app/teen/coins/coins-client.tsx` |
| `/teen/academic` | REDIRECT | `/teen/aide-scolaire` | none | no | no | 308 (correct) |
| `/teen/social` | KEEP | (fold into `/teen` once `?tab=map` deep-link migrated; then 410) | dashboard deep-links per F#9 | no | no | KEEP, then 410 |
| `/teen/games` | 410 GONE | (out of scope per F14) | none | no | no | 410 + hard delete (currently full page renders, CANON-ROUTE-011) |
| `/teen/calendar` | REDIRECT | `/teen/events?view=calendar` | none | no | no | 308 (currently full page renders, CANON-ROUTE-011) |
| `/teen/messages` | REDIRECT | `/teen/circles` (F12) | none | yes (`direct_messages`) | no | 308 (currently full page renders, CANON-ROUTE-011) |
| `/aide/faq` | REDIRECT | `/aide` | none | no | yes (FAQ SEO content) | Move accordion content into `/aide`, then 308 (CANON-ROUTE-012) |
| `/anniversaires/organiser` | REDIRECT | `/anniversaires` (F#16) | none | no | low | 308 (currently full multi-step renders, CANON-ROUTE-013) |
| `/notifications` | REDIRECT | role-resolved at `/auth/redirect` → `/parent/notifications` or `/teen/activity` | linked from `components/notifications/notification-center.tsx:237,295`, `components/dashboard/header.tsx:103`, etc. | yes (reads deprecated `notifications` table) | no | 308 role-router (CANON-ROUTE-006) |
| `/notifications/preferences` | REDIRECT | `/parent/settings#notifications` OR `/teen/profile?tab=settings#notifications` | none | no | no | 308 role-router (CANON-ROUTE-038) |
| `/autorisations` | REDIRECT | `/parent/approvals` | linked from `components/layouts/app-sidebar.tsx:57` | no | no | 308 (currently full page, CANON-ROUTE-005) |
| `/autorisations/ajouter` | REDIRECT | `/parent/approvals` | none | no | no | 308 |
| `/devenir-influenceur` | REDIRECT | `/devenir-ambassadeur` (F3 ruling) | none | no | yes (marketing kit links) | 308 (currently full page, CANON-ROUTE-031) |
| `/devenir-influenceur/candidature` | REDIRECT | `/devenir-ambassadeur/candidature` | none | yes (`influencer_campaigns`) | no | 308 + 410 the table |
| `/djs` | REDIRECT | `/agenda` | none | no | low | 308 (CANON-ROUTE-033) |
| `/djs/[id]` | REDIRECT | `/agenda/[id]` | none | no | no | 308 |
| `/djs/candidature` | 410 GONE | (none) | none | no | no | 410 |
| `/dev/defi-card-preview` | 410 GONE | (none) | none | no | no | strip via `next.config` env-gate; CANON-ROUTE-034 |
| `/xp-shop` | REDIRECT | `/teen/wallet?tab=shop` | none | no | no | 308 (correct) |
| `/espace` | REDIRECT | `/auth/redirect` | mobile-dock public nav line 259 | no | no | 308 (correct) |
| `/daily` | REDIRECT | `/teen/quests` | router.push from `app/daily/page.tsx:55,526` | no | no | 308 (currently 538-line full hub renders) |
| `/dashboard` | 410 GONE | role-prefix replacements | linked 5+ places (`components/layouts/app-sidebar.tsx:37`, `components/dashboard/sidebar.tsx:22`, `components/dashboard/header.tsx:40`) | no | no | 410 + sweep all `<Link>`s |
| `/dashboard/ambassadeur` | 410 GONE | `/ambassador` | linked `app/devenir-ambassadeur/page.tsx:194` | no | no | 410 |
| `/profile`, `/profile/enfants`, `/profile/enfants/ajouter`, `/profile/modifier`, `/profile/commandes`, `/mon-compte`, `/mes-reservations`, `/mes-clubs` | 410 GONE | role-prefixed (`/parent/teens`, `/parent/teens/add`, `/parent/settings`, `/teen/profile`) | linked 9+ places (CANON-ROUTE-021) | no | no | 410 + sweep links |
| `/events`, `/events/[id]` | 410 GONE | `/agenda`, `/agenda/[id]` | linked `app/parent/events/page.tsx:338` | no | no | 410 |
| `/cgv`, `/conditions`, `/support` | 410 GONE | `/legal/cgv`, `/legal/cgu`, `/aide` | linked `app/a-propos/page.tsx:142`, `app/guide-parents/page.tsx:170`, `app/auth/sign-up/page.tsx:248` | no | no | 410 + sweep links |
| `/partner/dashboard` | REDIRECT | `/partner` (F#1 routing §6) | linked `components/dashboard/partner/header.tsx:117`, `app/partner/dashboard/page.tsx:351` | no | no | 308 (CANON-ROUTE-007) |
| `/parent/subscription` | 410 GONE | `/carte-vip/souscrire` | linked `components/dashboard/parent/sidebar.tsx:27` | no | no | 410 (CANON-PARENT-008) |
| `/parent/live` | 410 GONE | folded into `/parent` dashboard | none | no | no | 410 (CANON-ROUTE-035) |
| `/ambassador/boutique` | 410 GONE | (DELETE, out-of-scope per FRONTEND_REDO §5) | linked `app/ambassador/comment-gagner/page.tsx:281` | no | no | 410 (CANON-ROUTE-030) |
| `/ambassador/{shop,link,stats,rewards,settings,help,profile}` | 410 GONE | `/ambassador/marketing|withdrawals|commissions|comment-gagner` | linked `components/dashboard/ambassador/sidebar.tsx:21-25`, mobile-dock 207/221 | no | no | 410 + canonical sidebar (CANON-ROUTE-016) |
| `/admin/events`, `/admin/users`, `/admin/settings` | 410 GONE | `/admin/evenements`, `/admin/utilisateurs`, (drop) | mobile-dock lines 162, 169, 183 | no | no | 410 + sweep mobile-dock (CANON-ROUTE-004) |
| `/admin/clubs`, `/admin/clubs/creer`, `/admin/clubs/[id]/supprimer` | MERGE | `/admin/partners?type=venue` (F#12 routing §6) | none | yes (`clubs` reads) | no | MOVE then redirect (CANON-ROUTE-036) |
| `/admin/scripts-sql` | 410 GONE | `/admin/system` super_admin tab (per canon admin §9) | linked `components/layouts/admin-sidebar.tsx:80-83` | no | no | strip in prod; super_admin only (CANON-ADMIN-011) |
| `/admin/proofs` | DELETE AFTER MIGRATION | `/admin/moderation?type=defi_proof` | none | yes (`moderation_queue`) | no | redirect after `/admin/moderation` ships |
| `/admin/creator-moderation` | DELETE AFTER MIGRATION | `/admin/moderation?type=feed_post` | none | yes (`moderation_queue`) | no | redirect after `/admin/moderation` ships |
| `/admin/content/review`, `/admin/content` | DELETE AFTER MIGRATION | `/admin/moderation?type=quiz_ai` (review) / DELETE (content mock) | none | no | no | redirect / delete (CANON-ADMIN-014) |
| `/admin/marketplace` | DELETE AFTER MIGRATION | `/admin/moderation?type=marketplace_listing` (disputes → `/admin/finances`) | none | yes | no | redirect (CANON-ADMIN-014) |
| `/admin/partners`, `/admin/mentors`, `/admin/drivers`, `/admin/ambassadeurs` | DELETE AFTER MIGRATION | `/admin/kyc?subject_kind={partner|mentor|driver|ambassador}` | sidebar links | yes (`kyc_documents`) | no | redirect after `/admin/kyc` ships (CANON-ADMIN-014) |
| `/admin/topups` | MERGE | `/admin/finances?tab=topups` | sidebar link | yes (`payment_transactions`) | no | move + redirect (CANON-ADMIN-007) |
| `/admin/permissions` | MERGE | `/admin/system?tab=permissions` (super_admin) | sidebar link | yes (`admin_roles`) | no | move (CANON-ADMIN-014) |
| `/admin/gamification-setup` | 410 GONE | (one-shot migration runner) | none | no | no | 410 (CANON-ADMIN-014) |
| `/admin/tag-normalize` | MERGE | `/admin/system?tab=cron-audits` | none | yes (`tag_aliases`) | no | move (CANON-ADMIN-014) |
| `/admin/internships` | MERGE | `/admin/operations?tab=internships` | sidebar link | yes (`internships`) | no | move |
| `/admin/anniversaires`, `/admin/check-in` | MERGE | `/admin/evenements?tab={anniversaires,check-in}`, `/admin/reservations?tab=check-in` | sidebar link | yes | no | move |
| `/admin/gamification/scorecard` | MERGE | `/admin/analytics?tab=live-pulse` | none | no | no | move |
| `/admin/logs` | RENAME | `/admin/audit-log` (also fix table from `activity_logs` to `audit_log`) | sidebar link | yes (deprecated `activity_logs`) | no | rename + canonical table |

**Notes on still-renders (not yet redirect)**: `/gamification` (5 pages: hub, leaderboard, collections, roue, parcours), `/teen/calendar`, `/teen/messages`, `/teen/games`, `/aide/faq`, `/anniversaires/organiser`, `/autorisations*`, `/notifications*`, `/devenir-influenceur*`, `/daily`, `/partner/dashboard` are all on disk as full pages despite canon. See compliance/05 §HOT clusters.

---

## Legacy tables (table)

Pulled from compliance/04 (economy), 06 (social — `notifications`/`activity_logs`/`moderation_reports`), 08 (parent — `notifications`/`activity_logs`), 12 (admin — `admin_audit_logs`), 09 (partner — `partner_discounts` view), INDEX cross-cutting #5, #7.

| Table | Class | Replacement | Writers? | Readers? | Migration RPC | Action |
|---|---|---|---|---|---|---|
| `notifications` | DELETE AFTER MIGRATION | `user_notifications` | yes — 7 endpoints (`api/parent/teens/route.ts:90`, `api/parent/teens/create/route.ts:207`, `api/parent/budget/route.ts:101`, `api/parent/grades/route.ts:295`, `api/parent/live/route.ts:378`, `api/teen/messages/route.ts:234`, `api/circles/report/route.ts:159`, also `app/notifications/page.tsx:19` reads) | yes | move_legacy_notifs (TO BUILD) | migrate writes/reads, then 410 writes |
| `activity_logs` | DELETE AFTER MIGRATION | `audit_log` (singular) | yes — 4 routes (`api/parent/teens/route.ts:101`, `api/parent/teens/create/route.ts:197`, `api/parent/budget/route.ts:113`, `api/partner/offers/*`) | yes (`/admin/logs`) | n/a | rewrite producers, swap reader, then 410 |
| `admin_audit_logs` | DELETE AFTER MIGRATION | `audit_log` (singular) | yes — 28 producers across `app/api/admin/**` (`refunds/route.ts:280`, `topups/[id]/confirm/route.ts:117`, `partners/[id]/approve/route.ts:81`, `moderation/[id]/approve/route.ts:74`, `lib/auth/admin-permissions.ts:165`) | yes | one-shot backfill (CANON-ADMIN-013) | rename + schema realign + propagate (CANON-ADMIN-001/002/013) |
| `moderation_reports` | DELETE | `moderation_queue` (with `content_type='circle_message'`) AND `user_reports` (universal report sink, also missing) | yes — `api/circles/report/route.ts:89,101,124` | no — table doesn't exist live | n/a | rewrite caller (CANON-SOCIAL-013, CANON-ADMIN-017) |
| `reports` | 410 GONE | `user_reports` | yes — `api/teen/feed/comments/route.ts:298-305` | no | n/a | rewrite caller (CANON-SOCIAL-005) |
| `partner_discounts` | KEEP-AS-VIEW | `partner_offers` (alias view, mig 074) | no (view) | yes — 3 reads in `app/partner/page.tsx:40-44,64-68,75-80` | n/a | sunset wave Cleanup-E per founder ruling |
| `shop_items` | DELETE AFTER MIGRATION | `shop_rewards` + `purchase_reward` RPC | yes — `api/teen/shop/route.ts:17-21` (legacy rail) | yes (legacy GET) | n/a | 410 the route (CANON-ECON-002), then drop |
| `xp_shop_items` | DELETE | `shop_rewards` | none | none | n/a | DROP TABLE (CANON-ECON-016/026) |
| `token_rewards`, `token_redemptions`, `token_transactions`, `token_transfers`, `token_sources`, `token_types` | DELETE | (canon §5.1: kill the entire token rail) | yes — `api/teen/tokens/route.ts:412-501` | yes | n/a | 410 the route, drop tables (CANON-ECON-003) |
| `user_purchases` | DELETE | `shop_purchases` | none (zero-row, zero-writer) | no | n/a | DROP TABLE (CANON-ECON-020) |
| `user_coins.{premium_tokens, seasonal_tokens, pending_tokens, token_multiplier, total_lifetime_tokens}` columns | DELETE | none (deprecated scaffolding) | yes — `api/teen/tokens/route.ts` reads | yes | n/a | drop columns after route 410 (CANON-ECON-003) |
| `shop_purchases.coins_spent` column | RENAME | `xp_spent` (it stores XP, not coins) | yes — `purchase_reward` RPC | yes — `app/teen/shop/history/page.tsx:51,58,166,170` | rename column (CANON-ECON-006) | rename + RPC body update + UI swap |
| `daily_challenges` | DELETE AFTER MIGRATION | unified `quests` + `quest_progress` per-teen | yes — `api/teen/quests/{start,complete}` fallback | yes (fallback) | n/a | drop fallback first, then drop table (CANON-GAME-012) |
| `teen_full_profile` | INVESTIGATE → VIEW | `teens` + joins | yes — `api/auth/validate-teen/route.ts:206-223` (writes) | yes (`get-user-role.ts:80`) | n/a | confirm view; redirect INSERTs to `teens` (CANON-AUTH-018) |
| `parents` | DELETE | `profiles` (role='parent') | yes — `components/onboarding/parent-setup-step.tsx:108-113` | unknown | n/a | drop in CANON-AUTH-005 fix wave |
| `influencer_campaigns` | 410 GONE | `ambassadors` with `track='influencer'` (per F3) | yes — `/devenir-influenceur` form posts | unknown | n/a | drop after fold (CANON-AUTH-023) |
| `xp_payment_settings.xp_to_dh_rate=100` row | DELETE | TS constant `XP_TO_DH_RATE=0.10` (10× drift trap) | none | none | DELETE row | drop or update to 10 (CANON-ECON-018) |
| Legacy `friendships(user_id, friend_id)` shape | DELETE | rich shape `(user1_id, user2_id, status, ...)` | none in app code | none | n/a | tracked deprecated (informational) |
| Legacy `social_feed_posts` | 410 GONE | `feed_posts` | none in app/migrations | none (docs only) | n/a | informational guard (CANON-SOCIAL-018) |

---

## Legacy APIs (table)

Phantom endpoints have been moved to file 15. This table covers legacy API endpoints still consumed.

| Endpoint | Class | Replacement | Callers | Action |
|---|---|---|---|---|
| `GET/POST /api/teen/shop` | 410 GONE | wallet `purchase_reward` server action via `/teen/wallet?tab=shop` | none on canonical UI | replace handler bodies with `return new NextResponse(null, { status: 410 })` (CANON-ECON-002) |
| `GET/POST /api/teen/tokens` (all actions) | 410 GONE | (entire token rail killed) | possibly legacy UI shells | 410 + drop (CANON-ECON-003) |
| `POST /api/teen/quests/complete` legacy `add_user_xp` branch | RENAME | `add_xp_to_user` RPC | `app/api/teen/quests/complete/route.ts:94` | rename callsite (CANON-ECON-004) |
| `POST /api/auth/validate-teen` `add_user_xp` call | RENAME | `add_xp_to_user` | `app/api/auth/validate-teen/route.ts:265` | rename |
| `POST /api/partner/apply-discount` `add_user_xp` call | RENAME | `add_xp_to_user` | `app/api/partner/apply-discount/route.ts:188` | rename |
| `POST /api/partners/register` (orphan partners) | RENAME + REWRITE | `POST /api/partners/wizard/submit` | `app/devenir-partenaire/inscription` | rebuild atomically (CANON-PARTNER-001) |
| `POST /api/admin/partners/[id]/approve` (no auth.users provisioning) | DELETE AFTER MIGRATION | `POST /api/admin/partners/[id]/activate` (canonical 6-step transactional) | admin queue | build canonical, redirect approve (CANON-PARTNER-002) |
| `POST /api/admin/refunds` (inline `bumpCoins`, direct UPDATEs) | DELETE AFTER MIGRATION | `refund_teen_coins` + `refund_booking` + `refund_food_order` + `refund_marketplace` RPCs | admin UI | route only through canonical RPCs (CANON-ECON-009, CANON-LIFE-001/002, CANON-ADMIN-007) |
| `POST /api/teen/friend-challenges/[id]/accept` with `{action:'decline'}` body | RENAME caller | `POST /api/teen/friend-challenges/[id]/decline` | `app/teen/quests/friend-defis/friend-defis-client.tsx:204` | rewire client (CANON-GAME-007) |
| `app/api/teen/friends/handlers.ts` `remove`/`block`/`unblock`/`search` (handler functions exist, no route file) | MUST IMPLEMENT | (build the route files) | dead code | scaffold routes (CANON-SOCIAL-007) — see file 15 phantom routes |
| `POST /api/admin/creator/moderate`, `/api/admin/marketplace/moderate/[listing_id]`, `/api/admin/content/review/[id]` | MERGE | single `moderate_content(p_queue_id, p_decision, p_note)` RPC dispatched via `/api/admin/moderation/[id]/{approve,reject}` | admin queues | unify (CANON-ADMIN-005) |
| `GET /api/parent/e-signature/status` (no companion `POST`) | KEEP + BUILD COMPANION | also build `POST /api/parent/e-signature` | parent wizard | add POST (CANON-AUTH-010) |
| Header `<form action="/auth/signout">` | MUST IMPLEMENT | route file missing | header component | see file 15 phantom routes |

---

## Legacy components (table)

From compliance/11 (4 AI components), compliance/13 (toast wrapper, motion), compliance/05/07 (legacy nav shells), compliance/06 (social-hub mock fixtures).

| Component | Class | Replacement | Callers | Action |
|---|---|---|---|---|
| `components/ai/elite-ai-companion.tsx` | DELETE | `components/teen/avatar-coach.tsx` (canonical) | mounted at `app/teen/layout.tsx:71-77` | unmount + delete (CANON-AI-004) |
| `components/ai/AgentSheet.tsx` | DELETE | `AvatarCoach` (or per-role surface) | importable | delete after import refactor |
| `components/ai/AgentFloatingButton.tsx` | DELETE | per-role canonical surface (or remove) | mounted at `app/{admin,parent,partner,ambassador}/layout.tsx` | unmount + delete (CANON-AI-014) |
| `components/teen/dashboard/ai-companion.tsx` | DELETE | `avatar-coach.tsx` | none/unmounted | delete |
| `components/teen/dashboard/ai-oracle-card.tsx` | DELETE | `avatar-coach.tsx` | only in unmounted `unified-quest-feed.tsx:5` | delete |
| `lib/ai/ready-player-me.ts` | DELETE | (zero call sites) | none | delete |
| `components/ui/toast.tsx`, `components/ui/toaster.tsx`, `hooks/use-toast.ts` (Radix wrapper) | DELETE AFTER MIGRATION | sonner | last caller: `components/ticket-actions.tsx` | migrate caller to sonner, then delete (CANON-DS-018) |
| `app/teen/coins/coins-client.tsx` | DELETE | `/teen/wallet` | redirect target | delete (CANON-ECON-014) |
| `components/layouts/app-sidebar.tsx` (legacy IA sidebar) | DELETE OR REWRITE | role-specific sidebars under `components/dashboard/<role>/sidebar.tsx` | mounted in legacy layouts | rewrite or delete (CANON-ROUTE-002) |
| `components/dashboard/sidebar.tsx`, `components/dashboard/header.tsx` (legacy "dashboard" shell) | DELETE | role-specific shells | various | delete (CANON-ROUTE-003) |
| Mobile-dock entries pointing at non-existent routes (`/admin/events`, `/admin/users`, `/admin/settings`, `/partner/profile`, `/ambassador/profile`, `/ambassador/shop`) | REWRITE | canonical hrefs | `components/layouts/mobile-dock.tsx:145,162,169,183,207,221` | rewrite (CANON-ROUTE-004) |
| `components/ui/parallax-container.tsx` (no reduced-motion gate) | FIX | gate via `useReducedMotion` | various | gate or wrap in Motion proxy (CANON-DS-005) |
| `app/teen/social/social-hub-client.tsx` RankingTab fixtures (`Salma K.`, `Youssef M.`) | DELETE | EmptyState | renders on `/teen/social` | delete fixtures, replace with EmptyState (CANON-SOCIAL-017) |
| `components/teen/defis-physiques-client.tsx` (billboard, no onClick) | DELETE | merge into `/teen/quests?tab=body` (F11) | `/teen/defis-physiques` | delete after merge (CANON-GAME-005, CANON-GAME-014) |
| `useOptimisticRunner` (`lib/hooks/use-optimistic-mutation.ts`) | REWRITE | React 19 `useOptimistic` + `startTransition` + 'Réessayer' rollback | 4 callers | rewrite (CANON-DS-009) |
| `lib/motion/easing.ts` `EASE_STANDARD` constant drift | RECONCILE | canon §3 values OR update canon | many | founder decision (CANON-DS-021) |
| `components/dashboard/parent/sidebar.tsx` `silver|gold|platinum` tier copy | REPLACE | DB enum `free|starter|pro|elite|family` | local | swap (CANON-PARENT-010) |
| Legacy parent-flavored `app/daily/page.tsx` (538-line full hub) | DELETE | `/teen/quests` (308) | none canonical | replace body with `permanentRedirect('/teen/quests')` |

---

## Legacy storage buckets

From compliance/07 §3, compliance/08 §6, INDEX cross-cutting #6.

| Bucket | Class | Replacement | Writers | Action |
|---|---|---|---|---|
| `defi-proofs` (public, used for chores) | RENAME / RE-PURPOSE | `chore-evidence` (PRIVATE, mig 080) for chores; `defi-proofs` retained PRIVATE only for physical-challenge proofs | `components/teen/teen-chore-complete-button.tsx:56-59` | swap to `chore-evidence`, fix path convention `<teen_id>/<chore_id>/<uuid>.<ext>` (CANON-GAME-008) |
| `documents` (PUBLIC `getPublicUrl`) holding CIN images | DELETE AFTER MIGRATION | `parent-cin` (PRIVATE, signed-URL only, 5/15/30-min TTL per F14) | `app/api/parent/e-signature/create/route.ts:73-90,135-155` | migrate uploads, scrub existing public URLs, build private bucket (CANON-PARENT-004) |
| `kyc-documents` (storage policy `kyc_admin_read` MISSING) | KEEP | (private bucket exists) | partner KYC | add admin-read policy (CANON-ADMIN-009) |
| `dm-attachments` | MUST CREATE | (referenced by canon, no migration) | none yet | create private bucket + signed-URL handler (CANON-SOCIAL-011) |
| `marketplace-images-private` | MUST CREATE | (referenced by canon §6) | none yet | create private bucket; min-1/max-6 enforcement (CANON-SOCIAL-016) |

---

## Sunset waves (date by canon recommendation)

Order chosen for least blast-radius first; each wave assumes prior waves' callers already moved.

- **Wave Cleanup-A (week 2)** — Routing layer hardening. Convert all 17 redirect stubs to actual `permanentRedirect()` (CANON-ROUTE-001/005-014, CANON-GAME-006). Strip `/dev/*`, gate `/admin/scripts-sql`. 410 sweep on `/dashboard`, `/profile*`, `/mes-*`, `/cgv`, `/conditions`, `/support`, `/events*`, hard delete `/teen/games`, `/teen/map`, `/gamification/{roue,parcours}`, `/djs/candidature`, `/parent/live`, `/ambassador/{shop,boutique}`, `/parent/subscription`. Re-point all sidebars + mobile-dock + footer to canonical hrefs (CANON-ROUTE-002/003/004/015/016, CANON-PARENT-008).

- **Wave Cleanup-B (week 3)** — Notification + audit table migration. Build `move_legacy_notifs` migration; rewrite 7 `notifications` writers + 1 reader to `user_notifications`; rewrite 4 `activity_logs` writers + `app/admin/logs` reader to `audit_log`; rename + reshape `admin_audit_logs` → `audit_log` (canon §4 schema), backfill 28 producers (CANON-ADMIN-001/002/013, CANON-PARENT-011-015, CANON-SOCIAL-012). 410 the bare `/notifications*` routes via role-router. Drop `app/notifications/page.tsx`, `app/notifications/preferences/page.tsx`, `app/autorisations/page.tsx`, `app/autorisations/ajouter/page.tsx`.

- **Wave Cleanup-C (week 4)** — AI-companion components → AvatarCoach (Kai) only. Unmount `EliteAICompanion` from `/teen/layout.tsx`; remove `AgentFloatingButton` from admin/parent/partner/ambassador layouts; delete `AgentSheet`, `ai-companion`, `ai-oracle-card`, `ready-player-me`. Migrate teen prompts to single `KAI_CANONICAL_PROMPT` (CANON-AI-004/008/014). Strip PII from ContextEngine + avatar-coach (CANON-AI-001/005). Replace hardcoded model literals with env-driven (CANON-AI-002).

- **Wave Cleanup-D (week 5)** — Toast/motion/easing sweep. Migrate `components/ticket-actions.tsx` to sonner; delete Radix toast wrapper trio (CANON-DS-018). Swap 4 `window.alert()` calls in feed-list/post-card/social-feed to `toast.success` (CANON-DS-012, CANON-SOCIAL-003). Land Wave 2 motion codemod (159 files, CANON-DS-020). Founder decision on `EASE_STANDARD` drift (CANON-DS-021). Inline cubic-bezier removal (CANON-DS-017).

- **Wave Cleanup-E (week 6)** — Currency/economy table sunset. Per F8/F12 ruling: drop `partner_discounts` view (CANON-PARTNER-015 — after consumers migrate); 410 `/api/teen/tokens` and drop entire token rail tables/columns (CANON-ECON-003); drop `user_purchases`, `xp_shop_items`, `shop_items`, `add_coins_to_user` RPC (CANON-ECON-016/020/026). Rename `shop_purchases.coins_spent` → `xp_spent` (CANON-ECON-006). Drop `xp_payment_settings.xp_to_dh_rate=100` row (CANON-ECON-018). Drop legacy `parents` and `influencer_campaigns` tables (CANON-AUTH-005/023). Drop legacy `friendships(user_id, friend_id)` shape if any rows linger.

- **Wave Cleanup-F (week 7+)** — Admin route consolidation. Build `/admin/{moderation,finances,audit-log,kyc,support,broadcasts,system,operations,cndp,utilisateurs/[id]}`. Redirect 19 deprecated admin routes per CANON-ADMIN-014. Swap `/admin/clubs*` into `/admin/partners?type=venue` (F#12).

End of file 14.
