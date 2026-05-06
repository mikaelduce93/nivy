# Homepage / Teen dashboard audit — 2026-05

**Baseline:** SHA `6e3e7f2`
**Mode:** Read-only

## Score pro: 3 / 5

## Résumé

Le hub teen (`app/teen/page.tsx`) est wired correctement mais **6 pages secondaires** restent des coquilles statiques avec arrays `const SUBJECTS = […]`, `const CONVERSATIONS = […]`, `const STREAK_MILESTONES = […]`, etc.

## Pages mocks confirmées (Read direct)

| Page | Mocks détectés | Marqueur TODO |
|---|---|---|
| `app/teen/aide-scolaire/page.tsx` | `SUBJECTS` (7 entrées), `RECENT_ACTIVITIES`, `RECOMMENDATIONS` | `TODO(data): /api/teen/education/grades exists but…` |
| `app/teen/academic/page.tsx` | **Duplique aide-scolaire à 95 %** — mêmes `SUBJECTS` ligne pour ligne | `TODO(data): backend exists for grades…` |
| `app/teen/messages/page.tsx` | `CONVERSATIONS` (5 entrées), `MESSAGES` | `TODO(data): /api/teen/messages?conversationId=… returns messages but there's no list-conversations endpoint yet` |
| `app/teen/calendar/page.tsx` | `EVENTS` (4+ entrées), `MONTHS`, `DAYS` | `TODO(data): events should come from getTeenDashboardData().upcomingEvents` |
| `app/teen/coins/page.tsx` | `TRANSACTIONS` (8), `EARN_METHODS` (5), `totalCoins = 1250` en dur | `TODO(data): /api/teen/wallet returns balance only` |
| `app/teen/streak/page.tsx` | `STREAK_MILESTONES` (6), `STREAK_HISTORY` (10), `DAILY_TASKS` (4), `currentStreak = 7` en dur | `TODO(data): teenDashboard already exposes currentStreak…` |

## Doublon critique
`app/teen/academic/page.tsx` et `app/teen/aide-scolaire/page.tsx` partagent **le même array `SUBJECTS` ligne par ligne** (vérifié sur lignes 12-60 des deux fichiers). Différence: paragraphe TODO dans le commentaire.

## Routes-redirect (succès Wave 1)
Vérifié via Read :
- `app/teen/shop/page.tsx` → `redirect("/teen/wallet?tab=shop")` ✓
- `app/xp-shop/page.tsx` → `redirect("/teen/wallet?tab=shop")` ✓
- `app/gamification/boutique/page.tsx` → `redirect("/teen/wallet?tab=shop")` ✓

## P0
- **H1** — Wire ou supprimer les 6 pages mocks listées. Backend partiellement présent (cf TODO comments).
- **H2** — Fusionner `academic` et `aide-scolaire` en une seule URL canonique.

## P1
- **H3** — Wire `app/teen/coins/page.tsx` au vrai wallet (`getTeenDashboardData()`).
- **H4** — Wire `app/teen/streak/page.tsx` à `currentStreak` exposé par teenDashboard.

## P2
- **H5** — Empty-states pour les 6 pages quand le teen n'a pas encore de données.

## Fichiers cités
- `app/teen/aide-scolaire/page.tsx`
- `app/teen/academic/page.tsx`
- `app/teen/messages/page.tsx`
- `app/teen/calendar/page.tsx`
- `app/teen/coins/page.tsx`
- `app/teen/streak/page.tsx`
- `app/teen/page.tsx`
- `lib/server/teen-dashboard.ts`
- `app/teen/wallet/wallet-hub-client.tsx`
