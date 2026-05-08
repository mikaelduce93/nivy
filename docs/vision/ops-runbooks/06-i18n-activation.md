# Runbook 06 — i18n activation (AR / Darija / EN)

> **Sub-agent**: Ops-E
> **Status**: V1 ships FR-only. The other three locales (AR / Darija / EN)
> exist as scaffolding so the only work needed to enable them is filling
> JSON files and flipping one env var. **No code refactor required.**
> **Founder reference**: Q2 decision logged in whitepaper `§7 Languages` —
> "fr-FR + ar-MA at launch; darija V2".

---

## 0. TL;DR

1. Hire translators for AR (MSA), Darija, EN.
2. They populate `messages/ar.json`, `messages/darija.json`, `messages/en.json`.
3. Set `NEXT_PUBLIC_I18N_ENABLE_NON_FR=true` in Vercel env.
4. Re-deploy. The locale switcher in navbar/footer unlocks; users can pick.
5. Run the RTL CSS audit (§5) before announcing AR to users.

Nothing else changes. No new dependencies, no migrations, no route changes.

---

## 1. What's already wired

| Concern | Where | Status |
|---|---|---|
| Locale list (`fr` / `ar` / `darija` / `en`) | `lib/i18n/types.ts` → `SUPPORTED_LOCALES` | Ready |
| Cookie + localStorage persistence | `lib/i18n/provider.tsx` (`nivy.locale`) | Ready |
| Server-side resolution from cookie | `lib/i18n/server.ts` → `getLocale()` | Ready |
| Empty-string fallback to FR | `lib/i18n/translate.ts` | Ready (V1 fix) |
| `<html lang>` + `<html dir>` | `app/layout.tsx` (auto from `LOCALE_HTML_LANG` + `isRtlLocale`) | Ready |
| Locale switcher (navbar + footer) | `components/locale-switcher.tsx` | Disabled by default |
| Activation flag | `process.env.NEXT_PUBLIC_I18N_ENABLE_NON_FR` | Default: unset/false |
| Message bundles | `messages/{fr,ar,darija,en}.json` | FR canonical; AR empty stub; Darija/EN partial |

The translator never touches `.tsx` files.

---

## 2. Translator brief

### 2.1 Files to fill

```
messages/
├── fr.json       ← canonical source. DO NOT edit (FR is the reference).
├── ar.json       ← empty stub. Fill every value. RTL.
├── darija.json   ← partial. Fill empty strings only. Latin script.
└── en.json       ← partial. Fill empty strings only.
```

**Rule**: every non-FR file must mirror the **exact key tree** of `fr.json`.
A missing or empty key automatically falls back to French at runtime
(see `lib/i18n/translate.ts`), so a half-translated bundle still renders
cleanly — but the user sees mixed languages until you finish.

### 2.2 Key conventions

- Namespaces are `snake_case` or `camelCase` and grouped by surface
  (`nav.*`, `hero.*`, `footer.*`, `teen.dashboard.*`, `parent.dashboard.*`).
- Placeholders use `{name}` syntax (e.g. `"Salut {name} !"`). Keep the
  brace tokens **identical** across locales — code passes the value in.
- Plurals are not yet wired; if you need them, ping the dev (~30 min to
  add an Intl.PluralRules helper to `translate.ts`).
- Emoji and whitespace are part of the value — copy them verbatim.

### 2.3 Tone guidelines per locale

| Locale | Audience | Tone | Script |
|---|---|---|---|
| **fr** | Parents (primary) + teens | Neutral-friendly. "Tu" form for teen surfaces, "vous" for parent dashboard. Mild slang ("vibe", "mouv") is OK on the home/marketing pages but absent from legal/auth flows. | Latin |
| **ar** | Mixed (parents + teens) | Formal MSA (الفصحى). No regional dialects. Use it for the parent dashboard, legal pages, and any text aimed at adults. **Do not** use Egyptian/Levantine colloquialisms. | Arabic (RTL) |
| **darija** | Teens only | Casual urban Casablancais. Latin transliteration in V1 (consistent with current bundle: "Wa, rj3ti!", "9eleb"). Numerals 3/7/9 used phonetically. Avoid French loanwords when a punchy Darija exists. | Latin (urban) |
| **en** | International + bilingual teens | US-leaning, casual but not over-slangy. "Sign up" not "Register", "Log in" not "Login". | Latin |

### 2.4 What NOT to translate

- Brand name **"NIVY"** / **"Nivy"** — always Latin script, never transliterated.
- Pillar names if they're displayed as glyph-style headers (e.g. "TEEN LIFE
  UNLEASHED" on the hero is intentionally English in all locales — it's a
  visual signature). Check with the founder before localising hero
  wordmarks.
- Email/phone/URLs.

---

## 3. Cost estimate

Scope baseline: **~210 keys** in `fr.json` today (will grow as more strings
get codemodded — see §6). Average **~12 words per key** (mix of short
labels like "Agenda" and longer sentences like the FAQ answers).

| Locale | Words ≈ | Pro rate (DH/word) | Total per locale (DH) |
|---|---|---|---|
| AR (MSA) | ~2,500 | 3 – 5 | **7,500 – 12,500** |
| Darija (Latin urban) | ~2,500 | 4 – 6 (rarer skill) | **10,000 – 15,000** |
| EN | ~2,500 | 2 – 4 | **5,000 – 10,000** |
| **Total** | ~7,500 | — | **22,500 – 37,500 DH** |

**Cheaper alternatives** (acceptable for V1, not production-grade):
- DeepL/GPT-4 first pass + native reviewer: divide the cost by ~3.
- Crowd source via Upwork: ~50% of agency rates, longer turnaround, more
  QA risk.

**Re-translation budget**: when the codemod sweep finishes (~700 strings
projected from the audit), recompute. Plan for a **3x multiplier** vs. V1
estimate.

---

## 4. Activation procedure

1. **Pre-flight**:
   - All four files have the same key tree. Run a JSON-key diff
     (any sane LSP can do this; or `jq -r '..|paths|join(".")' messages/fr.json | sort > /tmp/fr.keys` and same for the others).
   - All `ar.json` values are non-empty (or you accept FR fallback).
2. **Vercel env**:
   - Project → Settings → Environment Variables.
   - Add `NEXT_PUBLIC_I18N_ENABLE_NON_FR = true` for **Production** and
     **Preview**. Leave **Development** unset so local dev stays FR-only
     unless you opt in.
3. **Deploy** the next merge to `main` (or trigger a redeploy with no
   code changes — env-var changes don't auto-deploy).
4. **Smoke test**:
   - Visit `/`, open the locale switcher (top-right of navbar). All four
     options should be selectable.
   - Pick AR. Page should:
     - Re-render with AR strings (FR fallback for any empty keys).
     - Set `<html lang="ar" dir="rtl">`.
     - Persist in cookie `nivy.locale=ar` and survive a refresh.
   - Pick Darija → `<html lang="ar-MA" dir="ltr">`.
   - Pick EN → `<html lang="en" dir="ltr">`.
5. **Run the RTL audit** (§5) **before** publicising AR.

### Rollback

Set `NEXT_PUBLIC_I18N_ENABLE_NON_FR=false` (or delete the var) and
redeploy. The switcher greys out non-FR options. Existing users with
`nivy.locale=ar` cookie will keep seeing AR strings (with FR fallback)
until they re-pick FR — this is intentional so you can hot-fix the
switcher without yanking the rug from translated users.

If you need a hard rollback (force everyone back to FR), bump the cookie
name in `lib/i18n/types.ts` (`LOCALE_COOKIE = 'nivy.locale.v2'`); the
old cookie becomes invisible and everyone defaults to FR on next visit.

---

## 5. RTL CSS audit checklist

Tailwind 4 ships logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`,
`end-`) but the codebase **predates the AR plan** and uses physical
properties (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`,
`text-right`). These break in RTL.

**Required before AR launch**:

- [ ] Install `tailwindcss-rtl` or migrate to logical properties
      project-wide. Tailwind 4 supports both — pick one. Logical-property
      migration is the long-term answer; the plugin is the V1 expedient.
- [ ] Grep for risky utilities and audit each occurrence in user-facing
      surfaces:
      ```
      ml-|mr-|pl-|pr-|left-|right-|text-left|text-right|justify-start|justify-end|float-left|float-right
      ```
      Last grep (2026-05-08) found **~3,000 hits** across `app/` and
      `components/`. Bulk codemod with a script — don't hand-fix.
- [ ] Audit icons that imply direction:
      `ChevronLeft` / `ChevronRight` / `ArrowLeft` / `ArrowRight`. In
      RTL these should flip. Use the `[dir=rtl]:rotate-180` pattern or
      lucide's `<ChevronRight className="rtl:rotate-180" />`.
- [ ] Form fields: `text-left` placeholders look wrong in AR. Use
      `text-start`.
- [ ] Numerals: keep Latin/Western digits (0–9) in AR for prices,
      phones, dates — Eastern Arabic numerals (٠١٢…) confuse younger
      Moroccan teens who learnt with Latin digits at school.
- [ ] Date/number formatting: `date-fns/locale/ar` exists; wire it up in
      any component that does `format(date, 'PPpp')`.
- [ ] Animations / `transform: translateX(...)`: invert the X sign in RTL,
      or use `start`/`end` insets.
- [ ] Hero-section gradients and absolutely-positioned decorations: many
      use `left-*` / `right-*`. Check visually for each marketing page.
- [ ] Charts (`recharts`): X-axis ordering, tooltip placement. AR users
      expect right-to-left chronology in some viz patterns.

**Smoke pages** (visit each in AR after the audit):

1. `/` (home, hero + pillars + events grid)
2. `/teen` (dashboard bento)
3. `/parent` (financial overview, control center)
4. `/agenda` and `/agenda/[id]`
5. `/auth/login` and `/auth/sign-up`
6. `/legal/mentions-legales` (long prose page — best stress test for
   prose typography)

---

## 6. Codemod backlog

V1 sweep (Wave Ops-E) covered ~30 high-impact strings on:

- `app/page.tsx` (home — already used `useT()` from prior wave)
- `components/navbar.tsx` (login/signup/logout buttons + ARIA labels)
- `components/footer.tsx` (tagline, section headers, copyright, legal links)
- `components/locale-switcher.tsx` (its own UI strings)

**Remaining estimate**: ~95% of the UI is still hardcoded French (per
audit). The `messages/fr.json` skeleton has namespaces ready for
`teen.dashboard.*`, `parent.dashboard.*`, etc. — codemod the strings
into these namespaces incrementally.

**Pattern**:

```tsx
// Before
<Button>Connexion</Button>

// After
import { useT } from "@/lib/i18n"
function MyComponent() {
  const t = useT()
  return <Button>{t("nav.login")}</Button>
}
```

For server components: `import { getT } from "@/lib/i18n/server"` and
`const t = await getT()`.

---

## 7. Adding a NEW locale (e.g. Spanish)

1. Add `'es'` to `Locale` union and `SUPPORTED_LOCALES` in
   `lib/i18n/types.ts`.
2. Add label in `LOCALE_LABELS` (`'Español'`) and tag in
   `LOCALE_HTML_LANG` (`'es'`).
3. Create `messages/es.json` mirroring `fr.json` keys (copy the file,
   blank the values).
4. Import + register in `lib/i18n/dictionaries.ts`.
5. Done. Switcher picks it up automatically; RTL audit only needed if
   the locale is RTL (mark it in `RTL_LOCALES`).
