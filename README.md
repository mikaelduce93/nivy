# NIVY (Teens Party Morocco)

Plateforme web de soirees securisees pour adolescents 13-17 ans au Maroc.
Stack Next.js 16 (App Router) + React 19 + Supabase + Stripe/CMI + Sentry.

## Prerequis

- Node `20.9+` (voir `.nvmrc`)
- npm `10+`
- Compte Supabase + cles API (voir `.env.example`)

## Demarrage

```bash
npm install --legacy-peer-deps
cp .env.example .env.local      # remplir les valeurs
npm run dev                     # http://localhost:3000
```

## Scripts

| Script | Action |
|---|---|
| `npm run dev` | Serveur de dev |
| `npm run build` | Build production |
| `npm run start` | Lancer la prod localement |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:run` | Vitest (unit/integration) |
| `npm run test:e2e` | Playwright (smoke + a11y) |
| `npm run analyze` | Bundle analyzer |

## Structure

```
app/              Routes Next.js App Router
components/       Composants React (UI, features, layouts)
features/         Domaines fonctionnels (gamification, anniversaires, ...)
gamification-system/  Catalog gamification (achievements, missions, shop)
lib/              Lib partagee (config, supabase, security, monitoring, ...)
hooks/            Hooks React (use-toast, use-mobile)
emails/           Templates Resend
tests/            Vitest unit + integration
playwright.config.ts + tests/e2e + tests/a11y
docs/             Documentation projet (architecture, design system, audits)
research/         Recherche marche et benchmarking (hors scope code)
```

## Documentation

- Architecture : `docs/ARCHITECTURE.md`
- Database : `docs/DATABASE.md`
- API : `docs/API.md`
- Design system : `docs/design/DESIGN_SYSTEM.md`
- Securite : `docs/SECURITY.md`
- Tests : `docs/MANUAL-TESTS.md`, `docs/TESTS_IMPLEMENTATION.md`
- Deploiement : `docs/DEPLOYMENT.md` + `docs/RELEASE_CHECKLIST.md`
- Migrations DB : `docs/database/MIGRATIONS_README.md`
- Audits : `docs/audits/`

## License

Proprietaire. Tous droits reserves.
