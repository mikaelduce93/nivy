# Système de Génération Automatique de Contenu avec Validation

## ⚠️ SYSTÈME AMÉLIORÉ DISPONIBLE

**Ce document décrit le système de base (10/20).**

Pour le **système intelligent avancé (18.5/20)**, consultez :
👉 **[INTELLIGENT_CONTENT_SYSTEM.md](./INTELLIGENT_CONTENT_SYSTEM.md)**

Le système intelligent inclut :
- ✅ Profilage comportemental avancé
- ✅ Algorithme ML de recommandation
- ✅ Vérification factuelle multi-sources
- ✅ Adaptation dynamique
- ✅ Score de fiabilité global

---

## Vue d'ensemble

Ce système permet de générer automatiquement du contenu personnalisé (quiz, quêtes, défis) basé sur le profil de l'utilisateur, en utilisant des outils d'IA externes (OpenAI ou Anthropic Claude). **Le système inclut une validation automatique robuste, une modération manuelle, et un système de fallback avec contenu pré-curated pour garantir la fiabilité.**

## Architecture

### Composants principaux

1. **Migrations SQL**
   - `023_content_generation_system.sql` - Système de base
   - `024_content_validation_system.sql` - **Système de validation et modération**

2. **Services**
   - `lib/ai/content-generator.ts` - Génération de contenu avec IA
   - `lib/ai/content-validator.ts` - **Validation automatique et vérification de qualité**
   - `lib/ai/ready-player-me.ts` - Intégration avatars

3. **API Routes**
   - `/api/admin/content/generate` - Génération manuelle par admin
   - `/api/admin/content/validate` - **Modération et validation manuelle**
   - `/api/cron/generate-daily-content` - Génération quotidienne automatique
   - `/api/teen/content/personalized` - Récupération de contenu personnalisé

### Système de Validation Multi-Niveaux

Le système garantit la fiabilité du contenu via plusieurs couches :

1. **Validation Automatique** (immédiate)
   - Vérification de la structure (champs requis, formats)
   - Validation de la qualité (score 0-100)
   - Détection d'erreurs et avertissements
   - Vérification de cohérence (doublons, biais, etc.)

2. **Modération Manuelle** (si nécessaire)
   - Contenu avec score < 70 → revue manuelle obligatoire
   - Contenu avec erreurs → revue manuelle obligatoire
   - Interface admin pour approuver/rejeter/réviser

3. **Système de Fallback**
   - Si génération échoue → utilise contenu curated
   - Si qualité trop faible (< 50) → utilise contenu curated
   - Bibliothèque de contenu pré-validé manuellement

## Configuration

### Variables d'environnement

Ajoutez dans votre `.env.local`:

```env
# Provider: 'openai' ou 'claude'
AI_PROVIDER=openai

# Clé API OpenAI (si provider = openai)
OPENAI_API_KEY=sk-...

# Clé API Anthropic (si provider = claude)
ANTHROPIC_API_KEY=sk-ant-...

# Secret pour sécuriser les cron jobs
CRON_SECRET=your-secret-key
```

### Installation

1. Exécuter les migrations SQL (dans l'ordre):
```bash
# Migration de base
psql -f gamification-system/database/migrations/023_content_generation_system.sql

# Migration de validation (IMPORTANT)
psql -f gamification-system/database/migrations/024_content_validation_system.sql
```

2. Configurer les variables d'environnement

3. **Populer la bibliothèque de contenu curated** (recommandé)
   - Ajouter du contenu pré-validé dans `curated_content_library`
   - Ce contenu sera utilisé en fallback si la génération IA échoue

4. (Optionnel) Configurer Vercel Cron pour la génération quotidienne

## Utilisation

### Génération manuelle (Admin)

```typescript
// POST /api/admin/content/generate
{
  "contentType": "quiz", // ou "mission", "challenge"
  "teenId": "uuid-optional", // Optionnel, pour personnaliser
  "category": "school", // Optionnel
  "gradeLevel": "3eme", // Optionnel
  "difficulty": "normal", // Optionnel
  "subject": "Mathématiques", // Pour les quiz
  "count": 1 // Nombre d'éléments à générer
}
```

### Génération automatique quotidienne

Le cron job s'exécute automatiquement chaque jour à 6h00 (configuré dans `vercel.json`).

Pour tester manuellement:
```bash
curl -X POST https://your-domain.com/api/cron/generate-daily-content \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Récupération de contenu personnalisé (Teen)

```typescript
// GET /api/teen/content/personalized?contentType=all&limit=10
// Retourne du contenu trié par score de correspondance
```

## Adaptation basée sur le profil

Le système adapte le contenu généré en fonction de:

1. **Niveau scolaire** (`grade_level`)
   - 6ème, 5ème, 4ème, 3ème, 2nde, 1ère, Terminale

2. **Profils** (`profiles`)
   - School: Contenu éducatif
   - Sport: Défis physiques
   - Créa: Défis créatifs

3. **Intérêts** (`interests`)
   - Tags personnalisés de l'utilisateur

4. **Matière** (pour les quiz)
   - Mathématiques, Français, Histoire, etc.

## Validation et Qualité

### Score de Validation (0-100)

Chaque contenu généré est automatiquement validé et reçoit un score basé sur:

**Pour les Quiz:**
- Titre valide: +10 points
- Description complète: +10 points
- Matière spécifiée: +10 points
- Niveau scolaire: +10 points
- Difficulté valide: +10 points
- Nombre de questions (5-15): +20 points
- Toutes les questions valides: +20 points
- Cohérence des réponses: +10 points

**Pour les Missions:**
- Nom valide: +20 points
- Description complète (min 50 caractères): +30 points
- Catégorie spécifiée: +15 points
- Objectifs définis: +20 points
- Type de mission valide: +15 points

### Workflow de Validation

1. **Génération** → Contenu créé par IA
2. **Validation Auto** → Score calculé, erreurs détectées
3. **Décision Automatique:**
   - Score ≥ 70 + aucune erreur → **Auto-validé** (publié automatiquement)
   - Score < 70 ou erreurs → **Revue manuelle requise**
   - Score < 50 → **Fallback** (utilise contenu curated)
4. **Modération Manuelle** (si nécessaire) → Admin approuve/rejette/révisionne
5. **Publication** → Contenu actif et disponible

### Score de Correspondance (Profil)

Chaque contenu reçoit aussi un score de correspondance (0-100) basé sur:
- Correspondance niveau scolaire: +30 points
- Correspondance intérêts: +40 points
- Correspondance profils: +30 points

## Intégration avec Ready Player Me

Pour les avatars, le système est conçu pour être compatible avec Ready Player Me. Les avatars sont stockés dans `teens.avatar_url` et peuvent être générés via l'API Ready Player Me.

## Exemples de prompts

### Quiz éducatif
```
Génère un quiz éducatif avec les caractéristiques suivantes:
Niveau scolaire: 3ème
Matière: Mathématiques
Difficulté: normal
Intérêts: gaming, k-pop

Le quiz doit contenir 5-10 questions avec 4 options chacune.
```

### Mission
```
Génère une mission/quête avec les caractéristiques suivantes:
Niveau scolaire: 3ème
Catégorie: school
Profils: School
Intérêts: gaming, k-pop
```

## Coûts et limites

- **OpenAI GPT-4**: ~$0.03-0.06 par génération
- **Claude Sonnet**: ~$0.015-0.03 par génération
- Limite recommandée: 50-100 générations par jour

## Monitoring

Les logs de génération sont stockés dans `content_generation_logs`:
- Statut (pending, generating, completed, failed)
- Métriques (temps, tokens, coût estimé)
- Erreurs et messages

## Modération et Administration

### Interface de Modération

Les admins peuvent accéder à `/api/admin/content/validate` pour:

1. **Voir le contenu en attente de validation**
   - GET avec `?status=manual_review`
   - Liste tous les contenus nécessitant une revue

2. **Valider le contenu**
   - POST avec `action: "approve"` → Contenu publié
   - POST avec `action: "reject"` → Contenu désactivé
   - POST avec `action: "needs_revision"` → Marqué pour révision

### Bibliothèque de Contenu Curated

Le système inclut une bibliothèque de contenu pré-validé (`curated_content_library`) qui sert de fallback:

- Contenu validé manuellement par des experts
- Utilisé automatiquement si génération IA échoue
- Utilisé si qualité générée < 50
- Peut être partagé entre tous les utilisateurs

**Pour ajouter du contenu curated:**
```sql
INSERT INTO curated_content_library (
  content_type, category, content_data, title, 
  grade_level, difficulty, validated_by
) VALUES (
  'quiz', 'school', '{"title": "...", "questions": [...]}'::jsonb,
  'Quiz de Mathématiques', '3eme', 'normal', 'admin-uuid'
);
```

## Prochaines étapes

1. ✅ Système de base implémenté
2. ✅ **Validation automatique implémentée**
3. ✅ **Système de modération manuelle implémenté**
4. ✅ **Système de fallback implémenté**
5. ⏳ Interface admin UI pour la modération
6. ⏳ A/B testing des prompts
7. ⏳ Analytics et métriques d'engagement
8. ⏳ Machine learning pour améliorer les prompts

## Support

Pour toute question ou problème, consultez:
- Les logs dans `content_generation_logs`
- Les erreurs dans la console serveur
- La documentation des APIs OpenAI/Claude

