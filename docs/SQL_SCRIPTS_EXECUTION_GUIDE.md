# Guide d'Exécution des Scripts SQL

## Scripts à Exécuter (Ordre Important)

### Catégorie 1 - Nouvelles Pages
#### 1. Script 105: Create DJs and Campaigns Tables
**Fichier:** `scripts/105_create_djs_and_campaigns.sql`
**Description:** Crée toutes les tables nécessaires pour:
- Profils DJs (djs)
- Campagnes influenceurs (influencer_campaigns, campaign_assignments, campaign_performance)
- Galeries photos (photo_galleries, gallery_photos, photo_tags)
- Blog (blog_posts, post_categories, post_comments)
- FAQ (faq_categories, faq_questions)
- Témoignages (testimonials, video_testimonials)

**Dépendances:** Aucune
**RLS:** Activé sur toutes les tables

#### 2. Script 106: Seed DJs and Content Data
**Fichier:** `scripts/106_seed_djs_and_content.sql`
**Description:** Ajoute des données de démonstration:
- 4 DJs professionnels
- 4 campagnes influenceurs actives
- 6 albums photo avec 12 photos
- 3 articles de blog
- 8 catégories FAQ avec 24 questions
- 3 témoignages clients

**Dépendances:** 105
**Données:** Démo complète et réaliste

---

### P0 Sécurité
#### 3. Script 107: Add Critical RLS Policies
**Fichier:** `scripts/107_add_critical_rls_policies.sql`
**Description:** Ajoute les policies RLS manquantes critiques:
- Documents: users voient uniquement leurs docs
- Authorizations: parents voient uniquement leurs autorisations
- Admin tables: accessible uniquement aux admins
- Children: parents gèrent uniquement leurs enfants
- Bookings: users voient uniquement leurs réservations

**Dépendances:** Tables existantes (profiles, children, bookings, documents, authorizations)
**Sécurité:** CRITIQUE - Requis avant production

---

### P0 Opérationnel
#### 4. Script 108: Add Operational Features
**Fichier:** `scripts/108_add_operational_features.sql`
**Description:** Ajoute les fonctionnalités opérationnelles:
- Table e_signatures (signatures électroniques parentales)
- Table cin_uploads (CIN parents)
- Colonnes check-in améliorées (staff_name, notes)
- Index de performance
- Function purge_old_documents (RGPD J+30)

**Dépendances:** 107 (pour RLS)
**Fonctionnalités:** Check-in, E-signature, Purge RGPD

---

### P0 Paiements
#### 5. Script 109: Add Morocco Payment Methods
**Fichier:** `scripts/109_add_morocco_payments.sql`
**Description:** Ajoute les moyens de paiement locaux Maroc:
- Table payment_methods (enum étendu avec CMI, Mobile Money, Cash)
- Table cmi_transactions (paiements CMI)
- Table mobile_money_transactions (Orange, inwi, Maroc Telecom)
- Table cash_settlements (paiements cash ambassadeurs)
- Vues comptables pour exports

**Dépendances:** Tables bookings, profiles, ambassadors
**Paiements:** CMI, Orange Money, inwi Money, MT Cash, Cash ambassadeurs

---

## Comment Exécuter

### Option 1: Via Interface v0
Les scripts SQL dans le dossier `/scripts` peuvent être exécutés directement depuis l'interface v0.

### Option 2: Via Supabase Dashboard
1. Connectez-vous à votre projet Supabase
2. Allez dans SQL Editor
3. Copiez-collez chaque script dans l'ordre
4. Exécutez un par un
5. Vérifiez qu'il n'y a pas d'erreurs

### Option 3: Via CLI Supabase
Utilisez la commande push pour synchroniser les scripts avec votre base de données.

---

## Vérifications Post-Exécution

### Vérifier les Tables
Requête SQL pour vérifier que toutes les nouvelles tables existent dans le schéma public.

### Vérifier RLS
Requête SQL pour vérifier que la sécurité au niveau des lignes est activée sur les tables.

### Vérifier les Données
Requête SQL pour compter les enregistrements de démonstration insérés.

### Tester les Policies
Testez en vous connectant comme utilisateur normal et vérifiez que vous ne pouvez pas accéder aux données d'autres utilisateurs.

---

## Rollback en Cas d'Erreur

Si un script échoue, vous pouvez supprimer les tables dans l'ordre inverse avec CASCADE.

---

## Variables d'Environnement Requises

Après exécution des scripts, ajoutez ces variables dans Vercel:

**CMI Payment Gateway:**
- CMI_MERCHANT_ID
- CMI_SECRET_KEY
- CMI_API_URL

**Mobile Money:**
- ORANGE_MONEY_API_KEY
- INWI_MONEY_API_KEY
- MAROC_TELECOM_API_KEY

**CRON Job:**
- CRON_SECRET

---

## Ordre de Priorité

1. **CRITIQUE - Exécuter en premier:**
   - 107 (RLS Policies) - Sécurité essentielle

2. **HAUTE PRIORITÉ:**
   - 105, 106 (Pages Catégorie 1) - Fonctionnalités visibles
   - 108 (Opérationnel) - Check-in et E-signature

3. **PRIORITÉ NORMALE:**
   - 109 (Paiements Maroc) - Peut attendre configuration APIs

---

## Contact Support

Si vous rencontrez des erreurs lors de l'exécution:
1. Notez le numéro du script et le message d'erreur exact
2. Vérifiez les dépendances (tables existantes)
3. Contactez le support avec les logs complets

---

**Date de création:** 2025-01-15
**Version:** 1.0
**Statut:** Prêt pour exécution
