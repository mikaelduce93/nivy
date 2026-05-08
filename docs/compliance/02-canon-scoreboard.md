# Canon compliance scoreboard

Generated 2026-05-08. Source: 11 domain compliance audits + canon INDEX.

## Aggregate

- **Overall compliance score: 38/100** (priority-weighted average across the 11 domains; weights below)
- **Total findings: 248** (P0=61, P1=107, P2=58, P3=22)
- **Launch verdict: BLOCKED**

Reasoning: 8 of 11 domains carry at least one P0; weighted-priority leaders (auth, economy, parent, partner) all sit at or below 38/100; identity + money clusters both below 35.

## Domain scoreboard (sorted by score asc)

| # | Domain | Score | P0 | P1 | P2 | P3 | Status |
|---|---|---|---|---|---|---|---|
| 03 | Auth + onboarding | 22 | 12 | 8 | 5 | 2 | BLOCKED |
| 09 | Partner ecosystem | 22 | 6 | 7 | 3 | 0 | BLOCKED |
| 12 | Admin + moderation | 22 | 4 | 12 | 1 | 0 | BLOCKED |
| 04 | Economy + payments | 38 | 11 | 8 | 5 | 2 | BLOCKED |
| 06 | Social + feed | 38 | 7 | 7 | 3 | 1 | BLOCKED |
| 07 | Gamification | 38 | 7 | 7 | 3 | 0 | BLOCKED |
| 08 | Parent control | 38 | 5 | 16 | 10 | 0 | BLOCKED |
| 05 | Routing + navigation | 42 | 4 | 13 | 14 | 7 | BLOCKED |
| 10 | Lifestyle | 62 | 2 | 7 | 4 | 4 | BLOCKED |
| 11 | Personalization + AI | 62 | 2 | 6 | 4 | 2 | RISKY |
| 13 | Design system + mobile | 62 | 1 | 11 | 9 | 1 | RISKY |

Notes on counts:
- Domain 05 (routing) declares severities as BLOCKER/HIGH/MEDIUM/LOW; mapped 1:1 to P0/P1/P2/P3.
- Domain 06 (social) declares severities as critical/high/medium/low; mapped 1:1.
- Domain 09 (partner) reports 6 P0 + 7 P1 + 3 P2 in its compliance checklist; 2 PASS rows omitted.
- Domain 13 (design) declares 1 critical + 11 high + 9 medium + 1 low; mapped 1:1.
- Domain 12 (admin) finding `CANON-ADMIN-015` bundles five missing surfaces — counted as one P1.
- Domain 07 (gamification): `CANON-GAME-020` is cross-domain auth leak, not counted in gamification totals.

## Weights (priority order from prompt)

| Rank | Domain | Weight |
|---|---|---|
| 1 | auth-onboarding (03) | 11 |
| 2 | economy-payments (04) | 10 |
| 3 | parent-control (08) | 9 |
| 4 | partner-ecosystem (09) | 8 |
| 5 | social-feed (06) | 7 |
| 6 | gamification (07) | 6 |
| 7 | routing-navigation (05) | 5 |
| 8 | personalization-ai (11) | 4 |
| 9 | lifestyle (10) | 3 |
| 10 | admin-moderation (12) | 2 |
| 11 | design-system-mobile (13) | 1 |

Weighted score: Σ(weight × score) / Σ(weight) = (11·22 + 10·38 + 9·38 + 8·22 + 7·38 + 6·38 + 5·42 + 4·62 + 3·62 + 2·22 + 1·62) / 66 = 2 504 / 66 ≈ **38**.

## Launch status thresholds

- **BLOCKED**: any P0 OR score < 40
- **RISKY**: 40 ≤ score < 60 OR ≥ 5 P1
- **BETA READY**: 60 ≤ score < 80, 0 P0
- **LAUNCH READY**: score ≥ 80, 0 P0, ≤ 2 P1

Applied: 8 BLOCKED, 3 RISKY (lifestyle is BLOCKED on its own P0, despite score 62), 0 BETA READY, 0 LAUNCH READY.

## Cross-cutting cluster scores

Each cluster is the simple mean of its component-domain scores; finding deltas listed.

### Identity cluster — auth + roles + parent invariants — **27/100**
Components: auth-onboarding (22) + admin/roles partials inside admin-moderation (22) + parent-control parent-side identity slice (38). Weighted mean: 27. Drivers: orphan teen profiles (no `auth.users`), partner orphans, missing 4 of 7 role enum values, `is_onboarded` ungated, `auth.users` row creation broken on 3 of 4 surfaces.

### Money cluster — economy + parent topup + partner payouts — **33/100**
Components: economy-payments (38) + parent-control money slice (38) + partner-ecosystem payouts slice (22). Mean: 33. Drivers: top-up form ships forbidden `{packageId, coins, bonus, price}` payload (top-up 100% broken end-to-end), 6 missing canonical RPCs (`refund_teen_coins`, `revoke_xp_cashback`, `complete_mentor_session`, `pay_featured_creator`, `refund_top_up`, `release_savings_goal`), CMI webhook accepts unsigned payments, no per-month parental cap, no idempotency key.

### Safety cluster — social moderation + parent approvals + AI safety — **46/100**
Components: social-feed (38) + parent-control approvals slice (38) + personalization-ai (62). Mean: 46. Drivers: `user_reports`/`admin_audit_logs` tables missing (every report silently fails), approvals don't cascade to resource RPCs, 4 of 5 approve RPCs missing, full_name PII forwarded into LLM context every chat turn, mentor DM window-gate has zero call-sites.

### Frontend reality cluster — routing + design + design-system — **49/100**
Components: routing-navigation (42) + design-system-mobile (62) + a routing/admin sidebar slice from admin-moderation (22, weighted half). Mean: ~49. Drivers: 4 BLOCKER routing violations, 17 redirect stubs not wired (still rendering content), mobile dock points 6 tabs at non-existent routes, sidebars point at 7 forbidden URLs each, NotificationBell ships 21 raw palette utilities + no aria-label, `select`/`tabs`/`input-otp` violate 44px touch-target lock, `window.alert()` still in feed list.

This is the user's **frontend fouillis** quantified — it is not the worst cluster numerically (money + identity are worse) but it is the most user-visible.

---

End of scoreboard.
