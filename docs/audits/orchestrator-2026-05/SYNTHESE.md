# Synthèse audit Nivy — 2026-05

> Baseline: commit `6e3e7f2` (« [snapshot] team-agents Wave 1: wire core flows and unify economy »).
> Outil de dispatch d'agents (Task) **non disponible** dans cet environnement → cette passe est exécutée
> en mode read-only par l'orchestrateur lui-même. Les phases D (exécution) et E (recette) sont
> documentées comme handoff (cf §7) et `RECETTE.md`.

## 1. Tableau récap

| Zone | Score pro (1-5) | P0 | P1 | P2 | Effort total |
|------|-----------------|----|----|----|--------------|
| Architecture | 3 | 0 | 2 | 1 | 2.5j |
| Homepage / Teen | 3 | 2 | 2 | 1 | 4j |
| Gamification | 4 | 1 | 2 | 1 | 2j |
| Quiz | 4 | 0 | 2 | 1 | 1j |
| Rewards / Wallet | 4 | 0 | 2 | 1 | 1.5j |
| Reservation / Payment | 3 | 1 | 2 | 1 | 3j |
| Onboarding Parent | 3 | 1 | 2 | 1 | 3j |
| Onboarding Partner | 3 | 0 | 2 | 1 | 2j |
| **Total** | **3.4 moy.** | **5** | **16** | **8** | **~19j** |

## 2. Top 10 incohérences inter-zones

1. **academic ≡ aide-scolaire** : `app/teen/academic/page.tsx` et `app/teen/aide-scolaire/page.tsx` partagent le même array `SUBJECTS` ligne pour ligne (vérifié sur lignes 12-60 des 2 fichiers). Le seul delta est le commentaire TODO. Doublon pur.
2. **`coins` page contredit le wallet** : `app/teen/coins/page.tsx` affiche `totalCoins = 1250` en mock alors que `docs/economy.md §2.2` documente `walletData.coins = 0` (table `user_coins` jamais wirée). L'utilisateur voit deux vérités opposées entre `/teen/wallet` et `/teen/coins`.
3. **Hubs gamification ↔ teen toujours dupliqués** : 6 paires non-redirectées (`gamification/{aide-scolaire, defis-physiques, defis, missions, leaderboard, crews}` vs leur miroir `teen/*`). Le `routes-deduplicator` Wave 1 n'a réglé que `shop` → `wallet?tab=shop`.
4. **6 pages teen restent statiques** malgré la DoD du `teen-mock-killer` : `aide-scolaire`, `academic`, `messages`, `calendar`, `coins`, `streak` (cf homepage.md). Toutes contiennent un commentaire `TODO(data): ...` mais aucune n'a été wirée.
5. **2 rate-limiters coexistent** (`lib/security/rate-limiter.ts` + `lib/security/rate-limiter-redis.ts`) alors que la DoD `architecture-consolidator` exigeait un seul module ou re-export — résolu par documentation seulement.
6. **4 racines gamification** intactes (`lib/gamification/`, `features/gamification/`, `gamification-system/features/*`, `components/gamification/`). 41 `index.ts` recensés. La frontière est documentée (`docs/gamification-architecture.md`) mais aucun fichier n'a été déplacé.
7. **0 test Playwright nouveau** ajouté. Seuls les 8 specs préexistants (`tests/e2e/auth.spec.ts`, `home.spec.ts`, `redirects.spec.ts`, `smoke-zones.spec.ts`, `theme-matrix.spec.ts`, `performance.spec.ts`, `tests/visual/critical-pages.spec.ts`, `tests/a11y/critical-pages.spec.ts`) — totalisant 28 occurrences `test(/test.describe`. Aucune couverture quiz, shop, checkout, parent, partner ajoutée.
8. **E-signature parent : status sans create** — `app/api/parent/e-signature/status/route.ts` existe (GET) mais le POST pour insérer un row dans `e_signatures` n'est pas confirmé. `components/parent/e-signature-client.tsx` (untracked) doit avoir une cible serveur — risque flow cassé en prod.
9. **`xp_shop_items` legacy non-droppée** : zéro caller selon `docs/economy.md §5` mais reste en DB (deferred volontairement, conforme à la garde-fou « no DB migration »).
10. **`children` vs `parent_teen_relationships`** : `app/autorisations/page.tsx` lit toujours la table `children` ; le reste du parent dashboard utilise `parent_teen_relationships`. Risque incohérence si les deux schémas divergent.

## 3. Top 10 actions P0 / P1 (ranked impact / effort)

1. **C1 — Wire les 6 pages teen mocks** (`teen-mock-killer` Wave 2, scope reset) — impact UI: massif. Effort: 2j. Pages: aide-scolaire/academic (fusionner avant), messages, calendar, coins, streak.
2. **C2 — Fusionner `app/teen/academic` → `app/teen/aide-scolaire`** (redirect ou suppression). Effort: 0.25j.
3. **C3 — Réconcilier `app/teen/coins/page.tsx` avec wallet réel** OU la marquer roadmap V2 (banner "bientôt"). Effort: 0.25j.
4. **C4 — Compléter POST e-signature parent** (créer `app/api/parent/e-signature/create/route.ts` + connecter `components/parent/e-signature-client.tsx`). Effort: 0.5j.
5. **C5 — Ajouter 5 specs Playwright critiques** (quiz, shop, checkout, parent-onboarding, partner-onboarding). Effort: 1.5j.
6. **C6 — Redirect 6 paires gamification ↔ teen** restantes (canonical = la version wirée). Effort: 0.5j.
7. **C7 — Aplatir rate-limiters** : `rate-limiter.ts` re-export depuis `rate-limiter-redis.ts`. Effort: 0.5j.
8. **C8 — Ajouter README à chaque dossier gamification** comme promis. Effort: 0.5j.
9. **C9 — Tests parent top-up** (`tests/e2e/parent-topup.spec.ts`) — modifié Wave 1 sans test. Effort: 0.5j.
10. **C10 — Audit cohérence `children` vs `parent_teen_relationships`** (read-only, ticket DB). Effort: 0.5j.

## 4. Chemin critique vers "pro-quality"

**Phase 2A — Prod hygiene** (jours 1-3) :
- C2 (fusion academic/aide-scolaire) → C1 (wire mocks) → C3 (coins reconciliation) → C6 (redirects gamification).

**Phase 2B — Wallet & paiements solides** (jours 4-5) :
- C4 (e-signature POST) → C9 (tests top-up).

**Phase 2C — Couverture E2E** (jours 6-7) :
- C5 (5 specs critiques).

**Phase 2D — Dette technique** (jours 8-9) :
- C7 (rate-limiters) → C8 (READMEs gamification) → C10 (audit DB).

## 5. Index des rapports détaillés

- [architecture](./architecture.md)
- [homepage](./homepage.md)
- [gamification](./gamification.md)
- [quiz](./quiz.md)
- [rewards](./rewards.md)
- [reservation](./reservation.md)
- [onboarding-parent](./onboarding-parent.md)
- [onboarding-partner](./onboarding-partner.md)

## 6. Fichiers cités (sample, ≥15 chemins vérifiés)

1. `app/teen/aide-scolaire/page.tsx`
2. `app/teen/academic/page.tsx`
3. `app/teen/messages/page.tsx`
4. `app/teen/calendar/page.tsx`
5. `app/teen/coins/page.tsx`
6. `app/teen/streak/page.tsx`
7. `app/teen/quiz/page.tsx`
8. `app/teen/quiz/quiz-hub-client.tsx`
9. `app/teen/quiz/[id]/page.tsx`
10. `app/teen/shop/page.tsx`
11. `app/xp-shop/page.tsx`
12. `app/gamification/boutique/page.tsx`
13. `app/teen/wallet/wallet-hub-client.tsx`
14. `app/teen/shop/checkout/page.tsx`
15. `app/api/payments/hybrid/route.ts`
16. `app/api/parent/e-signature/status/route.ts`
17. `app/api/parent/topup/route.ts`
18. `app/parent/e-signature/page.tsx`
19. `app/parent/teens/add/page.tsx`
20. `app/devenir-partenaire/inscription/page.tsx`
21. `app/partner/page.tsx`
22. `lib/security/rate-limiter.ts`
23. `lib/security/rate-limiter-redis.ts`
24. `lib/payments/xp-converter.ts`
25. `lib/quiz/server.ts`
26. `lib/server/teen-dashboard.ts`
27. `docs/economy.md`
28. `docs/gamification-architecture.md`
29. `gamification-system/index.ts`
30. `features/gamification/index.ts`
31. `components/rewards/unified-rewards-display.tsx`
32. `components/dashboard/partner/awaiting-approval.tsx`
33. `tests/e2e/smoke-zones.spec.ts`
34. `tests/e2e/auth.spec.ts`

## 7. Phase D / E — handoff (env. sans Task tool)

L'orchestrateur ne peut pas dispatcher de sub-agents (pas de Task tool exposé dans cet environnement).
Les 8 spécifications d'agents auditeurs sous `.claude/agents/*-auditor.md` sont prêtes à être
invoquées par un orchestrateur extérieur ou par Claude Code en mode interactif.

Les agents d'exécution Phase C (cf `.claude/agents/team/`) sont rafraîchis par cette passe :
voir le diff de `team/teen-mock-killer.md` (refocus 6 pages restantes) et 2 nouveaux agents
créés pour les gaps non couverts (`duplicate-page-merger`, `e2e-test-author`). `RECETTE.md`
documente l'état d'attestation et les gaps non résolus.
