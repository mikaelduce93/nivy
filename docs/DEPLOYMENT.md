# Guide de Déploiement - Teens Party Morocco

Ce document décrit le processus de déploiement de l'application Teens Party Morocco.

## Table des matières

- [Architecture de Déploiement](#architecture-de-déploiement)
- [Prérequis](#prérequis)
- [Configuration Initiale](#configuration-initiale)
- [Variables d'Environnement](#variables-denvironnement)
- [Workflows CI/CD](#workflows-cicd)
- [Déploiement Manuel](#déploiement-manuel)
- [Rollback](#rollback)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   PR/Push   │───▶│  CI Tests   │───▶│ Deploy Preview  │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                                                              │
│                           │ (main branch)                    │
│                           ▼                                  │
│                   ┌─────────────────┐                       │
│                   │Deploy Production│                       │
│                   └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │        Vercel           │
              │  ┌──────────────────┐   │
              │  │ Edge Network CDN │   │
              │  └──────────────────┘   │
              │  ┌──────────────────┐   │
              │  │   Next.js SSR    │   │
              │  └──────────────────┘   │
              └─────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │       Supabase          │
              │  ┌──────────────────┐   │
              │  │   PostgreSQL DB  │   │
              │  │   Auth Service   │   │
              │  │   Storage        │   │
              │  └──────────────────┘   │
              └─────────────────────────┘
```

## Prérequis

### Comptes requis

- **GitHub** - Hébergement du code source
- **Vercel** - Plateforme de déploiement (gratuit pour projets personnels)
- **Supabase** - Backend as a Service (base de données, auth)

### Outils locaux

```bash
# Node.js 20+
node --version  # v20.x.x

# npm 10+
npm --version   # 10.x.x

# Vercel CLI (optionnel pour déploiement manuel)
npm install -g vercel
```

## Configuration Initiale

### 1. Configurer Vercel

```bash
# Se connecter à Vercel
vercel login

# Lier le projet (à exécuter depuis la racine du projet)
vercel link

# Récupérer les IDs nécessaires
vercel project ls
```

Notez les valeurs :
- `VERCEL_ORG_ID` - ID de votre organisation
- `VERCEL_PROJECT_ID` - ID du projet

### 2. Configurer les Secrets GitHub

Allez dans **Settings > Secrets and variables > Actions** et ajoutez :

| Secret | Description | Exemple |
|--------|-------------|---------|
| `VERCEL_TOKEN` | Token d'API Vercel | `xxx...` |
| `VERCEL_ORG_ID` | ID Organisation Vercel | `team_xxx` |
| `VERCEL_PROJECT_ID` | ID Projet Vercel | `prj_xxx` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase | `eyJxxx...` |

### 3. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Récupérer les clés dans **Settings > API**
3. Exécuter les migrations SQL (voir `/docs/SQL_SCRIPTS_EXECUTION_GUIDE.md`)

## Variables d'Environnement

### Variables Publiques (exposées au client)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application
NEXT_PUBLIC_APP_URL=https://teensparty.ma
NEXT_PUBLIC_APP_NAME="Teens Party Morocco"
```

### Variables Privées (serveur uniquement)

```env
# Supabase Service Role (accès admin - NE PAS EXPOSER)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Paiement (Stripe ou autre)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (optionnel)
RESEND_API_KEY=re_xxx
```

### Configuration par Environnement

| Variable | Development | Preview | Production |
|----------|------------|---------|------------|
| `NODE_ENV` | development | production | production |
| `NEXT_PUBLIC_APP_URL` | localhost:3000 | *.vercel.app | teensparty.ma |
| Database | Dev Supabase | Preview Supabase | Prod Supabase |

## Workflows CI/CD

### Pipeline CI (`.github/workflows/ci.yml`)

Déclenché sur : Push et PR vers `main` et `develop`

```
1. Lint        → ESLint
2. TypeCheck   → TypeScript --noEmit
3. Test        → Vitest (unitaires) + Coverage
4. Build       → next build
5. E2E*        → Playwright (uniquement sur main)
```

*Les tests E2E s'exécutent uniquement sur les pushs vers `main`.

### Déploiement Preview (`.github/workflows/deploy-preview.yml`)

Déclenché sur : Pull Request vers `main` ou `develop`

1. Build du projet avec Vercel CLI
2. Déploiement sur URL preview unique
3. Commentaire automatique sur la PR avec l'URL

### Déploiement Production (`.github/workflows/deploy-production.yml`)

Déclenché sur : Push vers `main`

1. Build du projet en mode production
2. Déploiement sur Vercel production
3. Création d'une GitHub Release automatique

## Déploiement Manuel

### Via Vercel CLI

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod

# Avec variables d'environnement
vercel --env DATABASE_URL=xxx --prod
```

### Via Interface Vercel

1. Connecter le repo GitHub sur vercel.com
2. Configurer les variables d'environnement
3. Les déploiements se font automatiquement

## Rollback

### Via Vercel Dashboard

1. Aller sur le projet dans Vercel
2. Onglet **Deployments**
3. Trouver le déploiement précédent stable
4. Cliquer **⋯ > Promote to Production**

### Via CLI

```bash
# Lister les déploiements
vercel ls

# Promouvoir un ancien déploiement
vercel promote [deployment-url]
```

### Via GitHub

1. Créer une PR de revert : `git revert HEAD`
2. Merger vers `main`
3. Le CI/CD redéploiera automatiquement

## Monitoring

### Vercel Analytics

- **Web Vitals** - Core Web Vitals (LCP, FID, CLS)
- **Audience** - Visiteurs, pages vues
- **Speed Insights** - Performance par page

### Logs

```bash
# Voir les logs en temps réel
vercel logs [deployment-url] --follow

# Logs de fonction
vercel logs [deployment-url] --scope=functions
```

### Supabase Dashboard

- **Database** - Requêtes, performance
- **Auth** - Utilisateurs actifs, connexions
- **Storage** - Utilisation, quotas

## Troubleshooting

### Build échoue

```bash
# Vérifier localement
npm run build

# Erreurs courantes :
# - Variables d'environnement manquantes
# - Types TypeScript invalides
# - Imports circulaires
```

### Erreurs de déploiement Vercel

| Erreur | Solution |
|--------|----------|
| `VERCEL_TOKEN invalid` | Régénérer le token dans Vercel |
| `Project not found` | Vérifier VERCEL_PROJECT_ID |
| `Build timeout` | Augmenter le timeout ou optimiser le build |
| `Function size exceeded` | Réduire les dépendances des API routes |

### Preview ne se déploie pas

- Vérifier que la PR vient du même repo (pas de fork)
- Vérifier les secrets GitHub Actions
- Consulter l'onglet Actions sur GitHub

### Base de données inaccessible

```bash
# Tester la connexion Supabase
curl https://[project-id].supabase.co/rest/v1/ \
  -H "apikey: [anon-key]" \
  -H "Authorization: Bearer [anon-key]"
```

## Checklist Pré-Production

### Infrastructure
- [ ] Variables d'environnement configurées
- [ ] Secrets GitHub Actions configurés
- [ ] Migrations Supabase exécutées
- [ ] Domain custom configuré (optionnel)
- [ ] SSL/HTTPS activé (automatique sur Vercel)

### Tests
- [ ] Tests unitaires passent (`npm test`)
- [ ] Tests E2E passent (`npm run test:e2e`)
- [ ] Tests de charge configurés (`npm run test:load`)
- [ ] Build réussit localement (`npm run build`)

### Monitoring (P1)
- [ ] Sentry DSN configuré
- [ ] Analytics Vercel activés
- [ ] Webhooks d'alertes configurés (Slack/Custom)
- [ ] Logs structurés activés

### Performance (P1)
- [ ] Bundle analysé (`npm run analyze:win`)
- [ ] Images optimisées (next/image)
- [ ] Lighthouse score > 90
- [ ] Cache headers configurés

## New Scripts Added (P1)

```bash
# Bundle analysis
npm run analyze:win    # Windows
npm run analyze        # Unix/Mac

# Load testing
npm run test:load      # Run k6 load tests
```

## Monitoring Configuration

### Sentry Integration

```env
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
```

Sentry captures:
- Client-side errors
- Server-side errors
- Session replays
- Performance metrics

### Alert Webhooks

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
ALERT_WEBHOOK_URL=https://your-alerting-service/webhook
```

Alert types:
- Payment failures
- High error rates
- Slow responses
- Critical errors
- Suspicious activity

## Contacts & Ressources

- **Documentation Vercel** : https://vercel.com/docs
- **Documentation Supabase** : https://supabase.com/docs
- **Documentation Next.js** : https://nextjs.org/docs
- **Issues GitHub** : Ouvrir une issue sur le repo

---

*Dernière mise à jour : Décembre 2025*
