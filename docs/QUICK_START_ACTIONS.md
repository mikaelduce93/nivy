# 🚀 Guide de Démarrage Rapide - Prochaines Actions

Guide rapide pour exécuter les prochaines actions de configuration et de test.

---

## ⚡ Démarrage Rapide (5 minutes)

### 1. Vérifier la Configuration

```bash
npm run validate:config
```

**Résultat attendu:**
- ✅ Variables Supabase configurées
- ⚠️ Variables optionnelles documentées

**Si erreurs:**
- Copier `env.local.example` vers `.env.local`
- Remplir les valeurs Supabase minimales

---

### 2. Tester les Feature Flags

```bash
npm run test:feature-flags
```

**Résultat attendu:**
```
✅ cmi_payment: false (from Environment Variables)
✅ mobile_money_payment: false (from Environment Variables)
...
```

**Si tout fonctionne:** ✅ Feature flags sont opérationnels !

---

### 3. Vérifier Edge Config (Optionnel)

```bash
npm run check:edge-config
```

**Si Edge Config n'est pas configuré:**
- Suivre les instructions affichées
- Voir: `docs/VERCEL_EDGE_CONFIG_SETUP.md`

**Si configuré:**
- ✅ Connexion testée
- ✅ Clés disponibles listées

---

### 4. Vérifier GitHub Secrets

```bash
npm run check:github-secrets
```

**Affiche:**
- 📋 Liste des secrets requis
- 📍 Où les trouver
- ✅ Checklist à compléter

**Action:**
- Configurer les secrets sur GitHub
- Suivre: `docs/GITHUB_ACTIONS_SETUP.md`

---

## 🧪 Tests Complets (15 minutes)

### Suite de Tests Locale

```bash
# 1. Validation configuration
npm run validate:config

# 2. Test feature flags
npm run test:feature-flags

# 3. Test health checks (nécessite .env.local complet)
npm run test:health:local

# 4. Vérifier Edge Config (si configuré)
npm run check:edge-config
```

**Tous les tests passent?** ✅ Prêt pour déploiement staging !

---

## 🔧 Configuration Production

### Étape 1: Vercel Edge Config

1. **Vérifier si configuré:**
   ```bash
   npm run check:edge-config
   ```

2. **Si non configuré:**
   - Suivre: `docs/VERCEL_EDGE_CONFIG_SETUP.md`
   - Créer Edge Config sur Vercel
   - Ajouter `EDGE_CONFIG` dans `.env.local`

3. **Ajouter les feature flags:**
   - Via Vercel Dashboard
   - Ou via CLI (voir guide)

### Étape 2: GitHub Actions Secrets

1. **Voir la checklist:**
   ```bash
   npm run check:github-secrets
   ```

2. **Configurer les secrets:**
   - GitHub → Settings → Secrets and variables → Actions
   - Ajouter chaque secret de la checklist
   - Suivre: `docs/GITHUB_ACTIONS_SETUP.md`

3. **Tester:**
   - Créer une PR
   - Vérifier que les workflows passent

---

## 📋 Checklist Complète

### Configuration Locale
- [ ] `npm run validate:config` passe
- [ ] `.env.local` configuré
- [ ] `npm run test:feature-flags` passe

### Edge Config (Optionnel mais Recommandé)
- [ ] `npm run check:edge-config` passe
- [ ] Edge Config créé sur Vercel
- [ ] Feature flags ajoutés dans Edge Config

### GitHub Actions
- [ ] `npm run check:github-secrets` exécuté
- [ ] Tous les secrets configurés
- [ ] Workflows testés (via PR)

### Tests
- [ ] `npm run test:health:local` passe
- [ ] Serveur démarre: `npm run dev`
- [ ] API routes fonctionnent
- [ ] Feature flags dans UI fonctionnent

---

## 🎯 Prochaines Étapes

### 1. Configuration Production

**Vercel Edge Config:**
```bash
# Vérifier
npm run check:edge-config

# Si non configuré, suivre:
# docs/VERCEL_EDGE_CONFIG_SETUP.md
```

**GitHub Secrets:**
```bash
# Voir checklist
npm run check:github-secrets

# Configurer sur GitHub
# docs/GITHUB_ACTIONS_SETUP.md
```

### 2. Tests en Staging

1. **Déployer sur staging:**
   - Merge vers `develop`
   - Vercel déploie automatiquement

2. **Valider:**
   - Health checks passent automatiquement
   - Tester manuellement les features

3. **Vérifier:**
   - Pas d'erreurs Sentry
   - Performance acceptable

### 3. Déploiement Production

1. **Pré-déploiement:**
   - Suivre: `docs/PRE_DEPLOYMENT_CHECKLIST.md`
   - Valider staging

2. **Déployer:**
   - Merge `develop` → `main`
   - Déploiement automatique

3. **Post-déploiement:**
   - Monitorer 30 premières minutes
   - Vérifier health checks
   - Tester features

---

## 📚 Documentation Complète

### Guides Principaux
- **Local Testing:** `docs/LOCAL_TESTING_GUIDE.md`
- **Pre-Deployment:** `docs/PRE_DEPLOYMENT_CHECKLIST.md`
- **Deployment Process:** `docs/DEPLOYMENT_PROCESS.md`
- **Release Process:** `docs/RELEASE.md`

### Configuration
- **Edge Config:** `docs/VERCEL_EDGE_CONFIG_SETUP.md`
- **GitHub Actions:** `docs/GITHUB_ACTIONS_SETUP.md`

### Scripts Disponibles

```bash
# Validation
npm run validate:config          # Valider configuration
npm run check:edge-config         # Vérifier Edge Config
npm run check:github-secrets      # Checklist GitHub secrets

# Tests
npm run test:feature-flags       # Tester feature flags
npm run test:health:local        # Health checks locaux
npm run test:staging             # Health checks staging (CI)
```

---

## 🆘 Aide Rapide

### Problème: Feature Flags ne fonctionnent pas

```bash
# Vérifier
npm run test:feature-flags

# Vérifier configuration
npm run validate:config

# Vérifier Edge Config
npm run check:edge-config
```

### Problème: Health Checks échouent

```bash
# Vérifier variables
npm run validate:config

# Tester localement
npm run test:health:local

# Vérifier .env.local contient:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Problème: GitHub Actions échouent

```bash
# Voir checklist
npm run check:github-secrets

# Vérifier secrets configurés
# GitHub → Settings → Secrets and variables → Actions
```

---

## ✅ Résultat Final

Après avoir complété toutes les étapes:

- ✅ Configuration validée
- ✅ Feature flags fonctionnent
- ✅ Edge Config configuré (optionnel)
- ✅ GitHub Secrets configurés
- ✅ Tests locaux passent
- ✅ Prêt pour déploiement staging
- ✅ Prêt pour déploiement production

---

**Questions?** Voir la documentation complète ou créer une issue GitHub.

