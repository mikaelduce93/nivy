# 📚 Guide d'Exécution des Migrations DB

## 🎯 Objectif
Ce guide vous permet de vérifier et configurer votre base de données Supabase pour que toutes les fonctionnalités de TeensParty Morocco soient opérationnelles.

---

## 📋 Prérequis

1. Accès au **Supabase Dashboard** de votre projet
2. Accès au **SQL Editor** de Supabase
3. Fichier `.env.local` configuré avec:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔍 Étape 1: Vérification de l'État Actuel

### Option A: Via SQL Editor
1. Ouvrez Supabase → SQL Editor
2. Copiez-collez le contenu de `scripts/VERIFICATION_COMPLETE.sql`
3. Exécutez et analysez les résultats

### Option B: Via Script Node
```bash
npm run migrate:p0 -- --check-only
```

---

## 📊 Résultats Attendus

| Table | Status Attendu | Migration Source |
|-------|----------------|------------------|
| `profiles` | ✅ EXISTS | Base Supabase Auth |
| `teens` | ✅ EXISTS | 021_refactor_parent_teen_architecture |
| `events` | ✅ EXISTS + Data | 100_seed_real_events |
| `clubs` | ✅ EXISTS + Data | 101_seed_real_clubs |
| `schools` | ✅ EXISTS + 10 seeds | 115_add_teen_profiles_fields |
| `interests` | ✅ EXISTS + 23 seeds | 115_add_teen_profiles_fields |
| `anniv_packs` | ✅ EXISTS + 6 seeds | 116_create_anniversaires_system |
| `anniv_extras` | ✅ EXISTS + 12 seeds | 116_create_anniversaires_system |
| `user_xp` | ✅ EXISTS | 000_base_tables (gamification) |
| `circles` | ✅ EXISTS | 023_circles_system |
| `friend_connections` | ✅ EXISTS | 024_friends_system |
| `feed_posts` | ✅ EXISTS | 025_activity_feed |
| `subscription_plans` | ✅ EXISTS | 027_premium_subscriptions |
| `token_rewards` | ✅ EXISTS | 028_tokens_rewards_system |

---

## 🚀 Étape 2: Exécution des Migrations

### Ordre d'Exécution Recommandé

#### Phase 1: Core (si pas déjà fait)
```
scripts/021_refactor_parent_teen_architecture.sql
```

#### Phase 2: P0 - MVP Critical
```
scripts/115_add_teen_profiles_fields.sql  → Schools, Interests, Teen fields
scripts/116_create_anniversaires_system.sql  → Packs, Extras, Orders
scripts/117_pass_system_and_gamification.sql  → Pass, XP, Streaks
```

#### Phase 3: Gamification Base
```
gamification-system/database/migrations/000_base_tables.sql
gamification-system/database/migrations/001_achievements_system.sql
gamification-system/database/migrations/002_leaderboard_system.sql
gamification-system/database/migrations/003_missions_system.sql
gamification-system/database/migrations/004_rewards_shop.sql
```

#### Phase 4: P2 Features
```
gamification-system/database/migrations/022_pillars_system.sql
gamification-system/database/migrations/023_circles_system.sql
gamification-system/database/migrations/024_friends_system.sql
gamification-system/database/migrations/025_activity_feed.sql
gamification-system/database/migrations/026_social_sharing.sql
gamification-system/database/migrations/027_premium_subscriptions.sql
gamification-system/database/migrations/028_tokens_rewards_system.sql
```

---

## 🛠️ Exécution Manuelle

### Pour chaque fichier SQL:

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Cliquez sur **New Query**
3. Copiez le contenu du fichier SQL
4. Cliquez sur **Run** (ou Ctrl+Enter)
5. Vérifiez qu'il n'y a pas d'erreurs

### Gestion des Erreurs Courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `relation "X" already exists` | Table déjà créée | Ignorer, c'est OK |
| `column "X" of relation "Y" already exists` | Colonne déjà ajoutée | Ignorer, c'est OK |
| `violates foreign key constraint` | Dépendance manquante | Exécuter la migration parent d'abord |
| `permission denied` | Pas de service role | Utiliser service_role key |

---

## ✅ Étape 3: Vérification Post-Migration

### Requêtes de Vérification Rapide

```sql
-- Vérifier les schools (doit retourner ~10)
SELECT COUNT(*) FROM public.schools WHERE is_active = true;

-- Vérifier les interests (doit retourner ~23)
SELECT COUNT(*) FROM public.interests WHERE is_active = true;

-- Vérifier les packs anniversaires (doit retourner 6)
SELECT COUNT(*) FROM public.anniv_packs WHERE is_active = true;

-- Vérifier les extras (doit retourner ~12)
SELECT COUNT(*) FROM public.anniv_extras WHERE is_active = true;

-- Vérifier les pillars dans user_xp
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_xp'
AND column_name IN ('school_score', 'sport_score', 'crea_score');
```

---

## 📱 Étape 4: Test Fonctionnel

### Test 1: Créer un Teen (Parent Dashboard)
1. Connectez-vous en tant que parent
2. Allez sur `/parent/teens/add`
3. Vérifiez que:
   - [ ] La liste des écoles s'affiche
   - [ ] Les centres d'intérêt s'affichent
   - [ ] Le formulaire se soumet correctement

### Test 2: Anniversaires
1. Allez sur `/anniversaires`
2. Vérifiez que:
   - [ ] Les packs s'affichent (6 packs)
   - [ ] Les extras s'affichent
   - [ ] Le calcul de prix fonctionne

### Test 3: Gamification
1. Connectez-vous en tant que teen
2. Allez sur `/teen`
3. Vérifiez que:
   - [ ] L'XP s'affiche
   - [ ] Les achievements se chargent
   - [ ] Les missions s'affichent

---

## 🔧 Script Automatique

Pour exécuter toutes les migrations P0 automatiquement:

```bash
# Vérifier d'abord
npm run migrate:p0 -- --dry-run

# Exécuter
npm run migrate:p0
```

**Note:** Le script nécessite `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`

---

## 📊 Checklist Finale

### Core
- [ ] `profiles` table existe
- [ ] `teens` table avec champs enrichis
- [ ] `events` table avec données
- [ ] `bookings` table existe

### P0 - MVP
- [ ] `schools` table avec 10 écoles
- [ ] `interests` table avec 23 centres d'intérêt
- [ ] `anniv_packs` table avec 6 packs
- [ ] `anniv_extras` table avec 12 extras
- [ ] Triggers anniversaires fonctionnels

### Gamification
- [ ] `user_xp` avec colonnes pillars
- [ ] `user_coins` table
- [ ] `achievements` table seedée
- [ ] `missions` table seedée
- [ ] `shop_rewards` table seedée

### P2 - Communauté
- [ ] `circles` table
- [ ] `friend_connections` table
- [ ] `feed_posts` table
- [ ] `social_shares` table

### P2 - Premium/Tokens
- [ ] `subscription_plans` table
- [ ] `token_rewards` table
- [ ] `token_transactions` table

---

## 🆘 Support

Si vous rencontrez des problèmes:

1. Vérifiez les logs Supabase → Logs → Postgres
2. Exécutez `scripts/VERIFICATION_COMPLETE.sql` pour diagnostic
3. Consultez les fichiers migration individuels pour comprendre les dépendances

---

*Dernière mise à jour: Janvier 2026*
