# 🎨 TODO FRONTEND - Toutes les Tâches UI/UX

> **Statut verifie 2026-05-06**: ce backlog peut etre obsolete. Voir `docs/audits/AUDIT_E2E_DOUBLONS_HARDCODE_SCAFFOLD.md` pour l'etat verifie a cette date, et `docs/RELEASE_CHECKLIST.md` pour la checklist active.

**Progression:** 0/120 tâches (0%)

---

## 📋 SECTION P0: CRITIQUE (MVP)

### 1. Formulaire Enfant Enrichi
**Fichier:** `app/parent/teens/add/page.tsx`  
**Référence:** Voir `TODO_P0_CRITIQUE.md` Section 1.1

- [ ] Tâche 1.1.1 à 1.1.10 (voir TODO_P0_CRITIQUE.md)

### 2. Anniversaires Connecté
**Fichier:** `app/anniversaires/page.tsx`  
**Référence:** Voir `TODO_P0_CRITIQUE.md` Section 1.2

- [ ] Tâche 1.2.1 à 1.2.8 (voir TODO_P0_CRITIQUE.md)

### 3. Souscription Pass VIP
**Fichier:** `app/carte-vip/souscrire/page.tsx`  
**Référence:** Voir `TODO_P0_CRITIQUE.md` Section 1.3

- [ ] Tâche 1.3.1 à 1.3.8 (voir TODO_P0_CRITIQUE.md)

### 4. Tarifs Pass sur Events/Clubs
**Fichiers:** `app/evenements/[id]/page.tsx`, `app/clubs/[slug]/page.tsx`  
**Référence:** Voir `TODO_P0_CRITIQUE.md` Section 1.4

- [ ] Tâche 1.4.1 à 1.4.6 (voir TODO_P0_CRITIQUE.md)

### 5. Admin Gestion Anniversaires
**Fichier:** `app/admin/anniversaires/page.tsx`  
**Référence:** Voir `TODO_P0_CRITIQUE.md` Section 1.5

- [ ] Tâche 1.5.1 à 1.5.9 (voir TODO_P0_CRITIQUE.md)

---

## 📋 SECTION P1: IMPORTANT

### 6. Dashboard Parent Temps Réel
**Fichier:** `app/parent/live/page.tsx` (à créer)  
**Durée:** 6-8h

- [ ] **Tâche 6.1:** Créer page dashboard temps réel
  - [ ] Créer fichier `app/parent/live/page.tsx`
  - [ ] Layout avec header "Suivi en direct"
  - [ ] Design cohérent avec reste app
  - [ ] Responsive mobile

- [ ] **Tâche 6.2:** Afficher statut teen en temps réel
  - [ ] Récupérer statut depuis `check_in_logs`
  - [ ] Afficher: "En activité", "Arrivé", "Sorti"
  - [ ] Mettre à jour automatiquement (polling ou WebSocket)
  - [ ] Indicateur visuel (vert/jaune/rouge)

- [ ] **Tâche 6.3:** Afficher heure check-in/check-out
  - [ ] Afficher heure entrée
  - [ ] Afficher heure sortie (si applicable)
  - [ ] Calculer durée présence
  - [ ] Format: "Depuis 2h 15min"

- [ ] **Tâche 6.4:** Bouton "Demander check-out anticipé"
  - [ ] Bouton visible si teen toujours présent
  - [ ] Modal confirmation
  - [ ] Envoyer notification au staff
  - [ ] Afficher statut "Demande envoyée"

- [ ] **Tâche 6.5:** Timeline de la journée
  - [ ] Afficher timeline avec événements
  - [ ] Marquer check-in/check-out
  - [ ] Afficher prochaines activités
  - [ ] Design visuel clair

- [ ] **Tâche 6.6:** Galerie photos (si consentement)
  - [ ] Vérifier `photo_consent = true`
  - [ ] Afficher photos événement (si disponibles)
  - [ ] Lazy loading images
  - [ ] Lightbox pour voir photos

**Sous-total:** 6-8h

---

### 7. Validation Notes Scolaires (V2 Preview)
**Fichier:** `app/parent/teens/[id]/grades/page.tsx` (à créer)  
**Durée:** 4-5h

- [ ] **Tâche 7.1:** Créer page validation notes
  - [ ] Créer fichier `app/parent/teens/[id]/grades/page.tsx`
  - [ ] Layout avec liste notes
  - [ ] Design cohérent

- [ ] **Tâche 7.2:** Afficher notes en attente validation
  - [ ] Récupérer notes depuis `teen_grades` (status = 'pending')
  - [ ] Afficher tableau: matière, note, date, actions
  - [ ] Badge "En attente validation"
  - [ ] Filtres: matière, période

- [ ] **Tâche 7.3:** Form validation note
  - [ ] Modal avec détails note
  - [ ] Boutons "Valider" / "Rejeter"
  - [ ] Champ commentaire (optionnel)
  - [ ] Confirmation avant validation

- [ ] **Tâche 7.4:** Historique notes validées
  - [ ] Afficher notes validées
  - [ ] Graphique évolution notes
  - [ ] Calcul moyenne générale
  - [ ] Export PDF (optionnel)

**Sous-total:** 4-5h

---

### 8. Budget Limits avec Alertes
**Fichier:** `app/parent/budget/page.tsx`  
**Durée:** 3-4h

- [ ] **Tâche 8.1:** Interface gestion budget
  - [ ] Afficher budget actuel par teen
  - [ ] Afficher dépenses du mois
  - [ ] Calculer reste disponible
  - [ ] Indicateur visuel (barre progression)

- [ ] **Tâche 8.2:** Définir limites budget
  - [ ] Form pour définir limite mensuelle
  - [ ] Validation: limite > 0
  - [ ] Sauvegarder dans `parental_controls`
  - [ ] Afficher confirmation

- [ ] **Tâche 8.3:** Alertes budget
  - [ ] Afficher alerte si 80% budget utilisé
  - [ ] Afficher alerte si budget dépassé
  - [ ] Bloquer nouvelles dépenses si budget dépassé
  - [ ] Notification push (optionnel)

- [ ] **Tâche 8.4:** Graphique dépenses
  - [ ] Graphique dépenses par catégorie
  - [ ] Graphique évolution mensuelle
  - [ ] Utiliser Recharts
  - [ ] Responsive

**Sous-total:** 3-4h

---

### 9. Export Historique PDF
**Fichier:** `app/parent/history/page.tsx`  
**Durée:** 2-3h

- [ ] **Tâche 9.1:** Bouton export PDF
  - [ ] Ajouter bouton "Exporter PDF"
  - [ ] Modal avec options (période, type transactions)
  - [ ] Générer PDF côté serveur
  - [ ] Télécharger fichier

- [ ] **Tâche 9.2:** Format PDF
  - [ ] En-tête avec logo et infos parent
  - [ ] Liste transactions avec détails
  - [ ] Totaux par période
  - [ ] Footer avec date génération

- [ ] **Tâche 9.3:** Utiliser bibliothèque PDF
  - [ ] Installer `pdfkit` ou `jspdf`
  - [ ] Créer template PDF
  - [ ] Générer PDF avec données
  - [ ] Tester génération

**Sous-total:** 2-3h

---

## 📋 SECTION P2: V2 FEATURES

### 10. Page Aide Scolaire
**Fichier:** `app/teen/aide-scolaire/page.tsx` (à créer)  
**Durée:** 8-10h

- [ ] **Tâche 10.1:** Créer page aide scolaire
  - [ ] Créer fichier `app/teen/aide-scolaire/page.tsx`
  - [ ] Layout avec tabs: "Quiz", "Tutos", "Notes", "Ressources"
  - [ ] Design cohérent avec gamification
  - [ ] Responsive

- [ ] **Tâche 10.2:** Liste quiz par matière
  - [ ] Récupérer quiz depuis `educational_resources`
  - [ ] Filtrer par matière (Math, Français, etc.)
  - [ ] Afficher cards avec: titre, matière, niveau, XP récompense
  - [ ] Badge "Complété" si déjà fait

- [ ] **Tâche 10.3:** Interface quiz
  - [ ] Page quiz avec questions
  - [ ] Radio buttons pour réponses
  - [ ] Timer (optionnel)
  - [ ] Bouton "Valider"
  - [ ] Afficher résultats + XP gagné

- [ ] **Tâche 10.4:** Liste tutos vidéo
  - [ ] Récupérer tutos depuis `educational_resources`
  - [ ] Afficher thumbnails vidéos
  - [ ] Player vidéo intégré
  - [ ] Tracking progression (temps regardé)
  - [ ] XP gagné si vidéo complète

- [ ] **Tâche 10.5:** Saisie notes
  - [ ] Form pour saisir note
  - [ ] Champs: matière, note, date, commentaire
  - [ ] Validation: note entre 0 et 20
  - [ ] Envoyer pour validation parent
  - [ ] Afficher statut "En attente validation"

- [ ] **Tâche 10.6:** Progression pilier École
  - [ ] Afficher score pilier École (/100)
  - [ ] Graphique évolution score
  - [ ] Badges débloqués
  - [ ] Objectifs mensuels

**Sous-total:** 8-10h

---

### 11. Page Défis Physiques
**Fichier:** `app/teen/defis-physiques/page.tsx` (à créer)  
**Durée:** 6-8h

- [ ] **Tâche 11.1:** Créer page défis physiques
  - [ ] Créer fichier `app/teen/defis-physiques/page.tsx`
  - [ ] Layout avec tabs: "Défis", "Records", "Clubs"
  - [ ] Design cohérent
  - [ ] Responsive

- [ ] **Tâche 11.2:** Liste défis physiques
  - [ ] Récupérer défis depuis `physical_challenges`
  - [ ] Afficher cards avec: titre, type, objectif, XP
  - [ ] Badge "Complété" si déjà fait
  - [ ] Filtres: type (pompes, course, etc.)

- [ ] **Tâche 11.3:** Interface compléter défi
  - [ ] Modal ou page dédiée
  - [ ] Form pour saisir résultat (ex: 30 pompes)
  - [ ] Upload photo preuve (optionnel)
  - [ ] Validation résultat
  - [ ] XP gagné + mise à jour score Sport

- [ ] **Tâche 11.4:** Records personnels
  - [ ] Afficher records par type défi
  - [ ] Graphique évolution records
  - [ ] Badge "Nouveau record!" si battu
  - [ ] Comparaison avec moyenne communauté

- [ ] **Tâche 11.5:** Présence clubs
  - [ ] Afficher clubs inscrits
  - [ ] Check-in automatique si présent
  - [ ] Tracking assiduité
  - [ ] XP gagné par présence

- [ ] **Tâche 11.6:** Progression pilier Sport
  - [ ] Afficher score pilier Sport (/100)
  - [ ] Graphique évolution
  - [ ] Badges débloqués
  - [ ] Objectifs mensuels

**Sous-total:** 6-8h

---

### 12. Parcours Passion
**Fichier:** `app/teen/parcours/page.tsx` (à créer)  
**Durée:** 8-10h

- [ ] **Tâche 12.1:** Créer page parcours passion
  - [ ] Créer fichier `app/teen/parcours/page.tsx`
  - [ ] Layout avec sélection parcours
  - [ ] Design cohérent
  - [ ] Responsive

- [ ] **Tâche 12.2:** Liste parcours disponibles
  - [ ] Récupérer parcours depuis `passion_paths`
  - [ ] Afficher cards: Danse, Musique, Art, Tech, etc.
  - [ ] Badge "En cours" si parcours actif
  - [ ] Afficher progression

- [ ] **Tâche 12.3:** Détails parcours
  - [ ] Page dédiée avec niveaux
  - [ ] Afficher niveaux avec progression
  - [ ] Badge "Complété" pour niveaux finis
  - [ ] Tutoriels par niveau

- [ ] **Tâche 12.4:** Interface tutoriel
  - [ ] Player vidéo tutoriel
  - [ ] Instructions étape par étape
  - [ ] Tracking progression
  - [ ] Validation niveau (quiz ou création)
  - [ ] XP gagné

- [ ] **Tâche 12.5:** Portfolio créations
  - [ ] Galerie créations uploadées
  - [ ] Upload nouvelle création
  - [ ] Description, tags
  - [ ] Likes et commentaires (optionnel)
  - [ ] XP gagné par like

- [ ] **Tâche 12.6:** Progression pilier Créa
  - [ ] Afficher score pilier Créa (/100)
  - [ ] Graphique évolution
  - [ ] Badges débloqués
  - [ ] Objectifs mensuels

**Sous-total:** 8-10h

---

### 13. Circles (Communauté)
**Fichier:** `app/teen/circles/page.tsx` (à créer)  
**Durée:** 10-12h

- [ ] **Tâche 13.1:** Créer page Circles
  - [ ] Créer fichier `app/teen/circles/page.tsx`
  - [ ] Layout avec liste circles
  - [ ] Design chat moderne
  - [ ] Responsive

- [ ] **Tâche 13.2:** Liste circles disponibles
  - [ ] Récupérer circles depuis DB
  - [ ] Afficher: Event Circles, Club Circles, School Circles
  - [ ] Badge "Nouveau" si nouveau circle
  - [ ] Indicateur messages non lus

- [ ] **Tâche 13.3:** Interface chat
  - [ ] Messages en temps réel (Supabase Realtime)
  - [ ] Input pour envoyer message
  - [ ] Upload images (optionnel)
  - [ ] Réactions (like, emoji)
  - [ ] Timestamp messages

- [ ] **Tâche 13.4:** Modération messages
  - [ ] Auto-modération mots interdits
  - [ ] Bouton "Signaler" sur chaque message
  - [ ] Admin peut supprimer messages
  - [ ] Logs modération

- [ ] **Tâche 13.5:** Event Circles
  - [ ] Circle créé automatiquement J-7 avant event
  - [ ] Circle fermé J+3 après event
  - [ ] Participants event uniquement
  - [ ] Notifications nouvelles messages

- [ ] **Tâche 13.6:** Club Circles
  - [ ] Circle permanent par club
  - [ ] Membres club uniquement
  - [ ] Discussions activités club
  - [ ] Partage créations

- [ ] **Tâche 13.7:** School Circles (V2)
  - [ ] Circle par école
  - [ ] Vérification école teen
  - [ ] Discussions entre élèves même école
  - [ ] Modération renforcée

**Sous-total:** 10-12h

---

### 14. Friend System
**Fichier:** `app/teen/friends/page.tsx`  
**Durée:** 6-8h

- [ ] **Tâche 14.1:** Liste amis
  - [ ] Récupérer amis depuis `friend_connections`
  - [ ] Afficher cards avec avatar, nom, niveau
  - [ ] Statut en ligne (optionnel)
  - [ ] Actions: message, défi, voir profil

- [ ] **Tâche 14.2:** Recherche amis
  - [ ] Barre recherche par pseudo
  - [ ] Résultats avec bouton "Ajouter"
  - [ ] Filtrer amis déjà ajoutés
  - [ ] Suggestions amis (même école, etc.)

- [ ] **Tâche 14.3:** Demandes d'amis
  - [ ] Liste demandes reçues
  - [ ] Boutons "Accepter" / "Refuser"
  - [ ] Notification nouvelles demandes
  - [ ] Historique demandes

- [ ] **Tâche 14.4:** Profil ami
  - [ ] Page profil avec stats
  - [ ] Comparaison stats (optionnel)
  - [ ] Défis entre amis
  - [ ] Historique interactions

**Sous-total:** 6-8h

---

### 15. Social Sharing
**Fichier:** `app/teen/share/page.tsx` (à créer)  
**Durée:** 4-5h

- [ ] **Tâche 15.1:** Partage achievements
  - [ ] Bouton "Partager" sur chaque achievement
  - [ ] Générer image avec achievement
  - [ ] Partage Instagram Stories
  - [ ] Partage TikTok
  - [ ] XP bonus si partagé

- [ ] **Tâche 15.2:** Partage leaderboard
  - [ ] Générer image classement
  - [ ] Partage avec hashtag #TeensPartyMorocco
  - [ ] Tracking partages
  - [ ] Badge "Influenceur" si > X partages

- [ ] **Tâche 15.3:** Intégration APIs sociales
  - [ ] Instagram Basic Display API
  - [ ] TikTok API (si disponible)
  - [ ] Gérer authentification OAuth
  - [ ] Post automatique (optionnel)

**Sous-total:** 4-5h

---

## 📊 RÉCAPITULATIF FRONTEND

### Total Estimé
- **P0 Critique:** 17-22h
- **P1 Important:** 15-20h
- **P2 V2 Features:** 42-55h

**TOTAL: 74-97h (9-12 jours à plein temps)**

### Progression
- [ ] P0: 0/5 sections (0%)
- [ ] P1: 0/4 sections (0%)
- [ ] P2: 0/6 sections (0%)

**TOTAL: 0/15 sections complétées (0%)**

---

*Dernière mise à jour: Décembre 2024*









