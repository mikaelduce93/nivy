# Teens Party Morocco - Documentation Projet Complète

> Documentation exhaustive du projet, concept, parties prenantes, rôles et fonctionnalités

**Version:** 2.0
**Date:** Décembre 2024
**Statut:** En développement (Backend 100% | Frontend ~30%)

---

## Table des Matières

1. [Présentation du Projet](#1-présentation-du-projet)
2. [Concept V2: "Ton Mérite = Ton Pouvoir d'Achat"](#2-concept-v2-ton-mérite--ton-pouvoir-dachat)
3. [Les 3 Piliers](#3-les-3-piliers)
4. [Parties Prenantes](#4-parties-prenantes)
5. [Rôles et Permissions](#5-rôles-et-permissions)
6. [Architecture Technique](#6-architecture-technique)
7. [Modules Métier](#7-modules-métier)
8. [Système de Gamification (19 Modules)](#8-système-de-gamification-19-modules)
9. [Fonctionnalités Opérationnelles](#9-fonctionnalités-opérationnelles)
10. [Progressive Web App (PWA)](#10-progressive-web-app-pwa)
11. [Internationalisation](#11-internationalisation)
12. [Sécurité et Conformité](#12-sécurité-et-conformité)
13. [Avancement du Projet](#13-avancement-du-projet)
14. [Roadmap](#14-roadmap)

---

## 1. Présentation du Projet

### 1.1 Vision

**Teens Party Morocco** est bien plus qu'une simple plateforme d'événements. C'est un **écosystème complet de développement pour adolescents** qui combine :

- **Événements** : Soirées sécurisées pour les 13-17 ans
- **Éducation** : Aide scolaire gamifiée
- **Sport** : Défis physiques et clubs
- **Créativité** : Parcours passion personnalisés
- **Communauté** : Circles de discussion et crews

### 1.2 Mission

> "Transformer chaque effort en récompense tangible, chaque progrès en pouvoir d'achat"

L'objectif est de **motiver les adolescents** à progresser dans leurs études, leur sport et leurs passions en leur offrant une **valeur réelle** pour leurs accomplissements.

### 1.3 Objectifs Stratégiques

| Objectif | Description | Impact |
|----------|-------------|--------|
| **Engagement** | Fidéliser via gamification avancée | Rétention > 70% |
| **Éducation** | Améliorer les résultats scolaires | +15% moyenne générale |
| **Santé** | Encourager l'activité physique | 10k pas/jour |
| **Créativité** | Développer les talents | Showcases trimestriels |
| **Monétisation** | Convertir XP en revenus | LTV × 3 |

### 1.4 Contexte Marché

- **Cible principale:** Adolescents de 13 à 17 ans au Maroc
- **Cible secondaire:** Parents (décideurs et payeurs)
- **Zones:** Casablanca, Rabat, Marrakech (puis expansion)
- **Différenciation:** Plateforme unique combinant événements + développement personnel

---

## 2. Concept V2: "Ton Mérite = Ton Pouvoir d'Achat"

### 2.1 Principe Fondamental

```
L'ado progresse                    L'ado dépense moins
    │                                      │
    ├── Études (notes, quiz)               │
    ├── Sport (défis, assiduité)    ────► XP/Coins ───► │ Soirées gratuites
    ├── Passion (créations, parcours)                    │ Clubs gratuits
    └── Participation (events, communauté)               │ Stages gratuits
```

**Ce qui rend TPM unique :** Les XP gagnés ont une **valeur monétaire réelle**, permettant aux ados de "payer" avec leur mérite.

### 2.2 Valeur Réelle des XP

**Taux de conversion : 1 XP = 0.10 DH**

| XP Accumulés | Valeur en DH | Ce que tu peux acheter |
|--------------|--------------|------------------------|
| 1,500 XP | 150 DH | 1 entrée soirée |
| 2,500 XP | 250 DH | 1 stage foot (1 semaine) |
| 4,500 XP | 450 DH | 1 mois de club |
| 10,000 XP | 1,000 DH | Pass VIP Gold (1 mois) |

### 2.3 Système de Paiement Hybride

L'adolescent peut **combiner XP et argent** pour payer :

```
Stage de foot = 250 DH ou 2,500 XP

Options disponibles:
├── 100% XP     → 2,500 XP utilisés  → 0 DH à payer
├── 75% XP      → 1,875 XP utilisés  → 62.50 DH à payer
├── 50% XP      → 1,250 XP utilisés  → 125 DH à payer
├── 25% XP      → 625 XP utilisés    → 187.50 DH à payer
└── 100% Argent → 0 XP utilisés      → 250 DH à payer
```

### 2.4 Bonus d'Équilibre

Les ados qui progressent **dans les 3 piliers** reçoivent des bonus :

| Condition | Bonus Mensuel |
|-----------|---------------|
| Tous les piliers > 50/100 | +500 XP + Multiplicateur ×1.10 |
| Tous les piliers > 70/100 | +1,000 XP + Multiplicateur ×1.25 |
| Excellence (> 85/100) | +2,000 XP + Badge Spécial |

---

## 3. Les 3 Piliers

### 3.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    PROFIL ADOLESCENT                        │
├───────────────────┬───────────────────┬───────────────────┤
│      ÉCOLE        │      SPORT        │      CRÉA         │
│    (Score /100)   │    (Score /100)   │   (Score /100)    │
├───────────────────┼───────────────────┼───────────────────┤
│ • Notes scolaires │ • Présence clubs  │ • Tutos complétés │
│ • Quiz réussis    │ • Défis physiques │ • Créations       │
│ • Tutos regardés  │ • Records battus  │ • Likes reçus     │
│ • Progression     │ • Assiduité       │ • Niveaux passés  │
└───────────────────┴───────────────────┴───────────────────┘
```

### 3.2 Pilier École (Bleu)

**Objectif:** Encourager la réussite scolaire

**Composants:**
- **Notes scolaires** : Saisie validée par les parents
- **Quiz interactifs** : Par matière et niveau
- **Ressources éducatives** : Vidéos, exercices, tutos
- **Aide aux devoirs** : Recommandations personnalisées

**Gains XP:**

| Action | XP | Condition |
|--------|-----|-----------|
| Quiz réussi (>70%) | +50 | Par quiz |
| Tuto regardé entièrement | +30 | Par vidéo |
| Note améliorée +1 pt | +100 | Validé parent |
| Note améliorée +2 pts | +250 | Validé parent |
| Moyenne > 12/20 (mois) | +400 | Mensuel |
| Mention TB (trimestre) | +1,000 | Validé parent |

### 3.3 Pilier Sport (Vert)

**Objectif:** Promouvoir l'activité physique

**Composants:**
- **Défis quotidiens** : Pompes, squats, course...
- **Défis hebdomadaires** : Objectifs plus ambitieux
- **Records personnels** : À battre
- **Présence clubs** : Tracking automatique

**Gains XP:**

| Action | XP | Condition |
|--------|-----|-----------|
| Présence au club | +50 | Par session |
| Défi quotidien complété | +20-30 | Selon difficulté |
| Défi hebdo complété | +80-150 | Selon difficulté |
| Record personnel battu | +150 | Avec preuve |
| Assiduité 100% (mois) | +300 | Mensuel |

### 3.4 Pilier Créa (Violet)

**Objectif:** Développer les talents créatifs

**Composants:**
- **Parcours passion** : Danse, musique, art, tech...
- **Tutoriels guidés** : Progression par niveau
- **Portfolio créations** : Partage communautaire
- **Showcases** : Événements de présentation

**Gains XP:**

| Action | XP | Condition |
|--------|-----|-----------|
| Tuto complété | +30 | Vidéo entière |
| Niveau de parcours validé | +200-300 | Validé |
| Création uploadée | +50 | Modérée |
| Like reçu sur création | +3 | Par like |
| Participation showcase | +300-500 | Par event |

---

## 4. Parties Prenantes

### 4.1 Utilisateurs Finaux

#### Parents / Tuteurs Légaux
- **Rôle principal:** Créateurs de compte, payeurs, validateurs
- **Responsabilités:**
  - Inscription et gestion du compte familial
  - Création et gestion des profils enfants
  - Validation des notes scolaires
  - Signature électronique des autorisations
  - Réservation et paiement des événements
  - Suivi en temps réel (check-in/check-out)
  - Approbation des achats avec XP

#### Adolescents (13-17 ans)
- **Rôle principal:** Utilisateurs actifs, participants
- **Activités:**
  - Progression dans les 3 piliers
  - Participation aux défis quotidiens
  - Création de contenu (portfolio)
  - Interaction communautaire (Circles, Crews)
  - Utilisation des XP pour achats
  - Participation aux événements

### 4.2 Équipe Opérationnelle

#### Administrateurs
- Gestion complète de la plateforme
- CRUD événements, clubs, contenus
- Modération communautaire
- Analytics et reporting
- Check-in avec scanner QR

#### Ambassadeurs
- Promotion des événements
- Code de parrainage unique
- Commission sur ventes (10%)
- Dashboard de suivi conversions
- Gamification (classement ambassadeurs)

### 4.3 Partenaires

#### Éducatifs
- **Écoles partenaires** : Accès API notes (futur)
- **Coachs sportifs** : Validation défis
- **Professeurs arts** : Validation parcours créa

#### Commerciaux
- **Lieux événementiels** : Venues soirées et anniversaires
- **Boutiques partenaires** : Offres exclusives Pass VIP
- **Prestataires** : DJ, photographes, traiteurs

---

## 5. Rôles et Permissions

### 5.1 Hiérarchie des Rôles

```
┌─────────────────────────────────────────────────────────────┐
│                        ADMIN                                 │
│  (Accès total - Gestion plateforme - Modération)            │
├─────────────────────────────────────────────────────────────┤
│                     AMBASSADOR                               │
│  (Code parrainage - Stats ventes - Commission 10%)          │
├─────────────────────────────────────────────────────────────┤
│                       PARENT                                 │
│  (Compte - Enfants - Réservations - Validation notes)       │
├─────────────────────────────────────────────────────────────┤
│                        TEEN                                  │
│  (Profil - Gamification - Défis - Communauté)               │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Matrice des Permissions Détaillée

| Fonctionnalité | Admin | Ambassador | Parent | Teen |
|----------------|:-----:|:----------:|:------:|:----:|
| **ADMIN** |
| Gestion événements | ✅ | ❌ | ❌ | ❌ |
| Gestion clubs | ✅ | ❌ | ❌ | ❌ |
| Check-in QR | ✅ | ❌ | ❌ | ❌ |
| Analytics complets | ✅ | ❌ | ❌ | ❌ |
| Modération messages | ✅ | ❌ | ❌ | ❌ |
| Gestion ambassadeurs | ✅ | ❌ | ❌ | ❌ |
| **AMBASSADOR** |
| Code parrainage | ✅ | ✅ | ❌ | ❌ |
| Stats conversions | ✅ | ✅ | ❌ | ❌ |
| Demande versement | ❌ | ✅ | ❌ | ❌ |
| **PARENT** |
| Créer compte | ✅ | ✅ | ✅ | ❌ |
| Gérer enfants | ✅ | ❌ | ✅ | ❌ |
| Valider notes | ❌ | ❌ | ✅ | ❌ |
| E-signature | ❌ | ❌ | ✅ | ❌ |
| Réserver/payer | ✅ | ✅ | ✅ | ❌ |
| Suivi live check-in | ❌ | ❌ | ✅ | ❌ |
| **TEEN** |
| Profil personnalisé | ❌ | ❌ | ❌ | ✅ |
| Défis quotidiens | ❌ | ❌ | ❌ | ✅ |
| Gagner/utiliser XP | ❌ | ❌ | ❌ | ✅ |
| Circles chat | ❌ | ❌ | ❌ | ✅ |
| Crews | ❌ | ❌ | ❌ | ✅ |
| Mini-jeux | ❌ | ❌ | ❌ | ✅ |
| Leaderboard | ❌ | ❌ | ❌ | ✅ |

---

## 6. Architecture Technique

### 6.1 Stack Technologique

| Couche | Technologie | Usage |
|--------|-------------|-------|
| **Framework** | Next.js 16 (App Router) | Full-stack React |
| **Frontend** | React 19 + TypeScript | Interface utilisateur |
| **Styling** | Tailwind CSS 4 + Radix UI | Design system |
| **Animations** | Framer Motion | Interactions fluides |
| **Base de données** | Supabase (PostgreSQL) | Stockage + Realtime |
| **Authentification** | Supabase Auth | Sessions sécurisées |
| **Paiements** | Stripe + CMI + Mobile Money | Multi-gateway |
| **Emails** | Resend | Transactionnels |
| **SMS** | Twilio | Notifications |
| **Push** | Web Push API | Notifications PWA |
| **Tests** | Vitest + Playwright | Qualité |
| **Documentation** | Storybook | Composants UI |
| **Déploiement** | Vercel | Hébergement |

### 6.2 Structure du Projet

```
teens-party-morocco/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Routes publiques
│   │   ├── evenements/           # Agenda + fiches events
│   │   ├── clubs/                # Liste + inscription clubs
│   │   ├── anniversaires/        # Réservation anniversaires
│   │   └── carte-vip/            # Pass VIP
│   │
│   ├── (dashboard)/              # Espace utilisateur
│   │   ├── mon-compte/           # Profil parent
│   │   ├── mes-enfants/          # Gestion enfants
│   │   ├── mes-reservations/     # Historique
│   │   └── suivi-live/           # Check-in temps réel
│   │
│   ├── gamification/             # Hub gamification ados
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── missions/             # Missions quotidiennes
│   │   ├── defis/                # Défis amis
│   │   ├── roue/                 # Roue de la fortune
│   │   ├── boutique/             # Shop XP
│   │   ├── crews/                # Groupes d'amis
│   │   ├── leaderboard/          # Classements
│   │   ├── collections/          # Cartes collectibles
│   │   ├── aide-scolaire/        # Quiz + ressources
│   │   ├── defis-physiques/      # Sport challenges
│   │   └── parcours/             # Parcours passion
│   │
│   ├── admin/                    # Back-office
│   │   ├── check-in/             # Scanner QR
│   │   ├── evenements/           # CRUD events
│   │   ├── anniversaires/        # Gestion commandes
│   │   ├── utilisateurs/         # Gestion users
│   │   ├── ambassadeurs/         # Gestion ambassadeurs
│   │   └── moderation/           # Messages + reports
│   │
│   ├── api/                      # API Routes
│   └── actions/                  # Server Actions
│
├── gamification-system/          # Système gamification (19 modules)
│   ├── features/                 # Logique métier
│   │   ├── achievements/         # Badges
│   │   ├── leaderboard/          # Classements
│   │   ├── missions/             # Missions
│   │   ├── shop/                 # Boutique
│   │   ├── wheel/                # Roue fortune
│   │   ├── challenges/           # Défis
│   │   ├── crews/                # Groupes
│   │   ├── mini-games/           # Mini-jeux
│   │   ├── collections/          # Collectibles
│   │   ├── vip-system/           # Tiers VIP
│   │   └── ...
│   ├── components/               # UI gamification
│   └── database/                 # Migrations SQL
│
├── components/                   # Composants globaux
│   ├── ui/                       # Design system (shadcn)
│   ├── qr-scanner.tsx            # Scanner QR
│   ├── e-signature-form.tsx      # E-signature
│   └── photo-upload.tsx          # Upload optimisé
│
├── lib/                          # Utilitaires
│   ├── supabase/                 # Clients Supabase
│   ├── security/                 # CSRF, rate limiting
│   ├── validation/               # Schémas Zod
│   └── payments/                 # CMI, Mobile Money
│
└── docs/                         # Documentation
```

### 6.3 Base de Données

#### Tables Principales

| Domaine | Tables |
|---------|--------|
| **Utilisateurs** | `profiles`, `teens`, `documents`, `authorizations` |
| **Événements** | `events`, `bookings`, `booking_tickets`, `check_in_logs` |
| **Clubs** | `clubs`, `club_memberships`, `club_sessions` |
| **Anniversaires** | `anniv_packs`, `anniv_extras`, `anniv_orders` |
| **Pass VIP** | `vip_cards`, `vip_card_usage`, `vip_tiers` |
| **Partenaires** | `partners`, `partner_venues`, `partner_discounts` |

#### Tables Gamification

| Domaine | Tables |
|---------|--------|
| **XP & Niveaux** | `user_xp`, `xp_ledger`, `levels` |
| **Streaks** | `user_streaks`, `streak_bonuses` |
| **Défis** | `challenges_templates`, `user_challenges`, `physical_challenges` |
| **Badges** | `badges`, `user_badges`, `badge_conditions` |
| **Missions** | `missions`, `user_missions`, `mission_rewards` |
| **Boutique** | `shop_rewards`, `shop_purchases`, `shop_categories` |
| **Roue** | `wheel_segments`, `wheel_spins`, `wheel_history` |
| **Crews** | `crews`, `crew_members`, `crew_challenges` |
| **Collections** | `collectibles`, `user_collectibles`, `collections` |
| **Leaderboard** | `leaderboard_entries`, `leaderboard_rewards` |
| **Mini-jeux** | `mini_games`, `game_scores`, `game_achievements` |

#### Tables Éducatives (V2)

| Table | Description |
|-------|-------------|
| `teen_grades` | Notes scolaires validées par parents |
| `educational_resources` | Quiz, vidéos, exercices |
| `passion_paths` | Parcours créatifs (danse, musique, art...) |
| `passion_path_levels` | Niveaux par parcours |
| `teen_passion_progress` | Progression des ados |

---

## 7. Modules Métier

### 7.1 Module Événements

**Description:** Gestion complète du cycle de vie des soirées

**Flux:**
1. Admin crée événement (date, lieu, capacité, prix)
2. Publication sur l'agenda public
3. Parent réserve + paye (Stripe/CMI/Mobile Money)
4. E-signature autorisation parentale
5. Génération QR code billet
6. Check-in le jour J (scan QR)
7. Notification parent en temps réel
8. Check-out et XP bonus pour l'ado

**Tarification dynamique:**
- Prix standard : 150 DH
- Prix Pass Gold : 120 DH (-20%)
- Prix Pass Platinum : 105 DH (-30%)
- Prix en XP : 1,500 XP (paiement hybride possible)

### 7.2 Module Anniversaires

**Description:** Organisation d'anniversaires pendant ou hors événements

**Deux parcours:**

| Pendant événement | Sur mesure (custom) |
|-------------------|---------------------|
| Pack Starter (6-10 invités) - 800 DH | Pack Essentiel - 2,500 DH |
| Pack Plus (11-20 invités) - 1,500 DH | Pack Signature - 5,000 DH |
| Pack VIP (21-30 invités) - 2,500 DH | Pack Luxe - 10,000 DH |

**12 Extras disponibles:**
1. DJ privé (+1,500 DH)
2. Photographe (+800 DH)
3. Vidéaste (+1,200 DH)
4. Décoration thématique (+600 DH)
5. Buffet premium (+1,000 DH)
6. Gâteau personnalisé (+400 DH)
7. Animation spéciale (+500 DH)
8. Limousine (+1,500 DH)
9. Candy bar (+400 DH)
10. Photobooth (+700 DH)
11. Confettis & effets (+300 DH)
12. Cadeaux invités (+400 DH)

### 7.3 Module Pass VIP

**Description:** Programme de fidélité avec 3 niveaux principaux

| Tier | Prix/mois | Réduction | Avantages |
|------|-----------|-----------|-----------|
| **Standard** | Gratuit | 0% | Accès de base, gamification |
| **Gold** | 299 DH | 20% | + Réservation prioritaire 48h |
| **Platinum** | 599 DH | 30% | + Events exclusifs + Perks boutiques |

**Fonctionnalités Pass:**
- Application automatique des réductions
- Tracking utilisation mensuelle
- Calcul économies réalisées
- Abonnement récurrent Stripe
- Paiement possible en XP (Gold = 2,990 XP)

### 7.4 Module Clubs

**Description:** Activités régulières hebdomadaires

**Types de clubs:**
- **Sport:** Football, basketball, danse, fitness
- **Art:** Dessin, peinture, sculpture
- **Musique:** Chant, guitare, DJ
- **Tech:** Coding, robotique, gaming

**Fonctionnalités:**
- Inscription mensuelle (DH ou XP)
- Planning des sessions
- Check-in automatique = XP
- Progression par niveau
- Certificats de complétion

### 7.5 Module Circles (Communauté)

**Description:** Chat communautaire modéré

**Types de Circles:**
- **Event Circles:** Chat temporaire J-7 → J+3
- **Club Circles:** Chat permanent par club
- **School Circles:** Chat par école (V2)

**Fonctionnalités:**
- Messages texte + images
- Réactions et likes
- Signalement pour modération
- Auto-modération mots interdits
- Gain XP pour participation constructive

---

## 8. Système de Gamification (19 Modules)

### 8.1 Vue d'Ensemble

Le système de gamification de TPM comprend **19 modules interconnectés** pour maximiser l'engagement :

```
┌────────────────────────────────────────────────────────────────┐
│                    HUB GAMIFICATION                             │
├────────────┬────────────┬────────────┬────────────┬───────────┤
│  BADGES    │ LEADERBOARD│  MISSIONS  │   SHOP     │   WHEEL   │
│ (Module 1) │ (Module 2) │ (Module 3) │ (Module 4) │ (Module 5)│
├────────────┼────────────┼────────────┼────────────┼───────────┤
│ CHALLENGES │   CREWS    │  ADV.TYPE  │   EVENT    │ SEASONAL  │
│ (Module 6) │ (Module 7) │ (Module 8) │ (Module 9) │(Module 10)│
├────────────┼────────────┼────────────┼────────────┼───────────┤
│ MINI-GAMES │   STATS    │  WRAPPED   │  PROFILE   │COLLECTIONS│
│(Module 11) │(Module 12) │(Module 13) │(Module 14) │(Module 15)│
├────────────┼────────────┼────────────┼───────────────────────┤
│   NOTIFS   │    VIP     │   FEED     │      SOCIAL           │
│(Module 16) │(Module 17) │(Module 18) │    (Module 19)        │
└────────────┴────────────┴────────────┴───────────────────────┘
```

### 8.2 Détail des 19 Modules

| # | Module | Description | Fonctionnalités clés |
|---|--------|-------------|---------------------|
| 1 | **Badges & Achievements** | Badges débloquables | 50+ badges, conditions automatiques, raretés |
| 2 | **Leaderboard** | Classements compétitifs | Hebdo/mensuel/global, par école, par crew |
| 3 | **Missions & Quests** | Objectifs à accomplir | Daily/weekly/monthly/seasonal, chaînes |
| 4 | **Rewards Shop** | Boutique XP | Goodies, réductions, items exclusifs |
| 5 | **Fortune Wheel** | Roue quotidienne | 1 spin/jour, bonus streak, jackpot |
| 6 | **Friend Challenges** | Défis entre amis | 1v1 duels, paris XP, preuves photo |
| 7 | **Crews System** | Groupes d'amis | Création crew, classement crews, défis collectifs |
| 8 | **Advanced Challenges** | Types de défis | Photo, quiz, géoloc, flash (temps limité) |
| 9 | **Event Challenges** | Défis événementiels | Check-in early, stay late, reviewer |
| 10 | **Seasonal Challenges** | Défis saisonniers | Calendrier avent, Halloween, Ramadan |
| 11 | **Mini-Games** | Jeux intégrés | Quiz musical, memory, prédictions |
| 12 | **Stats Dashboard** | Statistiques perso | Graphiques progression, comparaisons |
| 13 | **Annual Wrapped** | Récap annuel | Style Spotify Wrapped, partage social |
| 14 | **Profile Customization** | Personnalisation | Frames, titres, couleurs, effets |
| 15 | **Collections** | Collectibles | Cartes, stickers, sets complets |
| 16 | **Gamified Notifications** | Notifs intelligentes | Rappels, célébrations, streaks |
| 17 | **VIP System** | Tiers VIP gaming | 7 niveaux (Standard → Legendary) |
| 18 | **Activity Feed** | Fil d'actualité | Actions amis, réactions, tendances |
| 19 | **Social Sharing** | Partage social | Instagram, TikTok, parrainage |

### 8.3 Configuration XP

```typescript
// Récompenses XP standards
XP_REWARDS = {
  // Événements
  EVENT_ATTENDANCE: 100,
  EVENT_CHECK_IN_EARLY: 50,
  EVENT_STAY_LATE: 30,
  EVENT_REVIEW: 30,

  // Défis
  DAILY_CHALLENGE: 30,
  WEEKLY_CHALLENGE: 100,
  MONTHLY_CHALLENGE: 300,

  // Social
  FRIEND_CHALLENGE_WIN: 50,
  CREW_CHALLENGE_WIN: 100,
  REFERRAL_SIGNUP: 200,
  REFERRAL_FIRST_EVENT: 300,

  // Streaks
  STREAK_7_DAYS: 100,
  STREAK_30_DAYS: 500,
  STREAK_100_DAYS: 2000,

  // V2 - Piliers
  QUIZ_COMPLETED: 50,
  TUTORIAL_WATCHED: 30,
  GRADE_IMPROVED: 100,
  CLUB_ATTENDANCE: 50,
  PHYSICAL_CHALLENGE: 25,
  CREATION_UPLOADED: 50,
}
```

---

## 9. Fonctionnalités Opérationnelles

### 9.1 Scanner QR Check-in/Check-out

**Description:** Système de contrôle d'accès aux événements

**Format QR:** `TEENSPARTY:EVENT_ID:BOOKING_ID`

**Fonctionnalités:**
- Scan via caméra mobile
- Mode offline avec queue locale
- Recherche manuelle fallback
- Badge "NO-PHOTO" visible
- Alertes doublons
- Notification parent instantanée
- Logs d'audit complets

**Workflow:**
```
ENTRÉE:
1. Scan QR → Validation billet
2. Vérification e-signature OK
3. Enregistrement heure entrée
4. Notification push parent
5. +100 XP pour l'ado

SORTIE:
1. Scan QR → Vérification autorisation sortie
2. Si sortie avant fin: confirmation staff
3. Enregistrement heure sortie
4. Notification push parent
5. XP bonus si resté jusqu'à la fin
```

### 9.2 E-Signature Parentale

**Description:** Autorisation parentale légalement valide

**Processus en 3 étapes:**
1. **Informations parentales:** Nom complet, CIN, consentements
2. **Upload CIN:** Recto et verso (max 5 Mo)
3. **Signature électronique:** Canvas tactile

**Sécurité:**
- Hash SHA-256 pour intégrité
- Capture IP et user-agent
- Horodatage certifié
- Stockage séparé chiffré

**Consentements collectés:**
- Autorisation de participation
- Consentement photo/vidéo
- Consentement médical d'urgence
- Règles de sortie (avec/sans parent)

### 9.3 Dashboard Parent Temps Réel

**Description:** Suivi en direct de l'enfant pendant l'événement

**Informations affichées:**
- Statut: "En activité" / "Arrivé" / "Sorti"
- Heure check-in
- Heure estimée fin
- Bouton "Demander check-out anticipé"
- Timeline de la journée
- Galerie photos (si consentement)

### 9.4 Purge Automatique RGPD

**Description:** Conformité données personnelles

**Processus:**
- Cron job quotidien à 2h du matin
- Suppression documents > 30 jours
- CIN, signatures, autorisations
- Logs d'audit conservés
- Notification admin si erreur

---

## 10. Progressive Web App (PWA)

### 10.1 Fonctionnalités PWA

| Fonctionnalité | Description |
|----------------|-------------|
| **Installation** | Prompt d'ajout à l'écran d'accueil |
| **Mode offline** | Cache billets QR et données essentielles |
| **Push notifications** | Alertes check-in, défis, rappels |
| **Caméra native** | Scanner QR optimisé |
| **Plein écran** | Mode standalone sans barre URL |

### 10.2 Manifest

```json
{
  "name": "Teens Party Morocco",
  "short_name": "TPM",
  "description": "Soirées et développement pour ados",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#10b981",
  "background_color": "#0a0a0a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192" },
    { "src": "/icons/icon-512.png", "sizes": "512x512" }
  ]
}
```

### 10.3 Service Worker

**Cache Strategy:**
- Billets QR: Cache First (offline obligatoire)
- Pages: Network First (fraîcheur)
- Assets: Stale While Revalidate (performance)

---

## 11. Internationalisation

### 11.1 Langues Supportées

| Langue | Code | Direction | Priorité |
|--------|------|-----------|----------|
| Français | `fr` | LTR | P0 (launch) |
| Arabe | `ar` | RTL | P1 (post-launch) |
| Anglais | `en` | LTR | P2 (optionnel) |

### 11.2 Structure des Traductions

```
/locales
├── fr/
│   ├── common.json      # Termes généraux
│   ├── events.json      # Module événements
│   ├── gamification.json # Module gamification
│   └── auth.json        # Authentification
├── ar/
│   ├── common.json      # RTL adapté
│   └── ...
└── en/
    └── ...
```

### 11.3 Adaptation RTL (Arabe)

- Inversion automatique des layouts
- Polices arabes (Noto Sans Arabic)
- Direction texte et icônes
- Formats dates/nombres locaux

---

## 12. Sécurité et Conformité

### 12.1 Mesures de Sécurité

| Mesure | Description | Statut |
|--------|-------------|:------:|
| **RLS** | Row Level Security PostgreSQL | ✅ |
| **CSP** | Content Security Policy stricte | ✅ |
| **Rate Limiting** | 5-60 req/min selon endpoint | ✅ |
| **CSRF** | Tokens sur toutes mutations | ✅ |
| **Headers** | X-Frame-Options, HSTS, etc. | ✅ |
| **Validation** | Zod + sanitization XSS | ✅ |
| **Age Check** | Trigger SQL côté serveur | ✅ |
| **Encryption** | TLS 1.3, données sensibles chiffrées | ✅ |

### 12.2 Rate Limiting par Endpoint

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| `/api/auth/*` | 5 req | 1 min |
| `/api/bookings/*` | 10 req | 1 min |
| `/api/payments/*` | 3 req | 1 min |
| `/api/upload/*` | 10 req | 1 min |
| Autres API | 60 req | 1 min |

### 12.3 Conformité RGPD / CNDP (Maroc)

| Exigence | Implémentation |
|----------|----------------|
| Purge automatique | Documents > 30 jours supprimés |
| Consentement | Cookie banner opt-in explicite |
| Droit d'accès | Export données personnelles |
| Droit à l'oubli | Suppression compte complète |
| Droit rectification | Modification données |
| Registre traitements | Documentation interne |

### 12.4 Pages Légales

- `/legal/confidentialite` - Politique de confidentialité
- `/legal/cgu` - Conditions Générales d'Utilisation
- `/legal/cgv` - Conditions Générales de Vente
- `/legal/mentions-legales` - Mentions légales
- `/legal/cookies` - Politique cookies

---

## 13. Avancement du Projet

### 13.1 État Actuel

```
Backend (DB + APIs)    ████████████████████ 100%
Frontend               ██████░░░░░░░░░░░░░░  30%
Gamification           ████████████████░░░░  80%
Testing                ██░░░░░░░░░░░░░░░░░░  10%
Déploiement            ░░░░░░░░░░░░░░░░░░░░   0%
─────────────────────────────────────────────────
TOTAL GLOBAL           ~55% vers product-ready
```

### 13.2 Détail par Module

| Module | Backend | Frontend | Status |
|--------|:-------:|:--------:|--------|
| Auth/Onboarding | ✅ | ✅ | Complet |
| Événements | ✅ | ✅ | Complet |
| Réservations | ✅ | ✅ | Complet |
| Check-in QR | ✅ | ✅ | Complet |
| E-signature | ✅ | ✅ | Complet |
| Clubs | ✅ | ✅ | Complet |
| Anniversaires | ✅ | ⏳ | Frontend à connecter |
| Pass VIP | ✅ | ⏳ | Frontend à connecter |
| Gamification base | ✅ | ✅ | Complet |
| Gamification V2 | ⏳ | ⏳ | En cours |
| Circles | ❌ | ❌ | P1 |
| Dashboard parent live | ❌ | ❌ | P1 |
| PWA | ⏳ | ⏳ | Partiel |
| i18n | ❌ | ❌ | P1 |

### 13.3 Réalisations Clés

- ✅ **11 nouvelles tables** de base de données
- ✅ **7 fonctions PostgreSQL** automatisées
- ✅ **42 Server Actions** créées
- ✅ **19 modules** de gamification
- ✅ **Sécurité P0** complète (RLS, CSP, CSRF, Rate Limit)
- ✅ **Design System** complet avec Storybook

---

## 14. Roadmap

### Phase 1: MVP (P0) - Semaines 1-2

| Tâche | Priorité | Effort |
|-------|:--------:|:------:|
| Formulaire enfant enrichi | P0 | 4h |
| Anniversaires → APIs | P0 | 6h |
| Souscription Pass VIP | P0 | 4h |
| Tarifs Pass sur events | P0 | 3h |
| Admin gestion anniversaires | P0 | 6h |
| Tests manuels complets | P0 | 8h |

### Phase 2: Gamification V2 - Semaines 3-4

| Tâche | Priorité | Effort |
|-------|:--------:|:------:|
| Extension `user_xp` (piliers) | P0 | 3h |
| Page Aide Scolaire | P1 | 8h |
| Page Défis Physiques | P1 | 6h |
| Paiement hybride XP+DH | P1 | 8h |
| Dashboard parent progression | P1 | 6h |

### Phase 3: Communauté - Mois 2

| Tâche | Priorité | Effort |
|-------|:--------:|:------:|
| Circles événements | P1 | 12h |
| Modération messages | P1 | 6h |
| Ambassadeurs avancé | P1 | 10h |
| Notifications push | P1 | 6h |

### Phase 4: Polish - Mois 3

| Tâche | Priorité | Effort |
|-------|:--------:|:------:|
| PWA complète | P1 | 8h |
| Internationalisation FR/AR | P1 | 16h |
| Tests E2E Playwright | P1 | 12h |
| Monitoring Sentry | P1 | 4h |
| Déploiement production | P0 | 8h |

### Phase 5: V2 - Trimestre 2

| Tâche | Priorité | Effort |
|-------|:--------:|:------:|
| Parcours passion | P2 | 20h |
| Mini-jeux avancés | P2 | 16h |
| Circles écoles | P2 | 12h |
| App mobile Flutter | P2 | 6 semaines |
| Intégration écoles API | P2 | Variable |

---

## Annexes

### A. Variables d'Environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Paiements
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
CMI_MERCHANT_ID=
CMI_SECRET_KEY=
INWI_API_KEY=
ORANGE_API_KEY=

# Notifications
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Sécurité
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

### B. Scripts Disponibles

```bash
# Développement
npm run dev              # Serveur dev
npm run build            # Build production
npm run start            # Serveur prod

# Qualité
npm run lint             # ESLint
npm run test             # Tests unitaires
npm run test:e2e         # Tests E2E
npm run test:coverage    # Couverture

# Documentation
npm run storybook        # Composants UI

# Base de données
npm run migrate:p0       # Migrations automatiques
npm run migrate:manual   # Instructions manuelles
```

### C. Métriques de Succès

| Métrique | Objectif |
|----------|----------|
| Lighthouse Score | > 90 |
| Core Web Vitals | Verts |
| Taux conversion réservation | > 15% |
| Taux rétention 30j | > 70% |
| NPS | > 50 |
| Temps check-in | < 30s |
| Uptime | > 99.9% |

### D. Contacts

- **Sécurité:** security@teensparty.ma
- **Support:** support@teensparty.ma
- **Tech:** tech@teensparty.ma

---

*Document généré le 17 décembre 2024*
*Version 2.0 - Documentation complète*
*Teens Party Morocco - Tous droits réservés*
