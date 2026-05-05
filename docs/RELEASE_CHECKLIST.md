# Release Checklist - NIVY

> Statut verifie 2026-05-06. Source de verite des gates de release.

Cette checklist est concrete et executable. A jour avec l'etat reel du repo (voir `docs/audits/AUDIT_E2E_DOUBLONS_HARDCODE_SCAFFOLD.md`).

## 0. Prerequis dev local

- Node `>= 20.9.0`, npm `>= 10.0.0` (voir `package.json` `engines`).
- `npm ci` doit passer a froid sans warnings critiques.

Commandes de base que tout dev doit connaitre:

```bash
npm.cmd run typecheck      # tsc --noEmit
npm.cmd run lint -- --quiet
npm.cmd run test:run       # vitest run
npm.cmd run build          # next build
```

## 1. Variables d'environnement requises

A configurer comme secrets GitHub et dans Vercel (preview + production).

### Public (NEXT_PUBLIC_*)

- `NEXT_PUBLIC_APP_URL` — URL canonique du site (ex: `https://nivy.app`). Utilisee par layout, emails, OG, sitemaps.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Server-only

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (emails transactionnels)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `CMI_*` (paiement Maroc, voir `lib/payments/cmi.ts`)
- `OPENAI_API_KEY` (si fonctionnalites IA actives)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_*` (monitoring)
- `CRON_SECRET` (protege `/api/cron/*`)

### Optionnel

- `NEXT_PUBLIC_STAGING_URL`, `NEXT_PUBLIC_PROD_URL` (jobs staging-validation).
- `STAGING_URL`, `PROD_URL` (variables ou secrets repo).

## 2. Gates qualite (bloquants)

Tous doivent etre verts avant tag/release. Le CI (`.github/workflows/ci.yml`) execute ces jobs sur push/PR `main` et `develop`.

- [ ] `npm run lint -- --quiet` exit 0.
- [ ] `npm run typecheck` exit 0 (objectif: `next.config.mjs` ne doit plus avoir `ignoreBuildErrors: true` — Agent 3 le retire).
- [ ] `npm run test:run` exit 0, suite Vitest non vide (cf. `tests/`).
- [ ] `npm run build` exit 0 sans `ignoreBuildErrors`.
- [ ] (Optionnel) `npm run test:e2e` si Playwright configure pour l'environnement.

## 3. Garde-fous production

A verifier manuellement avant deploiement prod.

- [ ] Plus aucun fichier suivi sous `app/test/`, `app/api/test/`, `app/preview/`, `app/gamification-demo/`, `gamification-system/demo/`.
- [ ] Aucun mot de passe ou compte test affiche dans `app/auth/login/page.tsx` (l'UI ne doit pas exposer `Test123!`, comptes `*.test@*`, etc.).
- [ ] Aucun `error.stack` rendu cote client (`app/teen/error.tsx`, `app/api/test/check-partner-venue/route.ts`).
- [ ] Aucun token critique genere via `Math.random()` (cf. `lib/payments/*`, `app/api/bookings/create/route.ts`, etc.). Crypto requise.
- [ ] `next.config.mjs`: `ignoreBuildErrors` est `false` (ou cle absente).
- [ ] Redirects 301/302 dans `next.config.mjs` toujours coherents avec les routes existantes.
- [ ] `app/sitemap.ts` ne publie aucune route supprimee.

## 4. Smoke tests post-deploiement

A executer apres chaque deploy production. URL de base = `NEXT_PUBLIC_APP_URL`.

- [ ] `GET /` renvoie 200 et la home se charge sans erreur console critique.
- [ ] `GET /api/health` renvoie un statut realiste (pas `ok` mensonger sans verification DB).
- [ ] `GET /agenda` renvoie 200.
- [ ] `GET /evenements` redirige 301 vers `/agenda`.
- [ ] `GET /faq` redirige 301 vers `/aide/faq`.
- [ ] `GET /ambassadeurs` redirige 301 vers `/devenir-ambassadeur`.
- [ ] `GET /partenaires` redirige 301 vers `/devenir-partenaire`.
- [ ] `GET /influenceurs` redirige 301 vers `/devenir-influenceur`.
- [ ] `GET /parents` redirige 301 vers `/guide-parents`.
- [ ] `GET /support` redirige 301 vers `/aide`.
- [ ] `GET /fidelite` redirige 301 vers `/carte-vip`.
- [ ] `GET /test/*` renvoie 404.
- [ ] `GET /api/test/*` renvoie 404.
- [ ] `GET /preview/*` renvoie 404.
- [ ] `GET /gamification-demo` redirige 301 vers `/gamification`.
- [ ] Auth: connexion + creation compte teen fonctionnent en bout-en-bout (token email recu).
- [ ] Paiement: au moins un parcours sandbox (Stripe ou CMI) reussi.
- [ ] Headers securite presents: `Strict-Transport-Security`, `X-Frame-Options`, `Content-Security-Policy`.

## 5. Observabilite

- [ ] Sentry recoit des evenements de test depuis `NEXT_PUBLIC_APP_URL`.
- [ ] Vercel Analytics actif (`@vercel/analytics`).
- [ ] Logs Vercel: pas de spam d'erreur 500 sur les premieres minutes.

## 6. Donnees & migrations

- [ ] Toutes les migrations `gamification-system/database/migrations/*.sql` appliquees ou marquees comme non requises.
- [ ] Backups Supabase actifs.
- [ ] Pas de seed de demo en production.

## 7. Communication

- [ ] Tag git `vYYYY-MM-DD-<sha>` cree (le workflow `deploy-production.yml` le fait automatiquement).
- [ ] Note de release publiee.
- [ ] Equipe informee (Slack/Email).

## 8. Rollback

- [ ] Procedure de rollback testee: `vercel rollback` ou redeploiement du tag precedent.
- [ ] Snapshot Supabase recent disponible.

## Annexe - Risques connus a traiter avant release "1.0"

Sources: `docs/audits/AUDIT_E2E_DOUBLONS_HARDCODE_SCAFFOLD.md`.

- 173+ erreurs TypeScript (Agent 3 en charge).
- ~1577 warnings ESLint (qualite, non bloquants).
- Doublons hooks `use-toast` et `use-mobile` (Agent 7).
- Healthcheck DB factice (`app/api/health/route.ts`) — Agent 6.
- Newsletter, SMS inscription teen, gateway paiement: TODO bloquants — Agent 6.
