# Gamification V2 - Évolution du Système
## Teens Party Morocco

> Ce document décrit les améliorations à apporter au système de gamification existant pour transformer TPM en plateforme de développement pour adolescents.

---

## 1. État Actuel

### 1.1 Ce qui existe déjà

**Architecture:**
```
gamification-system/           # 19 modules
├── features/
│   ├── achievements/          # Badges
│   ├── leaderboard/          # Classements
│   ├── missions/             # Missions hebdo/mensuel
│   ├── shop/                 # Boutique XP
│   ├── wheel/                # Roue fortune
│   ├── challenges/           # Défis amis
│   ├── crews/                # Groupes
│   └── ...
└── components/

features/gamification/         # Domain actions
├── actions.ts                # Server actions (addXP, getDailyChallenges...)
└── schema.ts                 # Validation Zod

app/gamification/             # Pages
├── page.tsx                  # Hub principal
├── missions/
├── roue/
├── defis/
├── boutique/
├── crews/
├── leaderboard/
└── collections/
```

**Profils Teens (`features/teens/schema.ts`):**
```typescript
profiles: ['School', 'Sport', 'Créa']  // max 2
interests: string[]                     // Football, K-Pop, Danse, Gaming...
```

**Défis par profil (DÉJÀ IMPLÉMENTÉ dans `actions.ts`):**
```typescript
// assignDailyChallenges() - Ligne 324
const teenProfiles: string[] = teen?.profiles || []
if (teenProfiles.includes('School')) categoriesToAssign.push('school')
if (teenProfiles.includes('Sport')) categoriesToAssign.push('sport')
if (teenProfiles.includes('Créa')) categoriesToAssign.push('crea')
```

**Configuration actuelle (`gamification-system/index.ts`):**
```typescript
GAMIFICATION_CONFIG = {
  BASE_XP_PER_ACTION: 10,
  MAX_LEVEL: 100,
  XP_PER_LEVEL_BASE: 100,
  // ...
}

XP_REWARDS = {
  EVENT_ATTENDANCE: 100,
  DAILY_CHALLENGE: 30,
  // ...
}
```

### 1.2 Ce qu'on veut améliorer

| Actuel | Objectif V2 |
|--------|-------------|
| XP sans valeur tangible | XP/Coins = économies réelles (DH) |
| Défis génériques | Défis personnalisés par intérêts |
| Pas de lien études | Aide scolaire gamifiée |
| Parents non intégrés | Dashboard parent |
| Boutique basique | Achat clubs/stages/events avec XP |

---

## 2. Concept V2: "Ton mérite = Ton pouvoir d'achat"

### 2.1 Principe

```
L'ado progresse                    L'ado dépense moins
    │                                      │
    ├── Études (notes, quiz)               │
    ├── Sport (défis, assiduité)    ────► XP/Coins ───► │ Soirées gratuites
    ├── Passion (créations, parcours)                    │ Clubs gratuits
    └── Participation (events, communauté)               │ Stages gratuits
```

### 2.2 Valeur Réelle des XP

**Proposition: 1 XP = 0.10 DH**

```
XP            Valeur DH      Peut acheter
────────────────────────────────────────────
1,500 XP      150 DH        1 entrée soirée
2,500 XP      250 DH        1 stage foot (1 semaine)
4,500 XP      450 DH        1 mois de club
```

**Paiement hybride:**
```
Stage foot = 250 DH ou 2,500 XP

Options pour l'ado:
├── 100% XP:     2,500 XP  →  0 DH à payer
├── 50/50:       1,250 XP  →  125 DH à payer
├── 100% argent: 0 XP      →  250 DH à payer
```

---

## 3. Évolutions Techniques

### 3.1 Extension de la table `user_xp`

```sql
-- Ajouter les scores de piliers à user_xp existant
ALTER TABLE user_xp
ADD COLUMN IF NOT EXISTS school_score INT DEFAULT 50,
ADD COLUMN IF NOT EXISTS sport_score INT DEFAULT 50,
ADD COLUMN IF NOT EXISTS crea_score INT DEFAULT 50,
ADD COLUMN IF NOT EXISTS coins_equivalent DECIMAL(10,2)
  GENERATED ALWAYS AS (total_xp * 0.10) STORED;
```

### 3.2 Extension de `shop_rewards`

```sql
-- Ajouter le prix en DH pour paiement hybride
ALTER TABLE shop_rewards
ADD COLUMN IF NOT EXISTS price_dh DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS allows_hybrid_payment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS required_pillar VARCHAR(20),
ADD COLUMN IF NOT EXISTS required_pillar_score INT;

-- Calculer prix DH depuis xp_cost existant
UPDATE shop_rewards SET price_dh = xp_cost * 0.10 WHERE price_dh IS NULL;
```

### 3.3 Nouvelle table: Notes scolaires

```sql
CREATE TABLE teen_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID REFERENCES teens(id) ON DELETE CASCADE,

  subject VARCHAR(100) NOT NULL,
  grade DECIMAL(4,2) NOT NULL,
  max_grade DECIMAL(4,2) DEFAULT 20,

  trimester INT,
  school_year VARCHAR(9),

  validated_by_parent BOOLEAN DEFAULT false,
  validation_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 Nouvelle table: Défis physiques

```sql
CREATE TABLE physical_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title VARCHAR(255) NOT NULL,
  description TEXT,

  category VARCHAR(50) NOT NULL, -- daily, weekly, monthly
  sport_type VARCHAR(100),       -- football, danse, fitness...

  metric_type VARCHAR(50),       -- reps, duration, distance
  target_value INT NOT NULL,
  unit VARCHAR(20),

  xp_reward INT NOT NULL,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teen_physical_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID REFERENCES teens(id),
  challenge_id UUID REFERENCES physical_challenges(id),

  current_value INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 Nouvelle table: Parcours passion

```sql
CREATE TABLE passion_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL,        -- danse_hiphop, chant, dessin_manga
  category VARCHAR(50),              -- danse, musique, art, tech

  title VARCHAR(255) NOT NULL,
  description TEXT,

  total_levels INT DEFAULT 5,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE passion_path_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID REFERENCES passion_paths(id),

  level_number INT NOT NULL,
  level_name VARCHAR(100),           -- Débutant, Apprenti, Confirmé...

  required_tutorials JSONB,          -- IDs des tutos obligatoires
  required_challenges JSONB,

  xp_reward INT NOT NULL,

  UNIQUE(path_id, level_number)
);

CREATE TABLE teen_passion_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID REFERENCES teens(id),
  path_id UUID REFERENCES passion_paths(id),

  current_level INT DEFAULT 1,
  tutorials_completed JSONB DEFAULT '[]',

  started_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, path_id)
);
```

### 3.6 Nouvelle table: Ressources éducatives

```sql
CREATE TABLE educational_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title VARCHAR(255) NOT NULL,
  description TEXT,

  type VARCHAR(50) NOT NULL,         -- video, quiz, exercise
  subject VARCHAR(100),              -- Maths, Français, Physique...
  topic VARCHAR(255),                -- Équations, Grammaire...

  grade_levels TEXT[],               -- 6ème, 3ème, 2nde...
  difficulty VARCHAR(20),

  content_url TEXT,
  duration_minutes INT,

  xp_reward INT DEFAULT 30,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Évolutions des Server Actions

### 4.1 Extension de `features/gamification/actions.ts`

```typescript
// NOUVELLES ACTIONS À AJOUTER

/**
 * Récupère les scores des 3 piliers d'un teen
 */
export async function getTeenPillarScores(teenId: string): Promise<ActionResult<PillarScores>> {
  // Calculer school_score, sport_score, crea_score
  // Basé sur: notes, assiduité, défis complétés, créations...
}

/**
 * Récupère les défis personnalisés selon les intérêts du teen
 */
export async function getPersonalizedChallenges(teenId: string): Promise<ActionResult<Challenge[]>> {
  // Utiliser teen.interests pour filtrer les défis pertinents
}

/**
 * Calcule les options de paiement hybride
 */
export async function getPaymentOptions(
  rewardId: string,
  teenId: string
): Promise<ActionResult<PaymentOption[]>> {
  // Retourne les combinaisons XP + DH possibles
}

/**
 * Effectue un achat hybride
 */
export async function purchaseWithHybrid(
  rewardId: string,
  teenId: string,
  xpToUse: number
): Promise<ActionResult<Purchase>> {
  // Déduit XP et calcule le reste à payer en DH
}
```

### 4.2 Nouveau fichier: `features/gamification/pillar-actions.ts`

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Calcule le score École (sur 100)
 */
export async function calculateSchoolScore(teenId: string): Promise<number> {
  const supabase = await createClient()

  // 1. Moyenne générale (40 pts)
  const { data: grades } = await supabase
    .from('teen_grades')
    .select('grade')
    .eq('teen_id', teenId)
    .eq('validated_by_parent', true)

  const average = grades?.length
    ? grades.reduce((sum, g) => sum + g.grade, 0) / grades.length
    : 10

  let score = 0
  if (average >= 16) score += 40
  else if (average >= 14) score += 35
  else if (average >= 12) score += 30
  else if (average >= 10) score += 20
  else score += 10

  // 2. Engagement apprentissage (30 pts) - quiz, tutos
  const { count: quizCount } = await supabase
    .from('completed_resources')
    .select('*', { count: 'exact', head: true })
    .eq('teen_id', teenId)
    .eq('type', 'quiz')

  score += Math.min(30, (quizCount || 0) * 3)

  // 3. Progression (30 pts) - défis school complétés
  const { count: challengesCount } = await supabase
    .from('user_challenges')
    .select('*', { count: 'exact', head: true })
    .eq('teen_id', teenId)
    .eq('status', 'completed')
    .eq('challenge.category', 'school')

  score += Math.min(30, (challengesCount || 0) * 5)

  return Math.min(100, score)
}

/**
 * Calcule le score Sport (sur 100)
 */
export async function calculateSportScore(teenId: string): Promise<number> {
  // Basé sur: assiduité club, défis physiques, records
}

/**
 * Calcule le score Créa (sur 100)
 */
export async function calculateCreaScore(teenId: string): Promise<number> {
  // Basé sur: parcours passion, créations, likes reçus
}
```

---

## 5. Évolutions UI

### 5.1 Mise à jour de `app/gamification/page.tsx`

Ajouter l'affichage des 3 piliers dans le header:

```tsx
// Après les stats XP existantes, ajouter:

{/* Piliers */}
<div className="grid grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
    <BookOpen className="w-6 h-6 text-blue-400 mx-auto mb-2" />
    <p className="text-xl font-bold text-white">{pillarScores?.school || 50}/100</p>
    <p className="text-xs text-blue-400">École</p>
  </div>
  <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
    <Dumbbell className="w-6 h-6 text-green-400 mx-auto mb-2" />
    <p className="text-xl font-bold text-white">{pillarScores?.sport || 50}/100</p>
    <p className="text-xs text-green-400">Sport</p>
  </div>
  <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 text-center">
    <Palette className="w-6 h-6 text-purple-400 mx-auto mb-2" />
    <p className="text-xl font-bold text-white">{pillarScores?.crea || 50}/100</p>
    <p className="text-xs text-purple-400">Créa</p>
  </div>
</div>

{/* Valeur en DH */}
<div className="text-center mb-8">
  <p className="text-sm text-zinc-400">
    Tes XP valent <span className="text-green-400 font-bold">{(userXp?.total_xp * 0.10).toFixed(0)} DH</span>
  </p>
</div>
```

### 5.2 Nouvelle feature dans le hub

Ajouter dans le tableau `features`:

```tsx
{
  href: "/gamification/aide-scolaire",
  icon: GraduationCap,
  label: "Aide Scolaire",
  description: "Progresse et gagne des XP",
  color: "#3b82f6",
  badge: lowSchoolScore ? "!" : null,
},
```

### 5.3 Mise à jour de la boutique

Dans `app/gamification/boutique/shop-client.tsx`, ajouter:

```tsx
// Afficher prix en DH + XP
<div className="flex justify-between items-center">
  <span className="text-lg font-bold text-white">{reward.xp_cost.toLocaleString()} XP</span>
  <span className="text-sm text-zinc-400">ou {reward.price_dh} DH</span>
</div>

// Bouton paiement hybride
<Button onClick={() => openHybridPaymentModal(reward)}>
  Acheter
</Button>
```

---

## 6. Nouvelles Pages

### 6.1 `/app/gamification/aide-scolaire/page.tsx`

```
Page d'aide scolaire avec:
├── Diagnostic matières (basé sur teen_grades)
├── Ressources recommandées par matière faible
├── Quiz interactifs
├── Suivi de progression
└── Récompenses XP pour chaque quiz/tuto
```

### 6.2 `/app/gamification/defis-physiques/page.tsx`

```
Page de défis sportifs avec:
├── Défis quotidiens personnalisés
├── Records personnels à battre
├── Progression par sport
└── Classement entre amis
```

### 6.3 `/app/gamification/parcours/page.tsx`

```
Page des parcours passion avec:
├── Parcours disponibles (selon interests)
├── Progression par niveau
├── Tutos à regarder
├── Validation par la communauté
```

### 6.4 `/app/parent/dashboard/page.tsx`

```
Dashboard parent avec:
├── Résumé progression enfant
├── Scores des 3 piliers
├── XP gagnés cette semaine
├── Alertes (notes basses, etc.)
├── Autorisations en attente
```

---

## 7. Intégration avec l'Offre Business

### 7.1 Events (`app/evenements/`)

Modifier le flow de réservation:
- Afficher le prix en DH ET en XP
- Permettre le paiement hybride
- Bonus XP pour early bird, squad booking

### 7.2 Clubs (`app/clubs/`)

Modifier l'inscription:
- Paiement mensuel en DH ou XP
- XP bonus pour assiduité 100%
- Lien avec le pilier correspondant (Sport/Créa)

### 7.3 Anniversaires (`app/anniversaires/`)

Ajouter la gamification:
- XP bonus pour l'organisateur
- XP pour les invités qui check-in
- Réduction en XP sur les extras

### 7.4 Partenaires

Intégrer au système:
- Check-in partenaire = XP
- Réductions achetables en XP

---

## 8. Gains XP Détaillés

### 8.1 Pilier École

| Action | XP | Condition |
|--------|-----|-----------|
| Quiz réussi (>70%) | +50 | Par quiz |
| Tuto regardé | +30 | Vidéo complète |
| Note +1 pt | +100 | Validé parent |
| Note +2 pts | +250 | Validé parent |
| Moyenne > 12 (mois) | +400 | Mensuel |

### 8.2 Pilier Sport

| Action | XP | Condition |
|--------|-----|-----------|
| Présence club | +50 | Par session |
| Défi quotidien | +20-30 | Selon difficulté |
| Défi hebdo | +80-150 | Selon difficulté |
| Record battu | +150 | Preuve |
| Assiduité 100% | +300 | Mensuel |

### 8.3 Pilier Créa

| Action | XP | Condition |
|--------|-----|-----------|
| Tuto complété | +30 | Vidéo complète |
| Niveau parcours | +200-300 | Validé |
| Création uploadée | +50 | Modérée |
| Like reçu | +3 | Par like |
| Showcase | +300-500 | Participation |

### 8.4 Communauté

| Action | XP | Condition |
|--------|-----|-----------|
| Check-in event | +100 | QR scan |
| Review | +30 | Constructive |
| Parrainage | +300 | Ami actif 30j |
| Streak 7j | +100 | Connexion |
| Streak 30j | +500 | Connexion |

---

## 9. Roadmap d'Implémentation

### Phase 1: Base (2-3 semaines)
- [ ] Extension table `user_xp` avec piliers
- [ ] Extension table `shop_rewards` avec prix DH
- [ ] Affichage valeur DH dans l'UI
- [ ] Affichage piliers dans le hub

### Phase 2: École (2-3 semaines)
- [ ] Table `teen_grades`
- [ ] Table `educational_resources`
- [ ] Page aide scolaire
- [ ] Actions de calcul score école

### Phase 3: Sport (2 semaines)
- [ ] Table `physical_challenges`
- [ ] Page défis physiques
- [ ] Intégration présence clubs

### Phase 4: Créa (2 semaines)
- [ ] Tables parcours passion
- [ ] Page parcours
- [ ] Portfolio créations

### Phase 5: Paiement Hybride (2 semaines)
- [ ] Modal paiement hybride
- [ ] Intégration réservations
- [ ] Intégration boutique

### Phase 6: Parents (2 semaines)
- [ ] Dashboard parent
- [ ] Notifications
- [ ] Validation notes

---

## 10. Configuration

### 10.1 Constantes à ajouter dans `gamification-system/index.ts`

```typescript
// Ajouter à GAMIFICATION_CONFIG
export const GAMIFICATION_CONFIG_V2 = {
  // Valeur XP
  XP_TO_DH_RATIO: 0.10,           // 1 XP = 0.10 DH

  // Piliers
  PILLAR_MAX_SCORE: 100,
  PILLAR_BALANCE_THRESHOLD: 50,   // Bonus si tous > 50
  PILLAR_EXCELLENCE_THRESHOLD: 70, // Super bonus si tous > 70

  // Bonus équilibre
  BALANCE_BONUS_XP: 500,          // Mensuel si équilibré
  EXCELLENCE_BONUS_XP: 1000,      // Mensuel si excellent

  // Multiplicateurs
  BALANCE_MULTIPLIER: 1.10,       // +10% si équilibré
  EXCELLENCE_MULTIPLIER: 1.25,    // +25% si excellent
} as const

// Nouveaux XP rewards
export const XP_REWARDS_V2 = {
  // École
  QUIZ_COMPLETED: 50,
  TUTORIAL_WATCHED: 30,
  GRADE_IMPROVED_1: 100,
  GRADE_IMPROVED_2: 250,
  GRADE_IMPROVED_3: 500,
  MONTHLY_AVERAGE_12: 400,

  // Sport
  CLUB_ATTENDANCE: 50,
  DAILY_PHYSICAL_CHALLENGE: 25,
  WEEKLY_PHYSICAL_CHALLENGE: 100,
  RECORD_BROKEN: 150,
  MONTHLY_PERFECT_ATTENDANCE: 300,

  // Créa
  PASSION_TUTORIAL: 30,
  PASSION_LEVEL_UP: 250,
  CREATION_UPLOADED: 50,
  CREATION_LIKE_RECEIVED: 3,
  SHOWCASE_PARTICIPATION: 400,

  // Communauté
  EVENT_CHECKIN: 100,
  PARTNER_CHECKIN: 50,
  REVIEW_POSTED: 30,
  REFERRAL_ACTIVE: 300,
} as const
```

---

*Document créé le 16 décembre 2024*
*Basé sur l'architecture existante de Teens Party Morocco*
