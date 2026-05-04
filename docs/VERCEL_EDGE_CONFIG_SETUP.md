# Configuration Vercel Edge Config

Ce guide explique comment configurer Vercel Edge Config pour les feature flags et la configuration runtime.

---

## 📋 Prérequis

- Compte Vercel
- Projet déployé sur Vercel
- Accès au dashboard Vercel

---

## 🚀 Étape 1: Créer Edge Config

1. **Aller sur Vercel Dashboard**
   - https://vercel.com/dashboard
   - Sélectionner votre projet

2. **Créer Edge Config**
   - Settings → Edge Config
   - Cliquer sur "Create Edge Config"
   - Donner un nom (ex: `teens-party-config`)

3. **Récupérer la connection string**
   - Copier la connection string
   - Format: `https://edge-config.vercel.com/ecfg_xxxxx?token=xxxxx`

---

## 🔧 Étape 2: Configurer la Variable d'Environnement

### Sur Vercel Dashboard

1. **Settings → Environment Variables**
2. **Ajouter la variable:**
   ```
   Name: EDGE_CONFIG
   Value: [votre-connection-string]
   ```
3. **Sélectionner les environnements:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development (optionnel)

4. **Save**

### Localement (.env.local)

```env
EDGE_CONFIG=https://edge-config.vercel.com/ecfg_xxxxx?token=xxxxx
```

---

## 📝 Étape 3: Ajouter les Feature Flags

### Via Vercel Dashboard

1. **Settings → Edge Config**
2. **Cliquer sur votre Edge Config**
3. **Ajouter les clés/valeurs:**

```json
{
  "feature_new_payment_method": false,
  "feature_cmi_payment": false,
  "feature_mobile_money_payment": false,
  "feature_xp_payment": true,
  "feature_hybrid_payment": false,
  "feature_subscription_premium": true,
  "feature_gamification_v2": true,
  "feature_ready_player_me": false,
  "feature_ai_content_generation": false,
  "feature_staging_validation": false,
  "feature_enhanced_monitoring": true,
  "feature_pwa_offline_mode": false
}
```

### Via Vercel CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Lier le projet
vercel link

# Créer un fichier edge-config.json
cat > edge-config.json << EOF
{
  "feature_new_payment_method": false,
  "feature_cmi_payment": false,
  "feature_mobile_money_payment": false
}
EOF

# Pousser la config
vercel env pull .env.local
```

---

## 🔄 Étape 4: Utilisation dans le Code

### Feature Flags

Le code utilise automatiquement Edge Config si `EDGE_CONFIG` est défini:

```typescript
import { getFeatureFlag } from '@/lib/features/flags'

// Utilise Edge Config si disponible, sinon env vars
const enabled = await getFeatureFlag('cmi_payment')
```

### Configuration Runtime

```typescript
import { getRuntimeConfig } from '@/lib/config/runtime'

const config = await getRuntimeConfig()
const stripeEnabled = config.payments.stripeEnabled
```

---

## 🧪 Étape 5: Tester

### Tester les Feature Flags

```bash
# Vérifier que l'API fonctionne
curl http://localhost:3000/api/features/flags?flag=cmi_payment

# Réponse attendue:
# {"enabled": false}
```

### Tester Edge Config

```typescript
// Dans une API route ou Server Component
import { get } from '@vercel/edge-config'

const value = await get('feature_cmi_payment')
console.log(value) // false
```

---

## 🔄 Mise à Jour des Feature Flags

### Via Dashboard Vercel

1. **Settings → Edge Config**
2. **Modifier les valeurs**
3. **Save**
4. **Les changements sont immédiats** (pas de rebuild nécessaire)

### Via API Vercel

```bash
# Mettre à jour un flag
curl -X PATCH \
  https://api.vercel.com/v1/edge-config/ecfg_xxxxx/items \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "key": "feature_cmi_payment",
        "value": true
      }
    ]
  }'
```

---

## 📊 Monitoring

### Vérifier l'utilisation

- **Vercel Dashboard → Edge Config → Analytics**
- Voir les requêtes par seconde
- Voir les erreurs

### Logs

Les erreurs Edge Config sont loggées dans:
- Vercel Logs
- Console (si en développement)

---

## 🚨 Troubleshooting

### Edge Config non accessible

**Problème:** `Error: Edge Config not available`

**Solutions:**
1. Vérifier que `EDGE_CONFIG` est défini
2. Vérifier que la connection string est correcte
3. Vérifier les permissions Vercel

### Feature flags ne se mettent pas à jour

**Problème:** Les changements ne sont pas reflétés

**Solutions:**
1. Le cache est de 60 secondes, attendre
2. Forcer le refresh:
   ```typescript
   import { invalidateFeatureFlagCache } from '@/lib/features/flags'
   invalidateFeatureFlagCache('cmi_payment')
   ```

### Fallback vers env vars

Si Edge Config échoue, le système utilise automatiquement les variables d'environnement:

```env
FEATURE_CMI_PAYMENT=true
FEATURE_MOBILE_MONEY_PAYMENT=false
```

---

## 📚 Ressources

- [Vercel Edge Config Docs](https://vercel.com/docs/storage/edge-config)
- [Feature Flags Implementation](../lib/features/flags.ts)
- [Runtime Config Implementation](../lib/config/runtime.ts)

---

## ✅ Checklist

- [ ] Edge Config créé sur Vercel
- [ ] Variable `EDGE_CONFIG` configurée
- [ ] Feature flags ajoutés dans Edge Config
- [ ] Testé localement
- [ ] Testé en staging
- [ ] Testé en production
- [ ] Documentation équipe mise à jour

---

**Questions?** Créer une issue GitHub ou contacter l'équipe DevOps.

