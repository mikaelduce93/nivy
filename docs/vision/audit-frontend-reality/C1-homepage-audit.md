# C1 — Homepage Deep Audit (READ-ONLY)

**Scope:** `app/page.tsx`, `app/layout.tsx`, and the components rendered on `/`:
`components/trust-banner.tsx`, `components/footer.tsx`, `components/navbar.tsx`,
`components/ui/glass-card.tsx`, `components/ui/neon-button.tsx`,
`components/brand/mascot-states.tsx`, `components/gamification/avatar-dashboard.tsx`.

**Audit date:** 2026-05-08
**Method:** static read of source. No dev server hit, no Lighthouse run.
**Verdict:** Solid bones, premium typography, real i18n wiring — but
sabotaged by missing assets, a fake-looking "10,000 parents" trust badge,
a pillar taxonomy that contradicts itself, and the absence of the four
personas the brief promised (teen / parent / partner / sponsor).

---

## Overall score: **58 / 100**

Breakdown (each /10, weighted 1×):

| Dimension                | Score | Notes |
|--------------------------|:----:|-------|
| Hero clarity             | 7    | Strong gradient headline, but "TEEN LIFE UNLEASHED" + "1er Écosystème Lifestyle" doesn't tell *what the app does in one line*. |
| Copy / voice             | 6    | Mix of FR + EN slang ("Glow Up", "Big Brain", "Main Character") feels on-brand for 13–17 but FR-only i18n bundle means non-FR visitors get a half-translated UI. |
| Visual design polish     | 8    | Glass cards, neon accents, animated gradient, Geist typography — top-quartile execution. |
| Conversion path          | 5    | One sign-up CTA in hero (`/onboarding`), one in final CTA (`/auth/sign-up`). Two different funnels for the same goal. |
| Mobile                   | 6    | Right column hidden `lg:` (dashboard preview gone on mobile = lost demo). Mobile-only mascot + 4xl headline OK. Bottom of page collides with `MobileDock`. |
| Accessibility            | 7    | aria-labels, aria-live, role=alert, skip-links, reduced-motion variants. Decorative emojis aria-hidden. Good. |
| Performance hints        | 4    | Layout preloads `/teens-party-event.jpg` — **file does not exist in `/public`**. Hero image (gradient + dashboard) has no `priority` flag (none is needed since it's CSS, but the LCP element is likely the H1 or the dashboard card). |
| Trust / honesty          | 4    | TrustBanner claims "+10,000 Parents Nous font confiance" — pre-launch product, this is fabricated social proof. Also says "11–17 ans" while the rest of the site says "13–17 ans". |
| Information architecture | 6    | Hero → 4 pillars → upcoming events → final CTA. Logical, but **no problem statement, no how-it-works, no testimonials, no parent reassurance, no partner pitch**. |
| Brand consistency        | 5    | Page mixes "Nivy" (layout metadata), "TEEN LIFE UNLEASHED" (hero), "TeensParty" (footer social URLs `facebook.com/teenspartymorocco`, `twitter.com/teenspartyma`). Reads as a half-finished rebrand. |

Sum = 58. Round to **58/100**.

---

## Section-by-section scoring

### 1. TrustBanner (top strip)
- **Score: 4/10**
- Issues:
  - **"+10,000 Parents Nous font confiance"** — fabricated. The product is pre-launch. This is the kind of claim the CNDP and any sharp parent will call out instantly.
  - **"11–17 ans uniquement"** contradicts every other surface, which says **13–17**. Internal inconsistency.
  - Hard-coded FR strings, no `t()` usage — won't translate when AR / Darija ship.
  - Solid icons + colour coding.
- File: `components/trust-banner.tsx:43`, `:33`

### 2. Hero — left column (headline, subtitle, CTAs, trust pills)
- **Score: 7/10**
- Strengths:
  - Animated gradient `TEEN LIFE / UNLEASHED` headline is on-brand and visually strong.
  - Live countdown badge with `aria-live="polite"`.
  - Two CTAs (primary "Rejoins le club" → `/onboarding`, secondary "Agenda" → `/agenda`). Both routes exist.
  - Trust pills bottom-anchored.
- Issues:
  - **No value-prop sentence in 1 line.** The subtitle says "1er Écosystème Lifestyle" but never explains *what you do* (book events? earn XP? get rides?). A teen scanning for 3s gets vibes, not a reason.
  - Subtitle uses 4 coloured pillars (Soirées / Sport / Études / Créativité) but the next section relabels them in English (Glow Up / Big Brain / Self-Express / Main Character). Two vocabularies for the same thing in 200px of scroll.
  - Live badge depends on `upcomingEvents[0].event_date` from a client-side Supabase query — until that resolves, badge shows "Prochaine soirée dans 0j 0h" which on first paint reads as "no events".
- File: `app/page.tsx:115–179`

### 3. Hero — right column (Avatar Dashboard preview)
- **Score: 6/10**
- Strengths:
  - Clever idea: showing the future dashboard *before* sign-up is high-converting.
  - Floating mascot, "Aperçu" badge clearly labels it as not-real.
- Issues:
  - **`hidden lg:block`** — invisible on tablet and mobile. The single best piece of demo content on the page is desktop-only.
  - **Pillar mismatch:** the dashboard renders `vitality / intellect / party / prestige`, but the marketing pillars section directly below sells `vitality / intellect / party / creativity` (Self-Express). A user clicking "Self-Express" will land on a dashboard that has no orange creativity pillar — there's a "prestige" pillar instead.
  - Decorative `bg-purple-500/20` blur uses the old palette while the rest migrated to `brand-soft` / `gen-z-lime`.
- File: `app/page.tsx:182–205`, `components/gamification/avatar-dashboard.tsx:30–40`

### 4. Pillars section — "4 Piliers pour Level Up"
- **Score: 7/10**
- Strengths:
  - Clear grid, hover glow, individual CTAs per pillar, all four routes (`/clubs?category=…`, `/agenda`) exist.
  - Bilingual labels (English headline + French body) actually work for the target demo.
- Issues:
  - **Sport and gym are the same pillar (vitality), but "Glow Up" CTA points to `/clubs?category=sport`** while the data model treats vitality as broader. Pillar→category mapping is hand-coded in the page.
  - "Self-Express" CTA uses `variant="default"` with hard-coded orange overrides (`bg-orange-600 hover:bg-orange-500 …`) — every other pillar uses a design-system `NeonButton` variant. This one breaks the system.
  - No badge/icon for "you'll earn N XP per activity" — the section *promises* gamification but shows zero numbers.
- File: `app/page.tsx:209–278`

### 5. Events section — "Events à venir"
- **Score: 6/10**
- Strengths:
  - Skeleton loading states (Polish-F), error banner with `role="alert"`, empty state with CTA.
  - Client fetch with cleanup (`active` flag).
- Issues:
  - **Fallback image `/nightclub-confetti-celebration-crowd.jpg` does not exist in `/public`.** Every event without `image_url` will break with Next.js Image's 404 handling.
  - Cards link to `/agenda/${event.id}` — the dynamic route `app/agenda/[id]` exists, OK.
  - "J-{n}" badge is computed client-side every render (not memoised) — fine for 3 cards but smells.
  - No fallback when `event.title` is missing.
- File: `app/page.tsx:280–349`

### 6. Final CTA section — "PRÊT À LEVEL UP ?"
- **Score: 7/10**
- Strengths:
  - Strong gradient headline, two CTAs (`/auth/sign-up`, `/a-propos`), both routes exist.
  - Replaced fake counters with honest value props ("13–17 ans · Maroc / Lifestyle complet / XP réel"). Good move.
- Issues:
  - **Two different sign-up funnels on the same page:** hero → `/onboarding`, final CTA → `/auth/sign-up`. Pick one. Mixing them confuses analytics and the user.
  - Decorative `✨` and `🎮` use raw emoji, not Lucide icons — fine, but breaks visual consistency.
- File: `app/page.tsx:351–399`

### 7. Footer (home variant)
- **Score: 6/10**
- Strengths:
  - Has the home-only compact 3-col layout (brand / essentiels / contact) — appropriate scale for a landing page.
  - Locale switcher is rendered, copyright and legal links all exist (`/legal/{cgu, confidentialite, mentions-legales}` directories present).
- Issues:
  - Social URLs hardcoded to `facebook.com/teenspartymorocco`, `twitter.com/teenspartyma`, `instagram.com/teenspartymorocco` — **the brand is now Nivy.** These will dead-end or impersonate.
  - Phone `+212 661 234 567` is the canonical placeholder. Same in WhatsApp and home/non-home variants.
  - `getPublicAppConfig().contactEmail` is the only env-driven value; everything else is hard-coded.
- File: `components/footer.tsx:34–66`, `:111`, `:117`

### 8. Sections that the brief asked for and ARE NOT PRESENT
- **Score: 0/10 (existence check)**
- Missing:
  - **Problem statement / "why Nivy"** — no copy explains the gap Nivy fills.
  - **4 personas (teen / parent / partner / sponsor)** — no persona-cards, no parent reassurance block, no B2B partner pitch, no sponsor angle.
  - **How-it-works / 3-step explainer** — none.
  - **Testimonials / social proof** — none. The fake "10,000 parents" was the only attempt and it's gone in the CTA section but still in the TrustBanner.
  - **Newsletter / lead capture form** — none. (Confirmed: `Grep` for `<form` on home returns nothing.)
  - **FAQ summary** — exists in JSON-LD `application/ld+json` for SEO but never rendered visually.

---

## CTAs audit

| # | Section            | Label                  | href                     | Target exists? | Issue |
|---|--------------------|------------------------|--------------------------|:---:|-------|
| 1 | Hero primary       | "Rejoins le club" (i18n `hero.ctaPrimary`) | `/onboarding`         | ✅ | Onboarding flow exists (`page.tsx`, `interests`, `goals`, `learning-style`, `complete`). |
| 2 | Hero secondary     | "Voir l'agenda" / `nav.agenda` | `/agenda`             | ✅ | OK. |
| 3 | Pillar — Glow Up   | "Explorer Sport"       | `/clubs?category=sport`  | ✅ | Page exists; no verification that `?category=sport` filter is wired. |
| 4 | Pillar — Big Brain | "Explorer Tech"        | `/clubs?category=tech`   | ✅ | Same caveat. |
| 5 | Pillar — Self-Express | "Explorer Arts"     | `/clubs?category=art`    | ✅ | Same caveat. |
| 6 | Pillar — Main Char | "Voir Soirées"         | `/agenda`                | ✅ | No party-only filter applied; sends user to all events. |
| 7 | Events — header    | "Tout voir"            | `/agenda`                | ✅ | OK. |
| 8 | Events — card      | "Réserver"             | `/agenda/${event.id}`    | ✅ | Dynamic route `app/agenda/[id]` exists. Real reservation flow not validated here. |
| 9 | Final CTA primary  | "CRÉER MON PROFIL"     | `/auth/sign-up`          | ✅ | **Conflicts with hero CTA #1** (`/onboarding`). Two funnels for the same intent. |
| 10| Final CTA secondary| "En savoir plus"       | `/a-propos`              | ✅ | OK. |
| 11| Footer — Agenda    | "Agenda"               | `/agenda`                | ✅ | OK. |
| 12| Footer — Clubs     | "Clubs"                | `/clubs`                 | ✅ | OK. |
| 13| Footer — Sécurité  | "Sécurité"             | `/securite`              | ✅ | OK. |
| 14| Footer — Guide     | "Guide Parents"        | `/guide-parents`         | ✅ | OK. |
| 15| Footer — FAQ       | "FAQ"                  | `/aide/faq`              | ✅ | OK. |
| 16| Footer — Legal × 3 | mentions / privacy / cgu | `/legal/{…}`           | ✅ | All three subdirs present. |
| 17| Footer — Social ×4 | FB/IG/Twitter/WA       | `*.com/teenspartymorocco` etc. | ❌ branding | URLs use the **old** TeensParty brand, not Nivy. Either dead links or impersonation risk. |
| 18| Footer — phone     | `+212 661 234 567`     | tel: link                | ❌ data | Placeholder phone number hard-coded. |

**Forms:** none. No newsletter subscription, no lead-capture, no contact form on the homepage. Nothing to validate or audit at the endpoint level.

---

## Asset audit

| Asset path                                       | Referenced in                | Exists in `/public`? |
|--------------------------------------------------|------------------------------|:--:|
| `/og-image.jpg`                                  | `app/layout.tsx:91, 104`     | ✅ |
| `/teens-party-event.jpg` (preloaded)             | `app/layout.tsx:179`         | ❌ |
| `/nightclub-confetti-celebration-crowd.jpg`      | `app/page.tsx:318`           | ❌ |
| `/icons/panda-favicon.svg` and `/icons/icon-{16,32,152,192,512}.png` | layout metadata | ✅ |
| `/icons/apple-touch-icon.png`                    | layout metadata              | ✅ |
| `/icons/safari-pinned-tab.svg`                   | layout metadata              | ✅ |

**Two missing image references on the homepage path.** The preload directive in `<head>` for `/teens-party-event.jpg` will trigger a 404 on every page load and Chrome will log "preload found but not used" — minor SEO/perf hit. The event-card fallback 404s the moment any event lacks an `image_url`.

No `next/image` `priority` flag is set on any LCP candidate. With the right column hidden on mobile, the LCP element is almost certainly the H1 (text), so this is fine — but worth verifying.

---

## World-class 2026 SaaS landing rubric (binary)

| Criterion                                                  | Pass? |
|-------------------------------------------------------------|:--:|
| Hero communicates the value prop in one sentence            | ❌ (vibes-first, missing the "what") |
| Visible primary CTA above the fold                          | ✅ |
| Visible secondary CTA above the fold                        | ✅ |
| Real social proof (logos, testimonials, numbers, press)     | ❌ (only fake "10,000 parents") |
| Clear how-it-works section                                  | ❌ |
| Personas / segmented CTAs (teen/parent/partner/sponsor)     | ❌ |
| Mobile parity with desktop (no key content hidden)          | ❌ (dashboard preview is desktop-only) |
| LCP image has `priority` or `fetchpriority`                 | n/a (LCP is text)
| Preloaded assets all exist                                  | ❌ |
| Honest, age-correct trust claims                            | ❌ (11–17 vs 13–17, fake counter) |
| Accessibility: skip-links, aria-live, reduced-motion        | ✅ |
| Translatable copy (no hardcoded FR in components)           | ⚠ (page mostly OK; TrustBanner is hardcoded) |
| Consistent brand identity                                   | ❌ (Nivy / TeensParty mixed) |
| One sign-up funnel, not two                                 | ❌ |
| Real metadata + JSON-LD                                     | ✅ |

**Pass rate: 5/15.**

---

## Top 5 must-fix

1. **Replace or delete the "+10,000 Parents Nous font confiance" claim** in `TrustBanner` (`components/trust-banner.tsx:43`). Pre-launch product cannot afford a fabricated social-proof claim — CNDP, parent forums and any savvy journalist will call this out.
2. **Fix the broken asset references.** Either ship `/teens-party-event.jpg` and `/nightclub-confetti-celebration-crowd.jpg`, or remove the preload (`app/layout.tsx:179`) and replace the fallback (`app/page.tsx:318`) with an existing asset. Today both 404.
3. **Reconcile the pillar taxonomy.** The hero subtitle, pillars section, and the AvatarDashboard preview ship three subtly different vocabularies (Soirées/Sport/Études/Créativité vs Glow Up/Big Brain/Self-Express/Main Character vs party/vitality/intellect/**prestige**). Pick one set of 4 pillar IDs end-to-end (e.g. `party / vitality / intellect / creativity`) and map every label and route through it.
4. **Pick one sign-up funnel.** Hero CTA points to `/onboarding`, final CTA points to `/auth/sign-up`. Funnel one is a multi-step interests/goals flow, funnel two is the auth screen. Decide which is the canonical entry point for an anonymous home visitor and route both CTAs to the same root.
5. **Fix the 11–17 vs 13–17 age inconsistency** (TrustBanner says 11, every other surface says 13) and rebrand the footer social URLs from `teenspartymorocco` to the Nivy handles before the home page is shared anywhere public.

## Top 5 nice-to-have

1. **Add a problem-statement / how-it-works section** between the hero and the pillars (3 steps: "Crée ton profil → Choisis tes piliers → Gagne des récompenses"). Closes the "what does this app actually do?" gap the hero leaves open.
2. **Render a Parents reassurance block on the homepage** (currently the parents page is one click away; high-intent parents bounce). Small card: "Contrôle parental natif · Geo-fencing · Validation des sorties" with a CTA to `/guide-parents`.
3. **Make the AvatarDashboard preview visible on mobile** — even at reduced size. It's the strongest demo asset on the page and `lg:block` hides it from the majority of visitors.
4. **Move the JSON-LD FAQ content into a visible FAQ accordion** at the bottom of the home page. The questions are excellent (age, security, alcohol, reservation) and currently only Google sees them.
5. **Real-event-led hero** — when `upcomingEvents[0]` resolves, surface its title, city and J-N inside the live-badge instead of just the countdown. Today the badge says "Prochaine soirée dans 3j 4h" with no name; teens will trust a named event more than a generic countdown.

---

## Files referenced (absolute paths)

- `C:\Users\Shadow\Desktop\NIVY\app\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\layout.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\trust-banner.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\footer.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\navbar.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\gamification\avatar-dashboard.tsx`
- `C:\Users\Shadow\Desktop\NIVY\messages\fr.json` (i18n bundle, hero.* keys exist)
- `C:\Users\Shadow\Desktop\NIVY\public\` (root — assets `teens-party-event.jpg` and `nightclub-confetti-celebration-crowd.jpg` missing)
