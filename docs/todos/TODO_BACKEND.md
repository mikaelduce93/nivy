# ⚙️ TODO BACKEND - Toutes les Tâches API/Server

**Progression:** 0/45 tâches (0%)

---

## 📋 SECTION P0: CRITIQUE (MVP)

### 1. API Paiement Hybride
**Fichier:** `app/api/payments/hybrid/route.ts` (à créer)  
**Référence:** Voir `TODO_P0_CRITIQUE.md` Section 2.1

- [ ] Tâche 2.1.1 à 2.1.8 (voir TODO_P0_CRITIQUE.md)

### 2. Intégration CMI
**Fichier:** `app/api/payments/cmi/`  
**Référence:** Voir `TODO_P0_CRITIQUE.md` Section 2.2

- [ ] Tâche 2.2.1 à 2.2.5 (voir TODO_P0_CRITIQUE.md)

### 3. Mobile Money
**Fichier:** `app/api/payments/mobile-money/`  
**Référence:** Voir `TODO_P0_CRITIQUE.md` Section 2.3

- [ ] Tâche 2.3.1 à 2.3.5 (voir TODO_P0_CRITIQUE.md)

### 4. Webhooks Stripe
**Fichier:** `app/api/webhooks/stripe/route.ts`  
**Référence:** Voir `TODO_P0_CRITIQUE.md` Section 2.4

- [ ] Tâche 2.4.1 à 2.4.5 (voir TODO_P0_CRITIQUE.md)

---

## 📋 SECTION P1: IMPORTANT

### 5. API Validation Notes Scolaires
**Fichier:** `app/api/parent/grades/route.ts` (à créer)  
**Durée:** 3-4h

- [ ] **Tâche 5.1:** Créer API route validation notes
  - [ ] Créer `app/api/parent/grades/route.ts`
  - [ ] GET: récupérer notes en attente
  - [ ] POST: valider/rejeter note
  - [ ] Validation: parent peut uniquement valider ses enfants
  - [ ] RLS policies

- [ ] **Tâche 5.2:** Calculer score pilier École
  - [ ] Fonction PostgreSQL `calculate_school_score(teen_id)`
  - [ ] Formule basée sur: notes, quiz, tutos
  - [ ] Mettre à jour `user_xp.school_score`
  - [ ] Trigger automatique après validation note

- [ ] **Tâche 5.3:** Notifications validation
  - [ ] Envoyer notification teen quand note validée
  - [ ] Email parent (optionnel)
  - [ ] XP bonus si note améliorée
  - [ ] Logger action

**Sous-total:** 3-4h

---

### 6. API Dashboard Temps Réel
**Fichier:** `app/api/parent/live/route.ts` (à créer)  
**Durée:** 4-5h

- [ ] **Tâche 6.1:** Créer API route temps réel
  - [ ] Créer `app/api/parent/live/route.ts`
  - [ ] GET: récupérer statut teen en temps réel
  - [ ] WebSocket ou polling (choisir stratégie)
  - [ ] Validation: parent peut uniquement voir ses enfants
  - [ ] RLS policies

- [ ] **Tâche 6.2:** Implémenter WebSocket (optionnel)
  - [ ] Utiliser Supabase Realtime
  - [ ] Subscribe à `check_in_logs` changes
  - [ ] Envoyer updates en temps réel
  - [ ] Gérer déconnexions

- [ ] **Tâche 6.3:** API demande check-out anticipé
  - [ ] POST: créer demande check-out
  - [ ] Envoyer notification au staff
  - [ ] Mettre à jour statut booking
  - [ ] Logger action

**Sous-total:** 4-5h

---

### 7. API Export PDF
**Fichier:** `app/api/parent/export-pdf/route.ts` (à créer)  
**Durée:** 3-4h

- [ ] **Tâche 7.1:** Créer API route export PDF
  - [ ] Créer `app/api/parent/export-pdf/route.ts`
  - [ ] POST: générer PDF avec paramètres
  - [ ] Validation: parent peut uniquement exporter ses données
  - [ ] RLS policies

- [ ] **Tâche 7.2:** Générer PDF historique
  - [ ] Installer `pdfkit` ou `jspdf`
  - [ ] Créer template PDF
  - [ ] Récupérer données transactions
  - [ ] Générer PDF avec données
  - [ ] Retourner PDF en stream

- [ ] **Tâche 7.3:** Cache PDF générés
  - [ ] Cache PDF pour éviter régénération
  - [ ] Invalider cache si nouvelles transactions
  - [ ] Stocker temporairement (24h)
  - [ ] Optimiser performance

**Sous-total:** 3-4h

---

### 8. API Circles (Communauté)
**Fichier:** `app/api/circles/route.ts` (à créer)  
**Durée:** 6-8h

- [ ] **Tâche 8.1:** Créer API route circles
  - [ ] Créer `app/api/circles/route.ts`
  - [ ] GET: récupérer circles disponibles
  - [ ] POST: créer message dans circle
  - [ ] DELETE: supprimer message (modération)
  - [ ] RLS policies

- [ ] **Tâche 8.2:** Auto-modération messages
  - [ ] Liste mots interdits en DB
  - [ ] Fonction PostgreSQL `moderate_message(content)`
  - [ ] Remplacer mots interdits par ***
  - [ ] Logger tentatives

- [ ] **Tâche 8.3:** Intégration Supabase Realtime
  - [ ] Subscribe à `circle_messages` changes
  - [ ] Envoyer nouveaux messages en temps réel
  - [ ] Gérer déconnexions
  - [ ] Optimiser performance

- [ ] **Tâche 8.4:** API signalement messages
  - [ ] POST: signaler message
  - [ ] Créer entrée dans `moderation_reports`
  - [ ] Notification admin
  - [ ] Logger action

**Sous-total:** 6-8h

---

## 📋 SECTION P2: SCALABILITÉ

### 9. Pagination APIs
**Fichiers:** Toutes les API routes avec listes  
**Durée:** 8-10h

- [ ] **Tâche 9.1:** Pagination événements
  - [ ] Modifier `GET /api/events`
  - [ ] Ajouter params: `page`, `limit`
  - [ ] Retourner: `{ data, pagination: { page, limit, total, pages } }`
  - [ ] Tester avec grandes listes

- [ ] **Tâche 9.2:** Pagination bookings
  - [ ] Modifier `GET /api/bookings`
  - [ ] Même logique pagination
  - [ ] Optimiser query avec LIMIT/OFFSET
  - [ ] Tester performance

- [ ] **Tâche 9.3:** Pagination utilisateurs (admin)
  - [ ] Modifier `GET /api/admin/users`
  - [ ] Pagination + recherche
  - [ ] Filtres: role, status
  - [ ] Tester avec 1000+ users

- [ ] **Tâche 9.4:** Pagination leaderboard
  - [ ] Modifier `GET /api/gamification/leaderboard`
  - [ ] Pagination par tranches de 50
  - [ ] Cache résultats (5 min)
  - [ ] Tester performance

- [ ] **Tâche 9.5:** Cursor-based pagination (optionnel)
  - [ ] Pour très grandes listes
  - [ ] Utiliser cursor au lieu de page
  - [ ] Meilleure performance
  - [ ] Implémenter si nécessaire

**Sous-total:** 8-10h

---

### 10. Caching API Responses
**Fichier:** `lib/cache/` (à créer)  
**Durée:** 6-8h

- [ ] **Tâche 10.1:** Créer système cache
  - [ ] Créer `lib/cache/redis.ts` ou utiliser mémoire
  - [ ] Wrapper pour cache get/set
  - [ ] TTL configurable
  - [ ] Invalidation cache

- [ ] **Tâche 10.2:** Cache événements
  - [ ] Cache liste événements (5 min)
  - [ ] Cache détails événement (10 min)
  - [ ] Invalider si événement modifié
  - [ ] Mesurer gains performance

- [ ] **Tâche 10.3:** Cache leaderboard
  - [ ] Cache leaderboard (5 min)
  - [ ] Invalider si nouveau score
  - [ ] Optimiser requêtes
  - [ ] Mesurer gains

- [ ] **Tâche 10.4:** Cache stats utilisateur
  - [ ] Cache stats teen (1 min)
  - [ ] Cache stats parent (5 min)
  - [ ] Invalider si action modifie stats
  - [ ] Optimiser

**Sous-total:** 6-8h

---

### 11. Queue System pour Tâches Asynchrones
**Fichier:** `lib/queue/` (à créer)  
**Durée:** 8-10h

- [ ] **Tâche 11.1:** Setup queue system
  - [ ] Choisir solution (Bull, BullMQ, ou simple DB queue)
  - [ ] Créer table `job_queue` en DB
  - [ ] Worker pour traiter jobs
  - [ ] Gérer retries et erreurs

- [ ] **Tâche 11.2:** Queue emails
  - [ ] Mettre emails en queue
  - [ ] Worker envoie emails
  - [ ] Retry si échec
  - [ ] Logger résultats

- [ ] **Tâche 11.3:** Queue notifications push
  - [ ] Mettre notifications en queue
  - [ ] Worker envoie notifications
  - [ ] Gérer tokens invalides
  - [ ] Logger résultats

- [ ] **Tâche 11.4:** Queue génération PDF
  - [ ] Mettre génération PDF en queue
  - [ ] Worker génère PDF
  - [ ] Notifier user quand prêt
  - [ ] Nettoyer fichiers temporaires

- [ ] **Tâche 11.5:** Queue calculs lourds
  - [ ] Calcul leaderboard
  - [ ] Calcul stats globales
  - [ ] Génération rapports
  - [ ] Optimiser performance

**Sous-total:** 8-10h

---

### 12. API Versioning
**Fichier:** Structure API  
**Durée:** 4-5h

- [ ] **Tâche 12.1:** Structure versioning
  - [ ] Créer routes `/api/v1/*`
  - [ ] Garder routes actuelles pour compatibilité
  - [ ] Documenter versions
  - [ ] Planifier migration

- [ ] **Tâche 12.2:** Middleware versioning
  - [ ] Détecter version depuis header ou URL
  - [ ] Router vers bonne version
  - [ ] Gérer versions obsolètes
  - [ ] Logger usage versions

- [ ] **Tâche 12.3:** Documentation versions
  - [ ] Documenter changements par version
  - [ ] Guide migration
  - [ ] Dates dépréciation
  - [ ] Communication users

**Sous-total:** 4-5h

---

## 📋 SECTION P2: OPTIMISATIONS DB

### 13. Index Optimisés
**Fichier:** Scripts SQL  
**Durée:** 4-5h

- [ ] **Tâche 13.1:** Analyser queries lentes
  - [ ] Activer `pg_stat_statements`
  - [ ] Identifier queries > 200ms
  - [ ] Analyser plans d'exécution
  - [ ] Documenter findings

- [ ] **Tâche 13.2:** Créer index manquants
  - [ ] Index sur `bookings.parent_id`
  - [ ] Index sur `bookings.event_id`
  - [ ] Index sur `check_in_logs.booking_id`
  - [ ] Index composites si nécessaire

- [ ] **Tâche 13.3:** Optimiser index existants
  - [ ] Vérifier index inutilisés
  - [ ] Supprimer index redondants
  - [ ] Optimiser index composites
  - [ ] Mesurer gains

- [ ] **Tâche 13.4:** Index partiels
  - [ ] Index sur `bookings.status = 'confirmed'`
  - [ ] Index sur `events.date > NOW()`
  - [ ] Réduire taille index
  - [ ] Optimiser performance

**Sous-total:** 4-5h

---

### 14. Connection Pooling
**Fichier:** Configuration Supabase  
**Durée:** 2-3h

- [ ] **Tâche 14.1:** Configurer pooling Supabase
  - [ ] Vérifier configuration pooling
  - [ ] Ajuster pool size selon charge
  - [ ] Configurer timeout
  - [ ] Monitorer utilisation

- [ ] **Tâche 14.2:** Optimiser connexions
  - [ ] Réutiliser connexions
  - [ ] Éviter connexions multiples
  - [ ] Gérer déconnexions
  - [ ] Logger connexions

**Sous-total:** 2-3h

---

### 15. Archivage Données
**Fichier:** Scripts SQL  
**Durée:** 4-5h

- [ ] **Tâche 15.1:** Créer tables archivage
  - [ ] Créer `bookings_archive`
  - [ ] Créer `check_in_logs_archive`
  - [ ] Structure identique tables principales
  - [ ] Index pour recherche

- [ ] **Tâche 15.2:** Script archivage automatique
  - [ ] Fonction PostgreSQL `archive_old_data()`
  - [ ] Archiver bookings > 1 an
  - [ ] Archiver logs > 6 mois
  - [ ] Cron job mensuel

- [ ] **Tâche 15.3:** API accès archives
  - [ ] API route pour accéder archives
  - [ ] Filtres et recherche
  - [ ] Pagination
  - [ ] Permissions admin uniquement

**Sous-total:** 4-5h

---

## 📊 RÉCAPITULATIF BACKEND

### Total Estimé
- **P0 Critique:** 16-21h
- **P1 Important:** 16-21h
- **P2 Scalabilité:** 30-41h

**TOTAL: 62-83h (8-10 jours à plein temps)**

### Progression
- [ ] P0: 0/4 sections (0%)
- [ ] P1: 0/4 sections (0%)
- [ ] P2: 0/7 sections (0%)

**TOTAL: 0/15 sections complétées (0%)**

---

*Dernière mise à jour: Décembre 2024*









