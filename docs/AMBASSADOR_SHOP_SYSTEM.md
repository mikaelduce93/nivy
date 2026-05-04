# 🎁 Système de Shop pour Ambassadeurs

## Vue d'ensemble

Le système de shop permet aux ambassadeurs d'échanger leurs points contre des récompenses physiques et digitales (tech, expériences, merch, cartes cadeaux).

---

## 📁 Structure

### Pages
- **`app/ambassador/boutique/page.tsx`** : Interface principale du shop
  - Affichage des récompenses par catégorie
  - Historique des échanges
  - Gestion des points

### API Routes
- **`app/api/ambassador/shop/redeem/route.ts`** : Échanger des points
  - `POST` : Créer un échange
  - `GET` : Récupérer l'historique

- **`app/api/ambassador/shop/rewards/route.ts`** : Catalogue de récompenses
  - `GET` : Liste des récompenses disponibles

- **`app/api/ambassador/shop/points/route.ts`** : Gestion des points
  - `GET` : Solde actuel et total gagné

### Base de données

#### Tables
1. **`ambassador_rewards`** : Catalogue de récompenses
   - `id`, `name`, `description`, `emoji`, `image_url`
   - `points_cost`, `category`, `stock`, `is_active`

2. **`ambassador_points`** : Solde de points
   - `ambassador_id`, `total_points`, `lifetime_points`

3. **`ambassador_points_ledger`** : Historique des transactions
   - `ambassador_id`, `points_amount`, `action_type`
   - `description`, `reference_id`, `reference_type`

4. **`ambassador_redemptions`** : Échanges effectués
   - `ambassador_id`, `reward_id`, `points_spent`
   - `status`, `delivery_address`, `tracking_number`

#### Fonctions PostgreSQL
- **`award_ambassador_points()`** : Attribuer des points
- **`redeem_ambassador_reward()`** : Échanger une récompense

---

## 🎯 Fonctionnalités

### 1. Affichage du Catalogue
- Filtrage par catégorie (tech, experience, merch, event, other)
- Affichage du coût en points
- Indicateur de stock disponible
- Barre de progression vers l'objectif

### 2. Échange de Récompenses
- Vérification du solde suffisant
- Vérification du stock disponible
- Saisie de l'adresse de livraison (si nécessaire)
- Confirmation et déduction des points

### 3. Historique
- Liste des échanges effectués
- Statut de chaque commande (pending, processing, shipped, delivered, cancelled)
- Suivi de livraison (tracking number)

### 4. Gestion des Points
- Affichage du solde actuel
- Total gagné (lifetime)
- Historique des transactions

---

## 🔐 Sécurité

### RLS Policies
- **Ambassadeurs** : Peuvent voir uniquement leurs propres points et échanges
- **Admins** : Accès complet pour la gestion
- **Public** : Peut voir le catalogue de récompenses actives

### Validation
- Vérification de l'authentification
- Vérification du statut d'ambassadeur (approved)
- Validation du solde avant échange
- Vérification du stock disponible

---

## 📊 Catégories de Récompenses

1. **Tech & Gaming** 🎮
   - PlayStation 5, Nintendo Switch
   - AirPods Pro, iPhone 15
   - Manettes, enceintes

2. **Expériences** ✨
   - Accès VIP à des événements
   - Expériences exclusives

3. **Merch** 👕
   - Vêtements et accessoires
   - Produits dérivés

4. **Events & Clubs** 🎟️
   - Entrées gratuites
   - Accès prioritaires

5. **Cartes Cadeaux** 💳
   - Roblox, PlayStation Store
   - Xbox, Nintendo eShop

---

## 🚀 Utilisation

### Pour les Ambassadeurs

1. **Accéder au shop** : `/ambassador/boutique`
2. **Parcourir les récompenses** : Filtrer par catégorie
3. **Échanger** : Cliquer sur une récompense et confirmer
4. **Suivre les commandes** : Onglet "Mes Commandes"

### Pour les Admins

1. **Gérer le catalogue** : Ajouter/modifier des récompenses dans Supabase
2. **Suivre les échanges** : Table `ambassador_redemptions`
3. **Mettre à jour les statuts** : processing → shipped → delivered
4. **Attribuer des points** : Utiliser `award_ambassador_points()`

---

## 🔧 API Endpoints

### POST `/api/ambassador/shop/redeem`
Échanger des points contre une récompense

**Body:**
```json
{
  "reward_id": "uuid",
  "delivery_address": "string (optionnel)",
  "delivery_notes": "string (optionnel)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "redemption_id": "uuid",
    "message": "Récompense échangée avec succès"
  }
}
```

### GET `/api/ambassador/shop/redeem?limit=20`
Récupérer l'historique des échanges

### GET `/api/ambassador/shop/rewards?category=tech&active_only=true`
Récupérer le catalogue de récompenses

### GET `/api/ambassador/shop/points`
Récupérer le solde de points

---

## 📝 Notes

- Les points sont déduits immédiatement lors de l'échange
- Le stock est mis à jour automatiquement
- Les récompenses nécessitant une livraison demandent une adresse
- Les expériences sont gérées manuellement par l'admin

---

## 🔄 Prochaines Améliorations

- [ ] Notifications email lors du changement de statut
- [ ] Système de wishlist
- [ ] Récompenses limitées dans le temps (promotions)
- [ ] Système de reviews/ratings
- [ ] Recommandations basées sur l'historique

---

**Dernière mise à jour** : Janvier 2025

