# Systeme d'agents pour finaliser NIVY

Date: 2026-05-06

Source de verite initiale:
- `docs/audits/AUDIT_E2E_DOUBLONS_HARDCODE_SCAFFOLD.md`
- `package.json`
- `next.config.mjs`
- `tsconfig.json`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`

Objectif: organiser le travail jusqu'a une version production-ready, sans que plusieurs agents modifient les memes zones en conflit.

## Modele d'orchestration

Un agent orchestrateur pilote le projet. Il ne code pas les gros lots sauf urgence. Il transforme les audits en tickets atomiques, assigne les roles, donne le contexte minimal a chaque agent, controle les dependances, integre les resultats et decide si un lot est accepte.

Chaque agent specialise recoit:
- une mission claire
- un perimetre de fichiers autorise
- les fichiers a lire avant modification
- les criteres d'acceptation
- les commandes de verification
- les risques a surveiller
- le format de retour attendu

Regles de base:
- un seul agent par write-set
- pas de refactor opportuniste hors mission
- pas de suppression de route sans verifier redirect, SEO, sitemap et liens internes
- pas de credentials de test dans l'UI publique
- aucune PR acceptee si `tsc --noEmit` empire
- chaque suppression doit etre accompagnee d'une preuve d'usage ou d'absence d'usage

## Agent 0 - Orchestrateur

Role: chef d'orchestre technique.

Responsabilites:
- maintenir le plan global et les priorites
- decouper les lots en taches independantes
- assigner un agent avec un contexte court
- verifier que les write-sets ne se chevauchent pas
- relire les changements et demander correction si necessaire
- executer les gates qualite globaux
- produire le rapport de release

Prompt systeme:

```text
Tu es l'Orchestrateur NIVY. Ton but est de finaliser le projet jusqu'a un etat production-ready.

Lis d'abord:
- docs/audits/AUDIT_E2E_DOUBLONS_HARDCODE_SCAFFOLD.md
- package.json
- next.config.mjs
- tsconfig.json

Tu ne dois pas tout coder toi-meme. Tu decoupes le travail en lots independants, tu assignes les agents, tu donnes le contexte necessaire et tu controles les resultats.

Pour chaque lot, fournis:
- objectif
- fichiers a lire
- fichiers modifiables
- fichiers interdits
- criteres d'acceptation
- commandes de verification
- dependances
- risques

Tu dois maintenir un journal:
- decisions prises
- routes supprimees ou conservees
- variables d'environnement ajoutees
- erreurs TypeScript restantes
- tests ajoutes ou manquants

Definition of Done globale:
- aucune route de test/demo/preview exposee en production
- aucun credential de test hardcode dans l'UI ou une API publique
- les doublons exacts critiques sont supprimes ou remplaces par redirects stables
- `npx.cmd tsc --noEmit` passe
- `npm.cmd run lint -- --quiet` passe
- `npm.cmd run test:run` passe avec de vrais tests
- `npm.cmd run build` passe sans `ignoreBuildErrors: true`
```

## Agents specialises

### Agent 1 - Cleanup routes, scaffolds et doublons

Mission: supprimer ou neutraliser les routes legacy, demo, preview, test et fichiers `.skip`.

Fichiers a lire:
- `docs/audits/AUDIT_E2E_DOUBLONS_HARDCODE_SCAFFOLD.md`
- `next.config.mjs`
- `app/sitemap.ts`
- `app/robots.ts`
- `components/navbar.tsx`
- tous les fichiers listes dans les groupes de clones exacts

Write-set principal:
- `app/test/**`
- `app/api/test/**`
- `app/preview/**`
- `app/gamification-demo/**`
- `gamification-system/demo/**`
- routes legacy clonees sous `app/ambassadeurs`, `app/influenceurs`, `app/partenaires`, `app/parents`, `app/faq`, `app/fidelite`, `app/evenements`
- `next.config.mjs`
- docs de migration si necessaire

Taches:
1. Faire l'inventaire des routes legacy encore liees depuis l'UI.
2. Supprimer les clones exacts quand un redirect permanent existe deja.
3. Ajouter ou corriger redirects manquants avant suppression.
4. Supprimer les fichiers `.skip` ou les deplacer dans docs si necessaires comme archive.
5. Sortir les demos de la production route tree.

Criteres d'acceptation:
- plus aucun fichier suivi dans `app/test`, `app/api/test`, `app/preview`, `app/gamification-demo`
- les anciennes URLs publiques redirigent vers les nouvelles URLs
- aucun lien interne ne pointe vers une route supprimee
- sitemap ne publie pas de route supprimee

Verification:
- `git ls-files app/test app/api/test app/preview app/gamification-demo gamification-system/demo`
- `rg -n "/test|/preview|gamification-demo|/evenements|/ambassadeurs|/partenaires|/parents|/faq|/fidelite" app components lib`
- `npm.cmd run lint -- --quiet`

### Agent 2 - Hardcodes, secrets et configuration runtime

Mission: centraliser les URLs, emails, telephones, project IDs, providers et fallbacks.

Fichiers a lire:
- `lib/config/runtime.ts`
- `.env.example`
- `env.template`
- `env.local.example`
- `app/layout.tsx`
- `emails/*`
- `lib/emails.ts`
- `lib/resend.ts`
- `lib/payments/cmi.ts`
- `app/auth/login/page.tsx`

Write-set principal:
- `lib/config/**`
- `.env.example`
- `env.template`
- `env.local.example`
- `app/layout.tsx`
- `emails/**`
- `lib/emails.ts`
- `lib/resend.ts`
- pages/support/legal si elles exposent des contacts

Taches:
1. Creer une config canonique `getPublicAppConfig` et `getServerAppConfig`.
2. Remplacer les domaines hardcodes par `NEXT_PUBLIC_APP_URL`.
3. Remplacer emails et telephones hardcodes par variables documentees.
4. Retirer les comptes test et le mot de passe universel de l'UI publique.
5. Remplacer les IDs Supabase hardcodes dans scripts/pages par config ou documentation.

Criteres d'acceptation:
- aucune occurrence non documentee de `teensparty.ma`, `teenclub.ma`, `teenspartymorocco.ma`, `localhost:3000`
- aucun mot de passe hardcode
- les emails utilisent une source unique
- les templates d'env contiennent les nouvelles variables

Verification:
- `rg -n "Test123|teenclub.ma|teensparty.ma|teenspartymorocco.ma|localhost:3000|jyixeidmuvecienbkkrw" app components lib emails *.js *.mjs env*`
- `npx.cmd tsc --noEmit`

### Agent 3 - TypeScript et build gate

Mission: faire passer TypeScript strict et retirer le bypass build.

Fichiers a lire:
- sortie de `npx.cmd tsc --noEmit --pretty false`
- `tsconfig.json`
- `next.config.mjs`
- `components/ai/*`
- `components/ui/*`
- `lib/hooks/**`
- `lib/queries/**`
- `gamification-system/**`

Write-set principal:
- fichiers qui remontent des erreurs TS
- declarations `.d.ts` si necessaire
- `next.config.mjs`

Taches:
1. Classer les 181 erreurs par famille.
2. Corriger les erreurs API SDK AI, types UI polymorphes, imports manquants, props incoherentes.
3. Ajouter les declarations manquantes uniquement si la lib ne fournit pas de types.
4. Retirer `ignoreBuildErrors: true` quand `tsc` passe.

Criteres d'acceptation:
- `npx.cmd tsc --noEmit` passe
- `next.config.mjs` ne masque plus les erreurs TS
- pas de remplacement massif par `any`

Verification:
- `npx.cmd tsc --noEmit`
- `npm.cmd run lint -- --quiet`
- `npm.cmd run build`

### Agent 4 - Tests et qualite

Mission: installer un socle de tests reel pour eviter le faux positif actuel.

Fichiers a lire:
- `package.json`
- `docs/todos/TODO_TESTS.md`
- `lib/security/rate-limiter.ts`
- `lib/utils/sql.ts`
- `lib/validation/**`
- `features/**/schema.ts`

Write-set principal:
- `tests/**` ou `__tests__/**`
- config Vitest si necessaire
- scripts `package.json` si necessaire

Taches:
1. Creer les premiers tests unitaires pour fonctions pures.
2. Ajouter tests de regression pour `splitSqlStatements`, validation schemas, rate limiter.
3. Ajouter un test qui echoue si routes `/api/test` reapparaissent.
4. Documenter le scope minimum de couverture.

Criteres d'acceptation:
- `npm.cmd run test:run` passe
- au moins un test couvre les zones critique securite/config
- les tests ne dependent pas d'un Supabase reel

Verification:
- `npm.cmd run test:run`
- `npm.cmd run test:coverage`

### Agent 5 - Securite et exposition production

Mission: fermer les endpoints dangereux et les fuites d'information.

Fichiers a lire:
- `middleware.ts`
- `lib/security/**`
- `app/api/admin/**`
- `app/api/cron/**`
- `app/api/test/**` avant suppression par Agent 1
- `app/teen/error.tsx`

Write-set principal:
- `middleware.ts`
- `lib/security/**`
- routes API sensibles
- pages error

Taches:
1. Garantir que les routes admin/cron sont protegees.
2. Enlever les retours `error.stack` cote client/API publique.
3. Verifier que Supabase non configure ne desactive pas silencieusement la protection en production.
4. Remplacer tokens/references faibles par crypto.

Criteres d'acceptation:
- aucun `error.stack` rendu en production
- aucune route sensible sans auth ou secret
- aucun token critique genere par `Math.random`

Verification:
- `rg -n "error\\.stack|Math\\.random\\(|/api/test|check-api-keys|check-openai-balance" app lib components`
- `npm.cmd run lint -- --quiet`

### Agent 6 - Backend, data et features incompletes

Mission: remplacer les TODO bloquants par de vraies implementations ou des erreurs explicites non trompeuses.

Fichiers a lire:
- `app/api/health/route.ts`
- `app/api/payments/process/route.ts`
- `app/api/auth/register-teen/route.ts`
- `app/parent/live/page.tsx`
- `components/features/home/newsletter-form.tsx`
- `lib/payments/**`
- `lib/emails.ts`
- `lib/resend.ts`

Write-set principal:
- routes API concernees
- `lib/payments/**`
- `lib/emails.ts`
- composants clients relies

Taches:
1. Healthcheck DB reel ou statut degrade explicite.
2. Paiement: supprimer route mock ou la brancher au systeme paiement canonique.
3. Email/SMS inscription teen: implementer email Resend et stub SMS explicitement desactive par config.
4. Parent live: remplacer consentement force par donnees profil.
5. Newsletter: brancher ou desactiver proprement.

Criteres d'acceptation:
- plus de TODO bloquant dans les routes critiques
- aucun statut `ok` mensonger
- chaque feature non disponible retourne un message produit clair

Verification:
- `rg -n "TODO|placeholder|Return mock data|mock data" app/api app/parent components/features lib`
- tests API unitaires si possible

### Agent 7 - Architecture frontend et design system

Mission: reduire les systemes concurrents et stabiliser les imports.

Fichiers a lire:
- `components/ui/**`
- `components/notifications/**`
- `components/notification-bell.tsx`
- `hooks/use-toast.ts`
- `components/ui/use-toast.ts`
- `hooks/use-mobile.ts`
- `components/ui/use-mobile.tsx`
- `lib/client/lazy-components.tsx`
- `lib/utils/lazy-components.tsx`

Write-set principal:
- `components/ui/**`
- `components/notifications/**`
- `hooks/**`
- `lib/client/**`
- `lib/utils/lazy-components.tsx`

Taches:
1. Choisir un seul export pour `useToast` et `useMobile`.
2. Choisir un seul systeme notification bell.
3. Choisir une seule couche lazy components.
4. Rationaliser skeletons sans casser les imports existants.

Criteres d'acceptation:
- plus de clones exacts hooks
- imports publics documentes
- pas de regression UI evidente

Verification:
- `rg -n "use-toast|use-mobile|NotificationBell|lazy-components|skeleton-variants|skeletons" app components lib hooks`
- `npm.cmd run lint -- --quiet`

### Agent 8 - Release, CI et documentation

Mission: transformer les gates en CI et aligner la documentation avec l'etat reel.

Fichiers a lire:
- `.github/workflows/**`
- `package.json`
- `docs/**`
- rapport d'audit

Write-set principal:
- `.github/workflows/**`
- `docs/**`
- `package.json` scripts si necessaire

Taches:
1. Verifier que CI lance typecheck, lint quiet, tests et build.
2. Ajouter script `typecheck`.
3. Supprimer ou archiver docs contradictoires.
4. Creer checklist de release.

Criteres d'acceptation:
- un nouveau dev sait quoi lancer
- CI bloque les erreurs TS
- docs ne pretendent plus que des items sont faits alors qu'ils ne le sont pas

Verification:
- `npm.cmd run typecheck`
- `npm.cmd run lint -- --quiet`
- `npm.cmd run test:run`
- `npm.cmd run build`

## Plan global

### Phase 0 - Stabiliser le terrain

Objectif: fermer les risques evidents sans gros refactor.

Lots:
1. Agent 1 supprime/protege test/demo/preview.
2. Agent 2 retire credentials hardcodes.
3. Agent 5 masque stacks et ferme endpoints dangereux.
4. Agent 8 ajoute `typecheck` et CI gate.

Sortie attendue:
- plus de routes de test publiques
- plus de comptes test visibles
- CI commence a signaler la dette reelle

### Phase 1 - Rendre le build fiable

Objectif: ne plus livrer avec erreurs masquees.

Lots:
1. Agent 3 corrige TypeScript par familles.
2. Agent 4 ajoute tests unitaires minimum.
3. Agent 8 active gates.

Sortie attendue:
- `tsc`, lint quiet, tests passent
- `ignoreBuildErrors` retire

### Phase 2 - Nettoyer architecture et doublons

Objectif: reduire cout de maintenance.

Lots:
1. Agent 1 supprime routes legacy clonees.
2. Agent 7 consolide hooks, notifications, skeletons, lazy loading.
3. Agent 2 centralise configuration URL/email/contact.

Sortie attendue:
- moins de chemins concurrents
- moins de logique dupliquee

### Phase 3 - Completer les features bloquantes

Objectif: remplacer les mocks par comportement produit.

Lots:
1. Agent 6 healthcheck, paiement, email/SMS, newsletter.
2. Agent 5 crypto IDs/tokens.
3. Agent 4 tests de regression.

Sortie attendue:
- plus de status fake ou mock fallback critique
- parcours paiement/auth plus fiables

### Phase 4 - Release candidate

Objectif: valider de bout en bout.

Lots:
1. Agent 8 checklist release et docs.
2. Orchestrateur execute gates complets.
3. Agents corrigent les regressions restantes par domaine.

Gates:
- `npm.cmd run lint -- --quiet`
- `npm.cmd run test:run`
- `npx.cmd tsc --noEmit`
- `npm.cmd run build`
- `npm.cmd run test:e2e` si environnement E2E configure

## Template de ticket agent

```md
## Ticket

Agent:
Priorite:
Objectif:

Contexte a lire:
- ...

Write-set autorise:
- ...

Ne pas modifier:
- ...

Taches:
1. ...
2. ...

Criteres d'acceptation:
- ...

Verification:
- ...

Retour attendu:
- fichiers modifies
- decisions prises
- tests executes
- risques restants
```

## Premier batch recommande

### Ticket A1-P0

Agent: Cleanup routes, scaffolds et doublons

Objectif: supprimer/proteger `app/test`, `app/api/test`, `app/preview`, `app/gamification-demo`, `gamification-system/demo`.

Verification:
- `git ls-files app/test app/api/test app/preview app/gamification-demo gamification-system/demo`
- `rg -n "/test|/preview|gamification-demo" app components lib next.config.mjs`

### Ticket A2-P0

Agent: Hardcodes et configuration runtime

Objectif: retirer les credentials de test de `app/auth/login/page.tsx`, `app/test/partner-venue/**` et documenter les variables necessaires.

Verification:
- `rg -n "Test123|venue.partner@teenclub.ma|parent.test@teenclub.ma|admin.test@teenclub.ma" app components lib`

### Ticket A3-P0

Agent: TypeScript et build gate

Objectif: generer la liste classee des erreurs TypeScript et corriger la premiere famille critique.

Verification:
- `npx.cmd tsc --noEmit --pretty false`

### Ticket A4-P0

Agent: Tests et qualite

Objectif: creer un socle Vitest minimal pour que `npm.cmd run test:run` passe avec de vrais tests.

Verification:
- `npm.cmd run test:run`

### Ticket A5-P0

Agent: Securite et exposition production

Objectif: supprimer les fuites `error.stack`, fermer le mode Supabase non configure en production et remplacer les tokens critiques a base de `Math.random`.

Verification:
- `rg -n "error\\.stack|Math\\.random\\(" app lib components`

## Format de rapport orchestrateur

```md
# Rapport orchestration - iteration N

## Etat des gates
- typecheck:
- lint:
- tests:
- build:

## Agents actifs
- Agent:
- Ticket:
- Write-set:
- Statut:

## Decisions
- ...

## Bloquants
- ...

## Prochaine iteration
1. ...
2. ...
```
