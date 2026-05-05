# Audit E2E - Doublons, hardcodes, scaffolds

Date: 2026-05-06

Scope: fichiers suivis par Git, hors artefacts generes (`node_modules`, `.next`, `coverage`, `test-results`).

Commandes executees:
- `git ls-files`
- clone detection normalisee par hash de contenu
- `npm.cmd run lint`
- `npm.cmd run test:run`
- `npx.cmd tsc --noEmit`

## Resume

- 13 groupes de clones exacts detectes.
- 181 erreurs TypeScript detectees par `tsc --noEmit`.
- `next.config.mjs` ignore les erreurs TypeScript au build (`ignoreBuildErrors: true`).
- `npm run lint` passe mais remonte 1577 warnings.
- `npm run test:run` echoue: aucun fichier de test trouve.
- Des routes de test, demo et preview sont versionnees et routables dans `app/`.
- Plusieurs endpoints `/api/test/*` exposent des diagnostics ou consomment des APIs payantes.

## Doublons exacts

Ces fichiers ont le meme contenu normalise:

| Groupe | Fichiers | Impact |
|---|---|---|
| Route evenement detail | `app/agenda/[id]/page.tsx` = `app/evenements/[id]/page.tsx` | deux routes maintenues pour la meme UI |
| Mock gamification | `app/gamification-demo/mock-data.ts` = `gamification-system/demo/mock-data.ts` | donnees mock dupliquees |
| Candidature influenceur | `app/devenir-influenceur/candidature/page.tsx` = `app/influenceurs/candidature/page.tsx` | route legacy conservee |
| Landing ambassadeur | `app/ambassadeurs/page.tsx` = `app/devenir-ambassadeur/page.tsx` | route legacy conservee |
| Inscription partenaire | `app/devenir-partenaire/inscription/page.tsx` = `app/partenaires/inscription/page.tsx` | route legacy conservee |
| Guide parents | `app/guide-parents/page.tsx` = `app/parents/page.tsx` | route legacy conservee |
| Landing influenceur | `app/devenir-influenceur/page.tsx` = `app/influenceurs/page.tsx` | route legacy conservee |
| Programme ambassadeur | `app/ambassadeurs/programme/page.tsx` = `app/devenir-ambassadeur/programme/page.tsx` | route legacy conservee |
| FAQ | `app/aide/faq/page.tsx` = `app/faq/page.tsx` | route legacy conservee |
| Recompenses VIP | `app/carte-vip/recompenses/page.tsx` = `app/fidelite/recompenses/page.tsx` | route legacy conservee |
| Toast hook | `components/ui/use-toast.ts` = `hooks/use-toast.ts` | imports divergents possibles |
| Candidature ambassadeur | `app/ambassadeurs/candidature/page.tsx` = `app/devenir-ambassadeur/candidature/page.tsx` | route legacy conservee |
| Mobile hook | `components/ui/use-mobile.tsx` = `hooks/use-mobile.ts` | imports divergents possibles |

## Doublons structurels

- Routes legacy encore presentes alors que `next.config.mjs` redirige deja vers les nouvelles routes: `/evenements`, `/auth/signup`, `/ambassadeurs`, `/partenaires`, `/parents`, `/support`, `/faq`, `/dashboard`, `/mes-reservations`, `/mes-clubs`, `/gamification-demo`.
- Notifications: `components/notification-bell.tsx`, `components/notifications/notification-bell.tsx`, `gamification-system/components/notifications/notification-center.tsx` exportent des concepts concurrents.
- Loading/skeletons: `components/ui/skeleton.tsx`, `components/ui/skeleton-variants.tsx`, `components/ui/skeletons/*`, `components/ui/states/skeleton-set.tsx`, `components/ui/effects/elite-skeleton.tsx`.
- Rate limiting: `lib/security/rate-limiter.ts`, `lib/security/rate-limiter-redis.ts`, `lib/utils/rate-limiter.ts`.
- Lazy loading: `lib/client/lazy-components.tsx`, `lib/utils/lazy-components.tsx`, `components/teen/dashboard/lazy-components.tsx`.
- Gamification: domaine reparti entre `features/gamification/*`, `gamification-system/features/*`, `lib/gamification/*`, `components/gamification/*`.
- Supabase: plusieurs couches cohabitent (`lib/supabase/server.ts`, `server-with-timeout.ts`, `wrapper.ts`, `middleware.ts`, `client.ts`) avec des comportements differents.
- Documentation: 110 fichiers sous `docs/`, dont plusieurs audits, roadmaps et TODOs qui se contredisent. Exemple: des docs indiquent `ignoreBuildErrors: false`, mais la config actuelle est `true`.

## Hardcodes critiques

### Secrets, credentials, diagnostics

- `app/test/partner-venue/page.tsx:22-23` et `app/test/partner-venue/auto-login/page.tsx:17-18`: email + mot de passe de test hardcodes (`venue.partner@teenclub.ma`, `Test123!`).
- `app/auth/login/page.tsx:28-61`, `app/auth/login/page.tsx:126`, `app/auth/login/page.tsx:224`: comptes de test et mot de passe universel exposes dans l'UI.
- `app/api/test/check-api-keys/route.ts:9-20`: endpoint public qui confirme la presence des cles AI et retourne un prefixe masque.
- `app/api/test/check-openai-balance/route.ts:9-49`: endpoint public qui teste une cle OpenAI et consomme un appel `gpt-3.5-turbo`.
- `app/api/test/check-partner-venue/route.ts:7`, `app/api/test/check-partner-venue/route.ts:88`: email hardcode et retour de `error.stack`.
- `app/teen/error.tsx:101`: stack d'erreur rendue cote UI.

### URLs et domaines figes

- `app/layout.tsx:42`, `app/layout.tsx:63`, `app/layout.tsx:74`, `app/layout.tsx:122`: domaine canonique hardcode `https://teensparty.ma`.
- `emails/*.tsx` et `lib/emails.ts`: liens `https://teensparty.ma/...` hardcodes dans les emails.
- `gamification-system/features/social-sharing/schema.ts:359`, `schema.ts:435`, `actions.ts:378`: base URL `https://teenspartymorocco.ma`.
- `app/ambassador/marketing/page.tsx:57`, `components/ambassador/share-buttons.tsx:16`: liens `https://teenclub.ma/join`.
- `env.local.example:120`, `app/api/auth/register-teen/route.ts:112`, `app/api/payments/hybrid/route.ts:252`, `lib/payments/cmi.ts:58`: fallback `http://localhost:3000`.
- `identify-missing-scripts.js:5`, `identify-missing-scripts.js:151`, `app/admin/scripts-sql/page.tsx:87`: projet Supabase hardcode.
- `app/aide/page.tsx:159`, `app/guide-parents/page.tsx:173`, `app/parents/page.tsx:173`: numeros WhatsApp hardcodes.

### Donnees mock / placeholders en production

- `components/ai/widgets/FriendMap.tsx:17`: Mapbox static URL avec `access_token=mock`.
- `gamification-system/features/pillars/actions.ts:335`: `https://placeholder.com/media`.
- `components/agenda/events-client.tsx:442`, `components/agenda/events-client.tsx:546`, `components/events-carousel.tsx:78`, `components/optimized-image.tsx:38`: fallback `/placeholder.svg`.
- `app/page.tsx:18-24`: `mockUser` et `mockStats` injectes dans la home.
- `app/parent/grades/page.tsx:105-167`: notes mockees jusqu'a creation de table.
- `app/api/teen/leaderboard/route.ts:40`, `app/api/teen/friends/route.ts:42`, `lib/analytics/scorecard.ts:48`, `app/api/admin/scorecard/route.ts:13`, `app/api/admin/scorecard/route.ts:58`: fallback mock explicite.

### Identifiants aleatoires faibles

- `app/api/bookings/create/route.ts:108`: reference booking via `Date.now()` + `Math.random()`.
- `app/api/parent/teens/create/route.ts:137`: code linking via `Math.random()`.
- `app/api/teen/subscription/handlers.ts:146`: approval token via `Date.now()` + `Math.random()`.
- `app/partenaires/merci/page.tsx:185`: reference affichage via `Math.random()`.
- `lib/payments/mobile-money.ts:267`, `lib/payments/cmi.ts:212`: references de paiement via `Math.random()`.

## Scaffolds / restes de generation

- Routes de test versionnees: `app/test/*`.
- APIs de test versionnees: `app/api/test/*`.
- Previews versionnees: `app/preview/calendar/page.tsx`, `app/preview/games/page.tsx`.
- Demo gamification versionnee deux fois: `app/gamification-demo/*` et `gamification-system/demo/*`.
- Fichiers `.skip` versionnes: `app/admin/clubs/[id]/modifier/page.tsx.skip`, `app/api/webhooks/stripe/route.ts.skip`.
- TODOs bloquants dans le code:
  - `app/api/health/route.ts:20`: DB marquee `ok` sans verification reelle.
  - `app/api/payments/process/route.ts:46`: gateway paiement non integre.
  - `app/api/payments/process/route.ts:81`: email confirmation non envoye.
  - `app/api/auth/register-teen/route.ts:193`: email non implemente.
  - `app/api/auth/register-teen/route.ts:228`: SMS non implemente.
  - `app/parent/live/page.tsx:160`: consentement photo force a `true`.
  - `app/parent/live/page.tsx:196`: photos evenement non chargees.
  - `components/features/home/newsletter-form.tsx:17`: inscription newsletter non implemente.
  - `components/ui/states/page-error.tsx:44`: Sentry non branche pour ce composant.
  - `gamification-system/database/migrations/022_pillars_system.sql:995`: unlock achievement TODO.
- Documentation de backlog encore active: `docs/todos/*`, `docs/ROADMAP_PRINCIPALE.md`, `docs/guides/GUIDE_UTILISATION_ROADMAP.md`.

## Garde-fous qualite

- `next.config.mjs:11`: `ignoreBuildErrors: true`. C'est incoherent avec un depot `strict: true`.
- `npx.cmd tsc --noEmit`: 181 erreurs TypeScript.
- `npm.cmd run lint`: 1577 warnings, 0 erreur. Les warnings couvrent surtout unused imports, hooks dependencies, a11y labels et console.
- `npm.cmd run test:run`: aucun fichier de test trouve, malgre les scripts `test`, `test:e2e` et une documentation de tests.
- `tsconfig.json:10`: `skipLibCheck: true`.
- `middleware.ts:139-142`: si Supabase n'est pas configure, l'authentification est desactivee et la requete continue.

## Priorites recommandees

1. Supprimer ou proteger toutes les routes `app/test`, `app/api/test`, `app/preview`, `app/gamification-demo` avant production.
2. Remplacer les routes legacy clonees par `redirect`, `notFound`, ou imports re-exportes explicites, puis supprimer les doublons.
3. Enlever les credentials de test hardcodes de l'UI et des pages auto-login.
4. Centraliser `APP_URL`, domaines email, support email, telephones, URLs de partage et project IDs Supabase dans une config.
5. Remplacer `Math.random()` par des IDs/tokens generes avec `crypto.randomUUID()` ou `crypto.getRandomValues`.
6. Retirer `ignoreBuildErrors`, corriger les 181 erreurs TypeScript, puis activer le build comme gate.
7. Ajouter un minimum de tests reels ou supprimer les scripts/docs qui annoncent une couverture inexistante.
8. Choisir une seule architecture pour notification, skeletons, rate limiting, lazy loading et gamification.
