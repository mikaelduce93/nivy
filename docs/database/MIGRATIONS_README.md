# 🚀 GUIDE DES MIGRATIONS P0 - TEEN CLUB

## Vue d'ensemble

Ce dossier contient les migrations SQL pour transformer votre base de données et activer toutes les fonctionnalités P0 (priorité 0) nécessaires au lancement de la V1.

## 📋 Migrations incluses

### Migration 115: Profils enfants enrichis
**Fichier:** `scripts/115_add_teen_profiles_fields.sql`

**Ce qui est ajouté:**
- ✅ Champs `profiles`: city, relation_to_child
- ✅ Champs `teens`: pseudo (unique), avatar_url, school, grade_level, profiles, interests, allergies, photo_consent, exit_permission_rules
- ✅ Table `schools` (référentiel des écoles à Casablanca)
- ✅ Table `interests` (référentiel centres d'intérêt)
- ✅ Trigger de validation pseudo unique
- ✅ Contraintes (max 2 profils, profils autorisés)

**Résultat:** Les ados peuvent avoir un pseudo public, avatar, et profils personnalisés (School/Sport/Créa)

---

### Migration 116: Système anniversaires complet
**Fichier:** `scripts/116_create_anniversaires_system.sql`

**Ce qui est ajouté:**
- ✅ Table `anniv_packs` (packs Starter/Plus/VIP/Essentiel/Signature/Luxe)
- ✅ Table `anniv_extras` (options DJ, photo, déco, limousine, etc.)
- ✅ Table `anniv_orders` (commandes anniversaires)
- ✅ Table `anniv_order_extras` (liaison extras)
- ✅ 6 packs seedés (3 pour événements, 3 custom)
- ✅ 12 extras seedés
- ✅ Fonction auto-génération référence (ANNIV-XXXXXXXX)
- ✅ Trigger auto-calcul prix (invités supplémentaires + extras)

**Résultat:** Système complet pour gérer anniversaires pendant events et sur mesure

---

### Migration 117: Pass & Gamification
**Fichier:** `scripts/117_pass_system_and_gamification.sql`

**Ce qui est ajouté:**

**Partie 1 - Pass amélioré:**
- ✅ Nouvelles colonnes `vip_cards`: monthly_events_included, partner_discount_percentage, priority_booking_hours, stripe_subscription_id
- ✅ Table `vip_card_usage` (tracking utilisation Pass)
- ✅ Fonction `has_active_vip_pass(user_id)` → retourne true/false
- ✅ Fonction `get_user_vip_tier(user_id)` → retourne 'standard', 'gold' ou 'platinum'
- ✅ Fonction `calculate_price_with_pass(base_price, user_id, item_type)` → applique réduction

**Partie 2 - Gamification:**
- ✅ Table `user_xp` (XP et niveau par ado)
- ✅ Table `xp_ledger` (historique gains XP)
- ✅ Table `user_streaks` (streaks jours consécutifs)
- ✅ Table `challenges_templates` (templates défis quotidiens)
- ✅ Table `user_challenges` (défis assignés/complétés)
- ✅ 12 défis seedés (4 School, 4 Sport, 4 Créa)
- ✅ Fonction `add_xp_to_user(teen_id, xp_amount, reason)` → ajoute XP
- ✅ Fonction `update_user_streak(teen_id)` → met à jour streak
- ✅ **Fonction principale** `register_user_action(teen_id, action_type, xp_amount, data)` → XP + Streak en 1 appel

**Résultat:** Système complet Pass + base gamification (XP, niveau, streak, défis quotidiens)

---

## 🔧 Méthodes d'exécution

### Option A: Automatique (Recommandé)

```bash
# Exécuter toutes les migrations automatiquement
npm run migrate:p0
```

**Avantages:**
- ✅ Exécution automatisée
- ✅ Détection migrations déjà exécutées
- ✅ Tracking dans table `schema_migrations`
- ✅ Messages d'erreur clairs

**Prérequis:**
- Variables d'environnement dans `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

### Option B: Manuelle (SQL Editor)

```bash
# Afficher les instructions
npm run migrate:manual
```

**Étapes:**
1. Ouvrez le [Dashboard Supabase](https://app.supabase.com)
2. Allez dans **SQL Editor**
3. Créez une nouvelle query
4. Copiez-collez le contenu de chaque fichier **dans l'ordre**:
   - `scripts/115_add_teen_profiles_fields.sql`
   - `scripts/116_create_anniversaires_system.sql`
   - `scripts/117_pass_system_and_gamification.sql`
5. Cliquez sur **RUN** pour chaque fichier
6. Vérifiez qu'il n'y a pas d'erreurs

**Avantages:**
- ✅ Contrôle total
- ✅ Voir exactement ce qui se passe
- ✅ Pas de dépendances Node.js

---

## 📊 Vérification post-migration

Après avoir exécuté les migrations, vérifiez que tout est OK :

### 1. Vérifier tables créées

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'schools', 'interests',
  'anniv_packs', 'anniv_extras', 'anniv_orders', 'anniv_order_extras',
  'vip_card_usage',
  'user_xp', 'xp_ledger', 'user_streaks',
  'challenges_templates', 'user_challenges'
)
ORDER BY table_name;
```

**Résultat attendu:** 11 tables

---

### 2. Vérifier packs anniversaires seedés

```sql
SELECT id, name, pack_type, base_price, included_guests, is_active
FROM anniv_packs
ORDER BY display_order;
```

**Résultat attendu:** 6 packs (3 event + 3 custom)

---

### 3. Vérifier extras anniversaires seedés

```sql
SELECT name, category, price, is_active
FROM anniv_extras
ORDER BY price;
```

**Résultat attendu:** 12 extras

---

### 4. Vérifier défis quotidiens seedés

```sql
SELECT category, COUNT(*) as count
FROM challenges_templates
WHERE is_active = true
GROUP BY category;
```

**Résultat attendu:**
- school: 4
- sport: 4
- crea: 4

---

### 5. Tester fonction Pass

```sql
-- Remplacer USER_UUID par un vrai user_id
SELECT
  has_active_vip_pass('USER_UUID') as has_pass,
  get_user_vip_tier('USER_UUID') as tier,
  calculate_price_with_pass(100, 'USER_UUID', 'event') as discounted_price;
```

---

### 6. Tester fonction XP

```sql
-- Remplacer TEEN_UUID par un vrai teen_id
SELECT register_user_action(
  'TEEN_UUID'::uuid,
  'daily_challenge_school',
  10,
  '{"reference_type": "daily", "reference_id": null}'::jsonb
);
```

**Résultat attendu:** JSON avec xp, level, streak

---

## 🐛 Troubleshooting

### Erreur: "relation already exists"

**Cause:** La migration a déjà été partiellement exécutée.

**Solution:**
```sql
-- Vérifier ce qui existe déjà
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'anniv%' OR table_name LIKE 'user_%';

-- Option 1: Commenter les CREATE TABLE qui existent
-- Option 2: Supprimer et recommencer (DANGER!)
```

---

### Erreur: "permission denied"

**Cause:** Vous n'utilisez pas la SERVICE_ROLE_KEY.

**Solution:**
1. Allez dans Settings → API de Supabase
2. Copiez la `service_role key` (pas l'anon key)
3. Mettez-la dans `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

### Erreur: "function exec_sql does not exist"

**Cause:** La fonction helper n'existe pas encore.

**Solution:** Utilisez l'option manuelle (SQL Editor) au lieu de l'automatique.

---

## ✅ Checklist de validation

Avant de passer aux APIs, vérifiez :

- [ ] Migration 115 exécutée sans erreur
- [ ] Migration 116 exécutée sans erreur
- [ ] Migration 117 exécutée sans erreur
- [ ] 11 nouvelles tables créées
- [ ] 6 packs anniversaires dans `anniv_packs`
- [ ] 12 extras dans `anniv_extras`
- [ ] 12 défis dans `challenges_templates`
- [ ] Fonction `register_user_action` testée et fonctionne
- [ ] Fonction `calculate_price_with_pass` testée et fonctionne

---

## 🚀 Prochaines étapes

Une fois les migrations validées :

1. **Créer les APIs** (Server Actions)
   - `app/actions/teens.ts` - CRUD profils enrichis
   - `app/actions/anniversaires.ts` - Créer commandes anniv
   - `app/actions/pass.ts` - Souscription + vérification
   - `app/actions/gamification.ts` - XP, streak, daily challenges

2. **Modifier les pages Front**
   - `app/profile/enfants/ajouter/page.tsx` - Formulaire enrichi
   - `app/anniversaires/page.tsx` - Connexion APIs
   - `app/carte-vip/souscrire/page.tsx` - Paiement Pass
   - `app/daily/page.tsx` - Page défis quotidiens (nouveau)

3. **Créer pages Admin**
   - `app/admin/anniversaires/page.tsx` - Gestion packs/commandes
   - `app/admin/gamification/page.tsx` - Stats XP/challenges

4. **Tests complets**
   - Parcours parent: créer enfant avec pseudo/avatar
   - Parcours anniversaire: commander pack
   - Parcours Pass: souscrire → booking avec réduction
   - Parcours ado: compléter défi quotidien → XP + streak

---

## 📞 Support

En cas de problème :
1. Vérifiez les logs de la console
2. Consultez les erreurs Supabase (Database → Logs)
3. Relisez ce README
4. Exécutez manuellement via SQL Editor si automatique échoue

---

**Créé le:** 2025-11-30
**Version:** 1.0.0
**Status:** ✅ Prêt pour production
