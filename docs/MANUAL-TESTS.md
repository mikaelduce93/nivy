# Checklist Tests Manuels UX

Checklist pour tester manuellement les fonctionnalités de Teens Party Morocco.

## 1. Authentification

### 1.1 Inscription
- [ ] Affichage du formulaire d'inscription
- [ ] Validation email format
- [ ] Validation mot de passe (8+ chars, maj, min, chiffre)
- [ ] Confirmation mot de passe doit correspondre
- [ ] Validation téléphone format marocain (+212, 06, 07)
- [ ] Checkbox conditions obligatoire
- [ ] Message d'erreur si email déjà utilisé
- [ ] Redirection vers confirmation email après succès
- [ ] Email de confirmation reçu

### 1.2 Connexion
- [ ] Affichage du formulaire de connexion
- [ ] Message d'erreur si credentials incorrects
- [ ] Option "Se souvenir de moi"
- [ ] Lien "Mot de passe oublié" fonctionnel
- [ ] Redirection vers dashboard après connexion

### 1.3 Réinitialisation mot de passe
- [ ] Email de réinitialisation envoyé
- [ ] Lien de réinitialisation fonctionne
- [ ] Nouveau mot de passe validé
- [ ] Message de succès affiché

### 1.4 Déconnexion
- [ ] Bouton déconnexion accessible
- [ ] Session terminée
- [ ] Redirection vers accueil

---

## 2. Onboarding

### 2.1 Wizard
- [ ] Étape 1: Bienvenue affichée
- [ ] Navigation suivant/précédent
- [ ] Indicateur de progression
- [ ] Bouton "Passer" disponible
- [ ] Touches clavier (←→) fonctionnelles

### 2.2 Profil
- [ ] Sélection type profil (parent/teen)
- [ ] Champs spécifiques selon type
- [ ] Validation des champs

### 2.3 Complétion
- [ ] Animation confettis à la fin
- [ ] Redirection vers dashboard
- [ ] Progression sauvegardée (reprendre si interrompu)

---

## 3. Événements

### 3.1 Liste des événements
- [ ] Affichage de tous les événements
- [ ] Filtrage par catégorie
- [ ] Recherche par titre
- [ ] Filtre par ville
- [ ] Filtre par prix
- [ ] Skeleton pendant chargement
- [ ] Message si aucun résultat

### 3.2 Détail événement
- [ ] Informations complètes affichées
- [ ] Image de l'événement
- [ ] Date, heure, lieu
- [ ] Prix et places restantes
- [ ] Bouton réserver

### 3.3 Responsive
- [ ] Mobile: cards empilées
- [ ] Tablette: 2 colonnes
- [ ] Desktop: 3 colonnes

---

## 4. Réservation

### 4.1 Processus
- [ ] Sélection de l'enfant participant
- [ ] Choix type de billet (standard/VIP)
- [ ] Affichage du prix total
- [ ] Récapitulatif avant paiement

### 4.2 Paiement
- [ ] Affichage méthodes disponibles
- [ ] CMI: formulaire carte
- [ ] Mobile Money: sélection opérateur + téléphone
- [ ] Espèces: confirmation réservation

### 4.3 Confirmation
- [ ] Page de succès avec QR code
- [ ] Email de confirmation reçu
- [ ] Réservation visible dans "Mes Réservations"

---

## 5. Mes Réservations

### 5.1 Liste
- [ ] Réservations à venir affichées
- [ ] Réservations passées (grisées)
- [ ] Statut visible (confirmé, en attente)
- [ ] Message si aucune réservation

### 5.2 Détail réservation
- [ ] QR code visible
- [ ] Informations de l'événement
- [ ] Liste des billets
- [ ] Option télécharger PDF

---

## 6. Profil Enfants

### 6.1 Liste enfants
- [ ] Affichage des enfants ajoutés
- [ ] Bouton ajouter un enfant
- [ ] Actions modifier/supprimer

### 6.2 Ajouter enfant
- [ ] Formulaire complet
- [ ] Validation âge (10-18 ans)
- [ ] Photo optionnelle
- [ ] Informations médicales

### 6.3 Modifier enfant
- [ ] Pré-remplissage des champs
- [ ] Sauvegarde des modifications

---

## 7. Gamification

### 7.1 Dashboard
- [ ] XP total affiché
- [ ] Niveau actuel
- [ ] Barre de progression
- [ ] Streak affiché

### 7.2 Badges
- [ ] Liste des badges débloqués
- [ ] Badges verrouillés grisés
- [ ] Animation au déblocage
- [ ] Rareté indiquée

### 7.3 Défis quotidiens
- [ ] Liste des défis du jour
- [ ] Statut de chaque défi
- [ ] XP rewards affichés

---

## 8. Notifications

### 8.1 Centre de notifications
- [ ] Badge compteur non lues
- [ ] Liste des notifications
- [ ] Marquer comme lu
- [ ] Supprimer notification

### 8.2 Push notifications
- [ ] Demande de permission
- [ ] Réception des notifications
- [ ] Clic ouvre l'app

---

## 9. PWA

### 9.1 Installation
- [ ] Prompt d'installation affiché
- [ ] Installation sur mobile
- [ ] Icône sur écran d'accueil

### 9.2 Offline
- [ ] Page offline affichée sans connexion
- [ ] Cache des pages visitées
- [ ] Synchronisation au retour en ligne

---

## 10. Administration

### 10.1 Accès
- [ ] Redirection si non admin
- [ ] Menu admin visible pour admins

### 10.2 Dashboard admin
- [ ] Statistiques affichées
- [ ] Graphiques fonctionnels
- [ ] Navigation vers sections

### 10.3 Gestion événements
- [ ] Liste des événements
- [ ] Créer un événement
- [ ] Modifier un événement
- [ ] Supprimer un événement

### 10.4 Check-in
- [ ] Scanner QR code
- [ ] Recherche manuelle
- [ ] Enregistrer entrée
- [ ] Enregistrer sortie

### 10.5 Gestion utilisateurs
- [ ] Liste des utilisateurs
- [ ] Recherche/filtrage
- [ ] Modification rôle

---

## 11. Responsive Design

### 11.1 Mobile (< 640px)
- [ ] Navigation hamburger
- [ ] Cards pleine largeur
- [ ] Formulaires adaptés
- [ ] Touch targets 44px minimum

### 11.2 Tablette (640px - 1024px)
- [ ] Grille 2 colonnes
- [ ] Sidebar collapsible
- [ ] Navigation adaptée

### 11.3 Desktop (> 1024px)
- [ ] Grille 3-4 colonnes
- [ ] Sidebar fixe
- [ ] Hover states

---

## 12. Accessibilité

### 12.1 Navigation clavier
- [ ] Tab order logique
- [ ] Focus visible
- [ ] Skip links fonctionnels
- [ ] Escape ferme modals

### 12.2 Screen reader
- [ ] ARIA labels présents
- [ ] Headings hiérarchiques
- [ ] Alt text images
- [ ] Annonces live regions

### 12.3 Visuel
- [ ] Contraste suffisant
- [ ] Mode sombre
- [ ] Texte redimensionnable

---

## 13. Performance

### 13.1 Chargement
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Skeletons pendant chargement
- [ ] Images optimisées

### 13.2 Interactions
- [ ] Réponse au clic < 100ms
- [ ] Animations fluides 60fps
- [ ] Pas de layout shift

---

## 14. Sécurité

### 14.1 Formulaires
- [ ] Validation côté client
- [ ] Messages d'erreur clairs
- [ ] Protection double-submit
- [ ] Sanitization visible

### 14.2 Sessions
- [ ] Expiration session
- [ ] Déconnexion autres appareils
- [ ] Pages protégées inaccessibles déconnecté

---

## Notes de Test

**Environnement:**
- [ ] Chrome (dernière version)
- [ ] Firefox (dernière version)
- [ ] Safari (dernière version)
- [ ] Mobile iOS Safari
- [ ] Mobile Android Chrome

**Données de test:**
- Email: test@example.com
- Password: Test1234!
- Téléphone: 0612345678

**Date:** ___________
**Testeur:** ___________
**Version:** ___________
