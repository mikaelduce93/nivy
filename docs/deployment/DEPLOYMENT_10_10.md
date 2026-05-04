# 🚀 10/10 GAMIFICATION - DEPLOYMENT INSTRUCTIONS

Le système Gamification 10/10 est entièrement codé. Voici comment le rendre opérationnel.

## 1. Exécuter les Migrations DB
Le code backend dépend des nouvelles tables. Exécutez le script SQL généré.

```bash
# Via Supabase CLI (recommandé)
supabase db reset # Attention: efface les données locales
# OU juste appliquer la nouvelle migration
supabase db psql < supabase/migrations/20260116_gamification_10_10.sql
```

## 2. Tester le Flux
Un script de test a été créé pour vérifier que les tables et la logique de base répondent.

```bash
# Installer dépendances si besoin
npm install dotenv @supabase/supabase-js

# Lancer le test
npx tsx scripts/test-gamification-flow.ts
```

Si le test affiche "✅ Recommendation log table exists" et "✅ Found seasonal arcs", c'est que la base est prête.

## 3. Intégration Frontend Finale
Les composants UI sont prêts mais doivent être affichés aux utilisateurs.

### Dashboard Ado
- Le `QuestCalendar` est disponible dans `app/teen/calendar/page.tsx`.
- Ajoutez un lien dans la navigation principale (`components/dashboard/teen/sidebar.tsx`) vers `/teen/calendar`.

### Dashboard Parent
- Le `ParentalNudgeWidget` est prêt.
- Importez-le dans `app/parent/dashboard/page.tsx` :
```tsx
import { ParentalNudgeWidget } from '@/components/parent/dashboard/parental-nudge'
// Dans le render :
<ParentalNudgeWidget teenUsage={stats} />
```

### Dashboard Admin
- Le `Live Pulse` est accessible sur `app/admin/gamification/scorecard/page.tsx`.

## 4. Population de Contenu (Quest Recommender)
L'algorithme de recommandation (`lib/gamification/quest-recommender.ts`) cherche des quêtes dans `challenges_templates` avec des tags spécifiques.
Assurez-vous de taguer vos quêtes existantes :
```sql
UPDATE challenges_templates SET tags = ARRAY['Football', 'Sport'] WHERE category = 'sport';
UPDATE challenges_templates SET tags = ARRAY['Mathématiques'] WHERE category = 'school';
```

## État du système
- **Moteur Recommandation**: ✅ Prêt (API + Algo)
- **Social Graph**: ✅ Prêt (Server Actions + Tables)
- **Live-Ops**: ✅ Prêt (Calendrier + Saisons)
- **Analytics**: ✅ Prêt (Scorecard + Logs)
- **Sécurité**: ✅ Prêt (Anti-abuse soft caps)



