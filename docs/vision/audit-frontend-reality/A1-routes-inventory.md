# A1 — Routes Inventory (READ-ONLY frontend audit)

Source: `app/**` at `C:\Users\Shadow\Desktop\NIVY` (branch `main`).

## Totals

| Bucket | Count |
|---|---|
| Pages (`page.tsx`) — total | 199 |
| Pages — real / rendered | 182 |
| Pages — redirect-only stubs (`redirect()` / `permanentRedirect()` only, or `export { default }` re-export to a redirect page) | 17 |
| API routes (`route.ts`, incl. `auth/callback`) | 232 |
| Layouts (`layout.tsx`) | 8 |
| Loading skeletons (`loading.tsx`) | 142 |
| Error boundaries (`error.tsx`) | 13 |
| Not-found (`not-found.tsx`) | 1 |
| **Grand total files in `app/**`** | **595** |

**Redirect-only stubs (17):** `/teen/challenges`, `/teen/achievements`, `/teen/map`, `/teen/passions`, `/teen/rewards`, `/teen/settings`, `/teen/shop`, `/teen/coins`, `/teen/academic`, `/gamification/defis-physiques`, `/gamification/aide-scolaire`, `/gamification/crews`, `/gamification/boutique`, `/gamification/missions`, `/gamification/defis`, `/xp-shop`, `/espace`.

Note on classification: a page that calls `redirect()` only as auth-gate (then renders content) is classified as a real page, not a stub. Stubs are pages whose default export does nothing but call `redirect()` / `permanentRedirect()` (or `export { default } from <stub>`).

---

## Layouts (8)

| URL scope | File |
|---|---|
| (root) | `app/layout.tsx` |
| `(dashboard)` route group | `app/(dashboard)/layout.tsx` |
| `/teen/*` | `app/teen/layout.tsx` |
| `/parent/*` | `app/parent/layout.tsx` |
| `/partner/*` | `app/partner/layout.tsx` |
| `/admin/*` | `app/admin/layout.tsx` |
| `/ambassador/*` | `app/ambassador/layout.tsx` |
| `/mentor/*` | `app/mentor/layout.tsx` |

## Top-level error / not-found

| File | Type |
|---|---|
| `app/error.tsx` | error (root) |
| `app/not-found.tsx` | not-found (root) |
| `app/(dashboard)/error.tsx` | error (route group) |
| `app/loading.tsx` | loading (root) |

---

## PUBLIC pages (no role gate)

| URL | File | Page kind | loading? | error? |
|---|---|---|---|---|
| `/` | `app/page.tsx` | page | yes (`app/loading.tsx`) | yes (`app/error.tsx`) |
| `/a-propos` | `app/a-propos/page.tsx` | page | — | — |
| `/aide` | `app/aide/page.tsx` | page | — | — |
| `/aide/faq` | `app/aide/faq/page.tsx` | page | — | — |
| `/anniversaires` | `app/anniversaires/page.tsx` | page | yes | — |
| `/anniversaires/organiser` | `app/anniversaires/organiser/page.tsx` | page | — | — |
| `/agenda` | `app/agenda/page.tsx` | page | yes | — |
| `/agenda/[id]` | `app/agenda/[id]/page.tsx` | page | — | yes |
| `/blog` | `app/blog/page.tsx` | page | — | — |
| `/carte-vip` | `app/carte-vip/page.tsx` | page | — | — |
| `/carte-vip/confirmation` | `app/carte-vip/confirmation/page.tsx` | page | — | — |
| `/carte-vip/recompenses` | `app/carte-vip/recompenses/page.tsx` | page | — | — |
| `/carte-vip/souscrire` | `app/carte-vip/souscrire/page.tsx` | page | — | — |
| `/clubs` | `app/clubs/page.tsx` | page | yes | yes |
| `/clubs/[slug]` | `app/clubs/[slug]/page.tsx` | page | — | yes |
| `/communaute` | `app/communaute/page.tsx` | page | — | — |
| `/daily` | `app/daily/page.tsx` | page | — | — |
| `/dev/defi-card-preview` | `app/dev/defi-card-preview/page.tsx` | page (dev) | — | — |
| `/devenir-ambassadeur` | `app/devenir-ambassadeur/page.tsx` | page | — | — |
| `/devenir-ambassadeur/candidature` | `app/devenir-ambassadeur/candidature/page.tsx` | page | — | — |
| `/devenir-ambassadeur/programme` | `app/devenir-ambassadeur/programme/page.tsx` | page | — | — |
| `/devenir-influenceur` | `app/devenir-influenceur/page.tsx` | page | — | — |
| `/devenir-influenceur/candidature` | `app/devenir-influenceur/candidature/page.tsx` | page | — | — |
| `/devenir-partenaire` | `app/devenir-partenaire/page.tsx` | page | — | — |
| `/devenir-partenaire/inscription` | `app/devenir-partenaire/inscription/page.tsx` | page | — | — |
| `/djs` | `app/djs/page.tsx` | page | yes | — |
| `/djs/[id]` | `app/djs/[id]/page.tsx` | page | — | yes |
| `/djs/candidature` | `app/djs/candidature/page.tsx` | page | — | — |
| `/galerie` | `app/galerie/page.tsx` | page | yes | — |
| `/guide-parents` | `app/guide-parents/page.tsx` | page | — | — |
| `/legal/cgu` | `app/legal/cgu/page.tsx` | page | — | — |
| `/legal/cgv` | `app/legal/cgv/page.tsx` | page | — | — |
| `/legal/confidentialite` | `app/legal/confidentialite/page.tsx` | page | — | — |
| `/legal/cookies` | `app/legal/cookies/page.tsx` | page | — | — |
| `/legal/mentions-legales` | `app/legal/mentions-legales/page.tsx` | page | — | — |
| `/marketplace` | `app/marketplace/page.tsx` | page | — | — |
| `/marketplace/listings/[id]` | `app/marketplace/listings/[id]/page.tsx` | page | — | — |
| `/marketplace/my-listings` | `app/marketplace/my-listings/page.tsx` | page | — | — |
| `/marketplace/orders` | `app/marketplace/orders/page.tsx` | page | — | — |
| `/marketplace/sell` | `app/marketplace/sell/page.tsx` | page | — | — |
| `/notifications` | `app/notifications/page.tsx` | page | yes | — |
| `/notifications/preferences` | `app/notifications/preferences/page.tsx` | page | — | — |
| `/offline` | `app/offline/page.tsx` | page (PWA fallback) | — | — |
| `/partenaires/merci` | `app/partenaires/merci/page.tsx` | page | — | — |
| `/reservation` | `app/reservation/page.tsx` | page | yes | yes |
| `/reservation/confirmation` | `app/reservation/confirmation/page.tsx` | page | — | — |
| `/reservation/paiement` | `app/reservation/paiement/page.tsx` | page | — | yes |
| `/securite` | `app/securite/page.tsx` | page | — | — |
| `/temoignages` | `app/temoignages/page.tsx` | page | yes | — |
| `/autorisations` | `app/autorisations/page.tsx` | page | — | — |
| `/autorisations/ajouter` | `app/autorisations/ajouter/page.tsx` | page | — | — |
| `/espace` | `app/espace/page.tsx` | **redirect-only** (role-router → `/teen` / `/parent` / `/ambassador` / `/partner` / `/admin`) | — | — |
| `/xp-shop` | `app/xp-shop/page.tsx` | **redirect-only** → `/teen/wallet?tab=shop` | yes | — |

---

## AUTH pages

| URL | File | Page kind | loading? | error? |
|---|---|---|---|---|
| `/auth/confirm-email` | `app/auth/confirm-email/page.tsx` | page | — | — |
| `/auth/error` | `app/auth/error/page.tsx` | page | — | — |
| `/auth/login` | `app/auth/login/page.tsx` | page | — | — |
| `/auth/redirect` | `app/auth/redirect/page.tsx` | page (post-auth role router) | — | — |
| `/auth/sign-up` | `app/auth/sign-up/page.tsx` | page | — | — |
| `/auth/sign-up-success` | `app/auth/sign-up-success/page.tsx` | page | — | — |
| `/auth/validate-teen` | `app/auth/validate-teen/page.tsx` | page | — | — |

## ONBOARDING pages

| URL | File | Page kind | loading? | error? |
|---|---|---|---|---|
| `/onboarding` | `app/onboarding/page.tsx` | page | — | — |
| `/onboarding/interests` | `app/onboarding/interests/page.tsx` | page | — | — |
| `/onboarding/goals` | `app/onboarding/goals/page.tsx` | page | — | — |
| `/onboarding/learning-style` | `app/onboarding/learning-style/page.tsx` | page | — | — |
| `/onboarding/complete` | `app/onboarding/complete/page.tsx` | page | — | — |

---

## TEEN pages (layout: `app/teen/layout.tsx`, error boundary: `app/teen/error.tsx`)

| URL | File | Page kind | loading? | error? |
|---|---|---|---|---|
| `/teen` | `app/teen/page.tsx` | page | yes (`app/teen/loading.tsx`) | yes (`app/teen/error.tsx`) |
| `/teen/academic` | `app/teen/academic/page.tsx` | **redirect-only** → `/teen/aide-scolaire` | yes | — |
| `/teen/achievements` | `app/teen/achievements/page.tsx` | **redirect-only** → `/gamification/collections` | yes | — |
| `/teen/activity` | `app/teen/activity/page.tsx` | page | yes | — |
| `/teen/aide-scolaire` | `app/teen/aide-scolaire/page.tsx` | page | yes | — |
| `/teen/calendar` | `app/teen/calendar/page.tsx` | page | yes | — |
| `/teen/challenges` | `app/teen/challenges/page.tsx` | **redirect-only** (re-export of `/teen/defis-physiques`) | yes | — |
| `/teen/chores` | `app/teen/chores/page.tsx` | page | yes | — |
| `/teen/circles` | `app/teen/circles/page.tsx` | page | yes | — |
| `/teen/coins` | `app/teen/coins/page.tsx` | **redirect-only** → `/teen/wallet` | yes | — |
| `/teen/create` | `app/teen/create/page.tsx` | page | yes | — |
| `/teen/defis-physiques` | `app/teen/defis-physiques/page.tsx` | page | yes | — |
| `/teen/events` | `app/teen/events/page.tsx` | page | yes | — |
| `/teen/feed` | `app/teen/feed/page.tsx` | page | yes | — |
| `/teen/feed/[id]` | `app/teen/feed/[id]/page.tsx` | page | yes | — |
| `/teen/food` | `app/teen/food/page.tsx` | page | yes | — |
| `/teen/food/[partner_id]` | `app/teen/food/[partner_id]/page.tsx` | page | yes | — |
| `/teen/food/order/[id]` | `app/teen/food/order/[id]/page.tsx` | page | yes | — |
| `/teen/friends` | `app/teen/friends/page.tsx` | page | yes | — |
| `/teen/games` | `app/teen/games/page.tsx` | page | yes | — |
| `/teen/internships` | `app/teen/internships/page.tsx` | page | yes | — |
| `/teen/leaderboard` | `app/teen/leaderboard/page.tsx` | page | yes | — |
| `/teen/map` | `app/teen/map/page.tsx` | **redirect-only** → `/teen/social?tab=map` | yes | — |
| `/teen/mentor-sessions` | `app/teen/mentor-sessions/page.tsx` | page | yes | — |
| `/teen/mentors` | `app/teen/mentors/page.tsx` | page | yes | — |
| `/teen/mentors/[id]` | `app/teen/mentors/[id]/page.tsx` | page | yes | — |
| `/teen/messages` | `app/teen/messages/page.tsx` | page | yes | — |
| `/teen/offres` | `app/teen/offres/page.tsx` | page | yes | — |
| `/teen/passions` | `app/teen/passions/page.tsx` | **redirect-only** → `/teen/quests?tab=creative` | yes | — |
| `/teen/pathways` | `app/teen/pathways/page.tsx` | page | yes | — |
| `/teen/profile` | `app/teen/profile/page.tsx` | page | yes | — |
| `/teen/profile/edit` | `app/teen/profile/edit/page.tsx` | page | yes | — |
| `/teen/quests` | `app/teen/quests/page.tsx` | page | yes | — |
| `/teen/quests/[id]` | `app/teen/quests/[id]/page.tsx` | page | yes | — |
| `/teen/quests/friend-defis` | `app/teen/quests/friend-defis/page.tsx` | page | yes | — |
| `/teen/quiz` | `app/teen/quiz/page.tsx` | page | yes | — |
| `/teen/quiz/[id]` | `app/teen/quiz/[id]/page.tsx` | page | yes | — |
| `/teen/quiz/history` | `app/teen/quiz/history/page.tsx` | page | yes | — |
| `/teen/rewards` | `app/teen/rewards/page.tsx` | **redirect-only** → `/teen/wallet?tab=shop` | yes | — |
| `/teen/rides` | `app/teen/rides/page.tsx` | page | yes | — |
| `/teen/rides/request` | `app/teen/rides/request/page.tsx` | page | yes | — |
| `/teen/savings` | `app/teen/savings/page.tsx` | page | yes | — |
| `/teen/savings/new` | `app/teen/savings/new/page.tsx` | page | yes | — |
| `/teen/settings` | `app/teen/settings/page.tsx` | **redirect-only** → `/teen/profile?tab=settings` | — | — |
| `/teen/share` | `app/teen/share/page.tsx` | page | yes | — |
| `/teen/shop` | `app/teen/shop/page.tsx` | **redirect-only** → `/teen/wallet?tab=shop` | yes | — |
| `/teen/shop/checkout` | `app/teen/shop/checkout/page.tsx` | page | yes | yes |
| `/teen/shop/history` | `app/teen/shop/history/page.tsx` | page | yes | — |
| `/teen/social` | `app/teen/social/page.tsx` | page | yes | — |
| `/teen/streak` | `app/teen/streak/page.tsx` | page | — | — |
| `/teen/vip-card` | `app/teen/vip-card/page.tsx` | page | — | — |
| `/teen/wallet` | `app/teen/wallet/page.tsx` | page | yes | — |
| `/teen/wallet/allowance` | `app/teen/wallet/allowance/page.tsx` | page | yes | — |
| `/teen/xp-value` | `app/teen/xp-value/page.tsx` | page | — | — |

### TEEN — gamification surfaces (top-level `/gamification/*`)

| URL | File | Page kind | loading? | error? |
|---|---|---|---|---|
| `/gamification` | `app/gamification/page.tsx` | page | yes | — |
| `/gamification/aide-scolaire` | `app/gamification/aide-scolaire/page.tsx` | **redirect-only** → `/teen/aide-scolaire` | — | — |
| `/gamification/boutique` | `app/gamification/boutique/page.tsx` | **redirect-only** → `/teen/wallet?tab=shop` | — | — |
| `/gamification/collections` | `app/gamification/collections/page.tsx` | page | — | — |
| `/gamification/crews` | `app/gamification/crews/page.tsx` | **redirect-only** → `/teen/circles` | — | — |
| `/gamification/defis` | `app/gamification/defis/page.tsx` | **redirect-only** (308) → `/teen/quests/friend-defis` | — | — |
| `/gamification/defis-physiques` | `app/gamification/defis-physiques/page.tsx` | **redirect-only** → `/teen/defis-physiques` | — | — |
| `/gamification/leaderboard` | `app/gamification/leaderboard/page.tsx` | page | — | — |
| `/gamification/missions` | `app/gamification/missions/page.tsx` | **redirect-only** (308) → `/teen/quests` | — | — |
| `/gamification/parcours` | `app/gamification/parcours/page.tsx` | page | — | — |
| `/gamification/roue` | `app/gamification/roue/page.tsx` | page | — | — |

---

## PARENT pages (layout: `app/parent/layout.tsx`, error: `app/parent/error.tsx`)

| URL | File | Page kind | loading? | error? |
|---|---|---|---|---|
| `/parent` | `app/parent/page.tsx` | page | yes | yes |
| `/parent/allowances` | `app/parent/allowances/page.tsx` | page | yes | — |
| `/parent/allowances/new` | `app/parent/allowances/new/page.tsx` | page | yes | — |
| `/parent/approvals` | `app/parent/approvals/page.tsx` | page | yes | — |
| `/parent/budget` | `app/parent/budget/page.tsx` | page | yes | — |
| `/parent/chores` | `app/parent/chores/page.tsx` | page | yes | — |
| `/parent/chores/new` | `app/parent/chores/new/page.tsx` | page | yes | — |
| `/parent/chores/[id]` | `app/parent/chores/[id]/page.tsx` | page | yes | — |
| `/parent/documents` | `app/parent/documents/page.tsx` | page | yes | — |
| `/parent/e-signature` | `app/parent/e-signature/page.tsx` | page | yes | — |
| `/parent/events` | `app/parent/events/page.tsx` | page | yes | — |
| `/parent/food` | `app/parent/food/page.tsx` | page | yes | — |
| `/parent/grades` | `app/parent/grades/page.tsx` | page | yes | — |
| `/parent/history` | `app/parent/history/page.tsx` | page | yes | — |
| `/parent/live` | `app/parent/live/page.tsx` | page | yes | — |
| `/parent/mentor-sessions` | `app/parent/mentor-sessions/page.tsx` | page | yes | — |
| `/parent/mentor-sessions/[id]` | `app/parent/mentor-sessions/[id]/page.tsx` | page | yes | — |
| `/parent/notifications` | `app/parent/notifications/page.tsx` | page | yes | — |
| `/parent/rides` | `app/parent/rides/page.tsx` | page | yes | — |
| `/parent/rides/[id]` | `app/parent/rides/[id]/page.tsx` | page | yes | — |
| `/parent/savings` | `app/parent/savings/page.tsx` | page | yes | — |
| `/parent/settings` | `app/parent/settings/page.tsx` | page | yes | — |
| `/parent/teens` | `app/parent/teens/page.tsx` | page | yes | — |
| `/parent/teens/add` | `app/parent/teens/add/page.tsx` | page | yes | — |
| `/parent/topup` | `app/parent/topup/page.tsx` | page | yes | — |
| `/parent/topup/manual` | `app/parent/topup/manual/page.tsx` | page | yes | — |

---

## PARTNER pages (layout: `app/partner/layout.tsx`, error: `app/partner/error.tsx`)

| URL | File | Page kind | loading? | error? |
|---|---|---|---|---|
| `/partner` | `app/partner/page.tsx` | page | yes | yes |
| `/partner/dashboard` | `app/partner/dashboard/page.tsx` | page | yes | — |
| `/partner/events` | `app/partner/events/page.tsx` | page | yes | — |
| `/partner/invoices` | `app/partner/invoices/page.tsx` | page | yes | — |
| `/partner/kyc` | `app/partner/kyc/page.tsx` | page | yes | — |
| `/partner/offers` | `app/partner/offers/page.tsx` | page | yes | — |
| `/partner/offers/new` | `app/partner/offers/new/page.tsx` | page | yes | — |
| `/partner/offers/[id]/edit` | `app/partner/offers/[id]/edit/page.tsx` | page | yes | — |
| `/partner/payouts` | `app/partner/payouts/page.tsx` | page | yes | — |
| `/partner/restaurant/menu` | `app/partner/restaurant/menu/page.tsx` | page | yes | — |
| `/partner/restaurant/orders` | `app/partner/restaurant/orders/page.tsx` | page | yes | — |
| `/partner/scanner` | `app/partner/scanner/page.tsx` | page | yes | — |
| `/partner/settings` | `app/partner/settings/page.tsx` | page | yes | — |
| `/partner/stats` | `app/partner/stats/page.tsx` | page | yes | — |
| `/partner/support` | `app/partner/support/page.tsx` | page | yes | — |
| `/partner/transactions` | `app/partner/transactions/page.tsx` | page | yes | — |

---

## ADMIN pages (layout: `app/admin/layout.tsx`, error: `app/admin/error.tsx`)

| URL | File | Page kind | loading? | error? |
|---|---|---|---|---|
| `/admin` | `app/admin/page.tsx` | page | yes | yes |
| `/admin/ambassadeurs` | `app/admin/ambassadeurs/page.tsx` | page | yes | — |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | page | yes | — |
| `/admin/anniversaires` | `app/admin/anniversaires/page.tsx` | page | — | — |
| `/admin/anniversaires/[id]` | `app/admin/anniversaires/[id]/page.tsx` | page | yes | — |
| `/admin/check-in` | `app/admin/check-in/page.tsx` | page | yes | — |
| `/admin/clubs` | `app/admin/clubs/page.tsx` | page | yes | — |
| `/admin/clubs/creer` | `app/admin/clubs/creer/page.tsx` | page | yes | — |
| `/admin/clubs/[id]/supprimer` | `app/admin/clubs/[id]/supprimer/page.tsx` | page | yes | — |
| `/admin/content` | `app/admin/content/page.tsx` | page | yes | — |
| `/admin/content/review` | `app/admin/content/review/page.tsx` | page | yes | — |
| `/admin/creator-moderation` | `app/admin/creator-moderation/page.tsx` | page | yes | — |
| `/admin/drivers` | `app/admin/drivers/page.tsx` | page | yes | — |
| `/admin/drivers/[id]` | `app/admin/drivers/[id]/page.tsx` | page | yes | — |
| `/admin/evenements` | `app/admin/evenements/page.tsx` | page | yes | — |
| `/admin/evenements/creer` | `app/admin/evenements/creer/page.tsx` | page | yes | — |
| `/admin/evenements/[id]/modifier` | `app/admin/evenements/[id]/modifier/page.tsx` | page | yes | — |
| `/admin/evenements/[id]/supprimer` | `app/admin/evenements/[id]/supprimer/page.tsx` | page | yes | — |
| `/admin/gamification-setup` | `app/admin/gamification-setup/page.tsx` | page | yes | — |
| `/admin/gamification/scorecard` | `app/admin/gamification/scorecard/page.tsx` | page | yes | — |
| `/admin/internships` | `app/admin/internships/page.tsx` | page | yes | — |
| `/admin/logs` | `app/admin/logs/page.tsx` | page | yes | — |
| `/admin/marketplace` | `app/admin/marketplace/page.tsx` | page | yes | — |
| `/admin/mentors` | `app/admin/mentors/page.tsx` | page | yes | — |
| `/admin/partners` | `app/admin/partners/page.tsx` | page | yes | — |
| `/admin/permissions` | `app/admin/permissions/page.tsx` | page | yes | — |
| `/admin/proofs` | `app/admin/proofs/page.tsx` | page | yes | — |
| `/admin/reservations` | `app/admin/reservations/page.tsx` | page | yes | — |
| `/admin/scripts-sql` | `app/admin/scripts-sql/page.tsx` | page | yes | — |
| `/admin/tag-normalize` | `app/admin/tag-normalize/page.tsx` | page | yes | — |
| `/admin/topups` | `app/admin/topups/page.tsx` | page | yes | — |
| `/admin/utilisateurs` | `app/admin/utilisateurs/page.tsx` | page | yes | — |

---

## AMBASSADOR pages (layout: `app/ambassador/layout.tsx`)

| URL | File | Page kind | loading? | error? |
|---|---|---|---|---|
| `/ambassador` | `app/ambassador/page.tsx` | page | yes | — |
| `/ambassador/boutique` | `app/ambassador/boutique/page.tsx` | page | yes | — |
| `/ambassador/comment-gagner` | `app/ambassador/comment-gagner/page.tsx` | page | yes | — |
| `/ambassador/commissions` | `app/ambassador/commissions/page.tsx` | page | yes | — |
| `/ambassador/marketing` | `app/ambassador/marketing/page.tsx` | page | yes | — |
| `/ambassador/referrals` | `app/ambassador/referrals/page.tsx` | page | yes | — |
| `/ambassador/withdrawals` | `app/ambassador/withdrawals/page.tsx` | page | yes | — |

---

## MENTOR pages (layout: `app/mentor/layout.tsx`)

| URL | File | Page kind | loading? | error? |
|---|---|---|---|---|
| `/mentor/dashboard` | `app/mentor/dashboard/page.tsx` | page | yes | — |
| `/mentor/profile/edit` | `app/mentor/profile/edit/page.tsx` | page | yes | — |
| `/mentor/sessions` | `app/mentor/sessions/page.tsx` | page | yes | — |

> Note: there is a `app/mentor/loading.tsx` and `app/mentor/layout.tsx` but **no** `app/mentor/page.tsx` (no `/mentor` index route).

---

## API routes (`app/api/**/route.ts` + `app/auth/callback/route.ts`)

Total: **232** route handlers. Listed grouped by namespace.

### `/auth/*` (1)

| URL | File |
|---|---|
| `/auth/callback` | `app/auth/callback/route.ts` |

### `/api/admin/*` (33)

| URL | File |
|---|---|
| `/api/admin/accounting/export` | `app/api/admin/accounting/export/route.ts` |
| `/api/admin/ambassadors/approve` | `app/api/admin/ambassadors/approve/route.ts` |
| `/api/admin/ambassadors/reject` | `app/api/admin/ambassadors/reject/route.ts` |
| `/api/admin/analytics/export` | `app/api/admin/analytics/export/route.ts` |
| `/api/admin/anniversaires/[id]` | `app/api/admin/anniversaires/[id]/route.ts` |
| `/api/admin/audit-log` | `app/api/admin/audit-log/route.ts` |
| `/api/admin/broadcasts` | `app/api/admin/broadcasts/route.ts` |
| `/api/admin/content/generate` | `app/api/admin/content/generate/route.ts` |
| `/api/admin/content/review/[id]` | `app/api/admin/content/review/[id]/route.ts` |
| `/api/admin/content/validate` | `app/api/admin/content/validate/route.ts` |
| `/api/admin/creator/feature/[submission_id]` | `app/api/admin/creator/feature/[submission_id]/route.ts` |
| `/api/admin/creator/moderate` | `app/api/admin/creator/moderate/route.ts` |
| `/api/admin/drivers/[id]/approve` | `app/api/admin/drivers/[id]/approve/route.ts` |
| `/api/admin/execute-sql` | `app/api/admin/execute-sql/route.ts` |
| `/api/admin/internships` | `app/api/admin/internships/route.ts` |
| `/api/admin/internships/[id]/close` | `app/api/admin/internships/[id]/close/route.ts` |
| `/api/admin/internships/[id]/decide` | `app/api/admin/internships/[id]/decide/route.ts` |
| `/api/admin/kpis` | `app/api/admin/kpis/route.ts` |
| `/api/admin/marketplace/moderate/[listing_id]` | `app/api/admin/marketplace/moderate/[listing_id]/route.ts` |
| `/api/admin/mentor-reports` | `app/api/admin/mentor-reports/route.ts` |
| `/api/admin/mentor-reports/[id]/resolve` | `app/api/admin/mentor-reports/[id]/resolve/route.ts` |
| `/api/admin/mentors/[id]/approve` | `app/api/admin/mentors/[id]/approve/route.ts` |
| `/api/admin/mentors/[id]/reject` | `app/api/admin/mentors/[id]/reject/route.ts` |
| `/api/admin/moderation` | `app/api/admin/moderation/route.ts` |
| `/api/admin/moderation/[id]/approve` | `app/api/admin/moderation/[id]/approve/route.ts` |
| `/api/admin/moderation/[id]/reject` | `app/api/admin/moderation/[id]/reject/route.ts` |
| `/api/admin/partners/[id]/approve` | `app/api/admin/partners/[id]/approve/route.ts` |
| `/api/admin/partners/[id]/reject` | `app/api/admin/partners/[id]/reject/route.ts` |
| `/api/admin/permissions` | `app/api/admin/permissions/route.ts` |
| `/api/admin/refunds` | `app/api/admin/refunds/route.ts` |
| `/api/admin/run-migration` | `app/api/admin/run-migration/route.ts` |
| `/api/admin/scorecard` | `app/api/admin/scorecard/route.ts` |
| `/api/admin/signals/cap-stats` | `app/api/admin/signals/cap-stats/route.ts` |
| `/api/admin/tag-aliases` | `app/api/admin/tag-aliases/route.ts` |
| `/api/admin/topups` | `app/api/admin/topups/route.ts` |
| `/api/admin/topups/[id]/confirm` | `app/api/admin/topups/[id]/confirm/route.ts` |
| `/api/admin/users/[id]/anonymize` | `app/api/admin/users/[id]/anonymize/route.ts` |
| `/api/admin/users/[id]/export` | `app/api/admin/users/[id]/export/route.ts` |

### `/api/teen/*` (53)

| URL | File |
|---|---|
| `/api/teen/activities` | `app/api/teen/activities/route.ts` |
| `/api/teen/avatar` | `app/api/teen/avatar/route.ts` |
| `/api/teen/avatar-coach` | `app/api/teen/avatar-coach/route.ts` |
| `/api/teen/chores` | `app/api/teen/chores/route.ts` |
| `/api/teen/chores/[id]/complete` | `app/api/teen/chores/[id]/complete/route.ts` |
| `/api/teen/circles` | `app/api/teen/circles/route.ts` |
| `/api/teen/circles/members` | `app/api/teen/circles/members/route.ts` |
| `/api/teen/circles/messages` | `app/api/teen/circles/messages/route.ts` |
| `/api/teen/content/intelligent` | `app/api/teen/content/intelligent/route.ts` |
| `/api/teen/content/international` | `app/api/teen/content/international/route.ts` |
| `/api/teen/content/personalized` | `app/api/teen/content/personalized/route.ts` |
| `/api/teen/creativity/creations` | `app/api/teen/creativity/creations/route.ts` |
| `/api/teen/creativity/paths` | `app/api/teen/creativity/paths/route.ts` |
| `/api/teen/crew` | `app/api/teen/crew/route.ts` |
| `/api/teen/education/grades` | `app/api/teen/education/grades/route.ts` |
| `/api/teen/education/quizzes` | `app/api/teen/education/quizzes/route.ts` |
| `/api/teen/education/recommendations` | `app/api/teen/education/recommendations/route.ts` |
| `/api/teen/education/tutorials` | `app/api/teen/education/tutorials/route.ts` |
| `/api/teen/evidence/record` | `app/api/teen/evidence/record/route.ts` |
| `/api/teen/evidence/sign-upload` | `app/api/teen/evidence/sign-upload/route.ts` |
| `/api/teen/feed` | `app/api/teen/feed/route.ts` |
| `/api/teen/feed/[submission_id]/engage` | `app/api/teen/feed/[submission_id]/engage/route.ts` |
| `/api/teen/feed/comments` | `app/api/teen/feed/comments/route.ts` |
| `/api/teen/feed/submissions` | `app/api/teen/feed/submissions/route.ts` |
| `/api/teen/food/menu/[partner_id]` | `app/api/teen/food/menu/[partner_id]/route.ts` |
| `/api/teen/food/order` | `app/api/teen/food/order/route.ts` |
| `/api/teen/food/restaurants` | `app/api/teen/food/restaurants/route.ts` |
| `/api/teen/friend-challenges` | `app/api/teen/friend-challenges/route.ts` |
| `/api/teen/friend-challenges/[id]/accept` | `app/api/teen/friend-challenges/[id]/accept/route.ts` |
| `/api/teen/friend-challenges/[id]/decline` | `app/api/teen/friend-challenges/[id]/decline/route.ts` |
| `/api/teen/friend-challenges/[id]/progress` | `app/api/teen/friend-challenges/[id]/progress/route.ts` |
| `/api/teen/friend-challenges/[id]/resolve` | `app/api/teen/friend-challenges/[id]/resolve/route.ts` |
| `/api/teen/friends` | `app/api/teen/friends/route.ts` |
| `/api/teen/friends/requests` | `app/api/teen/friends/requests/route.ts` |
| `/api/teen/friends/requests/[id]/accept` | `app/api/teen/friends/requests/[id]/accept/route.ts` |
| `/api/teen/friends/requests/[id]/decline` | `app/api/teen/friends/requests/[id]/decline/route.ts` |
| `/api/teen/internships` | `app/api/teen/internships/route.ts` |
| `/api/teen/internships/[id]/apply` | `app/api/teen/internships/[id]/apply/route.ts` |
| `/api/teen/leaderboard` | `app/api/teen/leaderboard/route.ts` |
| `/api/teen/mentor-sessions/[id]/rate` | `app/api/teen/mentor-sessions/[id]/rate/route.ts` |
| `/api/teen/mentor-sessions/[id]/report` | `app/api/teen/mentor-sessions/[id]/report/route.ts` |
| `/api/teen/mentor-sessions/book` | `app/api/teen/mentor-sessions/book/route.ts` |
| `/api/teen/mentors` | `app/api/teen/mentors/route.ts` |
| `/api/teen/mentors/[id]` | `app/api/teen/mentors/[id]/route.ts` |
| `/api/teen/messages` | `app/api/teen/messages/route.ts` |
| `/api/teen/messages/[conversationId]` | `app/api/teen/messages/[conversationId]/route.ts` |
| `/api/teen/onboarding/complete` | `app/api/teen/onboarding/complete/route.ts` |
| `/api/teen/onboarding/goals` | `app/api/teen/onboarding/goals/route.ts` |
| `/api/teen/onboarding/interests` | `app/api/teen/onboarding/interests/route.ts` |
| `/api/teen/onboarding/learning-style` | `app/api/teen/onboarding/learning-style/route.ts` |
| `/api/teen/pathways` | `app/api/teen/pathways/route.ts` |
| `/api/teen/pathways/[slug]/declare` | `app/api/teen/pathways/[slug]/declare/route.ts` |
| `/api/teen/profile` | `app/api/teen/profile/route.ts` |
| `/api/teen/quests/complete` | `app/api/teen/quests/complete/route.ts` |
| `/api/teen/quests/start` | `app/api/teen/quests/start/route.ts` |
| `/api/teen/quiz/[id]` | `app/api/teen/quiz/[id]/route.ts` |
| `/api/teen/quiz/categories` | `app/api/teen/quiz/categories/route.ts` |
| `/api/teen/quiz/daily` | `app/api/teen/quiz/daily/route.ts` |
| `/api/teen/quiz/history` | `app/api/teen/quiz/history/route.ts` |
| `/api/teen/quiz/submit` | `app/api/teen/quiz/submit/route.ts` |
| `/api/teen/recommend-friends` | `app/api/teen/recommend-friends/route.ts` |
| `/api/teen/recommendations` | `app/api/teen/recommendations/route.ts` |
| `/api/teen/rides` | `app/api/teen/rides/route.ts` |
| `/api/teen/rides/[id]/cancel` | `app/api/teen/rides/[id]/cancel/route.ts` |
| `/api/teen/rides/groups/[id]/join` | `app/api/teen/rides/groups/[id]/join/route.ts` |
| `/api/teen/rides/groups/create` | `app/api/teen/rides/groups/create/route.ts` |
| `/api/teen/rides/request` | `app/api/teen/rides/request/route.ts` |
| `/api/teen/savings/goals` | `app/api/teen/savings/goals/route.ts` |
| `/api/teen/savings/goals/[id]/cancel` | `app/api/teen/savings/goals/[id]/cancel/route.ts` |
| `/api/teen/savings/goals/[id]/lock` | `app/api/teen/savings/goals/[id]/lock/route.ts` |
| `/api/teen/share` | `app/api/teen/share/route.ts` |
| `/api/teen/shop` | `app/api/teen/shop/route.ts` |
| `/api/teen/signals/record` | `app/api/teen/signals/record/route.ts` |
| `/api/teen/spend` | `app/api/teen/spend/route.ts` |
| `/api/teen/sport/challenges` | `app/api/teen/sport/challenges/route.ts` |
| `/api/teen/sport/clubs` | `app/api/teen/sport/clubs/route.ts` |
| `/api/teen/sport/records` | `app/api/teen/sport/records/route.ts` |
| `/api/teen/subscription` | `app/api/teen/subscription/route.ts` |
| `/api/teen/tokens` | `app/api/teen/tokens/route.ts` |
| `/api/teen/wallet` | `app/api/teen/wallet/route.ts` |

### `/api/parent/*` (28)

| URL | File |
|---|---|
| `/api/parent/allowances` | `app/api/parent/allowances/route.ts` |
| `/api/parent/allowances/[id]` | `app/api/parent/allowances/[id]/route.ts` |
| `/api/parent/allowances/[id]/pause` | `app/api/parent/allowances/[id]/pause/route.ts` |
| `/api/parent/allowances/[id]/resume` | `app/api/parent/allowances/[id]/resume/route.ts` |
| `/api/parent/approvals` | `app/api/parent/approvals/route.ts` |
| `/api/parent/budget` | `app/api/parent/budget/route.ts` |
| `/api/parent/chores` | `app/api/parent/chores/route.ts` |
| `/api/parent/chores/[id]/verify-completion` | `app/api/parent/chores/[id]/verify-completion/route.ts` |
| `/api/parent/chores/create` | `app/api/parent/chores/create/route.ts` |
| `/api/parent/e-signature/create` | `app/api/parent/e-signature/create/route.ts` |
| `/api/parent/e-signature/status` | `app/api/parent/e-signature/status/route.ts` |
| `/api/parent/export-pdf` | `app/api/parent/export-pdf/route.ts` |
| `/api/parent/food/budget` | `app/api/parent/food/budget/route.ts` |
| `/api/parent/grades` | `app/api/parent/grades/route.ts` |
| `/api/parent/insights` | `app/api/parent/insights/route.ts` |
| `/api/parent/live` | `app/api/parent/live/route.ts` |
| `/api/parent/mentor-sessions` | `app/api/parent/mentor-sessions/route.ts` |
| `/api/parent/mentor-sessions/[id]/approve` | `app/api/parent/mentor-sessions/[id]/approve/route.ts` |
| `/api/parent/mentor-sessions/[id]/deny` | `app/api/parent/mentor-sessions/[id]/deny/route.ts` |
| `/api/parent/mentor-sessions/[id]/report` | `app/api/parent/mentor-sessions/[id]/report/route.ts` |
| `/api/parent/rides/[id]/approve` | `app/api/parent/rides/[id]/approve/route.ts` |
| `/api/parent/rides/[id]/deny` | `app/api/parent/rides/[id]/deny/route.ts` |
| `/api/parent/rides/[id]/track` | `app/api/parent/rides/[id]/track/route.ts` |
| `/api/parent/rides/active` | `app/api/parent/rides/active/route.ts` |
| `/api/parent/savings/match` | `app/api/parent/savings/match/route.ts` |
| `/api/parent/teens` | `app/api/parent/teens/route.ts` |
| `/api/parent/teens/create` | `app/api/parent/teens/create/route.ts` |
| `/api/parent/teens/search` | `app/api/parent/teens/search/route.ts` |
| `/api/parent/topup` | `app/api/parent/topup/route.ts` |
| `/api/parent/topup/manual` | `app/api/parent/topup/manual/route.ts` |

### `/api/partner/*` (12)

| URL | File |
|---|---|
| `/api/partner/apply-discount` | `app/api/partner/apply-discount/route.ts` |
| `/api/partner/challenges/[id]/check-in` | `app/api/partner/challenges/[id]/check-in/route.ts` |
| `/api/partner/offers` | `app/api/partner/offers/route.ts` |
| `/api/partner/offers/[id]` | `app/api/partner/offers/[id]/route.ts` |
| `/api/partner/restaurant/menu/items` | `app/api/partner/restaurant/menu/items/route.ts` |
| `/api/partner/restaurant/menu/items/[id]` | `app/api/partner/restaurant/menu/items/[id]/route.ts` |
| `/api/partner/restaurant/orders/[id]/accept` | `app/api/partner/restaurant/orders/[id]/accept/route.ts` |
| `/api/partner/restaurant/orders/[id]/reject` | `app/api/partner/restaurant/orders/[id]/reject/route.ts` |
| `/api/partner/restaurant/orders/feed` | `app/api/partner/restaurant/orders/feed/route.ts` |
| `/api/partner/verify-card` | `app/api/partner/verify-card/route.ts` |
| `/api/partners/register` | `app/api/partners/register/route.ts` |

### `/api/ambassador/*` (4)

| URL | File |
|---|---|
| `/api/ambassador/shop/points` | `app/api/ambassador/shop/points/route.ts` |
| `/api/ambassador/shop/redeem` | `app/api/ambassador/shop/redeem/route.ts` |
| `/api/ambassador/shop/rewards` | `app/api/ambassador/shop/rewards/route.ts` |
| `/api/ambassador/withdrawals` | `app/api/ambassador/withdrawals/route.ts` |

### `/api/mentor/*` (4)

| URL | File |
|---|---|
| `/api/mentor/apply` | `app/api/mentor/apply/route.ts` |
| `/api/mentor/profile` | `app/api/mentor/profile/route.ts` |
| `/api/mentor/sessions` | `app/api/mentor/sessions/route.ts` |
| `/api/mentor/sessions/[id]/complete` | `app/api/mentor/sessions/[id]/complete/route.ts` |

### `/api/driver/*` (3)

| URL | File |
|---|---|
| `/api/driver/rides/[id]/complete` | `app/api/driver/rides/[id]/complete/route.ts` |
| `/api/driver/rides/[id]/dispatch` | `app/api/driver/rides/[id]/dispatch/route.ts` |
| `/api/driver/rides/[id]/track` | `app/api/driver/rides/[id]/track/route.ts` |

### `/api/cron/*` (16)

| URL | File |
|---|---|
| `/api/cron/assign-missions` | `app/api/cron/assign-missions/route.ts` |
| `/api/cron/birthday-greetings` | `app/api/cron/birthday-greetings/route.ts` |
| `/api/cron/disburse-allowances` | `app/api/cron/disburse-allowances/route.ts` |
| `/api/cron/evolve-teen-profiles` | `app/api/cron/evolve-teen-profiles/route.ts` |
| `/api/cron/feed-seed` | `app/api/cron/feed-seed/route.ts` |
| `/api/cron/friend-challenge-resolve` | `app/api/cron/friend-challenge-resolve/route.ts` |
| `/api/cron/generate-daily-content` | `app/api/cron/generate-daily-content/route.ts` |
| `/api/cron/marketplace-escrow-release` | `app/api/cron/marketplace-escrow-release/route.ts` |
| `/api/cron/mentor-recording-retention` | `app/api/cron/mentor-recording-retention/route.ts` |
| `/api/cron/notification-fan-out` | `app/api/cron/notification-fan-out/route.ts` |
| `/api/cron/notifications` | `app/api/cron/notifications/route.ts` |
| `/api/cron/parent-chore-rollover` | `app/api/cron/parent-chore-rollover/route.ts` |
| `/api/cron/partner-payout-monthly` | `app/api/cron/partner-payout-monthly/route.ts` |
| `/api/cron/purge-documents` | `app/api/cron/purge-documents/route.ts` |
| `/api/cron/quiz-seen-history-prune` | `app/api/cron/quiz-seen-history-prune/route.ts` |
| `/api/cron/recommendation-metrics-rollup` | `app/api/cron/recommendation-metrics-rollup/route.ts` |
| `/api/cron/ride-curfew-check` | `app/api/cron/ride-curfew-check/route.ts` |
| `/api/cron/tag-normalize` | `app/api/cron/tag-normalize/route.ts` |
| `/api/cron/weekly-leaderboard-rollup` | `app/api/cron/weekly-leaderboard-rollup/route.ts` |

### `/api/payments/*` and `/api/webhooks/*` (13)

| URL | File |
|---|---|
| `/api/payments/cash/create` | `app/api/payments/cash/create/route.ts` |
| `/api/payments/cmi/callback` | `app/api/payments/cmi/callback/route.ts` |
| `/api/payments/cmi/create` | `app/api/payments/cmi/create/route.ts` |
| `/api/payments/cmi/initiate` | `app/api/payments/cmi/initiate/route.ts` |
| `/api/payments/cmi/webhook` | `app/api/payments/cmi/webhook/route.ts` |
| `/api/payments/hybrid` | `app/api/payments/hybrid/route.ts` |
| `/api/payments/mobile-money/initiate` | `app/api/payments/mobile-money/initiate/route.ts` |
| `/api/payments/process` | `app/api/payments/process/route.ts` |
| `/api/payments/xp` | `app/api/payments/xp/route.ts` |
| `/api/webhooks/cashplus` | `app/api/webhooks/cashplus/route.ts` |
| `/api/webhooks/m2t` | `app/api/webhooks/m2t/route.ts` |
| `/api/webhooks/stripe` | `app/api/webhooks/stripe/route.ts` |
| `/api/webhooks/wafacash` | `app/api/webhooks/wafacash/route.ts` |

### `/api/marketplace/*` (7)

| URL | File |
|---|---|
| `/api/marketplace/listings` | `app/api/marketplace/listings/route.ts` |
| `/api/marketplace/listings/[id]` | `app/api/marketplace/listings/[id]/route.ts` |
| `/api/marketplace/listings/[id]/buy` | `app/api/marketplace/listings/[id]/buy/route.ts` |
| `/api/marketplace/my-listings` | `app/api/marketplace/my-listings/route.ts` |
| `/api/marketplace/orders` | `app/api/marketplace/orders/route.ts` |
| `/api/marketplace/transactions/[id]/confirm-receipt` | `app/api/marketplace/transactions/[id]/confirm-receipt/route.ts` |
| `/api/marketplace/transactions/[id]/dispute` | `app/api/marketplace/transactions/[id]/dispute/route.ts` |

### `/api/check-in/*` (6)

| URL | File |
|---|---|
| `/api/check-in/entry` | `app/api/check-in/entry/route.ts` |
| `/api/check-in/exit` | `app/api/check-in/exit/route.ts` |
| `/api/check-in/export` | `app/api/check-in/export/route.ts` |
| `/api/check-in/search` | `app/api/check-in/search/route.ts` |
| `/api/check-in/stats` | `app/api/check-in/stats/route.ts` |
| `/api/check-in/verify-pass` | `app/api/check-in/verify-pass/route.ts` |

### `/api/notifications/*` (8)

| URL | File |
|---|---|
| `/api/notifications` | `app/api/notifications/route.ts` |
| `/api/notifications/delete` | `app/api/notifications/delete/route.ts` |
| `/api/notifications/mark-all-read` | `app/api/notifications/mark-all-read/route.ts` |
| `/api/notifications/mark-read` | `app/api/notifications/mark-read/route.ts` |
| `/api/notifications/push/send` | `app/api/notifications/push/send/route.ts` |
| `/api/notifications/push/subscribe` | `app/api/notifications/push/subscribe/route.ts` |
| `/api/notifications/push/unsubscribe` | `app/api/notifications/push/unsubscribe/route.ts` |
| `/api/notifications/subscribe` | `app/api/notifications/subscribe/route.ts` |

### Misc / utility / public API (44)

| URL | File |
|---|---|
| `/api/agent/action` | `app/api/agent/action/route.ts` |
| `/api/auth/register-teen` | `app/api/auth/register-teen/route.ts` |
| `/api/auth/validate-teen` | `app/api/auth/validate-teen/route.ts` |
| `/api/authorizations/create` | `app/api/authorizations/create/route.ts` |
| `/api/authorizations/revoke` | `app/api/authorizations/revoke/route.ts` |
| `/api/bookings/create` | `app/api/bookings/create/route.ts` |
| `/api/circles` | `app/api/circles/route.ts` |
| `/api/circles/report` | `app/api/circles/report/route.ts` |
| `/api/clubs/cancel` | `app/api/clubs/cancel/route.ts` |
| `/api/clubs/pause` | `app/api/clubs/pause/route.ts` |
| `/api/clubs/resume` | `app/api/clubs/resume/route.ts` |
| `/api/creator/leaderboard` | `app/api/creator/leaderboard/route.ts` |
| `/api/csrf` | `app/api/csrf/route.ts` |
| `/api/dev/ai-smoke` | `app/api/dev/ai-smoke/route.ts` |
| `/api/e-signature/create` | `app/api/e-signature/create/route.ts` |
| `/api/features/flags` | `app/api/features/flags/route.ts` |
| `/api/gamification/pillars` | `app/api/gamification/pillars/route.ts` |
| `/api/health` | `app/api/health/route.ts` |
| `/api/invoices/[id]` | `app/api/invoices/[id]/route.ts` |
| `/api/invoices/topup/[id]` | `app/api/invoices/topup/[id]/route.ts` |
| `/api/me/data-delete` | `app/api/me/data-delete/route.ts` |
| `/api/me/data-export` | `app/api/me/data-export/route.ts` |
| `/api/newsletter/subscribe` | `app/api/newsletter/subscribe/route.ts` |
| `/api/onboarding/interests` | `app/api/onboarding/interests/route.ts` |
| `/api/onboarding/profile` | `app/api/onboarding/profile/route.ts` |
| `/api/presence` | `app/api/presence/route.ts` |
| `/api/tickets/generate-pdf` | `app/api/tickets/generate-pdf/route.ts` |
| `/api/upload/avatar` | `app/api/upload/avatar/route.ts` |

---

## Notes & gaps

- **No `/mentor` index page** — `app/mentor/loading.tsx` and `app/mentor/layout.tsx` exist, but `/mentor` itself 404s; only `/mentor/dashboard`, `/mentor/sessions`, `/mentor/profile/edit` are reachable.
- **No `/teen/quiz/result/...`** detail route despite `/api/teen/quiz/submit` and history page; result rendering presumably handled by `/teen/quiz/[id]` after submit.
- **`(dashboard)` route group** has a `layout.tsx` and `error.tsx` but no `page.tsx` directly inside the group; nothing in the audit indicates which routes (if any) currently sit under it — appears to be an unused / vestigial route group at present (no children with this group prefix were found via Glob for `app/(dashboard)/**/page.tsx`).
- **17 redirect-only stubs** preserve legacy URLs after route consolidation (rewards/economy unifier, quest-surface unifier, gamification → teen-shell migration). All but two (`/gamification/missions`, `/gamification/defis`) use `redirect()` (307); those two use `permanentRedirect()` (308) and set `robots: noindex`.
- Auth gates that conditionally call `redirect()` inside otherwise-rendered pages are **not** counted as redirect-only; they are real pages.
- `app/teen/challenges/page.tsx` is a re-export `export { default } from "../defis-physiques/page"` — counted as a redirect-style stub since it has no UI of its own, only re-exporting a page that itself renders `/teen/defis-physiques`.

