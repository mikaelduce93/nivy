# ✅ Checklist de Pré-Déploiement

Checklist complète à vérifier avant chaque déploiement en production.

---

## 📋 Avant de Commencer

- [ ] Code review approuvé
- [ ] Tous les tests passent localement
- [ ] Documentation mise à jour
- [ ] Changelog mis à jour

---

## 🔧 Configuration

### Variables d'Environnement

- [ ] `.env.local` configuré localement
- [ ] Variables Vercel configurées (staging/prod)
- [ ] Secrets GitHub Actions configurés
- [ ] Edge Config configuré (si utilisé)

**Vérifier:**
```bash
npm run validate:config
npm run check:edge-config
npm run check:github-secrets
```

---

## 🧪 Tests Locaux

### Tests Automatiques

- [ ] `npm run lint` passe
- [ ] `npx tsc --noEmit` passe (pas d'erreurs TypeScript)
- [ ] `npm run test:run` passe (tests unitaires)
- [ ] `npm run test:e2e` passe (tests E2E critiques)

### Tests DevOps

- [ ] `npm run test:feature-flags` passe
- [ ] `npm run test:health:local` passe
- [ ] Feature flags fonctionnent correctement
- [ ] Health checks passent

**Vérifier:**
```bash
npm run test:feature-flags
npm run test:health:local
```

---

## 🚀 Staging

### Déploiement Staging

- [ ] Code mergé sur `develop`
- [ ] Déploiement Vercel staging réussi
- [ ] Health checks staging passent automatiquement
- [ ] URL staging accessible

### Validation Staging

- [ ] Health checks passent: `npm run test:staging` (en CI)
- [ ] Pas d'erreurs dans Sentry staging
- [ ] Performance acceptable (< 3s LCP)
- [ ] Fonctionnalités critiques testées manuellement
- [ ] Feature flags configurés correctement
- [ ] Pas de régressions visuelles

**Tester manuellement:**
- [ ] Authentification (login/signup)
- [ ] Paiements (mode test)
- [ ] Réservations
- [ ] Dashboard utilisateur
- [ ] Mobile responsive

---

## 🎯 Production

### Pré-Déploiement

- [ ] Staging validé et approuvé
- [ ] Tests E2E passent
- [ ] Code review final approuvé
- [ ] Feature flags configurés pour production
- [ ] Plan de rollback préparé

### Déploiement

- [ ] PR `develop` → `main` créée
- [ ] Pre-deployment checks passent (en CI)
- [ ] Build réussit
- [ ] Déploiement Vercel production réussi
- [ ] GitHub Release créé automatiquement

### Post-Déploiement (30 premières minutes)

- [ ] Health check production OK
  ```bash
  curl https://teensparty.ma/api/health
  ```
- [ ] Pas d'erreurs dans Sentry
- [ ] Performance acceptable
- [ ] Fonctionnalités critiques testées
- [ ] Monitoring activé et fonctionnel

**Métriques à surveiller:**
- [ ] Taux d'erreur < 0.1%
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Temps de réponse API < 500ms

---

## 🚩 Feature Flags

### Avant Déploiement

- [ ] Feature flags documentés
- [ ] Valeurs par défaut définies
- [ ] Plan d'activation progressif préparé

### Après Déploiement

- [ ] Feature flags vérifiés
- [ ] Nouvelles features activées progressivement
- [ ] Monitoring des features activées

**Vérifier:**
```bash
curl https://teensparty.ma/api/features/flags?flag=cmi_payment
```

---

## 🔙 Plan de Rollback

### Préparation

- [ ] Méthode de rollback identifiée (feature flags, Vercel, Git)
- [ ] Procédure de rollback documentée
- [ ] Équipe informée de la procédure

### En Cas de Problème

- [ ] Évaluer la criticité (🔴 Critique, 🟠 Important, 🟢 Mineur)
- [ ] Exécuter le rollback si nécessaire
- [ ] Documenter le problème
- [ ] Créer issue pour investigation

**Options de rollback:**
1. **Feature Flags** (< 2 min) - Si problème lié à une feature
2. **Vercel Rollback** (< 5 min) - Rollback vers version précédente
3. **Git Revert** (10-15 min) - Dernier recours

---

## 📊 Monitoring

### Alertes Configurées

- [ ] Sentry (erreurs critiques)
- [ ] Vercel (downtime)
- [ ] GitHub Actions (déploiements échoués)

### Dashboards

- [ ] Sentry dashboard accessible
- [ ] Vercel Analytics activé
- [ ] Logs Vercel accessibles

---

## 📝 Communication

### Avant Déploiement

- [ ] Équipe informée du déploiement
- [ ] Fenêtre de maintenance annoncée (si nécessaire)
- [ ] Features à déployer communiquées

### Après Déploiement

- [ ] Déploiement réussi communiqué
- [ ] Nouvelles features annoncées
- [ ] Problèmes connus documentés

---

## ✅ Validation Finale

### Checklist Complète

- [ ] Tous les tests passent
- [ ] Staging validé
- [ ] Configuration vérifiée
- [ ] Feature flags configurés
- [ ] Plan de rollback préparé
- [ ] Monitoring activé
- [ ] Équipe informée

### Go/No-Go Decision

**GO si:**
- ✅ Tous les tests passent
- ✅ Staging validé
- ✅ Pas de problèmes bloquants
- ✅ Équipe disponible pour monitoring

**NO-GO si:**
- ❌ Tests critiques échouent
- ❌ Problèmes majeurs en staging
- ❌ Configuration incomplète
- ❌ Équipe indisponible

---

## 📚 Ressources

- **Release Process:** `docs/RELEASE.md`
- **Deployment Process:** `docs/DEPLOYMENT_PROCESS.md`
- **Local Testing:** `docs/LOCAL_TESTING_GUIDE.md`
- **Rollback Guide:** `docs/RELEASE.md` (section Rollback)

---

**Date:** _______________  
**Déployé par:** _______________  
**Version:** _______________  
**Signature:** _______________

---

**Questions?** Contacter l'équipe DevOps ou créer une issue GitHub.

