# Audit — Architecture

## Routes inspectées

- `app/layout.tsx`, `app/template.tsx`, `app/providers.tsx`
- `app/admin/layout.tsx`, `app/ambassador/layout.tsx`, `app/mentor/layout.tsx`, `app/parent/layout.tsx`, `app/partner/layout.tsx`, `app/teen/layout.tsx`
- `app/driver/{dashboard,rides,earnings,onboarding}/page.tsx` (no `app/driver/layout.tsx`)
- `proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`, still exported as `proxy`)
- `next.config.mjs`, `tsconfig.json`
- `lib/supabase/{client,server,middleware,service-role,wrapper}.ts`
- `lib/security/{csrf,rate-limiter,rate-limiter-redis,api-middleware,admin-check,fetch-with-csrf}.ts`
- `features/index.ts`, `features/gamification/{index,actions,schema}.ts`
- `gamification-system/index.ts` + `gamification-system/{features,components,database,api}/`
- `lib/gamification/{anti-abuse,quest-recommender}.ts`, `components/gamification/*`
- `app/api/**` (35 top-level domains, 296 `route.ts` files)
- `types/{supabase.ts,globals.d.ts,modules.d.ts}`
- `docs/canon/routing.locked.md`, `docs/gamification-architecture.md`, `docs/ARCHITECTURE.md`

## État actuel (résumé 5 lignes)

L'app n'a **pas** de route group `(dashboard)` (n'existe pas sur disque — c'est une invention du prompt d'audit, alignée sur un `docs/ARCHITECTURE.md` obsolète décrivant une structure scaffold jamais construite). Le vrai pattern est 6 layouts top-level par rôle (`admin/parent/teen/partner/ambassador/mentor`), tous cohérents (`getUserRole()` + `redirect`), plus `driver/` qui n'a **aucun layout** et duplique le guard par page (rattrapé côté edge par `proxy.ts`). `proxy.ts` applique CSP/nonce, rate-limit distribué, CSRF double-submit et le gate rôle/onboarding de façon uniforme sur `/admin`, `/parent`, `/teen`, `/ambassador`, `/partner`, `/mentor`, `/driver`. Le doublon `features/gamification/` (lean) vs `gamification-system/` (rich) vs `lib/gamification/` vs `components/gamification/` est réel, documenté (`docs/gamification-architecture.md`), et **toujours non consolidé** depuis l'audit de mai — mais les deux domaines ont bien des appelants actifs distincts, ce n'est pas du code mort. Le vrai P0 nouveau (non documenté dans les audits précédents) est l'absence totale de typage `Database` sur les 4 clients Supabase malgré un fichier `types/supabase.ts` de 12 742 lignes généré et quasi jamais importé — ce qui explique structurellement pourquoi les dizaines de drifts de colonnes (`profiles.pseudo`, `user_profiles`, etc.) documentés dans l'audit du 2026-06-03 n'ont jamais été détectés à la compilation.

## Niveau "pro" (1-5) avec justification

**3/5.**

Points forts : gate d'auth homogène par layout de rôle, CSP+nonce+CSRF+rate-limit appliqués en un seul point d'entrée (`proxy.ts`), `tsconfig.json` en `strict: true` avec `ignoreBuildErrors: false`, système de skeletons/lazy-loaders hiérarchisé et documenté (`docs/design/SKELETON_SYSTEM.md`, commentaires de canonicalisation explicites dans `lib/client/lazy-components.tsx`), redirects legacy proprement centralisés dans `next.config.mjs`.

Points faibles : le typage Supabase n'est branché nulle part (4 clients, 0 generic `<Database>`), ce qui rend `strict: true` largement cosmétique dès qu'une requête touche la DB (213 fichiers avec `any`/`as any`). Deux systèmes de toast concurrents dont un totalement mort côté rendu (`components/ui/toaster.tsx` jamais monté) cassent un flux paiement réel. La dette gamification (4 racines) reste identique à l'audit de mai — documentée mais jamais matérialisée. La documentation d'architecture generaliste (`docs/ARCHITECTURE.md`) décrit une structure qui n'a jamais existé et induit en erreur quiconque l'utilise comme référence (dont, ironiquement, le prompt de cet audit).

## Données : statique/mocké vs API réelle

Non applicable au sens strict (audit architecture, pas feature). Constats config-as-code notables :
- `next.config.mjs` centralise ~20 redirects legacy en dur (bon réflexe, évite la dérive dans le code des pages) mais certains sont `permanent: false` avec commentaire `// Temporary` datant d'avant V2 (`/dashboard → /espace`, `/mes-reservations → /teen`) — dette de redirection jamais finalisée.
- `docs/canon/routing.locked.md` fait foi comme source de vérité du routing et est globalement respecté (ex: `/partner/dashboard` redirige bien vers `/partner` comme prescrit), mais au moins une recommandation actée (renommer `/teen/leaderboard` → `/teen/leaderboard/creators`) n'a jamais été exécutée.
- `middleware.ts`/`proxy.ts` encode en dur la table `ONBOARDING_TARGETS` et `roleRouteMap` — config-as-code correcte mais dupliquée conceptuellement avec les redirects `next.config.mjs` (deux endroits différents décident où renvoyer un utilisateur mal routé).

## Cohérence avec le reste de l'app

- Naming FR/EN : cohérent par intention documentée dans `docs/canon/routing.locked.md` — le marketing public (`/anniversaires`, `/clubs`, `/devenir-*`, `/carte-vip`) est en français, l'app interne par rôle (`/teen/*`, `/parent/*`, `/partner/*`) est en anglais/mixte. Aucun document ne formalise explicitement cette règle comme convention (elle se déduit de l'usage), mais l'usage réel y est fidèle à ~95%. Exceptions mineures : `/teen/aide-scolaire` (FR) à côté de `/teen/pathways` (EN) dans le même rôle — acceptable car `aide-scolaire` est un nom de fonctionnalité produit, pas un terme technique.
- API vs frontend : `app/api/` est organisé par acteur (teen: 101 routes, admin: 44, parent: 36) en miroir direct des dossiers `app/teen`, `app/parent`, `app/admin` — cohérent. `app/api/partner/` (16 routes, actions authentifiées du partenaire) coexiste avec `app/api/partners/` (2 routes, inscription publique/wizard) — split fonctionnellement défendable (self-service vs onboarding public) mais non documenté, prête à confusion à l'ajout d'une route.
- Provider tree : un seul `QueryClientProvider` (`app/providers.tsx`), un seul `ThemeProvider`, un seul `GamificationProvider` (monté uniquement dans `app/teen/layout.tsx`, cohérent car gamification = domaine teen uniquement). `AgentFloatingButton` (coach IA legacy, flag `legacy_agent_sheet` off par défaut) est monté dans admin/ambassador/parent/partner mais **pas** teen ni mentor — cohérent pour teen (le coach *Niv* dédié le remplace) mais absence non expliquée pour mentor.

## Gaps bloquants (P0)

- **[CASSÉ]** Deux systèmes de toast actifs, l'un mort côté rendu. `app/layout.tsx:287` ne monte que `<Toaster/>` (sonner, `components/ui/sonner.tsx`). Le second système shadcn (`components/ui/toaster.tsx`, alimenté par `hooks/use-toast.ts`) n'est monté **nulle part** dans l'arbre de rendu. `components/ticket-actions.tsx:24,56,81,86,108` appelle `useToast()` 4 fois sur la page réelle `/reservation/confirmation` (`app/reservation/confirmation/page.tsx`) — ces toasts de confirmation/erreur d'action ticket ne s'affichent jamais à l'utilisateur. Effort: S (mounter `<Toaster/>` shadcn globalement, ou migrer `ticket-actions.tsx` vers `lib/utils/toast.ts`/sonner — la 2e option est cohérente avec le reste du code, 104 call sites sonner vs 6 shadcn).
- **[MANQUANT vs standard pro]** Aucun des 4 clients Supabase ne type la réponse DB. `lib/supabase/server.ts:7` (`createServerClient(url, key, {...})`, pas de generic), `lib/supabase/client.ts:65` (`createSupabaseBrowserClient(url, key, {...})`, idem), `lib/supabase/service-role.ts:27` (`createClient(url, key, {...})`, idem). Le fichier généré `types/supabase.ts` (12 742 lignes) n'est référencé que dans **un commentaire** (`lib/notifications/push.ts:11`) — jamais importé comme `Database` generic. Conséquence directe et vérifiable : les drifts de colonnes documentés dans `docs/audits/audit-2026-06-03/AUDIT-CONNEXION-AMINE.md` (`profiles.pseudo`, `profiles.level`, `user_profiles` fantôme, etc. — 9 fonctions DB + ~15 sites TS) n'ont jamais pu être détectés par `tsc` malgré `strict: true` dans `tsconfig.json:11`, parce que rien ne contraint les noms de colonnes au moment de la compilation. Effort: L (générer les types à jour via `supabase gen types`, les brancher sur les 4 clients, corriger la cascade d'erreurs de compilation qui va nécessairement apparaître — probablement des dizaines de sites).

## Gaps importants (P1)

- **[DETTE/doublon]** 4 racines gamification toujours actives et non consolidées : `lib/gamification/` (2 fichiers), `features/gamification/` (5 fichiers, `features/gamification/index.ts`), `gamification-system/features/*` (19 sous-domaines, `gamification-system/index.ts`), `components/gamification/` (UI classique). Vérifié : `features/gamification` a des appelants réels (`app/api/teen/quests/complete/route.ts`, `app/api/teen/recommendations/route.ts`, `app/daily/page.tsx`, `components/gamification/daily-challenges.tsx`, `components/parent/dashboard/parental-nudge.tsx`), `gamification-system` en a 12 côté `app/`. Le document `docs/gamification-architecture.md` (frontière documentée depuis mai) reste correct mais aucun README par sous-dossier `gamification-system/features/<feature>/` n'a été ajouté comme promis §A3 de l'audit orchestrateur de mai. Effort: M (soit matérialiser la fusion, soit ajouter les READMEs manquants pour clore la dette documentaire au moins).
- **[MANQUANT vs standard pro]** `app/driver/` n'a pas de `layout.tsx` propre — chaque page (`app/driver/dashboard/page.tsx:22-23`, `app/driver/rides/page.tsx:38-39`, `app/driver/earnings/page.tsx:22-23`) répète `getUserRole()` + `redirect("/auth/login")` mais **aucune ne vérifie `userInfo.role !== "driver"`**, contrairement aux 6 autres rôles qui ont ce check explicite dans leur layout. Le garde réel contre l'accès cross-rôle vient uniquement de `proxy.ts:352-367` (`isAccessingWrongDashboard`), ce qui fonctionne en prod mais casse la défense en profondeur : toute page `driver/*` ajoutée sans repasser par ce chemin edge serait accessible à n'importe quel utilisateur authentifié. Effort: S (créer `app/driver/layout.tsx` calqué sur `app/mentor/layout.tsx`).
- **[DETTE]** `docs/ARCHITECTURE.md:22-30` décrit une arborescence `app/(public)/`, `app/dashboard/` qui n'existe pas et n'a jamais existé sous cette forme (confirmé : aucun dossier `(public)` ni `(dashboard)` sur disque). Ce document a servi de point de départ erroné à la présente mission d'audit (le prompt demandait de lire `app/(dashboard)/layout.tsx`, inexistant). Risque räel de mauvais onboarding pour tout futur agent/dev qui s'y fie. Effort: S (réécrire ou supprimer `docs/ARCHITECTURE.md`).
- **[DETTE]** `/teen/leaderboard` (creator monthly stats, `app/teen/leaderboard/page.tsx:1-5`) garde toujours le même nom que `/gamification/leaderboard` (XP global) — collision de nommage déjà actée comme finding non résolu dans `docs/canon/routing.locked.md:397` (« Rename `/teen/leaderboard` → `/teen/leaderboard/creators` »). Toujours pas fait. Effort: S.
- **[DETTE/doublon]** `app/api/partner/` (16 routes, self-service partenaire authentifié) coexiste avec `app/api/partners/` (2 routes, `register` + `wizard/submit`, public onboarding). Distinction fonctionnellement correcte mais 0 commentaire/README ne l'explique — collision de nommage à un caractère près, source d'erreur pour tout nouvel appel API. Effort: S (ajouter un commentaire en tête de chaque dossier, ou renommer `partners` → `partner-onboarding`).

## Polish (P2)

- **[DETTE]** `components/ai/elite-ai-companion.tsx` (« Kai », @deprecated selon mémoire projet) reste physiquement dans le repo ; 0 importeur réel (seules 2 mentions restantes sont des commentaires dans `app/teen/layout.tsx:72-76` et `components/brand/niv.tsx:13`). Code mort, à supprimer plutôt qu'à laisser trainer. Effort: S.
- **[DETTE]** `app/teen/layout.tsx:76` référence `<NivCoachLauncher>` (« arrive en #210 ») mais ce composant n'existe nulle part dans le repo — seul `AvatarCoach` (`components/teen/avatar-coach.tsx`) est monté, et uniquement sur `/teen` (home), pas globalement comme le sont les `AgentFloatingButton` des autres rôles. Le commentaire laisse croire à une fonctionnalité livrée qui ne l'est pas. Effort: S (mettre à jour le commentaire, ou monter réellement un launcher global si voulu produit).
- **[DETTE]** `components/ui/states/skeleton-set.tsx` est marqué `@deprecated #72`, 0 consommateur confirmé — gardé pour historique git seulement, jamais supprimé. Effort: S.
- **[DETTE]** `app/api/lib/responses.ts` est un helper partagé (pas une route) rangé sous `app/api/` au lieu de `lib/` — casse la convention « tout ce qui est sous `app/api/*/` a un `route.ts` ». Effort: S.
- **[DETTE]** `next.config.mjs:137-179` contient plusieurs redirects marqués `permanent: false` avec commentaires « Temporary » / « TODO: créer en Phase 3 » (`/mes-reservations → /teen`, `/mes-clubs → /teen`, `/dashboard → /espace`) — dette de routing jamais soldée malgré plusieurs phases passées. Effort: S–M selon si les pages cibles existent déjà (`/teen/clubs` existe désormais, donc `/mes-clubs` pourrait être corrigé immédiatement).
- **[DETTE]** Docstring de `app/providers.tsx:10-11` référence `lib/queries/query-client.tsx` (`QueryProvider`) comme source de config sous-jacente — ce fichier n'existe pas ; `AppProviders` construit son `QueryClient` inline. Commentaire obsolète, pas un bug fonctionnel. Effort: S.

## Effort estimé (S/M/L par gap)

| Gap | Sévérité | Type | Effort |
|---|---|---|---|
| Toast shadcn mort sur page paiement réelle | P0 | CASSÉ | S |
| Aucun typage `Database` sur les clients Supabase | P0 | MANQUANT | L |
| 4 racines gamification non consolidées | P1 | DETTE/doublon | M |
| `driver/` sans layout, sans check de rôle par page | P1 | MANQUANT | S |
| `docs/ARCHITECTURE.md` obsolète (structure jamais construite) | P1 | DETTE | S |
| Collision naming `/teen/leaderboard` vs `/gamification/leaderboard` | P1 | DETTE | S |
| `api/partner` vs `api/partners` non documenté | P1 | DETTE/doublon | S |
| `elite-ai-companion.tsx` mort | P2 | DETTE | S |
| `NivCoachLauncher` référencé mais jamais implémenté | P2 | DETTE | S |
| `skeleton-set.tsx` déprécié jamais supprimé | P2 | DETTE | S |
| `api/lib/responses.ts` mal rangé | P2 | DETTE | S |
| Redirects `permanent:false` jamais finalisés | P2 | DETTE | S–M |
| Docstring `providers.tsx` obsolète | P2 | DETTE | S |

**Total estimé : ~1 jour P0 pur consolidation toast + 3-5 jours pour le typage Supabase (selon volume d'erreurs tsc en cascade) + ~2-3 jours P1/P2 cumulés.**

## Fichiers critiques à connaître

- `proxy.ts` — point d'entrée unique CSP/CSRF/rate-limit/gate rôle+onboarding (remplace `middleware.ts` depuis Next 16).
- `app/{admin,ambassador,mentor,parent,partner,teen}/layout.tsx` — pattern de gate homogène (`getUserRole()` + `redirect`).
- `app/driver/{dashboard,rides,earnings}/page.tsx` — gate dupliqué par page, incomplet (pas de check de rôle).
- `lib/supabase/{client,server,service-role}.ts` — les 3 clients à brancher sur `types/supabase.ts` (P0).
- `types/supabase.ts` — 12 742 lignes générées, quasi orpheline aujourd'hui.
- `app/layout.tsx:287` vs `components/ui/toaster.tsx` / `hooks/use-toast.ts` / `components/ticket-actions.tsx` — chaîne du bug toast mort.
- `docs/gamification-architecture.md`, `features/gamification/index.ts`, `gamification-system/index.ts`, `lib/gamification/*`, `components/gamification/*` — les 4 racines gamification.
- `docs/canon/routing.locked.md` — source de vérité routing (à jour, à consulter avant tout ajout de route).
- `docs/ARCHITECTURE.md` — à ne PAS utiliser comme référence (obsolète).
- `next.config.mjs` — redirects legacy (certains encore temporaires).
