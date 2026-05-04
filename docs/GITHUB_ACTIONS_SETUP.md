# Configuration GitHub Actions - Secrets & Variables

Ce guide explique comment configurer les secrets et variables GitHub Actions pour le CI/CD.

---

## 📋 Vue d'ensemble

Les workflows GitHub Actions nécessitent des secrets et variables pour:
- ✅ Déploiement Vercel
- ✅ Tests staging
- ✅ Health checks
- ✅ Notifications

---

## 🔐 Secrets GitHub Actions

### Accès aux Secrets

1. **Aller sur GitHub Repository**
   - https://github.com/[owner]/[repo]
   - Settings → Secrets and variables → Actions

2. **Cliquer sur "New repository secret"**

### Secrets Requis

#### 1. Vercel Secrets

| Secret | Description | Où le trouver |
|--------|-------------|--------------|
| `VERCEL_TOKEN` | Token d'authentification Vercel | Vercel Dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` | ID de l'organisation Vercel | Vercel Dashboard → Settings → General |
| `VERCEL_PROJECT_ID` | ID du projet Vercel | Vercel Dashboard → Settings → General |

**Comment obtenir:**

1. **VERCEL_TOKEN:**
   - Vercel Dashboard → Settings → Tokens
   - "Create Token"
   - Nom: `github-actions`
   - Scope: Full Account
   - Copier le token

2. **VERCEL_ORG_ID & VERCEL_PROJECT_ID:**
   - Vercel Dashboard → Settings → General
   - Copier "Organization ID" et "Project ID"

#### 2. Supabase Secrets

| Secret | Description | Où le trouver |
|--------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase | Supabase Dashboard → Settings → API |

**Comment obtenir:**

1. Supabase Dashboard → Settings → API
2. Copier "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
3. Copier "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 3. Staging/Production URLs

| Secret | Description | Exemple |
|--------|-------------|---------|
| `STAGING_URL` | URL de l'environnement staging | `staging.teensparty.ma` ou `teens-party-staging.vercel.app` |
| `PROD_URL` | URL de l'environnement production | `teensparty.ma` ou `teens-party.vercel.app` |

**Note:** Ces URLs peuvent être configurées comme **Variables** (non secrètes) si préféré.

---

## 📊 Variables GitHub Actions (Optionnel)

Les variables sont moins sensibles que les secrets et peuvent être utilisées pour des valeurs non confidentielles.

### Accès aux Variables

1. **Settings → Secrets and variables → Actions**
2. **Onglet "Variables"**
3. **"New repository variable"**

### Variables Recommandées

| Variable | Description | Exemple |
|----------|-------------|---------|
| `STAGING_URL` | URL staging (si non secret) | `staging.teensparty.ma` |
| `PROD_URL` | URL production (si non secret) | `teensparty.ma` |
| `NODE_VERSION` | Version Node.js | `20` |

---

## 🔧 Configuration par Environnement

### Production Environment

1. **Settings → Environments**
2. **Créer "production"** (si n'existe pas)
3. **Ajouter les secrets spécifiques à la production:**

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
PROD_URL
```

### Staging Environment (Optionnel)

1. **Créer "staging"**
2. **Ajouter les secrets:**

```
STAGING_URL
NEXT_PUBLIC_SUPABASE_URL (peut être différent pour staging)
NEXT_PUBLIC_SUPABASE_ANON_KEY (peut être différent pour staging)
```

---

## ✅ Checklist de Configuration

### Secrets Vercel
- [ ] `VERCEL_TOKEN` créé
- [ ] `VERCEL_ORG_ID` créé
- [ ] `VERCEL_PROJECT_ID` créé

### Secrets Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` créé
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` créé

### URLs
- [ ] `STAGING_URL` créé (secret ou variable)
- [ ] `PROD_URL` créé (secret ou variable)

### Environnements
- [ ] Environment "production" créé
- [ ] Environment "staging" créé (optionnel)
- [ ] Secrets assignés aux environnements

---

## 🧪 Tester la Configuration

### Test 1: Vérifier les Secrets

```bash
# Dans un workflow GitHub Actions, ajouter:
- name: Test Secrets
  run: |
    echo "Vercel Token: ${{ secrets.VERCEL_TOKEN != '' && 'OK' || 'MISSING' }}"
    echo "Supabase URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL != '' && 'OK' || 'MISSING' }}"
```

### Test 2: Déclencher un Workflow

1. **Créer une PR** vers `main` ou `develop`
2. **Vérifier que les workflows se déclenchent**
3. **Vérifier les logs** pour les erreurs de secrets

---

## 🔄 Mise à Jour des Secrets

### Mettre à jour un Secret

1. **Settings → Secrets and variables → Actions**
2. **Trouver le secret**
3. **Cliquer sur "Update"**
4. **Entrer la nouvelle valeur**
5. **Save**

### Rotation des Secrets

**Recommandation:** Rotation tous les 90 jours

1. Générer nouveau token/secret
2. Mettre à jour dans GitHub
3. Mettre à jour dans Vercel (si nécessaire)
4. Tester le déploiement
5. Supprimer l'ancien secret

---

## 🚨 Troubleshooting

### Secret non trouvé

**Erreur:** `Secret not found`

**Solutions:**
1. Vérifier le nom exact du secret (case-sensitive)
2. Vérifier que le secret est dans le bon environnement
3. Vérifier les permissions du workflow

### Token Vercel expiré

**Erreur:** `Vercel authentication failed`

**Solutions:**
1. Générer un nouveau token
2. Mettre à jour `VERCEL_TOKEN`
3. Vérifier les permissions du token

### URL incorrecte

**Erreur:** `Health checks failed`

**Solutions:**
1. Vérifier que `STAGING_URL` et `PROD_URL` sont corrects
2. Vérifier que les URLs sont accessibles
3. Vérifier le format (avec ou sans `https://`)

---

## 📚 Ressources

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel CLI Authentication](https://vercel.com/docs/cli#authentication)
- [Supabase API Keys](https://supabase.com/docs/guides/api)

---

## 🔐 Sécurité

### Bonnes Pratiques

- ✅ **Ne jamais commiter les secrets** dans le code
- ✅ **Utiliser des secrets différents** pour staging/prod
- ✅ **Rotation régulière** des tokens
- ✅ **Limiter les permissions** des tokens
- ✅ **Audit régulier** des secrets

### Permissions Minimales

- **VERCEL_TOKEN:** Scope limité au projet uniquement
- **Supabase Keys:** Utiliser `anon` key (pas `service_role`)

---

**Questions?** Créer une issue GitHub ou contacter l'équipe DevOps.

