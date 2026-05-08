# Nivy — UX/UI 2026 execution plan (50-agent dispatch)

> Reference: `MASTER_UX_AUDIT.md` (audit findings) + `TICKETS.md` (50 tickets). This plan sequences the 50 tickets into 4 waves with parallel agent dispatch. Calendar: 6–8 days end-to-end. Total agent capacity: 50 specialists across 4 waves (some agents recur).

---

## Wave structure

```
Wave 1 (foundations) ──► Wave 2 (parallel apply) ──► Wave 3 (per-route polish) ──► Wave 4 (validators)
   ~10 agents · D1-D2     ~20 agents · D3-D5         ~15 agents · D5-D7           ~5 agents · D7-D8
```

---

## Wave 1 — Foundations (D1–D2, ~10 agents)

**Goal**: build/upgrade the primitives every other wave depends on. Nothing ships to user-facing surfaces yet.

| Agent | Profile | Tickets | Files in scope |
|-------|---------|---------|----------------|
| W1-A1 | design-system architect | TICKET-001 | `eslint.config.*`, repo-wide allowlist baseline |
| W1-A2 | design-system architect | TICKET-003, TICKET-007 | `components/ui/headings.tsx`, `components/ui/status-badge.tsx` |
| W1-A3 | form architect | TICKET-004 | `components/ui/field.tsx`, `components/ui/input.tsx` |
| W1-A4 | design-system architect | TICKET-005 | `components/ui/skeletons/atoms.tsx` + presets refactor |
| W1-A5 | motion architect | TICKET-023, TICKET-027 | `components/ui/motion.tsx`, `lib/motion/easing.ts` |
| W1-A6 | motion designer | TICKET-013 | `components/ui/tabs-animated.tsx` |
| W1-A7 | design-system architect | TICKET-046, TICKET-028 | `components/ui/responsive-modal.tsx`, `components/ui/dialog.tsx` mobile path |
| W1-A8 | mobile UX engineer | TICKET-040 | `lib/hooks/use-keyboard-aware.ts` |
| W1-A9 | a11y specialist | TICKET-047, TICKET-049 | `components/ui/dialog.tsx`, every role `layout.tsx` |
| W1-A10 | perf engineer | TICKET-008 | 6 `<img>` → `next/image` migrations |

**Success criteria — Wave 1 gate (D2 EOD)**
- New primitives shipped to `components/ui/*` with stories/docstrings.
- Codemod from `framer-motion`'s `motion.*` → `Motion.*` runs clean across ~100 files.
- ESLint baseline established; CI green.
- Skip-links rendered in every role layout (verified by visual smoke test).

**Cannot proceed to Wave 2 until**: TICKET-001, TICKET-004, TICKET-005, TICKET-023, TICKET-046 are merged.

---

## Wave 2 — Parallel apply (D3–D5, ~20 agents)

**Goal**: propagate the foundations into every surface. This is the bulk of the work and the most parallelisable.

| Agent | Profile | Tickets | Surface area |
|-------|---------|---------|--------------|
| W2-A1 | design-system migrator | TICKET-002 (food + rides) | `app/teen/food/**`, `app/teen/rides/**`, `app/teen/food/order/[id]/page.tsx` |
| W2-A2 | design-system migrator | TICKET-002 (mentors + pathways + internships) | `app/teen/mentors/**`, `app/teen/pathways/**`, `app/teen/internships/**` |
| W2-A3 | design-system migrator | TICKET-002 (admin Wave-3) | `app/admin/drivers/**`, `app/admin/mentors/**`, `app/admin/internships/**` |
| W2-A4 | design-system migrator | TICKET-002 (partner restaurant + feed/messages) | `app/partner/restaurant/**`, `app/teen/feed/**`, `app/teen/messages/**` |
| W2-A5 | design-system migrator | TICKET-006 (teen empties) | ~30 teen surfaces with inline empty states |
| W2-A6 | design-system migrator | TICKET-006 (parent + partner + admin empties) | ~50 surfaces |
| W2-A7 | design-system migrator | TICKET-009 | top 5 magic-px offenders |
| W2-A8 | design-system migrator | TICKET-010 | top 4 inline-style offenders |
| W2-A9 | perf engineer + motion | TICKET-029 (teen routes) | ~50 new `loading.tsx` under `app/teen/**` |
| W2-A10 | perf engineer + motion | TICKET-029 (parent + partner + admin) | ~140 new `loading.tsx` |
| W2-A11 | motion designer | TICKET-025 | adopt `MorphingSkeleton` in every `loading.tsx` |
| W2-A12 | form architect | TICKET-042 (parent forms) | chore-form, allowance-form, mentor-session-form |
| W2-A13 | form architect | TICKET-042 (teen + partner forms) | savings, ride-request, food-checkout, partner-offer |
| W2-A14 | form architect | TICKET-043 | scroll-to-error infrastructure |
| W2-A15 | mobile UX engineer | TICKET-037 (teen lists) | quests, feed, mentors, food, friends, leaderboard, messages |
| W2-A16 | mobile UX engineer | TICKET-038, TICKET-039 | notifications swipe, friend-req swipe, feed long-press |
| W2-A17 | perf engineer | TICKET-031 (likes + follows + chore + savings) | optimistic mutations for top 4 |
| W2-A18 | perf engineer | TICKET-031 (cart + mentor + food + friend-req) | optimistic mutations for next 4 |
| W2-A19 | motion architect | TICKET-024 | View Transitions API pilot — 5 morphs |
| W2-A20 | mobile UX engineer | TICKET-041 | safe-area lint + fixes |

**Success criteria — Wave 2 gate (D5 EOD)**
- 0 raw `(cyan|emerald|sky|rose|amber|fuchsia)-(\d+)` in `app/teen/**`, `app/parent/**`, `app/admin/**`, `app/partner/**`.
- 100 % `loading.tsx` coverage; every loading state uses `MorphingSkeleton`.
- 8 mutations are optimistic; rollback path tested.
- 10 list surfaces have `PullToRefresh`; 3 have swipe; 3 have long-press.
- All forms have inline validation, focus-first, scroll-to-error, success animation.
- 5 routes morph cross-page via View Transitions API.

---

## Wave 3 — Per-route polish (D5–D7, ~15 agents)

**Goal**: hand-tuned polish on the surfaces that *are* the product (the top 20 worst-offenders from the audit table become at-spec; the top 10 strongest get +5 on every dimension).

| Agent | Profile | Tickets / surface |
|-------|---------|-------------------|
| W3-A1 | motion designer | TICKET-014 — switch/checkbox/radio polish |
| W3-A2 | motion designer | TICKET-015 — notification bell shake |
| W3-A3 | motion designer | TICKET-016, TICKET-017 — button juice default + card hover |
| W3-A4 | motion designer | TICKET-018 — focus glow surface-aware |
| W3-A5 | motion designer | TICKET-019 — mobile dock micro-polish |
| W3-A6 | motion designer | TICKET-020 — submit success animation across forms |
| W3-A7 | motion designer | TICKET-021 — toast stack motion |
| W3-A8 | motion designer | TICKET-022, TICKET-030 — confetti propagation + Celebrate refactor |
| W3-A9 | motion architect | TICKET-026 — FLIP on lists |
| W3-A10 | perf engineer | TICKET-032, TICKET-033 — bespoke skeletons + LCP audit |
| W3-A11 | perf engineer | TICKET-034, TICKET-035 — lazy-load + Suspense streaming |
| W3-A12 | perf engineer | TICKET-036 — CLS audit |
| W3-A13 | design-system architect | TICKET-011, TICKET-012 — card variants + color-mix tokens |
| W3-A14 | form architect | TICKET-044, TICKET-045 — autocomplete + CSRF UI |
| W3-A15 | a11y specialist | TICKET-050 — live regions on celebrations |

**Success criteria — Wave 3 gate (D7 EOD)**
- Every "worst-offender" page from the audit's top-20 table now scores ≥ 70.
- Lighthouse on `/teen`, `/parent`, `/partner` dashboards: LCP < 2.0 s on 4G throttled, CLS = 0, INP < 200 ms.
- Reduced-motion OS preference fully honoured: no animation runs.
- Celebration moments (chore approved, savings goal reached, level up, food delivered, mentor confirmed, friend accepted) all fire confetti + sound + ARIA announce.

---

## Wave 4 — Validators (D7–D8, ~5 agents)

**Goal**: prove the bar is cleared. No new code ships without sign-off.

| Agent | Profile | Scope |
|-------|---------|-------|
| W4-A1 | visual regression engineer | Run Playwright + Percy snapshots across the top 60 routes at 4 viewports (375 / 768 / 1280 / 1920). Diff against last green baseline. Block merge on > 0.1 % visual delta unless approved. |
| W4-A2 | perf engineer | Lighthouse CI across the same 60 routes. Gate: LCP ≤ 2.5 s, CLS ≤ 0.05, INP ≤ 200 ms, TBT ≤ 250 ms. PWA score ≥ 90. |
| W4-A3 | a11y specialist | axe-core sweep + manual VoiceOver/TalkBack pass on the 10 highest-traffic flows. Gate: 0 critical, ≤ 5 moderate per route. |
| W4-A4 | mobile QA | Manual gesture/perceived-motion test on 4 viewports + iOS Safari + Chrome Android + reduced-motion mode + landscape. |
| W4-A5 | 2026-API specialist | Confirm View Transitions, container queries, color-mix, popover adoption deliverables shipped (TICKET-024, TICKET-011, TICKET-012, TICKET-048). Bundle audit before/after. |

**Wave 4 gate — launch readiness**
- All Lighthouse, axe, Playwright suites green.
- Reduced-motion regression test green.
- Mobile QA sign-off attached to PR.
- 2026-API report delivered.

---

## Risk register

- **Codemod regression on `motion.*`** — the wrapper changes the import surface for ~100 files. Mitigation: ship behind a `Motion` named alias for one release with both imports allowed; deprecate in V1.5.
- **View Transitions API browser support** — Safari 18+ only. Mitigation: feature-detect; fallback to current `AnimatePresence` morph.
- **`useOptimistic` rollback UX** — if the server rejects, the optimistic state must revert *and* the user must understand. Mitigation: every optimistic mutation gets a paired toast on error with a "Réessayer" action.
- **Skeleton fidelity drift** — bespoke skeletons can desync from real layout. Mitigation: each `<PageSkeleton kind="...">` has a Storybook story rendered side-by-side with the real route screenshot in CI.
- **Wave 2 file-conflict explosion** — 20 agents touching ~250 files in parallel. Mitigation: agents are *route-scoped*; the W1 primitives layer is locked after D2 — no edits in W2.

---

## Dependency graph (critical path)

```
TICKET-001 ──┐
TICKET-005 ──┤
TICKET-023 ──┼──► Wave 2 unblocked
TICKET-046 ──┤
TICKET-004 ──┘

TICKET-029 ──► TICKET-025 ──► TICKET-032
TICKET-007 ──► TICKET-002
TICKET-040 ──► TICKET-042 ──► TICKET-043
TICKET-028 ──► TICKET-046 (merged in W1)
```

Critical path runtime (sequential): 4 days. With dispatch: D8.
