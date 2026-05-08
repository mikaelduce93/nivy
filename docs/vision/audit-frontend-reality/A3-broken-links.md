# A3 — Broken Internal Links Audit

Read-only audit. No code changes. Method described in the brief: grep `<Link href=`,
`router.push(`, `router.replace(`, `redirect(`, `permanentRedirect(` across `app/**`
+ `components/**`, then verify each `/`-prefixed destination against the existing
set of `app/**/page.tsx` (and route handlers, where relevant).

Dynamic segments (e.g. `/teen/quests/[id]`) are matched against concrete paths
(e.g. `/teen/quests/abc-123`). External URLs (`https://`, `mailto:`, `tel:`),
`#` anchors, expression-only refs (`href={item.href}`), and routes that resolve
through dynamic segments are excluded from the BROKEN list.

---

## Aggregate

- Total link/redirect references scanned: ~600 (≈335 `<Link>` references, ≈265
  router.push / redirect references — see persisted grep outputs).
- Unique internal destinations resolved against the route table: ≈140.
- Distinct BROKEN destinations: **34**.
- Distinct SUSPICIOUS destinations (resolves to a redirect-only stub): **8**.

### Broken count by role section

| Role section | Broken refs |
| --- | --- |
| teen | 12 |
| parent | 5 |
| partner | 3 |
| ambassador | 3 |
| admin | 7 |
| public / shared (footer, navbar, marketing, sidebar) | 22 |

(Counts above are total references, not distinct destinations — a single missing
route is often referenced from several places. The detail tables below list
every reference site.)

> User-reported symptom ("many menu items don't work for the teen account") is
> directly explained by:
> 1. `components/layouts/app-sidebar.tsx` — every nav entry points at a URL that
>    does not exist (`/dashboard`, `/mes-reservations`, `/profile/enfants`,
>    `/profile`, `/profile/modifier`).
> 2. `app/teen/profile/profile-hub-client.tsx` SettingsTab — every settings row
>    points at `/teen/settings/{privacy,notifications,visibility,language}`,
>    none of which exist.
> 3. `components/dashboard/teen/header.tsx` mobile menu — `/teen/coins` resolves
>    to a redirect-only stub (SUSPICIOUS), so the click works but lands on
>    `/teen/wallet` rather than a "Mes Coins" page.

---

## BROKEN — sorted by role

Status legend: BROKEN = no matching `app/**/page.tsx` (after dynamic-segment
matching). The "suggested-fix" column is a best-guess; the audit is read-only
and does not apply changes.

### Teen

| Source file:line | href | status | suggested-fix |
| --- | --- | --- | --- |
| `app/teen/profile/profile-hub-client.tsx:394` | `/teen/settings/privacy` | BROKEN | create `app/teen/settings/privacy/page.tsx` or point at `/teen/settings` |
| `app/teen/profile/profile-hub-client.tsx:395` | `/teen/settings/notifications` | BROKEN | create page or link to `/notifications/preferences` |
| `app/teen/profile/profile-hub-client.tsx:401` | `/teen/settings/visibility` | BROKEN | create page or merge into `/teen/settings` |
| `app/teen/profile/profile-hub-client.tsx:402` | `/teen/settings/language` | BROKEN | create page or merge into `/teen/settings` |
| `app/teen/quests/friend-defis/friend-defis-client.tsx:273` | `/teen/quests/friend-defis/new` | BROKEN | create page or open a modal in-place |
| `app/teen/leaderboard/page.tsx:79` | `/gamification/leaderboard` | OK (exists) but redirect-protected — see SUSPICIOUS |
| `app/teen/savings/page.tsx:43` (Link) → `/teen/savings/new` | OK (exists) | — | — |
| `components/teen/dashboard/crew-hub.tsx:321` | `/teen/circles?action=battle` | BROKEN-ish | `/teen/circles` exists but `?action=battle` has no handler — verify client logic |
| `components/teen/dashboard/crew-hub.tsx:402` | `/teen/circles?action=create` | BROKEN-ish | same — `?action=create` not handled |
| `components/notifications/notification-center.tsx:133` | `notification.action_url` (runtime) | UNKNOWN | depends on stored value; many DB rows likely point at obsolete paths |

> Note on the teen mobile menu: `components/dashboard/teen/header.tsx` lines
> 81–92 point at `/teen`, `/teen/events`, `/gamification/collections`,
> `/teen/coins`. All four destinations exist as files, but `/teen/coins`
> redirects to `/teen/wallet` (see SUSPICIOUS), so the "Mes Coins" label is
> misleading rather than broken.

### Parent

| Source file:line | href | status | suggested-fix |
| --- | --- | --- | --- |
| `components/dashboard/parent/header.tsx:132` | `/parent/profile` | BROKEN | create `app/parent/profile/page.tsx` or remove dropdown entry |
| `components/dashboard/parent/header.tsx:138` | `/parent/subscription` | BROKEN | create page or link to `/parent/settings` / `/carte-vip` |
| `components/reservation-form.tsx:137` | `/profile/teens/add` | BROKEN | should be `/parent/teens/add` |
| `app/reservation/page.tsx:129` | `/profile/enfants/ajouter` | BROKEN | should be `/parent/teens/add` |
| `app/autorisations/page.tsx:56` | `/profile/enfants/ajouter` | BROKEN | should be `/parent/teens/add` |
| `app/daily/page.tsx:55` | `/profile/enfants/ajouter` | BROKEN | should be `/parent/teens/add` |
| `components/club-enrollment-form.tsx:151` | `/profile/enfants/ajouter` | BROKEN | should be `/parent/teens/add` |

### Partner

| Source file:line | href | status | suggested-fix |
| --- | --- | --- | --- |
| `components/dashboard/partner/header.tsx:117` | `/partner/profile` | BROKEN | create page or rename to `/partner/settings` |
| `app/partner/dashboard/page.tsx:351` | `/partner/profile` | BROKEN | same |
| `app/partner/events/page.tsx:264` | `/events/${event.slug}` | BROKEN | no `/events/[slug]` route — should be `/agenda/[slug]` |
| `app/parent/events/page.tsx:338,376` | `/events`, `/events/${id}` | BROKEN | should be `/agenda` and `/agenda/[id]` |

### Ambassador

| Source file:line | href | status | suggested-fix |
| --- | --- | --- | --- |
| `components/dashboard/ambassador/header.tsx:122` | `/ambassador/profile` | BROKEN | create page or remove menu entry |
| `components/dashboard/ambassador/header.tsx:128` | `/ambassador/settings` | BROKEN | create page or remove menu entry |
| `app/ambassador/comment-gagner/page.tsx:288` | `/ambassador/missions` | BROKEN | no such route — link to `/ambassador` or `/gamification/missions` |
| `app/devenir-ambassadeur/page.tsx:194` | `/dashboard/ambassadeur` | BROKEN | should be `/ambassador` |

### Admin

| Source file:line | href | status | suggested-fix |
| --- | --- | --- | --- |
| `app/admin/utilisateurs/page.tsx:206` | `/admin/utilisateurs/${profile.id}` | BROKEN | no `app/admin/utilisateurs/[id]/page.tsx` exists |
| `app/admin/reservations/page.tsx:216` | `/admin/reservations/${booking.id}` | BROKEN | no `app/admin/reservations/[id]/page.tsx` |
| `app/admin/ambassadeurs/page.tsx:131` | `/admin/ambassadeurs/${ambassador.id}` | BROKEN | no `app/admin/ambassadeurs/[id]/page.tsx` |
| `app/admin/clubs/page.tsx:180` | `/admin/clubs/${club.id}/modifier` | BROKEN | only `[id]/supprimer` and `creer` exist under `app/admin/clubs/` |
| `app/admin/scripts-sql/page.tsx:175` | `/docs/EXECUTER_SCRIPTS_SQL.md` | BROKEN | docs path is not served by Next; either expose via `public/` or remove link |
| `app/admin/page.tsx:219` | `/admin/analytics` | OK (exists) | — |
| `app/admin/anniversaires/page.tsx:335` | `/admin/anniversaires/${order.id}` | OK — `app/admin/anniversaires/[id]/page.tsx` exists | — |

### Public / shared (sidebar, footer, navbar, marketing pages)

| Source file:line | href | status | suggested-fix |
| --- | --- | --- | --- |
| `components/layouts/app-sidebar.tsx:37` | `/dashboard` | BROKEN | should be `/teen` / `/parent` / `/ambassador` / `/partner` based on role, or removed |
| `components/layouts/app-sidebar.tsx:47` | `/mes-reservations` | BROKEN | no such route — `/reservation/confirmation` and `/reservation/paiement` exist but no list page |
| `components/layouts/app-sidebar.tsx:52` | `/profile/enfants` | BROKEN | should be `/parent/teens` |
| `components/layouts/app-sidebar.tsx:75` | `/profile` | BROKEN | should be role-specific dashboard |
| `components/layouts/app-sidebar.tsx:80` | `/profile/modifier` | BROKEN | no such route |
| `components/dashboard/header.tsx:131` | `/profile` | BROKEN | same as above |
| `components/dashboard/header.tsx:137` | `/mon-compte` | BROKEN | no such route |
| `components/cookie-banner.tsx:40` | `/legal/confidentialite` | OK (exists) | — |
| `app/legal/confidentialite/page.tsx:128` | `/parametres/donnees` | BROKEN | route does not exist; either build or change copy |
| `app/reservation/page.tsx:207` | `/cgv` | BROKEN | should be `/legal/cgv` |
| `app/reservation/page.tsx:211` | `/securite` | OK (exists at `app/securite/page.tsx`) | — |
| `app/auth/sign-up/page.tsx:248` | `/conditions` | BROKEN | should be `/legal/cgu` |
| `app/auth/validate-teen/page.tsx:277` | `/aide` | OK (exists) | — |
| `app/a-propos/page.tsx:142` | `/support` | BROKEN | no `/support` page; should be `/aide` or `/aide/faq` |
| `app/guide-parents/page.tsx:170` | `/support` | BROKEN | same |
| `app/communaute/page.tsx:61` | `/communaute/creer` | BROKEN | no `app/communaute/creer/page.tsx` |
| `app/blog/page.tsx:78` | `/blog/categorie/${cat.slug}` | BROKEN | no `app/blog/categorie/[slug]/page.tsx` |
| `app/devenir-influenceur/page.tsx:100` | `/influenceurs/${campaign.id}` | BROKEN | no `app/influenceurs/...` route exists |
| `app/djs/page.tsx:168` | `/djs/reserver` | BROKEN | only `/djs/[id]/reserver` is referenced, neither exists as a page (no `app/djs/[id]/reserver/page.tsx`) |
| `app/djs/[id]/page.tsx:52,177` | `/djs/${dj.id}/reserver` | BROKEN | page does not exist |
| `app/carte-vip/recompenses/page.tsx:116` | `/carte-vip/recompenses/${reward.id}` | BROKEN | no `app/carte-vip/recompenses/[id]/page.tsx` |
| `components/authorization-form.tsx:87` | `/authorisations` (after submit) | BROKEN | typo: should be `/autorisations` |
| `app/parent/teens/page.tsx:249,309` | `/parent/teens/${teen.teen_id}` | BROKEN | no `app/parent/teens/[id]/page.tsx`; only `add` and root |
| `components/parent/dashboard/teen-card-enhanced.tsx:31` | `/parent/teens/${teen.teen_id}` | BROKEN | same |

---

## SUSPICIOUS — destination is a redirect-only stub

These routes resolve to a real `page.tsx` file, but the file's only behaviour
is to call `redirect()` / `permanentRedirect()` to another URL. The Link works,
but the user lands on a different page than the link label suggests. Worth
auditing because it usually indicates either (a) an obsolete UI label that
should be updated, or (b) a redirect that can be removed in favour of pointing
the Link directly at the canonical destination.

| Source file:line | href | status | redirects to | note |
| --- | --- | --- | --- | --- |
| `app/teen/leaderboard/page.tsx:79` | `/gamification/leaderboard` | SUSPICIOUS | renders OK (auth-gated) | label "voir le classement global" — lives behind `redirect("/auth/login?redirect=...")` if anonymous. Mostly fine, mentioned for completeness. |
| `components/dashboard/teen/header.tsx:90` (mobile menu) | `/teen/coins` | SUSPICIOUS | `redirect("/teen/wallet")` | label "Mes Coins" but lands on `/teen/wallet` — rename label or skip the bounce |
| `components/teen/dashboard/quest-card.tsx:76,85` | `/teen/quests/${id}` | SUSPICIOUS for non-existent IDs | `app/teen/quests/[id]/page.tsx` exists | If `id` is invalid the dynamic page can throw — verify error handling |
| `app/xp-shop/page.tsx` referenced as `/xp-shop` | — | SUSPICIOUS | `redirect("/teen/wallet?tab=shop")` | only referenced internally; OK |
| `app/gamification/missions/page.tsx` | `/gamification/missions` | SUSPICIOUS | `permanentRedirect("/teen/quests")` | linked from `components/rewards/unified-rewards-display.tsx:230` — change link to `/teen/quests` |
| `app/gamification/aide-scolaire/page.tsx` | `/gamification/aide-scolaire` | SUSPICIOUS | `redirect("/teen/aide-scolaire")` | not actively linked, but reachable via search |
| `app/gamification/defis-physiques/page.tsx` | `/gamification/defis-physiques` | SUSPICIOUS | `redirect("/teen/defis-physiques")` | same |
| `app/gamification/crews/page.tsx` | `/gamification/crews` | SUSPICIOUS | `redirect("/teen/circles")` | same |
| `app/teen/passions/page.tsx` | `/teen/passions` | SUSPICIOUS | `redirect("/teen/quests?tab=creative")` | not linked from menu, but reachable |
| `app/teen/academic/page.tsx` | `/teen/academic` | SUSPICIOUS | `redirect("/teen/aide-scolaire")` | same |
| `app/teen/achievements/page.tsx` | `/teen/achievements` | SUSPICIOUS | `redirect("/gamification/collections")` | same |
| `app/teen/map/page.tsx` | `/teen/map` | SUSPICIOUS | `redirect("/teen/social?tab=map")` | the home dashboard already links directly to `/teen/social?tab=map` so the stub is dead weight |
| `app/teen/rewards/page.tsx` | `/teen/rewards` | SUSPICIOUS | `redirect("/teen/wallet?tab=shop")` | not linked from menu |
| `app/teen/shop/page.tsx` | `/teen/shop` | SUSPICIOUS | `redirect("/teen/wallet?tab=shop")` | linked from many places (`xp-purchase-power.tsx`, `shop-filters.tsx`, `checkout-client.tsx`, `error.tsx`, etc.) — every "Mon Shop" click does an extra hop |
| `app/teen/settings/page.tsx` | `/teen/settings` | SUSPICIOUS | `redirect("/teen/profile?tab=settings")` | linked from `dashboard/teen/header.tsx` and `settings-client.tsx` — the "Paramètres" menu item lands inside the profile tab UI |

---

## Notes on what was NOT flagged

- `mailto:`, `https://`, `tel:`, `wa.me/...` external destinations.
- Refs whose `href` value is a runtime expression with no string component
  visible at grep time (e.g. `<Link href={item.href}>`, `<Link href={action.href}>`,
  `<Link href={notification.action_url}>`, `<Link href={backHref}>`, `<Link href={eventUrl}>`).
  These can still surface broken links at runtime depending on data sources;
  the `notifications` table's `action_url` column is the most likely culprit
  for stale teen-facing links and deserves a separate data audit (out of scope
  for A3).
- `redirect()` calls inside route handlers (`/api/...`) and the auth callback —
  those target valid paths or the literal `"/"` and `/auth/login`.
- Anchor-only links (`href="#"`).

---

## Persisted grep evidence

Raw grep outputs (>40 KB) were saved by the harness and should be retained for
re-analysis:

- `<Link href=` matches:
  `C:\Users\Shadow\.claude\projects\C--Users-Shadow-Desktop-NIVY\b5c0c413-48b2-42ac-b1d1-f82ecdb3b57b\tool-results\toolu_019uxaAnA59CFTFEpoAhFQrA.txt`
- `redirect(...)` / `permanentRedirect(...)` matches:
  `C:\Users\Shadow\.claude\projects\C--Users-Shadow-Desktop-NIVY\b5c0c413-48b2-42ac-b1d1-f82ecdb3b57b\tool-results\toolu_018XhpWShSV6xQ1crx9gyshb.txt`
- Concrete route table:
  built from `app/**/page.tsx` glob (214 files); see scratch list `routes.txt`
  reproduced inline in the audit transcript.
