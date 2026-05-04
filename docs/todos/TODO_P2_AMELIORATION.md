# 🟡 TODO P2 - AMÉLIORATION (Features V2)

**Priorité:** MOYENNE  
**Objectif:** Implémenter features avancées  
**Durée estimée:** 80-100h (10-12 jours)  
**Progression:** 0/50 tâches (0%)

---

## 📋 SECTION 1: GAMIFICATION V2

### 1.1 Piliers (École/Sport/Créa)
**Fichier:** Extension `user_xp` table  
**Durée:** 8-10h

- [ ] **Tâche 1.1.1:** Extension table user_xp
  - [ ] Migration SQL: ajouter colonnes `school_score`, `sport_score`, `crea_score`
  - [ ] Valeurs par défaut: 50/100
  - [ ] Contraintes: 0-100
  - [ ] Index pour performance

- [ ] **Tâche 1.1.2:** Fonction calcul score École
  - [ ] Fonction PostgreSQL `calculate_school_score(teen_id)`
  - [ ] Formule: notes (40%) + quiz (30%) + tutos (30%)
  - [ ] Mettre à jour automatiquement
  - [ ] Trigger après validation note/quiz

- [ ] **Tâche 1.1.3:** Fonction calcul score Sport
  - [ ] Fonction PostgreSQL `calculate_sport_score(teen_id)`
  - [ ] Formule: présence clubs (40%) + défis (40%) + records (20%)
  - [ ] Mettre à jour automatiquement
  - [ ] Trigger après action sport

- [ ] **Tâche 1.1.4:** Fonction calcul score Créa
  - [ ] Fonction PostgreSQL `calculate_crea_score(teen_id)`
  - [ ] Formule: tutos complétés (40%) + créations (40%) + likes (20%)
  - [ ] Mettre à jour automatiquement
  - [ ] Trigger après action créa

- [ ] **Tâche 1.1.5:** Bonus équilibre
  - [ ] Fonction `calculate_balance_bonus(teen_id)`
  - [ ] Si tous piliers > 50: +500 XP + multiplicateur ×1.10
  - [ ] Si tous piliers > 70: +1,000 XP + multiplicateur ×1.25
  - [ ] Si tous piliers > 85: +2,000 XP + badge spécial
  - [ ] Calcul mensuel automatique

- [ ] **Tâche 1.1.6:** UI affichage piliers
  - [ ] Dashboard teen: afficher 3 piliers avec scores
  - [ ] Graphiques évolution par pilier
  - [ ] Badges équilibre
  - [ ] Objectifs mensuels

**Sous-total:** 8-10h

---

### 1.2 Aide Scolaire Complète
**Fichier:** `app/teen/aide-scolaire/`  
**Durée:** 12-15h

- [ ] **Tâche 1.2.1:** Système quiz
  - [ ] Table `educational_quizzes` avec questions/réponses
  - [ ] Table `quiz_attempts` pour tracking
  - [ ] API routes pour quiz
  - [ ] Interface quiz interactive
  - [ ] Calcul score et XP

- [ ] **Tâche 1.2.2:** Système tutos vidéo
  - [ ] Table `educational_tutorials` avec métadonnées
  - [ ] Intégration player vidéo (YouTube/Vimeo)
  - [ ] Tracking progression (temps regardé)
  - [ ] Validation complétion (80% regardé)
  - [ ] XP gagné

- [ ] **Tâche 1.2.3:** Ressources éducatives
  - [ ] Table `educational_resources` (PDF, articles)
  - [ ] Catégorisation par matière
  - [ ] Recherche ressources
  - [ ] Favoris
  - [ ] Recommandations personnalisées

- [ ] **Tâche 1.2.4:** Saisie et validation notes
  - [ ] Interface saisie note (teen)
  - [ ] Envoi pour validation parent
  - [ ] Interface validation (parent)
  - [ ] Calcul moyenne automatique
  - [ ] XP bonus si amélioration

- [ ] **Tâche 1.2.5:** Recommandations personnalisées
  - [ ] Algorithme recommandation basé sur:
    - Notes faibles → ressources matière
    - Intérêts → tutos passion
    - Progression → défis adaptés
  - [ ] Interface recommandations
  - [ ] Tracking efficacité

**Sous-total:** 12-15h

---

### 1.3 Défis Physiques Avancés
**Fichier:** `app/teen/defis-physiques/`  
**Durée:** 8-10h

- [ ] **Tâche 1.3.1:** Tracking activité physique
  - [ ] Intégration API santé (HealthKit/Google Fit) - optionnel
  - [ ] Saisie manuelle activité
  - [ ] Validation par photo/vidéo
  - [ ] Calcul calories/distance
  - [ ] XP gagné

- [ ] **Tâche 1.3.2:** Défis hebdomadaires
  - [ ] Défis plus ambitieux (ex: 100 pompes/semaine)
  - [ ] Tracking progression
  - [ ] Récompenses importantes
  - [ ] Classement défis

- [ ] **Tâche 1.3.3:** Records personnels
  - [ ] Tracking records par type
  - [ ] Graphique évolution
  - [ ] Badge "Nouveau record!"
  - [ ] Comparaison communauté

- [ ] **Tâche 1.3.4:** Intégration clubs sport
  - [ ] Check-in automatique présence
  - [ ] Tracking assiduité
  - [ ] Certificats complétion
  - [ ] XP bonus assiduité

**Sous-total:** 8-10h

---

### 1.4 Parcours Passion
**Fichier:** `app/teen/parcours/`  
**Durée:** 12-15h

- [ ] **Tâche 1.4.1:** Système parcours
  - [ ] Table `passion_paths` (Danse, Musique, Art, Tech)
  - [ ] Table `passion_path_levels` avec progression
  - [ ] Structure par niveaux (Débutant → Avancé)
  - [ ] Prérequis entre niveaux

- [ ] **Tâche 1.4.2:** Tutoriels guidés
  - [ ] Tutoriels étape par étape
  - [ ] Vidéos démonstration
  - [ ] Exercices pratiques
  - [ ] Validation niveau (quiz ou création)
  - [ ] XP et badges

- [ ] **Tâche 1.4.3:** Portfolio créations
  - [ ] Upload créations (photos, vidéos)
  - [ ] Description, tags, catégories
  - [ ] Galerie publique (optionnel)
  - [ ] Likes et commentaires
  - [ ] XP par like reçu

- [ ] **Tâche 1.4.4:** Showcases trimestriels
  - [ ] Événements présentation créations
  - [ ] Inscription showcase
  - [ ] Vote communauté
  - [ ] Récompenses gagnants
  - [ ] XP bonus participation

- [ ] **Tâche 1.4.5:** Recommandations parcours
  - [ ] Algorithme basé sur intérêts
  - [ ] Suggestions parcours
  - [ ] Parcours populaires
  - [ ] Parcours recommandés par amis

**Sous-total:** 12-15h

---

## 📋 SECTION 2: COMMUNAUTÉ

### 2.1 Circles (Chat Communautaire)
**Fichier:** `app/teen/circles/`  
**Durée:** 10-12h

- [ ] **Tâche 2.1.1:** Système Circles
  - [ ] Table `circles` (Event Circles, Club Circles, School Circles)
  - [ ] Table `circle_messages` avec contenu
  - [ ] Intégration Supabase Realtime
  - [ ] Messages en temps réel

- [ ] **Tâche 2.1.2:** Event Circles
  - [ ] Création automatique J-7 avant event
  - [ ] Participants event uniquement
  - [ ] Fermeture J+3 après event
  - [ ] Notifications nouvelles messages

- [ ] **Tâche 2.1.3:** Club Circles
  - [ ] Circle permanent par club
  - [ ] Membres club uniquement
  - [ ] Discussions activités
  - [ ] Partage créations

- [ ] **Tâche 2.1.4:** School Circles
  - [ ] Circle par école
  - [ ] Vérification école teen
  - [ ] Modération renforcée
  - [ ] Discussions entre élèves

- [ ] **Tâche 2.1.5:** Modération avancée
  - [ ] Auto-modération mots interdits
  - [ ] Signalement messages
  - [ ] Interface modération admin
  - [ ] Logs modération

**Sous-total:** 10-12h

---

### 2.2 Friend System Complet
**Fichier:** `app/teen/friends/`  
**Durée:** 8-10h

- [ ] **Tâche 2.2.1:** Système amis
  - [ ] Table `friend_connections` avec statut
  - [ ] Demandes d'amis
  - [ ] Acceptation/refus
  - [ ] Liste amis

- [ ] **Tâche 2.2.2:** Recherche amis
  - [ ] Recherche par pseudo
  - [ ] Suggestions (même école, intérêts communs)
  - [ ] Filtrer amis déjà ajoutés
  - [ ] Résultats avec actions

- [ ] **Tâche 2.2.3:** Interactions amis
  - [ ] Voir profil ami
  - [ ] Comparaison stats
  - [ ] Défis entre amis
  - [ ] Messaging direct (optionnel)

- [ ] **Tâche 2.2.4:** Privacy settings
  - [ ] Contrôles visibilité profil
  - [ ] Qui peut m'ajouter
  - [ ] Qui peut voir mes stats
  - [ ] Blocage utilisateurs

**Sous-total:** 8-10h

---

### 2.3 Activity Feed
**Fichier:** `app/teen/activity/`  
**Durée:** 6-8h

- [ ] **Tâche 2.3.1:** Système activity feed
  - [ ] Table `activities` avec type action
  - [ ] Types: achievement, challenge, creation, event
  - [ ] Intégration Supabase Realtime
  - [ ] Feed en temps réel

- [ ] **Tâche 2.3.2:** Affichage feed
  - [ ] Liste activités amis
  - [ ] Filtres par type
  - [ ] Pagination
  - [ ] Design moderne

- [ ] **Tâche 2.3.3:** Réactions
  - [ ] Like sur activités
  - [ ] Commentaires (optionnel)
  - [ ] Partage
  - [ ] XP bonus interactions

**Sous-total:** 6-8h

---

### 2.4 Social Sharing
**Fichier:** `app/teen/share/`  
**Durée:** 4-5h

- [ ] **Tâche 2.4.1:** Partage achievements
  - [ ] Générer image avec achievement
  - [ ] Partage Instagram Stories
  - [ ] Partage TikTok
  - [ ] Tracking partages
  - [ ] XP bonus

- [ ] **Tâche 2.4.2:** Partage leaderboard
  - [ ] Générer image classement
  - [ ] Hashtag #TeensPartyMorocco
  - [ ] Tracking
  - [ ] Badge "Influenceur"

- [ ] **Tâche 2.4.3:** Intégration APIs sociales
  - [ ] Instagram Basic Display API
  - [ ] TikTok API (si disponible)
  - [ ] OAuth flow
  - [ ] Post automatique (optionnel)

**Sous-total:** 4-5h

---

## 📋 SECTION 3: PAIEMENT HYBRIDE COMPLET

### 3.1 Conversion XP → DH
**Fichier:** `lib/payments/xp-converter.ts`  
**Durée:** 4-5h

- [ ] **Tâche 3.1.1:** Fonction conversion
  - [ ] Créer `lib/payments/xp-converter.ts`
  - [ ] Formule: 1 XP = 0.10 DH
  - [ ] Arrondir à 2 décimales
  - [ ] Tests unitaires

- [ ] **Tâche 3.1.2:** UI conversion
  - [ ] Afficher équivalent DH des XP
  - [ ] Calculateur interactif
  - [ ] Historique conversions
  - [ ] Graphique évolution valeur

- [ ] **Tâche 3.1.3:** Validation conversions
  - [ ] Vérifier solde XP suffisant
  - [ ] Limites de conversion (ex: max 50% par transaction)
  - [ ] Approbation parentale si > seuil
  - [ ] Logger conversions

**Sous-total:** 4-5h

---

### 3.2 Paiement Partiel XP + Argent
**Fichier:** `app/api/payments/hybrid/route.ts`  
**Durée:** 6-8h

- [ ] **Tâche 3.2.1:** UI sélecteur pourcentage
  - [ ] Slider ou boutons (0%, 25%, 50%, 75%, 100%)
  - [ ] Calcul automatique montants
  - [ ] Affichage récap clair
  - [ ] Validation solde XP

- [ ] **Tâche 3.2.2:** Traitement paiement hybride
  - [ ] Débiter XP d'abord
  - [ ] Traiter paiement DH restant
  - [ ] Gérer erreurs (rollback si échec)
  - [ ] Confirmer booking

- [ ] **Tâche 3.2.3:** Approbation parentale
  - [ ] Seuil déclenchement (ex: 1000 XP)
  - [ ] Créer `parental_approval`
  - [ ] Notification parent
  - [ ] Attendre approbation

- [ ] **Tâche 3.2.4:** Affichage économies
  - [ ] Calculer économies réalisées
  - [ ] Badge "Vous économisez X DH"
  - [ ] Historique économies
  - [ ] Graphique économies cumulées

**Sous-total:** 6-8h

---

### 3.3 Calcul ROI pour Teens
**Fichier:** `app/teen/xp-value/page.tsx` (à créer)  
**Durée:** 3-4h

- [ ] **Tâche 3.3.1:** Page valeur XP
  - [ ] Créer page dédiée
  - [ ] Afficher valeur totale XP (en DH)
  - [ ] Historique conversions
  - [ ] Projections économies

- [ ] **Tâche 3.3.2:** Calculateur ROI
  - [ ] Calculer économies réalisées
  - [ ] Projections futures
  - [ ] Graphiques
  - [ ] Recommandations

**Sous-total:** 3-4h

---

## 📊 RÉCAPITULATIF P2

### Total Estimé
- **Gamification V2:** 40-50h
- **Communauté:** 28-35h
- **Paiement Hybride:** 13-17h

**TOTAL: 81-102h (10-13 jours à plein temps)**

### Progression
- [ ] Section 1: Gamification V2 (0/4 sous-sections)
- [ ] Section 2: Communauté (0/4 sous-sections)
- [ ] Section 3: Paiement Hybride (0/3 sous-sections)

**TOTAL: 0/11 sections complétées (0%)**

---

## ✅ VALIDATION P2

Une fois toutes les tâches P2 complétées, valider:

- [ ] Piliers École/Sport/Créa fonctionnels
- [ ] Aide Scolaire complète
- [ ] Parcours Passion opérationnels
- [ ] Circles communautaires actifs
- [ ] Friend System complet
- [ ] Paiement hybride XP fonctionnel
- [ ] Tests complets effectués

**Le produit est alors en version complète V2 ! 🚀**

---

*Dernière mise à jour: Décembre 2024*









