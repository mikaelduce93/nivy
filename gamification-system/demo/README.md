# Demo - Système de Gamification

## Installation rapide

Pour voir la démonstration complète du système de gamification :

### 1. Copier les fichiers dans ton app Next.js

```bash
# Créer le dossier de démo dans ton app
mkdir -p app/gamification-demo

# Copier les fichiers
cp gamification-system/demo/page.tsx app/gamification-demo/page.tsx
cp gamification-system/demo/mock-data.ts app/gamification-demo/mock-data.ts
```

### 2. Installer les dépendances (si pas déjà installées)

```bash
npm install framer-motion lucide-react
```

### 3. Lancer l'application

```bash
npm run dev
```

### 4. Accéder à la démo

Ouvre ton navigateur sur : **http://localhost:3000/gamification-demo**

## Ce que tu verras

La démo inclut des exemples interactifs pour tous les modules :

| Section | Fonctionnalités |
|---------|-----------------|
| **Vue d'ensemble** | Stats rapides, progression niveau, actions rapides |
| **Badges** | Badges débloqués/verrouillés, progression, raretés |
| **Classement** | Top 10, podium, tendances, périodes |
| **Missions** | Quotidiennes, hebdomadaires, mensuelles avec progression |
| **Boutique** | Articles, prix, catégories, achat |
| **Roue Fortune** | Animation de spin fonctionnelle |
| **Défis** | Duels, défis d'équipe, invitations |
| **Crews** | Membres, niveaux, statistiques |
| **Mini-Jeux** | Liste des jeux, scores, jouer |
| **Collections** | Sets, cartes, packs, progression |
| **VIP** | Statut actuel, niveaux, avantages |
| **Activités** | Feed social, likes, commentaires |
| **Stats** | Graphiques, série, progression |
| **Wrapped** | Récap annuel style Spotify |
| **Partage** | Code parrainage, plateformes sociales |

## Données de test

Le fichier `mock-data.ts` contient des données simulées complètes :

- Utilisateur avec stats
- 6 badges avec différents états
- 10 utilisateurs pour le leaderboard
- Missions quotidiennes/hebdomadaires/mensuelles
- Articles de boutique
- Segments de roue
- Défis actifs et en attente
- Crews et membres
- 4 mini-jeux
- Collections avec items
- Statut VIP Gold
- Activités récentes
- Notifications
- Données Wrapped 2024
- Code de parrainage

## Personnalisation

Pour utiliser tes propres données, remplace les imports mock par des appels à tes server actions :

```tsx
// Avant (mock)
import { mockBadges } from "./mock-data"

// Après (réel)
import { getUserBadges } from "@/gamification-system/features/achievements"
const { badges } = await getUserBadges()
```

## Notes

- La démo est 100% côté client avec des données mockées
- Aucune base de données requise pour la démo
- Toutes les interactions sont simulées (pas de persistence)
- Pour un système fonctionnel, intègre les server actions et exécute les migrations SQL
