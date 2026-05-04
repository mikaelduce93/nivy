# 🚀 Guide de Release - Teens Party Morocco

**Version:** 1.0  
**Dernière mise à jour:** 2025-01-27

---

## 📋 Vue d'ensemble

Ce document décrit le processus complet de release pour Teens Party Morocco, de la validation staging jusqu'au déploiement en production et au rollback si nécessaire.

### Principes

- ✅ **Jamais de déploiement en prod sans staging validé**
- ✅ **Rollback rapide** (< 5 minutes)
- ✅ **Feature flags** pour déploiements progressifs
- ✅ **Validation automatique** en CI/CD

---

## 🔄 Processus de Release

### Phase 1: Développement & Tests Locaux

1. **Développer la feature** sur une branche feature
2. **Tests locaux**:
   ```bash
   npm run lint
   npm run test:run
   npm run test:e2e
   npm run build
   ```
3. **Créer une Pull Request** vers `develop`

### Phase 2: Validation Staging

#### 2.1 Déploiement Automatique Staging

Quand une PR est mergée sur `develop`, le workflow GitHub Actions déploie automatiquement sur Vercel (environnement staging).

#### 2.2 Validation Staging Automatique

Le workflow `.github/workflows/staging.yml` exécute automatiquement les health checks:

```bash
npm run test:staging
```

**Checks effectués:**
- ✅ Accessibilité de l'environnement staging
- ✅ Connexion Supabase
- ✅ API routes critiques
- ✅ Feature flags
- ✅ Configuration runtime
- ✅ Parité avec production
- ✅ Variables d'environnement

#### 2.3 Validation Manuelle (Recommandée)

1. **Tester les fonctionnalités critiques:**
   - Authentification (login/signup)
   - Paiements (test mode)
   - Réservations
   - Dashboard utilisateur

2. **Vérifier les logs:**
   - Sentry (erreurs)
   - Vercel Analytics (performance)

3. **Tester sur différents devices:**
   - Desktop
   - Mobile
   - Tablette

#### 2.4 Checklist Staging

- [ ] Health checks passent
- [ ] Pas d'erreurs dans Sentry
- [ ] Performance acceptable (< 3s LCP)
- [ ] Fonctionnalités critiques testées
- [ ] Feature flags configurés correctement
- [ ] Variables d'environnement présentes
- [ ] Pas de régressions visuelles

---

### Phase 3: Déploiement Production

#### 3.1 Prérequis

- ✅ Staging validé et approuvé
- ✅ Tests E2E passent
- ✅ Code review approuvé
- ✅ Feature flags configurés

#### 3.2 Merge vers Main

1. **Créer une PR** `develop` → `main`
2. **Vérifier les différences:**
   ```bash
   git diff develop..main
   ```
3. **Merge la PR** (squash & merge recommandé)

#### 3.3 Déploiement Automatique

Le workflow `.github/workflows/deploy-production.yml` se déclenche automatiquement:

1. **Pre-deployment checks:**
   - Lint
   - Type check
   - Tests unitaires

2. **Build & Deploy:**
   - Build Vercel
   - Déploiement production
   - Création GitHub Release

#### 3.4 Validation Post-Déploiement

1. **Vérifier l'URL de production:**
   ```bash
   curl https://teensparty.ma/api/health
   ```

2. **Tester les fonctionnalités critiques:**
   - Authentification
   - Paiements (mode test d'abord)
   - Dashboard

3. **Monitorer:**
   - Sentry (erreurs)
   - Vercel Analytics
   - Logs Vercel

---

## 🔙 Processus de Rollback

### Rollback Rapide (< 5 minutes)

#### Option 1: Rollback via Feature Flags (Recommandé)

Si le problème est lié à une feature avec feature flag:

1. **Désactiver le feature flag:**
   - Via Vercel Edge Config (si configuré)
   - Via variable d'environnement: `FEATURE_XXX=false`

2. **Invalidation du cache:**
   ```bash
   # Le cache se rafraîchit automatiquement après 60s
   # Ou forcer via API
   ```

3. **Vérifier le rollback:**
   - Tester que la feature est désactivée
   - Vérifier que l'ancienne version fonctionne

#### Option 2: Rollback via Vercel

1. **Aller sur Vercel Dashboard**
2. **Sélectionner le projet**
3. **Onglet "Deployments"**
4. **Cliquer sur "..."** du déploiement précédent
5. **"Promote to Production"**

#### Option 3: Rollback via Git (Dernier recours)

1. **Identifier le commit précédent:**
   ```bash
   git log --oneline -10
   ```

2. **Créer une PR de rollback:**
   ```bash
   git checkout -b rollback/YYYY-MM-DD
   git revert <commit-hash>
   git push origin rollback/YYYY-MM-DD
   ```

3. **Merge rapide vers main**

---

## 🚩 Feature Flags

### Utilisation

#### Server Component / API Route

```typescript
import { getFeatureFlag } from '@/lib/features/flags'

export async function MyComponent() {
  const enabled = await getFeatureFlag('new_payment_method')
  
  if (!enabled) {
    return <OldPaymentComponent />
  }
  
  return <NewPaymentComponent />
}
```

#### Client Component

```typescript
'use client'
import { useFeatureFlag } from '@/lib/features/use-feature-flag'

export function MyComponent() {
  const enabled = useFeatureFlag('new_payment_method')
  
  if (!enabled) return null
  
  return <div>New Feature</div>
}
```

### Configuration

#### Via Variables d'Environnement

```env
FEATURE_NEW_PAYMENT_METHOD=true
FEATURE_CMI_PAYMENT=false
FEATURE_MOBILE_MONEY_PAYMENT=false
```

#### Via Vercel Edge Config (Recommandé)

1. **Créer Edge Config** sur Vercel
2. **Ajouter les flags:**
   ```json
   {
     "feature_new_payment_method": true,
     "feature_cmi_payment": false
   }
   ```
3. **Configurer la variable:**
   ```env
   EDGE_CONFIG=your-edge-config-connection-string
   ```

### Feature Flags Disponibles

| Flag | Description | Par défaut |
|------|-------------|------------|
| `new_payment_method` | Nouveau système de paiement | `false` |
| `cmi_payment` | Paiement CMI | `false` |
| `mobile_money_payment` | Paiement Mobile Money | `false` |
| `xp_payment` | Paiement avec XP | `true` |
| `hybrid_payment` | Paiement hybride (XP + DH) | `false` |
| `subscription_premium` | Abonnements premium | `true` |
| `gamification_v2` | Nouvelle version gamification | `true` |
| `ready_player_me` | Intégration Ready Player Me | `false` |
| `ai_content_generation` | Génération de contenu IA | `false` |
| `staging_validation` | Validation staging automatique | `false` |
| `enhanced_monitoring` | Monitoring avancé | `true` |
| `pwa_offline_mode` | Mode offline PWA | `false` |

---

## ⚙️ Configuration Runtime

### Utilisation

```typescript
import { getRuntimeConfig } from '@/lib/config/runtime'

const config = await getRuntimeConfig()
const apiUrl = config.apiUrl
const stripeEnabled = config.payments.stripeEnabled
```

### Configuration

La configuration runtime peut être modifiée sans rebuild via:

1. **Vercel Edge Config** (recommandé)
2. **Variables d'environnement** (fallback)

### Cache

La configuration est mise en cache pendant 5 minutes. Pour forcer le refresh:

```typescript
import { getRuntimeConfig, invalidateConfigCache } from '@/lib/config/runtime'

invalidateConfigCache()
const config = await getRuntimeConfig(true) // force refresh
```

---

## 📊 Monitoring Post-Release

### Métriques à Surveiller

1. **Erreurs:**
   - Sentry: Taux d'erreur < 0.1%
   - Logs Vercel: Pas d'erreurs 5xx

2. **Performance:**
   - LCP < 2.5s
   - FID < 100ms
   - CLS < 0.1

3. **Fonctionnalités:**
   - Taux de conversion paiements
   - Taux d'erreur authentification
   - Temps de réponse API

### Alertes

Configurer des alertes sur:
- Sentry (erreurs critiques)
- Vercel (downtime)
- GitHub Actions (déploiements échoués)

---

## ✅ Checklist de Release

### Avant le Déploiement

- [ ] Code review approuvé
- [ ] Tests passent (unitaires + E2E)
- [ ] Staging validé
- [ ] Feature flags configurés
- [ ] Documentation mise à jour
- [ ] Changelog mis à jour

### Pendant le Déploiement

- [ ] Pre-deployment checks passent
- [ ] Build réussit
- [ ] Déploiement Vercel réussi
- [ ] GitHub Release créé

### Après le Déploiement

- [ ] Health check production OK
- [ ] Fonctionnalités critiques testées
- [ ] Monitoring activé
- [ ] Pas d'erreurs dans Sentry
- [ ] Performance acceptable

---

## 🆘 En Cas de Problème

### Problème Détecté en Production

1. **Évaluer la criticité:**
   - 🔴 Critique: Rollback immédiat
   - 🟠 Important: Désactiver feature flag si possible
   - 🟢 Mineur: Fix en hotfix

2. **Rollback si nécessaire:**
   - Voir section "Processus de Rollback"

3. **Investigation:**
   - Consulter Sentry
   - Vérifier les logs Vercel
   - Analyser les métriques

4. **Fix:**
   - Créer branche hotfix
   - Tester en staging
   - Déployer en production

---

## 📚 Ressources

- **Documentation Vercel:** https://vercel.com/docs
- **GitHub Actions:** https://docs.github.com/en/actions
- **Feature Flags:** `lib/features/flags.ts`
- **Runtime Config:** `lib/config/runtime.ts`
- **Health Checks:** `tests/staging/health-checks.ts`

---

## 🔄 Améliorations Futures

- [ ] Intégration Slack pour notifications
- [ ] Dashboard de monitoring personnalisé
- [ ] Tests de charge automatiques
- [ ] Canary deployments
- [ ] Blue-green deployments

---

**Questions?** Contacter l'équipe DevOps ou créer une issue GitHub.

