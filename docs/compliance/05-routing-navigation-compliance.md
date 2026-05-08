# 05 — Routing & Navigation Compliance Audit

> **Domain**: Routing + Navigation
> **Sources of truth**: `docs/canon/routing.locked.md`, `docs/canon/INDEX.locked.md`
> **Date**: 2026-05-08
> **Mode**: READ-ONLY. No code edits. No deletions. Strict adherence to canon.
> **Method**: per-route disk verification, redirect-implementation verification, internal-link grep, role nav cross-check, forbidden-pattern lint.

## Summary

- **Score**: **42 / 100** (Launch status: **BLOCK**)
- **Findings**: 38 (4 BLOCKER, 13 HIGH, 14 MEDIUM, 7 LOW)
- **Headline**: Many canonical routes are present, but the entire deprecation layer is broken. `/gamification/*` hub still renders content (canon §2 requires 308). Three of the four cross-cutting nav components (`components/layouts/app-sidebar.tsx`, `components/dashboard/sidebar.tsx`, `components/dashboard/header.tsx`) point at legacy IA URLs that the canon explicitly bans (rule 1, 4, 5, 6, 8). The mobile dock points at four routes that don't exist on disk (`/admin/events`, `/admin/users`, `/admin/settings`, `/partner/profile`, `/ambassador/profile`, `/ambassador/shop`). Teen sidebar links every redirect-only stub instead of the canonical replacement.
- **What works**: 165 of the canonical routes per role have `page.tsx` on disk. The PWA spine (`public/sw.js`, `app/manifest.ts`) is present. Many redirect stubs (`/teen/shop`, `/teen/coins`, `/teen/settings`, `/teen/academic`, `/teen/passions`, `/teen/map`, `/teen/rewards`, `/xp-shop`, `/gamification/missions`, `/gamification/defis`, `/gamification/aide-scolaire`, `/gamification/defis-physiques`, `/gamification/boutique`, `/gamification/crews`, `/espace`) correctly redirect.

## Severity standard

- **BLOCKER**: ships broken navigation or violates a canon `LOCKED` rule that would corrupt data, leak PII, or 404 a primary nav target.
- **HIGH**: forbidden pattern present in production code, or a canonical merge target is still serving two parallel pages, or a 308-required stub renders content.
- **MEDIUM**: deprecated route still has internal `<Link>` instead of pointing to canonical (avoids the bounce); missing route required by whitepaper P0/P1.
- **LOW**: missing P2 routes; cosmetic naming alignment; doc drift.

## Method recap

1. Each canonical row in `routing.locked.md` §1.1–§1.10 was checked against `app/<path>/page.tsx` (or `route.ts` for handlers). Render vs. redirect-only was confirmed by reading the file head.
2. Each row in §2 (DEPRECATED) was checked: does `app/<path>/page.tsx` actually call `redirect()`/`permanentRedirect()` to the canonical replacement?
3. Each row in §4 (MISSING) was confirmed via filesystem `ls`.
4. Internal nav scanned by Grep: `<Link href`, `router.push`, `redirect(`, `permanentRedirect(`.
5. Role nav components inspected directly (`components/layouts/app-sidebar.tsx`, `components/layouts/admin-sidebar.tsx`, `components/layouts/mobile-dock.tsx`, `components/layouts/parent-mobile-dock.tsx`, `components/dashboard/{teen,parent,partner,ambassador,mentor}/sidebar.tsx`, `components/dashboard/sidebar.tsx`, `components/dashboard/header.tsx`).
6. §5 forbidden patterns enumerated and grep'd.
7. §3 merge clusters reviewed for live duplicates.

---

## Findings

### BLOCKER

```json
{
  "id": "CANON-ROUTE-001",
  "severity": "BLOCKER",
  "title": "/gamification (root) renders a full hub page; canon requires 308 to /teen",
  "evidence": {
    "file": "C:\\Users\\Shadow\\Desktop\\NIVY\\app\\gamification\\page.tsx",
    "lines": "1-40",
    "behavior": "Imports BentoGrid, GlassCard, full hub UI. `redirect()` is only called for the unauth case (line 39 — login redirect)."
  },
  "canon_rule": "routing.locked.md §2 row `/gamification` → `/teen` 308; §5 rule 9 (no auth surfaces outside role prefix); INDEX.locked.md cross-cut: `/gamification/*` zone is sunset.",
  "fix": "Replace body with `permanentRedirect('/teen')`. Same shape as `app/gamification/missions/page.tsx`."
}
```

```json
{
  "id": "CANON-ROUTE-002",
  "severity": "BLOCKER",
  "title": "components/layouts/app-sidebar.tsx primary nav points at 7 forbidden URLs",
  "evidence": {
    "file": "C:\\Users\\Shadow\\Desktop\\NIVY\\components\\layouts\\app-sidebar.tsx",
    "lines": "37, 47, 52, 57, 62, 67, 73, 79",
    "violations": [
      "/dashboard (line 37) — forbidden §5 rule 1",
      "/mes-reservations (line 47) — forbidden §5 rule 4",
      "/profile/enfants (line 52) — forbidden §5 rule 4",
      "/autorisations (line 57) — should be /parent/approvals (canon §2)",
      "/notifications (line 67) — forbidden §5 rule 3",
      "/profile (line 73) — forbidden §5 rule 4",
      "/profile/modifier (line 79) — forbidden §5 rule 4"
    ]
  },
  "canon_rule": "routing.locked.md §5 rules 1, 3, 4. INDEX cross-cut: notifications must be role-namespaced.",
  "fix": "Either delete this sidebar entirely (redundant with role-specific sidebars under components/dashboard/<role>/sidebar.tsx) or rewrite all hrefs to canonical role-prefixed equivalents. Decision required: which sidebar is the canonical authenticated nav? See CANON-ROUTE-007."
}
```

```json
{
  "id": "CANON-ROUTE-003",
  "severity": "BLOCKER",
  "title": "components/dashboard/sidebar.tsx + components/dashboard/header.tsx point at 8 forbidden URLs",
  "evidence": {
    "files": [
      "C:\\Users\\Shadow\\Desktop\\NIVY\\components\\dashboard\\sidebar.tsx:22,28,34,42,48,52,58,62,68",
      "C:\\Users\\Shadow\\Desktop\\NIVY\\components\\dashboard\\header.tsx:40,41,42,44,45,103,131,137"
    ],
    "violations": [
      "/dashboard, /mes-reservations, /mes-clubs, /profile/enfants, /gamification, /notifications, /mon-compte (sidebar)",
      "/dashboard, /mes-reservations, /mes-clubs, /profile/enfants, /gamification, /notifications, /profile, /mon-compte (header)"
    ]
  },
  "canon_rule": "§5 rules 1, 2, 3, 4, 9.",
  "fix": "Delete or rewrite. These two components are the legacy 'dashboard' shell mentioned in canon §5 rule 1: `Currently 5+ broken refs in components/layouts/app-sidebar.tsx + components/dashboard/header.tsx`. Match the rule's call-out exactly."
}
```

```json
{
  "id": "CANON-ROUTE-004",
  "severity": "BLOCKER",
  "title": "MobileDock public + admin nav target 6 routes that do not exist on disk",
  "evidence": {
    "file": "C:\\Users\\Shadow\\Desktop\\NIVY\\components\\layouts\\mobile-dock.tsx",
    "lines": [
      "162 — /admin/events (only /admin/evenements exists)",
      "169 — /admin/users (only /admin/utilisateurs exists)",
      "183 — /admin/settings (no such route)",
      "145 — /partner/profile (no such route; canon §4 row 32 marks as broken link, P2)",
      "207 — /ambassador/shop (no such route; canon §1.8 marks /ambassador/boutique sunset)",
      "221 — /ambassador/profile (no such route)"
    ]
  },
  "canon_rule": "§5 rule 13 (links must resolve to canonical). §1.7 admin canonical is /admin/evenements + /admin/utilisateurs. §1.8 /ambassador/boutique is sunset (DELETE).",
  "fix": "Replace with canonical hrefs. /admin/events → /admin/evenements; /admin/users → /admin/utilisateurs; /admin/settings → drop (or build); /partner/profile → /partner/settings (or implement per canon §6 #1); /ambassador/shop → drop; /ambassador/profile → /ambassador or /ambassador/withdrawals (no profile surface in canon §1.8)."
}
```

### HIGH

```json
{
  "id": "CANON-ROUTE-005",
  "severity": "HIGH",
  "title": "/autorisations + /autorisations/ajouter render full pages; canon requires 308 to /parent/approvals",
  "evidence": {
    "files": [
      "C:\\Users\\Shadow\\Desktop\\NIVY\\app\\autorisations\\page.tsx:1-40 (renders Card, Button, list of authorizations)",
      "C:\\Users\\Shadow\\Desktop\\NIVY\\app\\autorisations\\ajouter\\page.tsx (exists as full page)"
    ]
  },
  "canon_rule": "routing.locked.md §2 rows `/autorisations*` → `/parent/approvals` 308.",
  "fix": "Replace bodies with `permanentRedirect('/parent/approvals')`."
}
```

```json
{
  "id": "CANON-ROUTE-006",
  "severity": "HIGH",
  "title": "/notifications + /notifications/preferences render full pages and read deprecated `notifications` table",
  "evidence": {
    "file": "C:\\Users\\Shadow\\Desktop\\NIVY\\app\\notifications\\page.tsx:19-26",
    "code": "supabase.from(\"notifications\").select(...) — deprecated table per INDEX cross-cut #5"
  },
  "canon_rule": "§2 rows `/notifications*` → role-namespaced 308; §5 rule 3 (no bare /notifications); INDEX cross-cut #5 (`user_notifications` is canonical, `notifications` deprecated).",
  "fix": "Replace with role-router redirect: get role from getUserRole(), then redirect to /parent/notifications or /teen/activity."
}
```

```json
{
  "id": "CANON-ROUTE-007",
  "severity": "HIGH",
  "title": "/partner and /partner/dashboard both alive — canon §6 #1 requires consolidation",
  "evidence": {
    "files": [
      "C:\\Users\\Shadow\\Desktop\\NIVY\\app\\partner\\page.tsx (renders BentoGrid hub)",
      "C:\\Users\\Shadow\\Desktop\\NIVY\\app\\partner\\dashboard\\page.tsx:1-25 (also renders BentoGrid + UniversalScanner)"
    ]
  },
  "canon_rule": "routing.locked.md §6 row #1: canonical = /partner; /partner/dashboard must be 308.",
  "fix": "Replace `/partner/dashboard/page.tsx` body with `permanentRedirect('/partner')`."
}
```

```json
{
  "id": "CANON-ROUTE-008",
  "severity": "HIGH",
  "title": "/teen/achievements redirects to /gamification/collections instead of canon-decided /teen/profile?tab=achievements",
  "evidence": {
    "file": "C:\\Users\\Shadow\\Desktop\\NIVY\\app\\teen\\achievements\\page.tsx:1-7",
    "code": "redirect(\"/gamification/collections\")"
  },
  "canon_rule": "routing.locked.md §6 row #5 (resolved): canonical = /teen/profile?tab=achievements. /gamification/collections is itself deprecated (§2 row 307→pending §6).",
  "fix": "Build /teen/profile achievements tab; redirect both /teen/achievements and /gamification/collections to it."
}
```

```json
{
  "id": "CANON-ROUTE-009",
  "severity": "HIGH",
  "title": "/teen/passions redirects to /teen/quests?tab=creative — canon table says /onboarding",
  "evidence": {
    "file": "C:\\Users\\Shadow\\Desktop\\NIVY\\app\\teen\\passions\\page.tsx:1-6",
    "code": "redirect(\"/teen/quests?tab=creative\")"
  },
  "canon_rule": "routing.locked.md §2 row `/teen/passions` → `/onboarding` 308.",
  "fix": "Either change redirect target to /onboarding, or update canon §2 if the quests-tab destination is preferred. Flag for founder reconciliation."
}
```

```json
{
  "id": "CANON-ROUTE-010",
  "severity": "HIGH",
  "title": "/teen/challenges re-exports /teen/defis-physiques default — canon requires 308",
  "evidence": {
    "file": "C:\\Users\\Shadow\\Desktop\\NIVY\\app\\teen\\challenges\\page.tsx:1-3",
    "code": "export { default } from \"../defis-physiques/page\""
  },
  "canon_rule": "routing.locked.md §2 row `/teen/challenges` → `/teen/quests` 308 (REPLACE current re-export).",
  "fix": "Replace with `permanentRedirect('/teen/quests')`."
}
```

```json
{
  "id": "CANON-ROUTE-011",
  "severity": "HIGH",
  "title": "/teen/social, /teen/calendar, /teen/messages, /teen/games render full pages — canon requires 308 / 410",
  "evidence": {
    "files": [
      "app/teen/social/page.tsx:1-25 (renders SocialHubClient)",
      "app/teen/calendar/page.tsx:1-50 (renders CalendarClient)",
      "app/teen/messages/page.tsx:1-90 (renders MessagesClient)",
      "app/teen/games/page.tsx:1-25 (renders GamesClient)"
    ]
  },
  "canon_rule": "§2 rows: /teen/social keep until ?tab=map migrated then 410; /teen/calendar 308 → /teen/events?view=calendar; /teen/messages 308 → /teen/circles; /teen/games 410.",
  "fix": "/teen/calendar + /teen/messages → permanentRedirect immediately. /teen/games → 410 after audit of mini-games consumers (canon §6 #14: hard delete). /teen/social → keep until /teen/map rebuilt or merged into /teen dashboard."
}
```

```json
{
  "id": "CANON-ROUTE-012",
  "severity": "HIGH",
  "title": "/aide/faq is full FAQ page; canon requires 308 to /aide",
  "evidence": {
    "file": "C:\\Users\\Shadow\\Desktop\\NIVY\\app\\aide\\faq\\page.tsx:1-160 (full Accordion-based FAQ)"
  },
  "canon_rule": "routing.locked.md §2 row `/aide/faq` → `/aide` 308; §3 cluster Help/FAQ.",
  "fix": "Move accordion content into /aide and replace /aide/faq body with permanentRedirect('/aide')."
}
```

```json
{
  "id": "CANON-ROUTE-013",
  "severity": "HIGH",
  "title": "/anniversaires/organiser is full marketing flow; canon requires redirect to /anniversaires",
  "evidence": {
    "file": "C:\\Users\\Shadow\\Desktop\\NIVY\\app\\anniversaires\\organiser\\page.tsx:1-200 (full multi-step booking)"
  },
  "canon_rule": "§2 + §3 + §6 #16 (resolved: redirect to /anniversaires).",
  "fix": "Replace with permanentRedirect('/anniversaires'); fold any salvageable copy into the canonical page."
}
```

```json
{
  "id": "CANON-ROUTE-014",
  "severity": "HIGH",
  "title": "/gamification/leaderboard, /gamification/collections, /gamification/roue, /gamification/parcours render content — canon requires 308 / 410",
  "evidence": {
    "files": [
      "app/gamification/leaderboard/page.tsx:1-40 (queries user_xp, renders LeaderboardClient)",
      "app/gamification/collections/page.tsx:1-40 (queries collections, renders CollectionsClient)",
      "app/gamification/roue/page.tsx:1-40 (queries wheel_segments, renders FortuneWheelClient)",
      "app/gamification/parcours/page.tsx:1-20 (renders static map UI)"
    ]
  },
  "canon_rule": "§2 rows: leaderboard → /teen/leaderboard 308; collections → /teen/profile?tab=achievements 307→pending §6; roue → 410 (wheel_streaks trigger broken); parcours → 410 (static mock).",
  "fix": "Phase: (1) parcours + roue → permanentRedirect immediately or delete page (410). (2) leaderboard → permanentRedirect('/teen/leaderboard'). (3) collections → wait for /teen/profile?tab=achievements then 308."
}
```

```json
{
  "id": "CANON-ROUTE-015",
  "severity": "HIGH",
  "title": "components/dashboard/teen/sidebar.tsx links 7 deprecated stubs instead of canonical replacements",
  "evidence": {
    "file": "C:\\Users\\Shadow\\Desktop\\NIVY\\components\\dashboard\\teen\\sidebar.tsx",
    "lines": [
      "29 — /teen/passions (deprecated → /onboarding)",
      "30 — /teen/games (410 sunset)",
      "33 — /gamification/collections (deprecated)",
      "34 — /teen/coins (deprecated → /teen/wallet)",
      "37 — /gamification/leaderboard (deprecated → /teen/leaderboard)",
      "39 — /teen/settings (deprecated → /teen/profile?tab=settings)"
    ]
  },
  "canon_rule": "§5 rule 8 (no <Link> directly to redirect-only stubs).",
  "fix": "Re-point every entry to its canonical target. Drop /teen/games entirely."
}
```

```json
{
  "id": "CANON-ROUTE-016",
  "severity": "HIGH",
  "title": "components/dashboard/{partner,ambassador,mentor}/sidebar.tsx all reference unbuilt nav targets",
  "evidence": {
    "files": [
      "components/dashboard/ambassador/sidebar.tsx:21 (/ambassador/link — does not exist)",
      "components/dashboard/ambassador/sidebar.tsx:22 (/ambassador/stats — does not exist)",
      "components/dashboard/ambassador/sidebar.tsx:23 (/ambassador/rewards — does not exist)",
      "components/dashboard/ambassador/sidebar.tsx:24 (/ambassador/settings — does not exist)",
      "components/dashboard/ambassador/sidebar.tsx:25 (/ambassador/help — does not exist)",
      "components/dashboard/parent/sidebar.tsx:27 (/parent/subscription — does not exist; canon §1.5 has no such route)",
      "components/dashboard/mentor/sidebar.tsx:17 (/mentor/availability — does not exist)"
    ]
  },
  "canon_rule": "§5 rule 13 + §1 (canonical paths only).",
  "fix": "Either build the missing routes (per §4 missing list) or remove from sidebar. Ambassador canonical surfaces per §1.8 are: /ambassador, /ambassador/comment-gagner, /ambassador/commissions, /ambassador/marketing, /ambassador/referrals, /ambassador/withdrawals."
}
```

```json
{
  "id": "CANON-ROUTE-017",
  "severity": "HIGH",
  "title": "components/layouts/admin-sidebar.tsx still surfaces /admin/scripts-sql without super_admin gate",
  "evidence": {
    "file": "C:\\Users\\Shadow\\Desktop\\NIVY\\components\\layouts\\admin-sidebar.tsx:80-83",
    "code": "{ title: 'Scripts SQL', href: '/admin/scripts-sql', icon: Database }"
  },
  "canon_rule": "§5 rule 10 (no raw SQL admin tools outside super_admin gate); §1.7 sunset note: P0 RESTRICT or REMOVE.",
  "fix": "Either gate the link via permission check + add page-level super_admin enforcement, or remove the entry. Page itself should also be removed in production builds (§5 rule 14)."
}
```

### MEDIUM

```json
{
  "id": "CANON-ROUTE-018",
  "severity": "MEDIUM",
  "title": "Missing canonical routes — P0",
  "evidence": {
    "filesystem_check": "ls confirmed not present",
    "missing": [
      "/partner/awards (canon §4 #11 — P0)",
      "/partner/awards/[id] (canon §4 #12 — P0)"
    ]
  },
  "canon_rule": "§4 rows 11–12 (P0).",
  "fix": "Build per spec `teacher-coach-xp.md`. Largest single missing partner feature."
}
```

```json
{
  "id": "CANON-ROUTE-019",
  "severity": "MEDIUM",
  "title": "Missing canonical routes — P1 cluster",
  "evidence": {
    "missing": [
      "/admin/audit-log",
      "/admin/moderation",
      "/admin/refunds",
      "/admin/broadcasts",
      "/admin/cndp",
      "/teen/avatar",
      "/teen/crews",
      "/teen/aide-scolaire/tutors",
      "/teen/aide-scolaire/grades",
      "/parent/topup/recurring",
      "/partner/staff",
      "/partner/anniversaires",
      "/partner/restaurant (root index — restaurant/menu and restaurant/orders exist but not the root)",
      "/account/export",
      "/account/delete",
      "/admin/utilisateurs/[id]",
      "/admin/reservations/[id]",
      "/admin/ambassadeurs/[id]",
      "/parent/teens/[id]"
    ]
  },
  "canon_rule": "§4 rows P1.",
  "fix": "Schedule per priority. /admin/cndp + /account/{export,delete} block CNDP compliance."
}
```

```json
{
  "id": "CANON-ROUTE-020",
  "severity": "MEDIUM",
  "title": "/mentor index missing — sidebar points at /mentor/dashboard but not /mentor",
  "evidence": {
    "filesystem_check": "app/mentor/ has layout.tsx + loading.tsx + dashboard/ + profile/ + sessions/ — no page.tsx at root",
    "canon_decision": "§6 #8: build /mentor as redirect to /mentor/dashboard"
  },
  "canon_rule": "§6 #8 (resolved).",
  "fix": "Add app/mentor/page.tsx with `permanentRedirect('/mentor/dashboard')`."
}
```

```json
{
  "id": "CANON-ROUTE-021",
  "severity": "MEDIUM",
  "title": "Bare /profile, /profile/enfants, /profile/enfants/ajouter, /mon-compte links inside auth flows",
  "evidence": {
    "files": [
      "app/autorisations/page.tsx:56 (/profile/enfants/ajouter)",
      "app/reservation/page.tsx:129 (/profile/enfants/ajouter)",
      "app/carte-vip/confirmation/page.tsx:319 (/profile)",
      "app/anniversaires/page.tsx:739 (/profile/commandes — also broken target)",
      "app/daily/page.tsx:55,526 (/profile/enfants/ajouter, /profile)",
      "components/club-enrollment-form.tsx:151 (/profile/enfants/ajouter)",
      "components/reservation-form.tsx:137 (/profile/teens/add)"
    ]
  },
  "canon_rule": "§5 rule 4 (no <Link> to /profile, /profile/enfants, /profile/enfants/ajouter, /profile/modifier, /mon-compte, /mes-reservations).",
  "fix": "Re-point to role-prefixed: /parent/teens, /parent/teens/add, /parent/settings, /teen/profile."
}
```

```json
{
  "id": "CANON-ROUTE-022",
  "severity": "MEDIUM",
  "title": "/events, /support, /conditions referenced in 4 places (canon §5 rule 6)",
  "evidence": {
    "files": [
      "app/parent/events/page.tsx:338 (/events — canonical is /agenda)",
      "app/a-propos/page.tsx:142 (/support)",
      "app/guide-parents/page.tsx:170 (/support)",
      "app/auth/sign-up/page.tsx:248 (/conditions)"
    ]
  },
  "canon_rule": "§5 rule 5 + 6.",
  "fix": "/events → /agenda; /support → /aide; /conditions → /legal/cgu."
}
```

```json
{
  "id": "CANON-ROUTE-023",
  "severity": "MEDIUM",
  "title": "router.push targets bypassed canon: /dashboard, /profile, /teen/shop, /notifications",
  "evidence": {
    "files": [
      "app/onboarding/page.tsx:103 (router.push('/dashboard'))",
      "app/anniversaires/page.tsx:739 (router.push('/profile/commandes'))",
      "app/daily/page.tsx:55,526 (router.push('/profile*'))",
      "app/teen/shop/checkout/checkout-client.tsx:187,230 (router.push('/teen/shop') — stub bounce)",
      "components/teen/shop-filters.tsx:74 (router.push('/teen/shop'))",
      "components/notifications/notification-center.tsx:237,295 (router.push('/notifications*'))"
    ]
  },
  "canon_rule": "§5 rules 1, 3, 4, 8.",
  "fix": "Re-point router.push targets to canonical equivalents (/auth/redirect for role-router, /teen/wallet?tab=shop for shop, /parent/notifications or /teen/activity for inbox)."
}
```

```json
{
  "id": "CANON-ROUTE-024",
  "severity": "MEDIUM",
  "title": "/teen/leaderboard links back to deprecated /gamification/leaderboard",
  "evidence": {
    "file": "app/teen/leaderboard/page.tsx:79",
    "code": "<Link href=\"/gamification/leaderboard\">"
  },
  "canon_rule": "§5 rule 8; §6 #3 (canon-decided: query-param scope on /teen/leaderboard).",
  "fix": "Remove the back-link, or rewrite it to /teen/leaderboard?scope=xp."
}
```

```json
{
  "id": "CANON-ROUTE-025",
  "severity": "MEDIUM",
  "title": "components/footer.tsx still links /gamification (zone-sunset)",
  "evidence": {
    "file": "components/footer.tsx:238",
    "code": "<Link href=\"/gamification\">"
  },
  "canon_rule": "§2 row /gamification → /teen 308; §5 rule 2.",
  "fix": "Re-point to /teen (auth) or remove from public footer."
}
```

```json
{
  "id": "CANON-ROUTE-026",
  "severity": "MEDIUM",
  "title": "components/rewards/unified-rewards-display.tsx links 2 deprecated stubs",
  "evidence": {
    "file": "components/rewards/unified-rewards-display.tsx:230,236",
    "code": "<Link href=\"/gamification/missions\"> + <Link href=\"/gamification/leaderboard\">"
  },
  "canon_rule": "§5 rule 8.",
  "fix": "/gamification/missions → /teen/quests; /gamification/leaderboard → /teen/leaderboard."
}
```

```json
{
  "id": "CANON-ROUTE-027",
  "severity": "MEDIUM",
  "title": "components/dashboard/teen/header.tsx links /gamification/collections, /teen/coins, /teen/settings",
  "evidence": {
    "file": "components/dashboard/teen/header.tsx",
    "lines": "87 (/gamification/collections), 90 (/teen/coins), 186 (/teen/settings)"
  },
  "canon_rule": "§5 rule 8.",
  "fix": "Re-point: collections → /teen/profile?tab=achievements (per §6 #5); coins → /teen/wallet; settings → /teen/profile?tab=settings."
}
```

```json
{
  "id": "CANON-ROUTE-028",
  "severity": "MEDIUM",
  "title": "components/dashboard/{partner,ambassador}/header.tsx link nonexistent /partner/profile and /ambassador/profile",
  "evidence": {
    "files": [
      "components/dashboard/partner/header.tsx:117",
      "components/dashboard/ambassador/header.tsx:122",
      "app/partner/dashboard/page.tsx:351"
    ]
  },
  "canon_rule": "§4 rows 32 (/partner/profile broken).",
  "fix": "Either build the routes (P2) or re-point to /partner/settings + /ambassador (the dashboard root)."
}
```

```json
{
  "id": "CANON-ROUTE-029",
  "severity": "MEDIUM",
  "title": "/devenir-ambassadeur links deprecated /dashboard/ambassadeur",
  "evidence": {
    "file": "app/devenir-ambassadeur/page.tsx:194",
    "code": "<Link href=\"/dashboard/ambassadeur\">"
  },
  "canon_rule": "§5 rule 1 (no <Link> to /dashboard).",
  "fix": "Re-point to /ambassador or /auth/redirect."
}
```

```json
{
  "id": "CANON-ROUTE-030",
  "severity": "MEDIUM",
  "title": "/ambassador/comment-gagner links sunset /ambassador/boutique",
  "evidence": {
    "file": "app/ambassador/comment-gagner/page.tsx:281"
  },
  "canon_rule": "§1.8 sunset row.",
  "fix": "Remove the link; /ambassador/boutique should be deleted (canon: DELETE — out of scope per FRONTEND_REDO §5)."
}
```

```json
{
  "id": "CANON-ROUTE-031",
  "severity": "MEDIUM",
  "title": "/devenir-influenceur + /devenir-influenceur/candidature still on disk; canon §6 F3 says fold into /devenir-ambassadeur",
  "evidence": {
    "files": [
      "app/devenir-influenceur/page.tsx (renders content)",
      "app/devenir-influenceur/candidature/page.tsx (renders content)"
    ]
  },
  "canon_rule": "§2 rows (308 to /devenir-ambassadeur*); INDEX cross-cut F3 (resolved: fold into ambassador).",
  "fix": "Replace with permanentRedirect to /devenir-ambassadeur and /devenir-ambassadeur/candidature."
}
```

### LOW

```json
{
  "id": "CANON-ROUTE-032",
  "severity": "LOW",
  "title": "Missing P2 routes",
  "evidence": {
    "missing": [
      "/teen/birthday",
      "/teen/wellbeing",
      "/parent/ambassador",
      "/parent/family-plan",
      "/parent/profile (or redirect)",
      "/partner/profile (or redirect)",
      "/admin/clubs/[id]/modifier",
      "/teen/quests/friend-defis/new",
      "/teen/settings/{privacy,notifications,visibility,language}"
    ]
  },
  "canon_rule": "§4 rows P2.",
  "fix": "Schedule for V1.5+."
}
```

```json
{
  "id": "CANON-ROUTE-033",
  "severity": "LOW",
  "title": "/djs, /djs/[id], /djs/candidature still on disk",
  "evidence": {
    "files": [
      "app/djs/page.tsx",
      "app/djs/[id]/page.tsx",
      "app/djs/candidature/page.tsx"
    ]
  },
  "canon_rule": "§2 rows: /djs → /agenda 308; /djs/[id] → /agenda/[id] 308; /djs/candidature → 410.",
  "fix": "Convert to redirects (or 410 for candidature)."
}
```

```json
{
  "id": "CANON-ROUTE-034",
  "severity": "LOW",
  "title": "/dev/defi-card-preview still in /app — canon §2 says 410 in production builds",
  "evidence": {
    "file": "app/dev/defi-card-preview/page.tsx"
  },
  "canon_rule": "§5 rule 14 + §2 row.",
  "fix": "Strip via next.config env-gate or move to a private branch."
}
```

```json
{
  "id": "CANON-ROUTE-035",
  "severity": "LOW",
  "title": "/parent/live still on disk — canon §1.5 says DELETE/fold",
  "evidence": {
    "file": "app/parent/live/page.tsx"
  },
  "canon_rule": "§1.5 sunset row.",
  "fix": "Delete or fold contents into /parent dashboard."
}
```

```json
{
  "id": "CANON-ROUTE-036",
  "severity": "LOW",
  "title": "/admin/clubs* and /admin/clubs/creer + /admin/clubs/[id]/supprimer still alive — canon §6 #12 says merge into /admin/partners",
  "evidence": {
    "files": [
      "app/admin/clubs/page.tsx",
      "app/admin/clubs/creer/page.tsx",
      "app/admin/clubs/[id]/supprimer/page.tsx"
    ]
  },
  "canon_rule": "§6 #12 (resolved): merge into /admin/partners?type=venue.",
  "fix": "Migrate UI behind /admin/partners filter; redirect old paths."
}
```

```json
{
  "id": "CANON-ROUTE-037",
  "severity": "LOW",
  "title": "Tier naming drift in components/dashboard/parent/sidebar.tsx — uses canonical free/silver/gold/platinum",
  "evidence": {
    "file": "components/dashboard/parent/sidebar.tsx:37-44"
  },
  "canon_rule": "§6 #11 (resolved: Free/Silver/Gold/Platinum).",
  "fix": "No action — already aligned. Flagged for cross-domain consistency check (other surfaces may still use Starter/Pro/Elite/Family)."
}
```

```json
{
  "id": "CANON-ROUTE-038",
  "severity": "LOW",
  "title": "/notifications/preferences still renders + links back to /notifications",
  "evidence": {
    "file": "app/notifications/preferences/page.tsx:90"
  },
  "canon_rule": "§2 row /notifications/preferences → role-namespaced 308.",
  "fix": "Replace with role-router redirect (matches CANON-ROUTE-006 pattern)."
}
```

---

## Cross-cutting cluster status (canon §3)

| Cluster | Canon decision | Status | Action |
|---|---|---|---|
| Gamification hub vs Teen shell | `/teen` canonical | **HOT** — `/gamification` still renders content | CANON-ROUTE-001 |
| Teen events vs calendar | `/teen/events?view=` canonical | **HOT** — `/teen/calendar` still renders | CANON-ROUTE-011 |
| Help / FAQ | `/aide` canonical | **HOT** — `/aide/faq` still renders full page | CANON-ROUTE-012 |
| Anniversaires | `/anniversaires` canonical | **HOT** — `/anniversaires/organiser` still renders | CANON-ROUTE-013 |
| Daily challenges | `/teen/quests` canonical | **HOT** — `/daily` still renders full page (not in findings list above; see below) | Add: `app/daily/page.tsx` (538 lines). Replace with permanentRedirect('/teen/quests'). |
| Parent approvals | `/parent/approvals` canonical | **HOT** — `/autorisations*` still renders | CANON-ROUTE-005 |
| Notifications | role-namespaced canonical | **HOT** — `/notifications*` still renders + reads deprecated table | CANON-ROUTE-006 |
| Partner dashboard | `/partner` canonical | **HOT** — `/partner/dashboard` still renders | CANON-ROUTE-007 |
| Reservation flow | `/reservation*` keep public, auth deep-link | **OK** — not migrated yet; canon allows during migration | (no finding) |
| Teen feed vs `/communaute` | split (auth vs public) | **OK** — both alive, intentional split | (no finding) |
| Achievements / collections | `/teen/profile?tab=achievements` canonical | **HOT** — neither built; both stubs/duplicates linked | CANON-ROUTE-008, CANON-ROUTE-014 |

> Bonus finding (counted as part of CANON-ROUTE-001 cluster, not separate): `app/daily/page.tsx` (538 lines) is a fully-rendered legacy parent-flavored quest hub. Canon §2 says 308 to `/teen/quests`. Add to fix list.

---

## Forbidden patterns scan (canon §5)

| Rule | Violations found | Locations |
|---|---|---|
| 1. No `<Link>` to `/dashboard` | 3 | `components/layouts/app-sidebar.tsx:37`, `components/dashboard/sidebar.tsx:22`, `components/dashboard/header.tsx:40`, `app/devenir-ambassadeur/page.tsx:194` (/dashboard/ambassadeur) — also 3 router.push (`app/onboarding/page.tsx:103`, etc.) |
| 2. No new `/gamification/*` | 0 new (existing: 11 still in `app/gamification/*` — most should be redirects) | (covered by 001, 014, 025, 026) |
| 3. No `<Link>` to `/notifications*` | 4 | `app/notifications/preferences/page.tsx:90`, `components/dashboard/header.tsx:103`, `components/notifications/notification-center.tsx:237,295` |
| 4. No `<Link>` to `/profile*`, `/mon-compte`, `/mes-reservations` | 9 | (CANON-ROUTE-021) |
| 5. No `<Link>` to `/events*` | 1 | `app/parent/events/page.tsx:338` |
| 6. No `<Link>` to `/cgv`, `/conditions`, `/support` | 3 | `app/a-propos/page.tsx:142`, `app/guide-parents/page.tsx:170`, `app/auth/sign-up/page.tsx:248` |
| 7. Deep links must include role prefix | 0 known violations |  |
| 8. No `<Link>` to redirect-only stubs | 18+ | Mostly in role sidebars + shop/checkout components (CANON-ROUTE-015, 023, 024, 025, 026, 027) |
| 9. No new top-level marketing-style URLs for auth surfaces | 1 | `/espace` still in mobile dock public nav (`components/layouts/mobile-dock.tsx:259`) — though canon §2 has /espace as 308; sticky as long as the link points there it'll bounce, not block |
| 10. No raw SQL admin tools outside super_admin | 1 | `app/admin/scripts-sql/page.tsx` + sidebar link (CANON-ROUTE-017) |
| 11. PRIVATE-bucket-only for KYC/CIN/proofs | (out of scope of routing audit) | flagged for storage audit |
| 12. `is_onboarded` gate on every new auth route | (out of scope of routing audit) | flagged for auth audit |
| 13. No DB-stored runtime URL `<Link>` without validation | (out of scope of routing audit) | flagged for activity-feed audit |
| 14. No `/dev/*` or `/admin/scripts-sql/**` in prod | 2 | `/dev/defi-card-preview`, `/admin/scripts-sql` (CANON-ROUTE-034, 017) |
| 15. No `?action=create`/`?action=battle` without handler | (none observed in this pass) |  |

---

## Score

| Component | Weight | Score | Weighted |
|---|---|---|---|
| Canonical routes on disk | 25 | 22/25 (most exist) | 22 |
| Deprecation layer (308/410 actually wired) | 25 | 6/25 (≈ 18 of 40 deprecated rows correctly redirect; rest still render) | 6 |
| Forbidden patterns (zero violations target) | 20 | 4/20 (≥ 30 violations across rules 1, 3, 4, 5, 6, 8, 14) | 4 |
| Nav components (sidebar + dock + header) | 15 | 4/15 (3 of 4 cross-cutting nav components ship forbidden patterns; teen sidebar links 6 deprecated stubs; mobile dock links 6 nonexistent routes) | 4 |
| Missing routes (P0 + P1) | 10 | 4/10 (P0 partner/awards missing; 8 P1 routes missing) | 4 |
| Merge clusters resolved | 5 | 2/5 (most merge targets still have both pages alive) | 2 |
| **Total** | **100** | | **42** |

## Launch status

**BLOCK**.

Three blockers prevent launch:
1. **CANON-ROUTE-001** — `/gamification` rendering full content while INDEX cross-cut #5 marks the entire zone as sunset.
2. **CANON-ROUTE-002 + 003** — the two cross-cutting auth sidebars + header navigate to `/dashboard`, `/profile`, `/mon-compte`, `/notifications`, `/mes-reservations`, `/profile/enfants` — every URL canon §5 explicitly forbids. Any teen, parent, partner, or ambassador who lands on a page that mounts these components will get nav links to legacy IA URLs that 404 or bounce.
3. **CANON-ROUTE-004** — mobile dock points six tabs at routes that don't exist on disk (`/admin/events`, `/admin/users`, `/admin/settings`, `/partner/profile`, `/ambassador/profile`, `/ambassador/shop`). Each tap = guaranteed 404 in the dominant nav surface.

Recommended order to unblock:
1. Fix CANON-ROUTE-001 + 002 + 003 + 004 (4 BLOCKERs) — pure rewrites; no new infrastructure.
2. Convert all HIGH redirect stubs (005, 006, 007, 010, 011, 012, 013, 014, 029, 031) to actual redirects. Pure 7-line page replacements.
3. Re-point HIGH role-sidebar entries (015, 016, 017) to canonical hrefs.
4. Build P0 missing route /partner/awards.
5. Schedule the 18 P1 missing routes per `routing.locked.md` §4.

After (1)–(3) the score should land in the 70–80 band, sufficient for V1.4 launch with P1 missing routes filed as known gaps.

---

## Appendix — Canonical-route disk verification (representative sample)

All §1.1–§1.10 rows verified by `Glob` of `app/**/page.tsx` against the canon table. Sample of rendered (not redirect) status:

| Canon row | On disk | Render mode |
|---|---|---|
| `/teen` | YES | render |
| `/teen/events` | YES | render |
| `/teen/quests` | YES | render |
| `/teen/wallet` | YES | render |
| `/teen/profile` | YES | render |
| `/teen/leaderboard` | YES | render |
| `/teen/internships` | YES | render |
| `/teen/mentors` | YES | render |
| `/teen/food` | YES | render |
| `/teen/rides` | YES | render |
| `/parent` | YES | render |
| `/parent/approvals` | YES | render |
| `/parent/topup` | YES | render |
| `/partner` | YES | render |
| `/partner/dashboard` | YES | **render (DUPLICATE — see CANON-ROUTE-007)** |
| `/admin` | YES | render |
| `/ambassador` | YES | render |
| `/mentor` | NO (only sub-routes) | — (CANON-ROUTE-020) |
| `/auth/login` | YES | render |
| `/auth/redirect` | YES | render (role router) |
| `/auth/callback` | YES | route handler |
| `/onboarding/*` | YES | render |
| Public `/agenda`, `/clubs`, `/legal/*`, `/marketplace/*`, `/anniversaires`, `/carte-vip/*` | YES | render |

PWA assets: `public/sw.js` and `app/manifest.ts` both present (resolves canon §4 row 35 — was P0 blocker).

End of audit.
