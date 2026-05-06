# 🔴 TODO P0 - CRITIQUE (MVP Bloquant)

> **Statut verifie 2026-05-06**: ce backlog peut etre obsolete. Voir `docs/audits/AUDIT_E2E_DOUBLONS_HARDCODE_SCAFFOLD.md` pour l'etat verifie a cette date, et `docs/RELEASE_CHECKLIST.md` pour la checklist active.

**Priorité:** MAXIMALE  
**Objectif:** Rendre le produit fonctionnel pour lancement  
**Durée estimée:** 55-71h (7-9 jours)  
**Progression:** 0/45 tâches (0%)

---

## 📋 SECTION 1: FRONTEND CONNECTÉ AUX APIs

### 1.1 Formulaire Enfant Enrichi
**Fichier:** `app/parent/teens/add/page.tsx`  
**Durée:** 4-5h  
**Prérequis:** Migration 115 exécutée

- [ ] **Tâche 1.1.1:** Ajouter champ pseudo avec validation async
  - [ ] Importer `checkPseudoAvailable` depuis `app/actions/teens.ts`
  - [ ] Ajouter champ input avec debounce (300ms)
  - [ ] Afficher message "Pseudo disponible" / "Pseudo déjà pris"
  - [ ] Désactiver submit si pseudo invalide
  - [ ] Tester avec pseudo existant et nouveau

- [ ] **Tâche 1.1.2:** Implémenter upload avatar
  - [ ] Utiliser composant `PhotoUpload` existant
  - [ ] Ajouter compression image (max 1MB, 1920x1920)
  - [ ] Afficher preview avant upload
  - [ ] Appeler `uploadTeenAvatar(file, teenId)` après création
  - [ ] Gérer erreurs upload (affichage message)

- [ ] **Tâche 1.1.3:** Sélecteur école avec recherche
  - [ ] Appeler `getSchools()` pour récupérer liste
  - [ ] Créer dropdown avec recherche (combobox Radix UI)
  - [ ] Filtrer écoles par nom en temps réel
  - [ ] Sauvegarder `school_id` dans formulaire
  - [ ] Tester avec 10+ écoles

- [ ] **Tâche 1.1.4:** Multi-select profils (max 2)
  - [ ] Créer chips select avec options: ["School", "Sport", "Créa"]
  - [ ] Limiter à 2 sélections maximum
  - [ ] Afficher message si tentative 3ème sélection
  - [ ] Sauvegarder array `profiles[]` dans formulaire
  - [ ] Validation: au moins 1 profil requis

- [ ] **Tâche 1.1.5:** Multi-select centres d'intérêt
  - [ ] Appeler `getInterests()` pour récupérer liste
  - [ ] Créer tags select (multi-select avec chips)
  - [ ] Permettre sélection illimitée
  - [ ] Sauvegarder array `interests[]` dans formulaire
  - [ ] Afficher tags sélectionnés visuellement

- [ ] **Tâche 1.1.6:** Switch consentement photo
  - [ ] Ajouter Switch component (Radix UI)
  - [ ] Label: "Consentement photo/vidéo"
  - [ ] Sauvegarder boolean `photo_consent`
  - [ ] Afficher info tooltip expliquant usage

- [ ] **Tâche 1.1.7:** Textarea règles de sortie
  - [ ] Ajouter Textarea component
  - [ ] Label: "Règles de sortie (optionnel)"
  - [ ] Placeholder: "Ex: Sortie uniquement avec parent, avant 22h..."
  - [ ] Sauvegarder `exit_permission_rules`
  - [ ] Max 500 caractères

- [ ] **Tâche 1.1.8:** Contact d'urgence
  - [ ] Ajouter champs: nom, téléphone, relation
  - [ ] Validation téléphone (format marocain)
  - [ ] Sauvegarder `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relation`
  - [ ] Optionnel mais recommandé

- [ ] **Tâche 1.1.9:** Connecter à API `createTeen()`
  - [ ] Importer `createTeen` depuis `app/actions/teens.ts`
  - [ ] Préparer objet `input` avec tous les champs
  - [ ] Gérer loading state pendant création
  - [ ] Afficher success message + redirect vers `/parent/teens`
  - [ ] Gérer erreurs (affichage message détaillé)

- [ ] **Tâche 1.1.10:** Tests manuels complets
  - [ ] Tester création avec tous les champs remplis
  - [ ] Tester création avec champs minimaux
  - [ ] Tester validation pseudo unique
  - [ ] Tester upload avatar (fichier valide/invalide)
  - [ ] Vérifier données sauvegardées en DB

**Sous-total:** 4-5h

---

### 1.2 Anniversaires Connecté aux APIs
**Fichier:** `app/anniversaires/page.tsx`  
**Durée:** 6-8h  
**Prérequis:** Migration 116 exécutée

- [ ] **Tâche 1.2.1:** Connecter Step 2 (choix formule) à `getAnnivPacks()`
  - [ ] Importer `getAnnivPacks` depuis `app/actions/anniversaires.ts`
  - [ ] Appeler API dans useEffect avec type ('event' ou 'custom')
  - [ ] Afficher packs dans cards avec prix et détails
  - [ ] Gérer loading state
  - [ ] Gérer erreurs (fallback message)

- [ ] **Tâche 1.2.2:** Connecter Step 3 (extras) à `getAnnivExtras()`
  - [ ] Importer `getAnnivExtras` depuis `app/actions/anniversaires.ts`
  - [ ] Afficher extras en grid avec checkboxes
  - [ ] Afficher prix de chaque extra
  - [ ] Permettre sélection multiple
  - [ ] Sauvegarder sélection dans state

- [ ] **Tâche 1.2.3:** Utiliser `calculateAnnivPrice()` pour récap
  - [ ] Importer `calculateAnnivPrice` depuis `app/actions/anniversaires.ts`
  - [ ] Appeler API avec: pack_id, guest_count, extras[]
  - [ ] Afficher détail prix (pack + invités supplémentaires + extras)
  - [ ] Mettre à jour récap en temps réel
  - [ ] Afficher total final

- [ ] **Tâche 1.2.4:** Connecter paiement à `createAnnivOrder()`
  - [ ] Importer `createAnnivOrder` depuis `app/actions/anniversaires.ts`
  - [ ] Préparer objet `input` avec toutes les données
  - [ ] Gérer paiement Stripe (redirection checkout)
  - [ ] Après paiement, créer commande avec `createAnnivOrder()`
  - [ ] Gérer erreurs paiement

- [ ] **Tâche 1.2.5:** Afficher QR code après confirmation
  - [ ] Récupérer `anniv_order_id` après création
  - [ ] Générer QR code avec format: `ANNIV:ORDER_ID`
  - [ ] Afficher QR code dans page confirmation
  - [ ] Permettre téléchargement QR code (PNG)
  - [ ] Afficher référence commande (ANNIV-XXXXXXXX)

- [ ] **Tâche 1.2.6:** Gérer deux parcours (event vs custom)
  - [ ] Step 1: Choix type (pendant event / sur mesure)
  - [ ] Si "pendant event": afficher sélecteur événements
  - [ ] Si "sur mesure": afficher sélecteur lieux partenaires
  - [ ] Adapter wizard selon choix
  - [ ] Tester les deux parcours

- [ ] **Tâche 1.2.7:** Validation formulaire complète
  - [ ] Valider date anniversaire (futur, pas trop loin)
  - [ ] Valider nombre invités (min selon pack)
  - [ ] Valider sélection pack
  - [ ] Afficher erreurs validation claires
  - [ ] Désactiver submit si invalide

- [ ] **Tâche 1.2.8:** Tests manuels complets
  - [ ] Tester parcours "pendant event" (pack Starter)
  - [ ] Tester parcours "sur mesure" (pack Essentiel)
  - [ ] Tester avec extras (DJ + photographe)
  - [ ] Tester calcul prix (vérifier calculs)
  - [ ] Tester paiement Stripe
  - [ ] Vérifier commande créée en DB

**Sous-total:** 6-8h

---

### 1.3 Souscription Pass VIP
**Fichier:** `app/carte-vip/souscrire/page.tsx` (à créer)  
**Durée:** 4-5h  
**Prérequis:** Migration 117 exécutée

- [ ] **Tâche 1.3.1:** Créer page souscription Pass
  - [ ] Créer fichier `app/carte-vip/souscrire/page.tsx`
  - [ ] Layout avec header "Souscrire au Pass VIP"
  - [ ] 3 cards comparatif (Standard/Gold/Platinum)
  - [ ] Design cohérent avec reste de l'app
  - [ ] Responsive mobile

- [ ] **Tâche 1.3.2:** Form sélection tier
  - [ ] Radio group pour sélection tier
  - [ ] Afficher prix mensuel de chaque tier
  - [ ] Afficher avantages de chaque tier
  - [ ] Highlight tier sélectionné
  - [ ] Validation: tier requis

- [ ] **Tâche 1.3.3:** Afficher calculateur économies
  - [ ] Importer `calculatePassSavings` depuis `app/actions/pass.ts`
  - [ ] Appeler API avec tier et estimations (events/mois, clubs)
  - [ ] Afficher économies estimées par mois
  - [ ] Afficher break-even point
  - [ ] Graphique simple (optionnel)

- [ ] **Tâche 1.3.4:** Bouton souscrire → `subscribeToPass()` → Stripe
  - [ ] Importer `subscribeToPass` depuis `app/actions/pass.ts`
  - [ ] Préparer input avec tier sélectionné
  - [ ] Appeler API → récupérer `sessionId` Stripe
  - [ ] Rediriger vers Stripe Checkout
  - [ ] Gérer erreurs (affichage message)

- [ ] **Tâche 1.3.5:** Page confirmation après paiement
  - [ ] Créer `app/carte-vip/confirmation/page.tsx`
  - [ ] Récupérer `session_id` depuis query params
  - [ ] Appeler `confirmPassSubscription(sessionId)`
  - [ ] Afficher message success
  - [ ] Afficher détails Pass (tier, date expiration)
  - [ ] Bouton "Voir mon Pass"

- [ ] **Tâche 1.3.6:** Afficher carte VIP avec QR code
  - [ ] Générer QR code avec format: `VIP:USER_ID:TIER`
  - [ ] Afficher carte visuelle (design moderne)
  - [ ] Afficher QR code sur carte
  - [ ] Permettre téléchargement carte (PNG)
  - [ ] Afficher date expiration

- [ ] **Tâche 1.3.7:** Gérer Pass existant
  - [ ] Vérifier si user a déjà un Pass actif (`hasActivePass()`)
  - [ ] Si oui: afficher message "Vous avez déjà un Pass actif"
  - [ ] Afficher option "Renouveler" ou "Upgrade"
  - [ ] Gérer upgrade (Gold → Platinum)
  - [ ] Calculer prorata si nécessaire

- [ ] **Tâche 1.3.8:** Tests manuels complets
  - [ ] Tester souscription Gold
  - [ ] Tester souscription Platinum
  - [ ] Tester paiement Stripe
  - [ ] Vérifier Pass créé en DB
  - [ ] Tester calculateur économies
  - [ ] Vérifier QR code généré

**Sous-total:** 4-5h

---

### 1.4 Affichage Tarifs Pass sur Events/Clubs
**Fichiers:** `app/evenements/[id]/page.tsx`, `app/clubs/[slug]/page.tsx`  
**Durée:** 3-4h

- [ ] **Tâche 1.4.1:** Vérifier Pass actif sur page event
  - [ ] Importer `hasActivePass` et `getUserPassTier` depuis `app/actions/pass.ts`
  - [ ] Appeler APIs dans Server Component
  - [ ] Récupérer tier si Pass actif
  - [ ] Passer données au Client Component

- [ ] **Tâche 1.4.2:** Afficher prix normal vs prix Pass
  - [ ] Afficher prix normal (ex: 150 DH)
  - [ ] Si Pass actif: afficher prix réduit (ex: 120 DH avec Gold)
  - [ ] Badge "Votre prix Pass" si actif
  - [ ] Calculer économies (ex: -30 DH)
  - [ ] Design visuel clair (strikethrough prix normal)

- [ ] **Tâche 1.4.3:** Appliquer automatiquement lors booking
  - [ ] Dans `app/api/bookings/create/route.ts`
  - [ ] Vérifier Pass actif avant calcul prix
  - [ ] Appeler `calculatePriceWithPass(basePrice, userId, 'event')`
  - [ ] Utiliser prix réduit pour booking
  - [ ] Logger réduction appliquée

- [ ] **Tâche 1.4.4:** Tracker utilisation Pass après booking
  - [ ] Après création booking, appeler `trackPassUsage('event_booking', ...)`
  - [ ] Incrémenter `monthly_events_included` si applicable
  - [ ] Logger dans `vip_card_usage`
  - [ ] Gérer erreurs silencieusement

- [ ] **Tâche 1.4.5:** Répéter pour clubs
  - [ ] Même logique sur page club
  - [ ] Afficher prix normal vs prix Pass
  - [ ] Appliquer réduction lors inscription club
  - [ ] Tracker utilisation Pass

- [ ] **Tâche 1.4.6:** Tests manuels complets
  - [ ] Tester avec Pass Gold (réduction 20%)
  - [ ] Tester avec Pass Platinum (réduction 30%)
  - [ ] Tester sans Pass (prix normal)
  - [ ] Vérifier réduction appliquée en DB
  - [ ] Vérifier tracking utilisation

**Sous-total:** 3-4h

---

### 1.5 Admin - Gestion Anniversaires
**Fichier:** `app/admin/anniversaires/page.tsx` (à créer)  
**Durée:** 6-8h

- [ ] **Tâche 1.5.1:** Créer page admin anniversaires
  - [ ] Créer fichier `app/admin/anniversaires/page.tsx`
  - [ ] Layout avec tabs: "Packs", "Extras", "Commandes"
  - [ ] Design cohérent avec reste admin
  - [ ] Protection route admin (middleware)

- [ ] **Tâche 1.5.2:** Liste packs (tableau avec edit/delete)
  - [ ] Appeler `getAnnivPacks()` pour tous les packs
  - [ ] Afficher tableau avec colonnes: nom, type, prix, invités, actions
  - [ ] Bouton "Modifier" → ouvre modal
  - [ ] Bouton "Supprimer" → confirmation puis suppression
  - [ ] Gérer loading et erreurs

- [ ] **Tâche 1.5.3:** Form créer/modifier pack
  - [ ] Modal avec formulaire
  - [ ] Champs: nom, type (event/custom), prix, invités inclus, description
  - [ ] Validation formulaire
  - [ ] Appeler API création/modification
  - [ ] Refresh liste après action

- [ ] **Tâche 1.5.4:** Liste extras (tableau avec edit/delete)
  - [ ] Appeler `getAnnivExtras()` pour tous les extras
  - [ ] Afficher tableau avec colonnes: nom, prix, description, actions
  - [ ] Bouton "Modifier" → ouvre modal
  - [ ] Bouton "Supprimer" → confirmation puis suppression

- [ ] **Tâche 1.5.5:** Form créer/modifier extra
  - [ ] Modal avec formulaire
  - [ ] Champs: nom, prix, description, icône (optionnel)
  - [ ] Validation formulaire
  - [ ] Appeler API création/modification
  - [ ] Refresh liste après action

- [ ] **Tâche 1.5.6:** Liste commandes anniversaires
  - [ ] Query DB pour récupérer toutes commandes (`anniv_orders`)
  - [ ] Afficher tableau avec colonnes: référence, client, date, pack, prix, statut
  - [ ] Filtres: statut (pending/paid/cancelled), date
  - [ ] Pagination (20 par page)
  - [ ] Export CSV (optionnel)

- [ ] **Tâche 1.5.7:** Détails commande
  - [ ] Modal ou page dédiée avec détails complets
  - [ ] Afficher: infos client, pack sélectionné, extras, prix total
  - [ ] Afficher statut paiement
  - [ ] Actions: confirmer, annuler, marquer payé
  - [ ] Afficher QR code commande

- [ ] **Tâche 1.5.8:** Actions sur commandes
  - [ ] Bouton "Confirmer" → update status 'confirmed'
  - [ ] Bouton "Annuler" → update status 'cancelled' + raison
  - [ ] Bouton "Marquer payé" → update payment_status 'paid'
  - [ ] Envoyer email notification client
  - [ ] Logger action dans audit log

- [ ] **Tâche 1.5.9:** Tests manuels complets
  - [ ] Tester création pack
  - [ ] Tester modification pack
  - [ ] Tester suppression pack
  - [ ] Tester création extra
  - [ ] Tester visualisation commandes
  - [ ] Tester actions sur commandes

**Sous-total:** 6-8h

---

## 📋 SECTION 2: PAIEMENTS PRODUCTION

### 2.1 Paiement Hybride XP + DH
**Fichiers:** `app/reservation/paiement/page.tsx`, `app/api/payments/hybrid/route.ts` (à créer)  
**Durée:** 8-10h

- [ ] **Tâche 2.1.1:** Créer API route paiement hybride
  - [ ] Créer `app/api/payments/hybrid/route.ts`
  - [ ] Endpoint POST avec body: `{ bookingId, xpAmount, cashAmount }`
  - [ ] Validation: xpAmount + cashAmount = total
  - [ ] Vérifier solde XP suffisant
  - [ ] Retourner session Stripe si cashAmount > 0

- [ ] **Tâche 2.1.2:** Conversion XP → DH (1 XP = 0.10 DH)
  - [ ] Créer fonction `convertXPToDH(xpAmount)` dans `lib/payments/xp-converter.ts`
  - [ ] Formule: `dhAmount = xpAmount * 0.10`
  - [ ] Arrondir à 2 décimales
  - [ ] Tester avec différents montants

- [ ] **Tâche 2.1.3:** UI sélecteur pourcentage XP
  - [ ] Dans page paiement, ajouter slider ou boutons
  - [ ] Options: 0%, 25%, 50%, 75%, 100% XP
  - [ ] Calculer automatiquement montants XP et DH
  - [ ] Afficher récap: "X XP (Y DH) + Z DH = Total"
  - [ ] Validation: solde XP suffisant

- [ ] **Tâche 2.1.4:** Débiter XP lors paiement
  - [ ] Dans API route, appeler fonction débit XP
  - [ ] Créer entrée dans `xp_ledger` (type: 'purchase', amount: -xpAmount)
  - [ ] Mettre à jour `user_xp.total_xp` (déduire)
  - [ ] Logger transaction
  - [ ] Gérer erreurs (rollback si échec)

- [ ] **Tâche 2.1.5:** Traiter paiement DH restant
  - [ ] Si cashAmount > 0, créer session Stripe
  - [ ] Rediriger vers Stripe Checkout
  - [ ] Après paiement Stripe, confirmer booking
  - [ ] Si cashAmount = 0, confirmer booking directement

- [ ] **Tâche 2.1.6:** Approbation parentale si XP > seuil
  - [ ] Définir seuil (ex: 1000 XP = 100 DH)
  - [ ] Si xpAmount > seuil, créer `parental_approval`
  - [ ] Envoyer notification parent
  - [ ] Attendre approbation avant traitement
  - [ ] Afficher message "En attente approbation parent"

- [ ] **Tâche 2.1.7:** Afficher économies réalisées
  - [ ] Calculer: `economies = xpAmount * 0.10`
  - [ ] Afficher badge "Vous économisez X DH avec vos XP"
  - [ ] Afficher dans récap paiement
  - [ ] Sauvegarder dans booking (champ `xp_used`, `economies`)

- [ ] **Tâche 2.1.8:** Tests manuels complets
  - [ ] Tester paiement 100% XP
  - [ ] Tester paiement 50% XP + 50% DH
  - [ ] Tester paiement 100% DH (pas de XP)
  - [ ] Tester avec solde XP insuffisant
  - [ ] Tester approbation parentale
  - [ ] Vérifier débit XP en DB

**Sous-total:** 8-10h

---

### 2.2 Intégration CMI Complète
**Fichier:** `app/api/payments/cmi/create/route.ts`  
**Durée:** 3-4h

- [ ] **Tâche 2.2.1:** Configurer clés CMI production
  - [ ] Ajouter variables env: `CMI_MERCHANT_ID`, `CMI_SECRET_KEY`
  - [ ] Vérifier clés valides
  - [ ] Tester connexion API CMI
  - [ ] Documenter configuration

- [ ] **Tâche 2.2.2:** Générer hash CMI correct
  - [ ] Vérifier fonction `generateCMIHash()` dans `lib/payments/cmi.ts`
  - [ ] Tester avec données réelles
  - [ ] Vérifier format hash (SHA256)
  - [ ] Comparer avec documentation CMI

- [ ] **Tâche 2.2.3:** Créer session paiement CMI
  - [ ] Dans `app/api/payments/cmi/create/route.ts`
  - [ ] Préparer données selon format CMI
  - [ ] Générer hash
  - [ ] Rediriger vers URL CMI avec params
  - [ ] Gérer erreurs

- [ ] **Tâche 2.2.4:** Gérer callback CMI
  - [ ] Créer route `app/api/payments/cmi/callback/route.ts`
  - [ ] Vérifier hash retourné par CMI
  - [ ] Traiter statut paiement (success/failed)
  - [ ] Mettre à jour booking
  - [ ] Rediriger vers page confirmation

- [ ] **Tâche 2.2.5:** Tests en production
  - [ ] Tester avec carte de test CMI
  - [ ] Vérifier redirection vers CMI
  - [ ] Tester paiement réussi
  - [ ] Tester paiement échoué
  - [ ] Vérifier callback reçu

**Sous-total:** 3-4h

---

### 2.3 Mobile Money (Inwi/Orange)
**Fichier:** `app/api/payments/mobile-money/initiate/route.ts`  
**Durée:** 3-4h

- [ ] **Tâche 2.3.1:** Configurer APIs Mobile Money
  - [ ] Ajouter variables env: `INWI_API_KEY`, `ORANGE_API_KEY`
  - [ ] Vérifier clés valides
  - [ ] Tester connexion APIs
  - [ ] Documenter configuration

- [ ] **Tâche 2.3.2:** Implémenter paiement Inwi
  - [ ] Dans `app/api/payments/mobile-money/initiate/route.ts`
  - [ ] Préparer requête selon format Inwi
  - [ ] Envoyer requête API Inwi
  - [ ] Récupérer code de paiement
  - [ ] Afficher instructions à l'utilisateur

- [ ] **Tâche 2.3.3:** Implémenter paiement Orange
  - [ ] Même logique pour Orange
  - [ ] Adapter format requête
  - [ ] Gérer différences APIs
  - [ ] Tester séparément

- [ ] **Tâche 2.3.4:** Gérer vérification paiement
  - [ ] Polling ou webhook pour vérifier statut
  - [ ] Vérifier paiement toutes les 5 secondes (max 2 min)
  - [ ] Mettre à jour booking quand confirmé
  - [ ] Gérer timeout

- [ ] **Tâche 2.3.5:** Tests en production
  - [ ] Tester paiement Inwi
  - [ ] Tester paiement Orange
  - [ ] Vérifier vérification statut
  - [ ] Tester timeout

**Sous-total:** 3-4h

---

### 2.4 Webhooks Stripe
**Fichier:** `app/api/webhooks/stripe/route.ts`  
**Durée:** 2-3h

- [ ] **Tâche 2.4.1:** Configurer webhook Stripe
  - [ ] Ajouter variable env: `STRIPE_WEBHOOK_SECRET`
  - [ ] Configurer webhook dans dashboard Stripe
  - [ ] URL: `https://your-domain.com/api/webhooks/stripe`
  - [ ] Événements: `checkout.session.completed`, `customer.subscription.updated`

- [ ] **Tâche 2.4.2:** Vérifier signature webhook
  - [ ] Dans `app/api/webhooks/stripe/route.ts`
  - [ ] Vérifier signature avec `STRIPE_WEBHOOK_SECRET`
  - [ ] Rejeter si signature invalide
  - [ ] Logger tentatives invalides

- [ ] **Tâche 2.4.3:** Traiter événement checkout.session.completed
  - [ ] Récupérer `session_id` depuis événement
  - [ ] Récupérer `booking_id` depuis metadata
  - [ ] Mettre à jour booking: `payment_status = 'paid'`
  - [ ] Envoyer email confirmation
  - [ ] Logger transaction

- [ ] **Tâche 2.4.4:** Traiter événement customer.subscription.updated
  - [ ] Récupérer `subscription_id` depuis événement
  - [ ] Mettre à jour Pass VIP: `status`, `expires_at`
  - [ ] Si annulé: désactiver Pass
  - [ ] Envoyer email notification
  - [ ] Logger changement

- [ ] **Tâche 2.4.5:** Tests webhooks
  - [ ] Utiliser Stripe CLI pour tester localement
  - [ ] Tester événement checkout
  - [ ] Tester événement subscription
  - [ ] Vérifier traitement correct
  - [ ] Vérifier logs

**Sous-total:** 2-3h

---

## 📋 SECTION 3: SCANNER QR

### 3.1 Scanner QR Check-in/Check-out
**Fichier:** `app/admin/check-in/page.tsx`  
**Durée:** 6-8h

- [ ] **Tâche 3.1.1:** Implémenter scanner QR fonctionnel
  - [ ] Utiliser composant `QRScanner` existant
  - [ ] Intégrer dans page admin check-in
  - [ ] Démarrer caméra au chargement
  - [ ] Afficher preview caméra
  - [ ] Gérer permissions caméra

- [ ] **Tâche 3.1.2:** Parser QR code
  - [ ] Format attendu: `TEENSPARTY:EVENT_ID:BOOKING_ID`
  - [ ] Parser string QR code
  - [ ] Extraire `event_id` et `booking_id`
  - [ ] Valider format
  - [ ] Gérer QR codes invalides

- [ ] **Tâche 3.1.3:** Vérifier booking et autorisations
  - [ ] Appeler API `GET /api/check-in/search?booking_id=XXX`
  - [ ] Vérifier booking existe et est valide
  - [ ] Vérifier e-signature parentale OK
  - [ ] Vérifier âge (13-17 ans)
  - [ ] Afficher infos teen (nom, photo si consentement)

- [ ] **Tâche 3.1.4:** Enregistrer check-in
  - [ ] Appeler API `POST /api/check-in/entry`
  - [ ] Body: `{ booking_id, event_id, checked_in_by }`
  - [ ] Mettre à jour `bookings.checked_in_at`
  - [ ] Créer entrée dans `check_in_logs`
  - [ ] Ajouter XP à teen (+100 XP)

- [ ] **Tâche 3.1.5:** Envoyer notification parent
  - [ ] Récupérer parent_id depuis booking
  - [ ] Envoyer notification push: "Votre enfant [nom] est arrivé à l'événement"
  - [ ] Envoyer email (optionnel)
  - [ ] Logger notification

- [ ] **Tâche 3.1.6:** Gérer check-out
  - [ ] Même logique pour check-out
  - [ ] Appeler API `POST /api/check-in/exit`
  - [ ] Vérifier autorisation sortie (règles parent)
  - [ ] Mettre à jour `bookings.checked_out_at`
  - [ ] Si sortie avant fin: demander confirmation staff

- [ ] **Tâche 3.1.7:** Mode offline avec queue
  - [ ] Détecter connexion internet
  - [ ] Si offline: stocker scans dans localStorage
  - [ ] Quand online: envoyer queue
  - [ ] Afficher indicateur "Mode offline"
  - [ ] Gérer erreurs sync

- [ ] **Tâche 3.1.8:** Recherche manuelle fallback
  - [ ] Ajouter champ recherche par référence booking
  - [ ] Appeler API `GET /api/check-in/search?reference=XXX`
  - [ ] Afficher résultats
  - [ ] Permettre check-in manuel
  - [ ] Logger recherche manuelle

- [ ] **Tâche 3.1.9:** Gérer doublons
  - [ ] Vérifier si booking déjà check-in
  - [ ] Afficher alerte "Déjà check-in à [heure]"
  - [ ] Empêcher double check-in
  - [ ] Logger tentatives doublons

- [ ] **Tâche 3.1.10:** Tests manuels complets
  - [ ] Tester scan QR valide
  - [ ] Tester scan QR invalide
  - [ ] Tester check-in
  - [ ] Tester check-out
  - [ ] Tester mode offline
  - [ ] Tester recherche manuelle
  - [ ] Tester doublon

**Sous-total:** 6-8h

---

## 📋 SECTION 4: TESTS E2E PARCOURS CRITIQUES

### 4.1 Tests Playwright
**Fichier:** `tests/e2e/critical-flows.spec.ts` (à créer)  
**Durée:** 15-20h

- [ ] **Tâche 4.1.1:** Setup Playwright
  - [ ] Vérifier `playwright.config.ts` configuré
  - [ ] Installer navigateurs: `npx playwright install`
  - [ ] Créer fixtures pour auth (parent, teen, admin)
  - [ ] Créer helpers pour actions communes
  - [ ] Tester setup avec test simple

- [ ] **Tâche 4.1.2:** Test parcours parent complet
  - [ ] Test: Signup parent
  - [ ] Test: Login parent
  - [ ] Test: Ajouter enfant avec tous champs
  - [ ] Test: Réserver événement
  - [ ] Test: Paiement Stripe
  - [ ] Test: Télécharger QR code
  - [ ] Vérifier données en DB

- [ ] **Tâche 4.1.3:** Test parcours teen
  - [ ] Test: Login teen
  - [ ] Test: Compléter défi quotidien
  - [ ] Test: Gagner XP
  - [ ] Test: Voir leaderboard
  - [ ] Test: Utiliser shop XP
  - [ ] Vérifier XP en DB

- [ ] **Tâche 4.1.4:** Test parcours anniversaire
  - [ ] Test: Créer commande anniversaire
  - [ ] Test: Sélectionner pack
  - [ ] Test: Ajouter extras
  - [ ] Test: Paiement
  - [ ] Test: Voir QR code
  - [ ] Vérifier commande en DB

- [ ] **Tâche 4.1.5:** Test parcours Pass VIP
  - [ ] Test: Voir comparatif Pass
  - [ ] Test: Souscrire Pass Gold
  - [ ] Test: Paiement Stripe
  - [ ] Test: Voir Pass actif
  - [ ] Test: Réserver event avec réduction
  - [ ] Vérifier réduction appliquée

- [ ] **Tâche 4.1.6:** Test parcours admin
  - [ ] Test: Login admin
  - [ ] Test: Créer événement
  - [ ] Test: Scanner QR check-in
  - [ ] Test: Voir analytics
  - [ ] Test: Exporter données

- [ ] **Tâche 4.1.7:** Test parcours paiement hybride
  - [ ] Test: Sélectionner % XP
  - [ ] Test: Vérifier calculs
  - [ ] Test: Paiement 100% XP
  - [ ] Test: Paiement 50% XP + 50% DH
  - [ ] Vérifier débit XP

- [ ] **Tâche 4.1.8:** Tests responsive
  - [ ] Tester sur mobile (iPhone, Android)
  - [ ] Tester sur tablette
  - [ ] Tester sur desktop
  - [ ] Vérifier UI adaptatif

- [ ] **Tâche 4.1.9:** Tests erreurs
  - [ ] Test: Paiement échoué
  - [ ] Test: QR code invalide
  - [ ] Test: Pseudo déjà pris
  - [ ] Test: Solde XP insuffisant
  - [ ] Vérifier messages erreur

- [ ] **Tâche 4.1.10:** CI/CD intégration
  - [ ] Ajouter script `npm run test:e2e:ci`
  - [ ] Configurer GitHub Actions
  - [ ] Exécuter tests sur chaque PR
  - [ ] Générer rapport
  - [ ] Notifier en cas d'échec

**Sous-total:** 15-20h

---

## 📊 RÉCAPITULATIF P0

### Total Estimé
- **Frontend Connecté:** 17-22h
- **Paiements Production:** 16-21h
- **Scanner QR:** 6-8h
- **Tests E2E:** 15-20h

**TOTAL: 54-71h (7-9 jours à plein temps)**

### Progression
- [ ] Section 1: Frontend Connecté (0/10 sous-sections)
- [ ] Section 2: Paiements Production (0/4 sous-sections)
- [ ] Section 3: Scanner QR (0/1 sous-sections)
- [ ] Section 4: Tests E2E (0/1 sous-sections)

**TOTAL: 0/16 sections complétées (0%)**

---

## ✅ VALIDATION MVP

Une fois toutes les tâches P0 complétées, valider:

- [ ] Tous les parcours critiques fonctionnent
- [ ] Tests E2E passent à 100%
- [ ] Build production réussit sans erreurs
- [ ] Déploiement staging réussi
- [ ] Tests manuels complets effectués
- [ ] Documentation mise à jour

**Le produit est alors prêt pour un lancement MVP ! 🚀**

---

*Dernière mise à jour: Décembre 2024*









