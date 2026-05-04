# 🧪 Guide de Test Local Complet

Guide pour tester localement tous les composants DevOps avant le déploiement.

---

## 📋 Prérequis

- ✅ Node.js 20+ installé
- ✅ npm installé
- ✅ Dépendances installées: `npm install`
- ✅ `.env.local` configuré (voir `env.local.example`)

---

## 🔧 Étape 1: Validation de la Configuration

### Vérifier la Configuration

```bash
npm run validate:config
```

**Vérifie:**
- ✅ Variables Supabase présentes
- ✅ Variables optionnelles documentées
- ✅ Format correct

**Si erreurs:**
- Vérifier `.env.local` existe
- Copier `env.local.example` vers `.env.local`
- Remplir les valeurs requises

---

## 🚩 Étape 2: Tester les Feature Flags

### Test des Feature Flags

```bash
npm run test:feature-flags
```

**Teste:**
- ✅ Récupération individuelle de flags
- ✅ Récupération multiple de flags
- ✅ API route (si serveur démarré)
- ✅ Source de configuration (Edge Config ou env vars)

**Résultat attendu:**
```
✅ cmi_payment: false (from Environment Variables)
✅ mobile_money_payment: false (from Environment Variables)
✅ xp_payment: true (from Environment Variables)
...
```

### Tester avec Edge Config

Si Edge Config est configuré:

```bash
npm run check:edge-config
```

**Vérifie:**
- ✅ Connection string présente
- ✅ Connexion Edge Config fonctionne
- ✅ Clés disponibles

---

## 🏥 Étape 3: Tester les Health Checks

### Health Checks Locaux

```bash
npm run test:health:local
```

**Nécessite:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STAGING_URL` (optionnel)
- `NEXT_PUBLIC_PROD_URL` (optionnel)

**Teste:**
- ✅ Accessibilité staging (si URL fournie)
- ✅ Connexion Supabase
- ✅ API routes critiques
- ✅ Feature flags
- ✅ Configuration runtime
- ✅ Parité production (si URLs fournies)

**Résultat:**
- Rapport formaté dans la console
- Rapport JSON: `staging-health-report.json`

---

## 🚀 Étape 4: Tester avec Serveur de Développement

### Démarrer le Serveur

```bash
npm run dev
```

**URL:** http://localhost:3000

### Tester les Endpoints

#### Health Check

```bash
curl http://localhost:3000/api/health
```

**Réponse attendue:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T...",
  "environment": "development",
  "version": "1.0.0"
}
```

#### Feature Flags API

```bash
# Un seul flag
curl http://localhost:3000/api/features/flags?flag=cmi_payment

# Plusieurs flags
curl http://localhost:3000/api/features/flags?flags=cmi_payment,mobile_money_payment
```

**Réponse attendue:**
```json
{
  "enabled": false
}
```

---

## 💳 Étape 5: Tester l'Intégration Paiements

### Tester avec Feature Flags

1. **Démarrer le serveur:**
   ```bash
   npm run dev
   ```

2. **Vérifier que CMI est désactivé:**
   - Ouvrir une page de paiement
   - Vérifier que "CMI" n'apparaît **pas** dans les options

3. **Activer CMI temporairement:**
   ```bash
   # Dans .env.local
   FEATURE_CMI_PAYMENT=true
   ```
   - Redémarrer le serveur
   - Vérifier que "CMI" apparaît maintenant

4. **Tester l'API:**
   ```bash
   # Devrait retourner 403 si flag désactivé
   curl http://localhost:3000/api/payments/cmi/initiate?booking=test&amount=100
   ```

---

## 🔍 Étape 6: Vérifier GitHub Actions

### Checklist des Secrets

```bash
npm run check:github-secrets
```

**Affiche:**
- ✅ Liste des secrets requis
- ✅ Où les trouver
- ✅ Checklist à cocher

**Action:**
- Configurer les secrets sur GitHub
- Vérifier la checklist

---

## 📊 Checklist Complète de Test Local

### Configuration
- [ ] `npm run validate:config` passe
- [ ] `.env.local` configuré correctement
- [ ] Variables Supabase présentes

### Feature Flags
- [ ] `npm run test:feature-flags` passe
- [ ] Flags récupérés correctement
- [ ] API route fonctionne
- [ ] Edge Config configuré (optionnel)

### Health Checks
- [ ] `npm run test:health:local` passe
- [ ] Tous les checks passent
- [ ] Rapport généré

### Serveur de Développement
- [ ] `npm run dev` démarre sans erreurs
- [ ] `/api/health` répond
- [ ] `/api/features/flags` répond
- [ ] Pages chargent correctement

### Intégration
- [ ] Feature flags dans paiements fonctionnent
- [ ] Méthodes désactivées masquées dans UI
- [ ] API routes protégées par feature flags

### GitHub Actions
- [ ] `npm run check:github-secrets` exécuté
- [ ] Checklist des secrets complétée
- [ ] Secrets configurés sur GitHub

---

## 🚨 Troubleshooting

### Feature Flags ne fonctionnent pas

**Problème:** Flags retournent toujours `false`

**Solutions:**
1. Vérifier `.env.local` contient `FEATURE_XXX=true`
2. Redémarrer le serveur après modification
3. Vérifier Edge Config si utilisé

### Health Checks échouent

**Problème:** `Supabase Connection failed`

**Solutions:**
1. Vérifier `NEXT_PUBLIC_SUPABASE_URL` est correct
2. Vérifier `NEXT_PUBLIC_SUPABASE_ANON_KEY` est correct
3. Vérifier connexion internet
4. Vérifier Supabase est accessible

### API Routes ne répondent pas

**Problème:** `404 Not Found`

**Solutions:**
1. Vérifier serveur est démarré: `npm run dev`
2. Vérifier URL est correcte
3. Vérifier route existe dans `app/api/`

---

## 📚 Ressources

- **Configuration:** `env.local.example`
- **Feature Flags:** `lib/features/flags.ts`
- **Health Checks:** `tests/staging/health-checks.ts`
- **Validation:** `scripts/validate-config.ts`

---

## ✅ Résultat Attendu

Après avoir complété tous les tests:

- ✅ Configuration validée
- ✅ Feature flags fonctionnent
- ✅ Health checks passent
- ✅ Serveur démarre correctement
- ✅ API routes fonctionnent
- ✅ Intégration paiements testée
- ✅ Prêt pour déploiement staging

---

**Questions?** Voir la documentation ou créer une issue GitHub.

