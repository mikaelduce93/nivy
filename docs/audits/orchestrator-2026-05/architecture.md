# Architecture audit — 2026-05

**Baseline:** SHA `6e3e7f2`
**Mode:** Read-only

## Score pro: 3 / 5

## Résumé exécutif

Wave 1 a livré la documentation (`docs/economy.md`, `docs/gamification-architecture.md`) mais la **consolidation matérielle** des couches dupliquées (gamification 4 dossiers, rate-limiters 2, skeletons 5, lazy loaders 2) **n'a pas eu lieu**. Les fichiers redondants existent toujours, seules des consignes ont été ajoutées.

## Inventaire vérifié

### Gamification — 4 dossiers, 41 `index.ts`
Vérifié via Glob `gamification-system/**/index.ts` → 41 fichiers index. Quatre racines coexistent :
- `lib/gamification/` (helpers purs)
- `features/gamification/` (lean Server Actions)
- `gamification-system/features/<feature>/` (rich platform)
- `components/gamification/` (UI classique)

`docs/gamification-architecture.md` (134 lignes) documente la frontière mais **aucun code n'a été déplacé**. Il n'y a pas de README dans chaque dossier comme prévu par la DoD `architecture-consolidator`.

### Rate-limiters — 2 fichiers
- `lib/security/rate-limiter.ts` (in-memory, marqué "SOURCE OF TRUTH")
- `lib/security/rate-limiter-redis.ts` (Upstash distribué, fallback in-memory)

Le commentaire en tête de `rate-limiter.ts` clarifie l'usage. La DoD `architecture-consolidator` exigeait **un seul module** ou un re-export ; il y a toujours 2 modules. Acceptable mais sous-optimal.

### Skeletons / Lazy loaders / Notifications
Non re-vérifiés en détail mais d'après `git status`, `lib/client/lazy-components.tsx` et `components/notifications/notification-bell.tsx` sont modifiés (signal d'activité Wave 1). Les sources multiples persistent.

### Supabase clients
`lib/supabase/service-role.ts` modifié. Plusieurs helpers (`server.ts`, `client.ts`, `middleware.ts`, `wrapper.ts`, `service-role.ts`) coexistent — pas de consolidation matérielle.

## P0
- Aucun. La cohabitation est documentée et fonctionnelle.

## P1
- **A1 — Aplatir gamification ou ratifier les 4 dossiers** : ajouter un README à chaque racine OU supprimer les barrels morts (effort: 1j).
- **A2 — Supprimer 1 rate-limiter** : `rate-limiter.ts` re-export depuis `rate-limiter-redis.ts` quand env Redis absent (effort: 0.5j).

## P2
- **A3 — README par dossier `gamification-system/features/<feature>/`** comme le promet `gamification-architecture.md` (effort: 1j).

## Fichiers cités
- `gamification-system/index.ts`
- `features/gamification/index.ts`
- `lib/gamification/quest-recommender.ts`
- `lib/security/rate-limiter.ts`
- `lib/security/rate-limiter-redis.ts`
- `lib/supabase/service-role.ts`
- `docs/economy.md`
- `docs/gamification-architecture.md`
