# B7 — Public + Marketing Pages Audit (READ-ONLY)

Scope: every page under `app/` that is **not** inside `teen/`, `parent/`, `partner/`, `admin/`, `mentor/`, `ambassador/`, `api/`, `auth/`. The audit covers pages under `app/(public marketing)/` (no actual route group folder exists — they sit at root level), plus the `app/legal/*` cluster.

Method:
1. Globbed `app/*/page.tsx` (depth 1) and recursed into the candidate public dirs.
2. Read top 30–60 lines of each `page.tsx`.
3. Classified each route, scored 0–10 (production-readiness as a marketing/public surface), flagged duplicates.
4. Cross-checked `app/sitemap.ts`, `app/robots.ts`, and `app/layout.tsx` for SEO posture.

Note: `app/(public)/**/page.tsx` route group does **not** exist. Public pages sit at `app/<slug>/page.tsx` directly.

---

## Section 1 — Full public route inventory + score

Scoring rubric: 10 = production-grade marketing page (real copy + DB-backed data + metadata + OG); 5 = decent skeleton, missing copy/DB/metadata; 0 = stub or dead route.

Classification key: `M` marketing, `S` static legal/info, `I` interactive (form/calc), `D` DB-backed, `R` redirect, `A` auth-gated (mis-classified as public — should not really be in scope).

| Route | File | Class | Score | Notes |
|---|---|---|---|---|
| `/` | `app/page.tsx` | M+I+D | 7 | Client component, countdown timer, fetches `upcomingEvents`, AvatarDashboard preview. No `metadata` export (relies on root layout). Heavy hero. |
| `/a-propos` | `app/a-propos/page.tsx` | M (static) | 6 | Mission/vision/values cards. Real FR copy. **No `metadata` export.** No team section, no founder bio. |
| `/agenda` | `app/agenda/page.tsx` | M+D | 9 | Server component, full DB fetch, skeleton, filters, exports `metadata` (title+description). Strong. |
| `/agenda/[id]` | `app/agenda/[id]/page.tsx` | M+D | n/a | Detail route — out of depth-1 scope but referenced in sitemap as `/agenda/{slug}`. Slug field used in sitemap doesn't match `[id]` param — possible mismatch. |
| `/aide` | `app/aide/page.tsx` | I+S | 7 | Help center w/ search, contact email/phone/whatsapp, FAQ accordion. Client component, no `metadata`. |
| `/aide/faq` | `app/aide/faq/page.tsx` | S | 6 | Static FAQ page. Duplicate concept (see Section 2). No `metadata`. |
| `/ambassador` | `app/ambassador/page.tsx` | A+D | n/a | **Auth-gated dashboard**, not public. Out of scope (matches `ambassador/` exclusion concept). Listed by glob because it's at depth 1. |
| `/anniversaires` | `app/anniversaires/page.tsx` | I+D+A | 4 (as marketing) | Heavy 6-step birthday booking funnel, calls `getMyTeens()` (auth-required). Mixed: marketing landing AND product flow. No `metadata`. |
| `/autorisations` | `app/autorisations/page.tsx` | A | n/a | Auth-required parental authorizations dashboard (`redirect("/auth/login")`). Not public. |
| `/blog` | `app/blog/page.tsx` | M+D | 6 | DB-backed (`blog_posts` + `post_categories`), `try/catch` falls back to empty. **No `metadata` export.** No `[slug]` detail route exists — blog posts have no readable URL. Dead end. |
| `/carte-vip` | `app/carte-vip/page.tsx` | M+I | 7 | Client savings calculator, 3 tiers, real pricing copy. Listed in sitemap. **No `metadata` export.** |
| `/clubs` | `app/clubs/page.tsx` | M+D | 9 | Server component, DB-backed, ISR (`revalidate=60`), exports `metadata`. |
| `/clubs/[slug]` | `app/clubs/[slug]/page.tsx` | M+D | n/a | Detail route. Listed in sitemap. |
| `/communaute` | `app/communaute/page.tsx` | D+A | 5 | Reads `posts` table publicly but renders post actions (likely needs auth to engage). Listed in sitemap as public. No `metadata`. |
| `/daily` | `app/daily/page.tsx` | A+D | n/a | Daily challenges product page, calls `getMyTeens()` — auth-required. Not public. |
| `/devenir-ambassadeur` | `app/devenir-ambassadeur/page.tsx` | M+D | 7 | Public ambassadors leaderboard + program pitch. Real copy. No `metadata`. Listed in sitemap. |
| `/devenir-influenceur` | `app/devenir-influenceur/page.tsx` | M+D | 7 | Influencer program pitch, queries `influencer_campaigns`. Real copy. No `metadata`. **Not in sitemap.** |
| `/devenir-partenaire` | `app/devenir-partenaire/page.tsx` | M | 8 | Server component, 4 partner archetypes, real benefits/stats copy, 100% static. No `metadata`. Listed in sitemap. |
| `/devenir-partenaire/inscription` | `.../inscription/page.tsx` | I | 7 | Client form, 4 type-specific forms (RetailPartnerForm, VenuePartnerForm, ClubPartnerForm, EducationPartnerForm). No `metadata`. |
| `/djs` | `app/djs/page.tsx` | M+D | 6 | DJ directory, DB-backed with try/catch fallback. Has `[id]` and `/candidature` sub-routes. No `metadata`. **Not in sitemap.** |
| `/djs/candidature` | `.../candidature/page.tsx` | I | n/a | DJ application form. |
| `/djs/[id]` | `.../[id]/page.tsx` | M+D | n/a | DJ detail. |
| `/espace` | `app/espace/page.tsx` | R | 9 | Pure role-based redirect dispatcher (auth-gated). Smart routing. Has `metadata`. |
| `/galerie` | `app/galerie/page.tsx` | M+D | 6 | Photo gallery, DB-backed (`photo_galleries`) with try/catch fallback. No `metadata`. **Not in sitemap.** |
| `/gamification` | `app/gamification/page.tsx` | A+D | n/a | Gamification hub, has `metadata`, but redirects via `getUser()`. Sub-pages: `defis`, `missions`, `collections`, `leaderboard`, `roue` (all have `metadata`). Not truly public. |
| `/guide-parents` | `app/guide-parents/page.tsx` | M (static) | 6 | Solid parents-oriented marketing copy. Whatsapp/phone CTAs. No `metadata`. **Not in sitemap.** |
| `/marketplace` | `app/marketplace/page.tsx` | D+M | 6 | Discover feed for C2C marketplace, server-rendered with filters via search params. Public read. No `metadata`. **Not in sitemap.** Has `force-dynamic`. |
| `/notifications` | `app/notifications/page.tsx` | A | n/a | Auth-required (`redirect("/auth/login")`). Not public. |
| `/offline` | `app/offline/page.tsx` | S+I | 7 | PWA offline fallback, client w/ navigator.onLine. No `metadata` (intentional — service-worker rendered). |
| `/onboarding` | `app/onboarding/page.tsx` | I+A | n/a | Multi-step onboarding flow (auth-required). Not public. |
| `/partenaires/merci` | `app/partenaires/merci/page.tsx` | S | 6 | Thank-you page after partner inscription submission. **Inconsistent URL structure**: form lives at `/devenir-partenaire/inscription`, success goes to `/partenaires/merci`. No `metadata`. |
| `/reservation` | `app/reservation/page.tsx` | A+D | n/a | Auth-required event reservation flow. Not public. Listed in `robots.ts` disallow. |
| `/securite` | `app/securite/page.tsx` | M (static) | 8 | Strong static security/safety pitch, exports `metadata`. **Not in sitemap.** |
| `/temoignages` | `app/temoignages/page.tsx` | M+D | 5 | Honest empty-state if no testimonials. DB-backed (`testimonials`). No `metadata`. **Not in sitemap.** |
| `/xp-shop` | `app/xp-shop/page.tsx` | R | 8 | Pure redirect to `/teen/wallet?tab=shop`. Documented as consolidation. |
| `/legal/cgu` | `app/legal/cgu/page.tsx` | S | 6 | CGU. **Hardcoded placeholder `[votre-domaine.com]` in copy.** No `metadata`. Listed in sitemap. |
| `/legal/cgv` | `app/legal/cgv/page.tsx` | S | 8 | Sales conditions, exports `metadata`. **Not in sitemap.** |
| `/legal/confidentialite` | `app/legal/confidentialite/page.tsx` | S | 9 | Privacy policy, exports `metadata`, dated `2026-05-07`, references Loi 09-08 + CNDP. Listed in sitemap. |
| `/legal/cookies` | `app/legal/cookies/page.tsx` | I+S | 7 | Cookie preferences UI w/ localStorage persistence. **Not in sitemap.** |
| `/legal/mentions-legales` | `app/legal/mentions-legales/page.tsx` | S | 5 | Mentions légales — **placeholders `[Montant]`, `[Numéro RC]` in copy.** Listed in sitemap. |

### Aggregate counts
- **Truly public + production-ready (>=8)**: `/agenda`, `/clubs`, `/devenir-partenaire`, `/securite`, `/legal/cgv`, `/legal/confidentialite`, `/espace` (redirect), `/xp-shop` (redirect) → **8 pages**.
- **Public but mid-grade (5–7)**: `/`, `/a-propos`, `/aide`, `/aide/faq`, `/blog`, `/carte-vip`, `/communaute`, `/devenir-ambassadeur`, `/devenir-influenceur`, `/djs`, `/galerie`, `/guide-parents`, `/marketplace`, `/offline`, `/partenaires/merci`, `/temoignages`, `/legal/cgu`, `/legal/cookies`, `/legal/mentions-legales` → **19 pages**.
- **Mis-classified as public** (auth-gated, should be moved): `/anniversaires`, `/autorisations`, `/communaute` (read-only public OK), `/daily`, `/notifications`, `/onboarding`, `/reservation`, `/gamification`, `/ambassador`.
- **Routes with `metadata` export**: 7 of ~30 public-ish surfaces — see Section 4.

---

## Section 2 — Duplicates table

| Surface concept | Route A | Route B | Canonical pick | What to do with the loser |
|---|---|---|---|---|
| Events list | `/agenda` | `/evenements` (does not exist) | `/agenda` ✓ already canonical | No action; just don't add `/evenements`. |
| FAQ | `/aide` (full help center w/ search + categories + contacts) | `/aide/faq` (plain accordion) | `/aide` (richer, owns SUPPORT_EMAIL/WHATSAPP) | Redirect `/aide/faq` → `/aide`, or re-purpose `/aide/faq` as a `/aide#faq` anchor route. Both currently coexist with overlapping FR copy. |
| Become a partner | `/devenir-partenaire` (marketing landing) | `/partenaires/merci` (thank-you) | `/devenir-partenaire/inscription` form → `/partenaires/merci` | URL structure is inconsistent: form lives under `/devenir-partenaire/`, but success page lives under `/partenaires/`. Move thank-you to `/devenir-partenaire/merci` for cohesion, or create `/partenaires` index that redirects to `/devenir-partenaire`. |
| VIP card | `/carte-vip` (single canonical) | — | `/carte-vip` ✓ | None. |
| Privacy | `/legal/confidentialite` ✓ | `/privacy` (does not exist) | `/legal/confidentialite` | None. Note: `robots.ts` mentions `/profile/` disallow but no such surface exists publicly. |
| Terms | `/legal/cgu` + `/legal/cgv` | — | Both canonical (different concepts: usage vs sale) | Consider linking from one to the other since users confuse them. |
| Cookies | `/legal/cookies` ✓ | — | `/legal/cookies` | Add to sitemap (currently missing). |
| Birthday booking | `/anniversaires` | (admin counterpart `/admin/anniversaires`) | `/anniversaires` for users | The user-facing route mixes marketing landing + auth-gated funnel; consider splitting into `/anniversaires` (marketing) and `/anniversaires/reserver` (auth). |
| XP shop | `/xp-shop` (redirect) | `/teen/wallet?tab=shop` (canonical) | `/teen/wallet?tab=shop` ✓ | Already handled by redirect — clean. |
| Communaute / Social feed | `/communaute` | `/teen/communaute` (likely) | `/communaute` is public read-only feed | OK as-is, but ensure post actions check auth and don't 500. |
| Agenda detail slug | `sitemap.ts` emits `/agenda/${event.slug}` | But folder is `app/agenda/[id]/page.tsx` (param name `id`) | Pick one: either rename folder to `[slug]` or change sitemap to use `id` | **Bug**: sitemap URLs may 404 if the page expects `id` and routing matches by folder name. Verify. |

---

## Section 3 — Missing public surfaces (investor / visitor expectations)

What an investor, journalist, or first-time visitor would look for and **cannot find**:

| Expected surface | Current state | Severity | Suggested route |
|---|---|---|---|
| **Pricing page** | None. `/carte-vip` covers VIP tiers but there is no transversal pricing for events, clubs, anniversaires — fragmented across product flows. | High | `/tarifs` or `/pricing` |
| **Team / About founders** | `/a-propos` is mission/vision/values only — no faces, no bios, no founder LinkedIn. | High (investor blocker) | `/a-propos/equipe` or `/equipe` |
| **Press kit / Media** | None. No logos, no press releases, no media contact. | Medium-High | `/presse` or `/media-kit` |
| **Case studies / Success stories** | `/temoignages` exists but is empty-state'd by design. No editorial event recaps, no partner case studies. | High | `/cas-clients` or expand `/temoignages` |
| **Investors page** | None. No deck link, no traction numbers, no contact. | Medium | `/investisseurs` |
| **Careers / Jobs** | None. | Medium | `/carrieres` |
| **Contact page** | Only embedded in `/aide` and `/a-propos`. No dedicated `/contact`. | High | `/contact` |
| **Download/App page** | None. No App Store/Play Store CTAs, despite PWA + mobile-first positioning. Cited in scope. | High | `/telecharger` |
| **Cities / Coverage** | Cities filter exists in `/agenda` but no SEO landing per city (`/casablanca`, `/marrakech`, `/rabat`). Massive missed local SEO. | High | `/villes/[slug]` |
| **Events/Soirees page** vs. agenda | The brief mentions `/evenements` — does not exist. `/agenda` handles it. | Low | Either alias `/evenements` → `/agenda` or accept current. |
| **Galerie integration** | `/galerie` exists but **not in sitemap**, no `metadata`. | Medium | Fix existing. |
| **Témoignages integration** | Exists but **not in sitemap**. | Medium | Fix existing. |
| **Securité page promotion** | Strong page (`/securite`) but **not in sitemap** despite being core to parent trust. | High | Add to sitemap. |
| **Guide parents promotion** | Strong page (`/guide-parents`) but **not in sitemap**. | High | Add to sitemap. |
| **Blog detail pages** | `/blog` lists posts but there is no `/blog/[slug]` route → posts are unreadable. Dead surface. | Critical | Create `app/blog/[slug]/page.tsx`. |
| **DJs in sitemap** | `/djs` not in sitemap. | Medium | Add. |
| **Marketplace in sitemap** | `/marketplace` not in sitemap (public read surface). | Medium | Add. |
| **Influenceurs in sitemap** | `/devenir-influenceur` not in sitemap (despite being an acquisition surface). | High | Add. |
| **404 / not-found polish** | `app/not-found.tsx` exists (not audited) — confirm it's branded and links back to public surfaces. | Low | Verify. |
| **Sitemap drift** | `robots.ts` disallows `/dashboard/`, `/profile/`, `/mes-reservations/`, `/driver/` — none exist as routes. Stale. | Low | Clean up. |

---

## Section 4 — SEO / metadata audit

### Pages that **export** `metadata` (server components or static)

Confirmed via `grep` for `export\s+(const|async function generate)?\s*metadata`:

| Route | Has `metadata` | OG declared? | Notes |
|---|---|---|---|
| `/` | No (relies on root layout default) | Inherits root OG | Root layout has full OG/Twitter on `/og-image.jpg`. Acceptable but a custom homepage `metadata` would beat the default template. |
| `/agenda` | Yes | Inherits root OG (no per-page OG) | Title+description only. |
| `/clubs` | Yes | Inherits | Title+description only. |
| `/securite` | Yes | Inherits | Title+description only. |
| `/legal/cgv` | Yes | Inherits | Title+description only. |
| `/legal/confidentialite` | Yes | Inherits | Title+description only. |
| `/espace` | Yes | Inherits | Redirect page; metadata mostly cosmetic. |
| `/gamification` and sub-pages (`defis`, `missions`, `collections`, `leaderboard`, `roue`) | Yes | Inherits | These are auth-gated though — being indexed is undesirable. They are blocked by `robots.ts` disallow `/onboarding/`, `/reservation/`, etc. but **`/gamification` is NOT in `robots.ts` disallow** → exposed to crawl. |
| `/admin/anniversaires` and `/admin/anniversaires/[id]` | Yes | n/a | Admin-gated — irrelevant. |

### Pages **without** `metadata` (relying solely on root template `%s | Nivy`)

`/`, `/a-propos`, `/aide`, `/aide/faq`, `/anniversaires`, `/blog`, `/carte-vip`, `/communaute`, `/daily`, `/devenir-ambassadeur`, `/devenir-influenceur`, `/devenir-partenaire`, `/devenir-partenaire/inscription`, `/djs`, `/djs/[id]`, `/djs/candidature`, `/galerie`, `/guide-parents`, `/marketplace`, `/notifications`, `/offline`, `/onboarding`, `/partenaires/merci`, `/reservation`, `/temoignages`, `/xp-shop` (redirect — N/A), `/legal/cgu`, `/legal/cookies`, `/legal/mentions-legales`, `/ambassador`.

→ **27 routes** without their own `metadata` export. The fallback title is just the root default `"Nivy — L'écosystème lifestyle gamifié des 13–17 ans au Maroc"` for every one of them, since `template: "%s | Nivy"` only triggers when a child sets a title. **All 27 routes share the same SEO title** in current build.

### OG / Twitter cards

- Root layout sets a single shared `/og-image.jpg` (1200×630) with FR locale, valid Twitter `summary_large_image` and `@nivyapp` creator handle — solid baseline.
- **No public page overrides OG image** with a route-specific card. Means LinkedIn/Twitter previews of `/agenda`, `/clubs`, `/devenir-partenaire`, etc. all show the same image.
- **No `keywords` per page**, no `alternates.canonical` per page (only root sets canonical = `appUrl`, so every public route is canonicalized to homepage — **Wrong, this should be removed or per-route'd**).
- **No JSON-LD / structured data** anywhere (`Event`, `Organization`, `BreadcrumbList`, `FAQPage` schemas are all missing). Massive SEO miss for `/agenda`, `/aide`, `/clubs`.
- `verification.google` removed in Wave D.5; no equivalent for Bing Webmaster.

### `sitemap.ts` audit

Sitemap currently emits **9 static URLs** + dynamic `/agenda/{slug}` + `/clubs/{slug}`:

Static: `/`, `/agenda`, `/clubs`, `/carte-vip`, `/devenir-ambassadeur`, `/devenir-partenaire`, `/communaute`, `/legal/confidentialite`, `/legal/cgu`, `/legal/mentions-legales`.

**Missing from sitemap (should be added)**: `/a-propos`, `/aide`, `/blog`, `/djs`, `/galerie`, `/guide-parents`, `/marketplace`, `/securite`, `/temoignages`, `/devenir-influenceur`, `/legal/cgv`, `/legal/cookies`, `/partenaires/merci` (or block via robots).

### `robots.ts` audit

- Disallows are mostly correct: `/api/`, `/admin/`, `/teen/`, `/parent/`, `/partner/`, `/ambassador/`, `/mentor/`, `/driver/`, `/onboarding/`, `/reservation/`, `/auth/`.
- **Stale entries**: `/dashboard/`, `/profile/`, `/mes-reservations/` — none of these route folders exist. Drop them.
- **Missing disallow**: `/gamification/` (auth-gated dashboard but currently crawlable), `/notifications/`, `/autorisations/`, `/daily/`, `/anniversaires/` if you choose to keep that funnel auth-only, `/espace/` (just a redirect — should be noindex via metadata or disallowed).
- `/offline` should be marked `noindex` via metadata (it's a PWA fallback, not a real surface).

### Tactical SEO fixes (summary)

1. Add `metadata` export to: `/`, `/a-propos`, `/aide`, `/blog`, `/carte-vip`, `/devenir-ambassadeur`, `/devenir-influenceur`, `/devenir-partenaire`, `/djs`, `/galerie`, `/guide-parents`, `/temoignages`, `/legal/cgu`, `/legal/cookies`, `/legal/mentions-legales`. (15 high-value pages.)
2. Remove or per-route the `alternates.canonical` in root layout — currently every page canonicalizes to homepage.
3. Sync `sitemap.ts` with all production-grade public routes; fix `[id]` vs `${slug}` mismatch on `/agenda/`.
4. Clean stale `robots.ts` disallows; add missing ones for `/gamification/`, `/notifications/`, `/autorisations/`, `/espace/`, `/offline`.
5. Add JSON-LD: `Organization` on `/`, `Event` on `/agenda/[id]`, `LocalBusiness` on `/clubs/[slug]`, `FAQPage` on `/aide`, `BreadcrumbList` on legal pages.
6. Replace `[votre-domaine.com]`, `[Montant]`, `[Numéro RC]` placeholders in `/legal/cgu` and `/legal/mentions-legales` before launch.
7. Build the missing surfaces flagged in Section 3, prioritizing: `/contact`, `/blog/[slug]`, `/equipe`, `/telecharger`, `/villes/[slug]`.

---

**Audit complete.** Read-only — no files modified outside this report.
