# Plan Product Ready - Teens Party Morocco (Version Améliorée "Next Gen")

## Vue d'ensemble
L'objectif est de créer une expérience **"Digital Nightlife"** cohérente avec un public 13-17 ans. L'interface ne doit pas ressembler à un site de réservation classique, mais à une extension numérique de la fête : **Hype, Social, et Exclusif**.

## Phase 1 : UI "Neo-Nightlife" (L'Immersion)
Transformation de l'interface pour refléter l'énergie des soirées.

*   **Design System "Neon Glass"** :
    *   Remplacement des cartes solides par du **Glassmorphism** (flou + transparence) pour un effet moderne et premium.
    *   **Backgrounds Vivants** : Particules subtiles ou "spotlights" mouvants en arrière-plan qui réagissent au scroll.
    *   **Micro-interactions** : Boutons qui "pulsent" au rythme d'une musique virtuelle, retours haptiques (vibrations) sur mobile lors des clics.
*   **Navigation "App-Like"** :
    *   **Dock Flottant** (Mobile) : Une barre de navigation flottante et translucide (style iOS) plutôt qu'une barre fixe classique.
    *   **Transitions Fluides** : Les pages ne "chargent" pas, elles glissent (Swipe navigation) comme sur une app native.

## Phase 2 : Gamification Sociale (La "Social Proof")
La gamification actuelle est individuelle. Pour être cohérente avec le concept "Party", elle doit être **Sociale**.

*   **Le "Teen ID" (Identité Numérique)** :
    *   Transformer le profil en une **Carte Holographique 3D** (tilt effect) qui affiche le niveau, le rang VIP et les badges.
    *   Cette carte est **partageable** sur Instagram/Snapchat/TikTok en un clic (générateur d'image dynamique).
*   **Système de "Crews" (Clans)** :
    *   Permettre aux utilisateurs de créer un **Crew** (groupe d'amis).
    *   **Bonus de Groupe** : "Si ton Crew de 4 personnes vient à la soirée, tout le monde gagne +100 XP".
    *   **Leaderboard des Crews** : Quel groupe est le plus actif de Casablanca ?

## Phase 3 : L'Expérience "Live Event"
L'application doit être indispensable *pendant* la soirée, pas juste avant.

*   **Mode "Tonight" (Activé le soir de l'événement)** :
    *   L'accueil de l'app change radicalement 2h avant la soirée.
    *   **Billet Rapide** : Le QR code apparaît immédiatement en ouvrant l'app (luminosité max auto).
    *   **Flash Check-in** : L'écran clignote d'une couleur spécifique (validé par le videur) pour un accès VIP rapide.
*   **Interactivité Live** :
    *   **Vote DJ** : Sondage en temps réel pendant la soirée ("Prochain style : Rap US ou Afro ?").
    *   **Moments Gagnants** : Notification Push à une heure aléatoire : "Le premier qui montre cet écran au bar gagne un mocktail !".

## Phase 4 : FOMO & Contenu (Fear Of Missing Out)
*   **Stories Vidéo** :
    *   Remplacer les bannières statiques par des **Stories** (format vertical vidéo) montrant l'ambiance des soirées précédentes.
*   **Drop Zone** :
    *   Une section où des photos exclusives de la soirée sont débloquées uniquement pour ceux qui étaient présents (via géolocalisation ou scan billet).

## Plan d'Action Immédiat
1.  **Design System** : Refonte du `globals.css` et création de composants `GlassCard` et `AnimatedBackground`.
2.  **Navigation** : Implémenter le `FloatingDock` pour mobile.
3.  **Teen ID** : Créer le composant carte 3D interactif.
4.  **Crew Logic** : Mettre en place la structure de base des groupes en base de données.

## Questions de Validation
*   Cette direction "Social Nightlife" correspond-elle mieux à votre vision ?
*   Souhaitez-vous prioriser l'aspect visuel (UI Neon) ou social (Crews) en premier ?
