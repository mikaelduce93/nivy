# 🚀 Processus de Déploiement Complet

Guide complet du processus de déploiement de Teens Party Morocco, de la configuration initiale jusqu'au déploiement en production.

---

## 📋 Table des Matières

1. [Configuration Initiale](#configuration-initiale)
2. [Développement Local](#développement-local)
3. [Tests](#tests)
4. [Déploiement Staging](#déploiement-staging)
5. [Validation Staging](#validation-staging)
6. [Déploiement Production](#déploiement-production)
7. [Post-Déploiement](#post-déploiement)
8. [Rollback](#rollback)

---

## 🔧 Configuration Initiale

### 1. Prérequis

- ✅ Node.js 20+
- ✅ npm 10+
- ✅ Compte Vercel
- ✅ Compte Supabase
- ✅ Compte GitHub

### 2. Cloner le Repository

```bash
git clone https://github.com/[owner]/teens-party-morocco.git
cd teens-party-morocco
```

### 3. Installer les Dépendances

```bash
npm install
```

### 4. Configurer l'Environnement Local

```bash
# Copier le template
cp env.local.example .env.local

# Éditer .env.local avec vos valeurs
# Voir env.local.example pour la liste complète
```

### 5. Valider la Configuration

```bash
npm run validate:config
```

**Vérifier:**
- ✅ Variables Supabase configurées
- ✅ Variables optionnelles selon besoins

---

## 💻 Développement Local

### 1. Démarrer le Serveur de Développement

```bash
npm run dev
```

**URL:** http://localhost:3000

### 2. Tests Locaux

```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit

# Tests unitaires
npm run test:run

# Tests E2E
npm run test:e2e
```

### 3. Health Checks Locaux

```bash
# Tester les health checks (nécessite .env.local)
npm run test:health:local
```

---

## 🧪 Tests

### Tests Automatiques

Les tests sont exécutés automatiquement en CI:

```yaml
# .github/workflows/ci.yml
- lint
- typecheck
- test (unitaires)
- build
- e2e (sur main uniquement)
```

### Tests Manuels

**Checklist avant commit:**
- [ ] `npm run lint` passe
- [ ] `npx tsc --noEmit` passe
- [ ] `npm run test:run` passe
- [ ] Tests E2E critiques passent
- [ ] Build réussit: `npm run build`

---

## 🚀 Déploiement Staging

### 1. Créer une Branche

```bash
git checkout -b feature/ma-feature
# ... développer ...
git commit -m "feat: ma feature"
git push origin feature/ma-feature
```

### 2. Créer une Pull Request

1. **GitHub → New Pull Request**
2. **Base:** `develop`
3. **Compare:** `feature/ma-feature`
4. **Créer la PR**

### 3. Déploiement Automatique Preview

Le workflow `.github/workflows/deploy-preview.yml`:
- ✅ Déploie automatiquement sur Vercel Preview
- ✅ Comment la PR avec l'URL de preview
- ✅ Exécute les tests

### 4. Review & Merge

1. **Code review** par l'équipe
2. **Vérifier** que les tests passent
3. **Merge** vers `develop`

### 5. Déploiement Staging Automatique

Quand mergé sur `develop`:
- ✅ Vercel déploie automatiquement sur staging
- ✅ Workflow `.github/workflows/staging.yml` exécute les health checks

---

## ✅ Validation Staging

### 1. Health Checks Automatiques

Exécutés automatiquement après déploiement staging:

```bash
# Via GitHub Actions
npm run test:staging
```

**Checks:**
- ✅ Accessibilité staging
- ✅ Connexion Supabase
- ✅ API routes critiques
- ✅ Feature flags
- ✅ Configuration runtime
- ✅ Parité production

### 2. Validation Manuelle

**Checklist:**
- [ ] Health checks passent
- [ ] Pas d'erreurs dans Sentry
- [ ] Performance acceptable (< 3s LCP)
- [ ] Fonctionnalités critiques testées
- [ ] Feature flags configurés correctement
- [ ] Pas de régressions visuelles

### 3. Tests Utilisateur

**Tester:**
- Authentification (login/signup)
- Paiements (mode test)
- Réservations
- Dashboard utilisateur
- Mobile responsive

---

## 🎯 Déploiement Production

### 1. Prérequis

- ✅ Staging validé et approuvé
- ✅ Tests E2E passent
- ✅ Code review approuvé
- ✅ Feature flags configurés

### 2. Merge vers Main

```bash
# Créer PR develop → main
git checkout develop
git pull origin develop
git checkout -b release/v1.x.x
# ... préparer release ...
git push origin release/v1.x.x
```

**Créer PR:** `develop` → `main`

### 3. Pre-Deployment Checks

Le workflow `.github/workflows/deploy-production.yml`:
- ✅ Lint
- ✅ Type check
- ✅ Tests unitaires
- ✅ Vérification staging

### 4. Déploiement Automatique

Quand mergé sur `main`:
- ✅ Build Vercel
- ✅ Déploiement production
- ✅ Création GitHub Release

### 5. Validation Post-Déploiement

**Immédiatement après déploiement:**

```bash
# Vérifier health check
curl https://teensparty.ma/api/health

# Vérifier feature flags
curl https://teensparty.ma/api/features/flags?flag=cmi_payment
```

**Checklist:**
- [ ] Health check OK
- [ ] Pas d'erreurs dans Sentry
- [ ] Performance acceptable
- [ ] Fonctionnalités critiques testées

---

## 📊 Post-Déploiement

### 1. Monitoring

**Métriques à surveiller (premières 30 minutes):**

- **Erreurs:**
  - Sentry: Taux d'erreur < 0.1%
  - Logs Vercel: Pas d'erreurs 5xx

- **Performance:**
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1

- **Fonctionnalités:**
  - Taux de conversion paiements
  - Taux d'erreur authentification
  - Temps de réponse API

### 2. Alertes

**Configurer des alertes sur:**
- Sentry (erreurs critiques)
- Vercel (downtime)
- GitHub Actions (déploiements échoués)

### 3. Communication

**Informer l'équipe:**
- ✅ Déploiement réussi
- ✅ Nouvelles features activées
- ✅ Feature flags activés/désactivés

---

## 🔙 Rollback

### Option 1: Feature Flags (Recommandé)

**Si problème lié à une feature avec flag:**

1. **Désactiver le flag:**
   - Via Vercel Edge Config (si configuré)
   - Via variable d'environnement: `FEATURE_XXX=false`

2. **Vérifier:**
   - Feature désactivée
   - Ancienne version fonctionne

**Temps:** < 2 minutes

### Option 2: Rollback Vercel

1. **Vercel Dashboard → Deployments**
2. **Sélectionner déploiement précédent**
3. **"..." → "Promote to Production"**

**Temps:** < 5 minutes

### Option 3: Rollback Git (Dernier recours)

1. **Identifier commit précédent:**
   ```bash
   git log --oneline -10
   ```

2. **Créer PR de rollback:**
   ```bash
   git checkout -b rollback/YYYY-MM-DD
   git revert <commit-hash>
   git push origin rollback/YYYY-MM-DD
   ```

3. **Merge rapide vers main**

**Temps:** 10-15 minutes

---

## 📚 Ressources

- **Release Process:** `docs/RELEASE.md`
- **Feature Flags:** `lib/features/flags.ts`
- **Health Checks:** `tests/staging/health-checks.ts`
- **GitHub Actions Setup:** `docs/GITHUB_ACTIONS_SETUP.md`
- **Vercel Edge Config:** `docs/VERCEL_EDGE_CONFIG_SETUP.md`

---

## ✅ Checklist Complète

### Avant Déploiement
- [ ] Code review approuvé
- [ ] Tests passent (unitaires + E2E)
- [ ] Staging validé
- [ ] Feature flags configurés
- [ ] Documentation mise à jour
- [ ] Changelog mis à jour

### Pendant Déploiement
- [ ] Pre-deployment checks passent
- [ ] Build réussit
- [ ] Déploiement Vercel réussi
- [ ] GitHub Release créé

### Après Déploiement
- [ ] Health check production OK
- [ ] Fonctionnalités critiques testées
- [ ] Monitoring activé
- [ ] Pas d'erreurs dans Sentry
- [ ] Performance acceptable

---

**Questions?** Créer une issue GitHub ou contacter l'équipe DevOps.

