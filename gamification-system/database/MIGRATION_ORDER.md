# Guide d'exécution des migrations Gamification

## Ordre d'exécution OBLIGATOIRE

Exécutez les migrations dans l'ordre suivant dans Supabase SQL Editor:

### Phase 1: Base (OBLIGATOIRE EN PREMIER)
```
000_base_tables.sql
```
- Crée les tables de base: teens, user_xp, user_streaks, user_coins, user_progression
- Crée les fonctions: add_xp_to_user, add_coins_to_user, update_user_streak
- Crée la vue `profiles` pour compatibilité

### Phase 2: Core Gamification
```
001_achievements_system.sql
002_leaderboard_system.sql
003_missions_system.sql
```

### Phase 3: Économie
```
004_rewards_shop.sql
005_fortune_wheel.sql
```

### Phase 4: Social
```
006_friend_challenges.sql
007_crews_system.sql
```

### Phase 5: Challenges avancés
```
008_special_challenges.sql
009_event_challenges.sql
010_seasonal_challenges.sql
```

### Phase 6: Jeux et Stats
```
011_mini_games.sql
012_user_stats_dashboard.sql
```

### Phase 7: Features additionnelles
```
013_annual_wrapped.sql
014_profile_customization.sql
015_collections.sql
016_gamified_notifications.sql
017_vip_system.sql
018_activity_feed.sql
019_social_sharing.sql
```

## Comment exécuter

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans SQL Editor
4. Pour chaque fichier dans l'ordre ci-dessus:
   - Copier le contenu du fichier
   - Coller dans l'éditeur SQL
   - Cliquer sur "Run"
   - Vérifier qu'il n'y a pas d'erreur avant de passer au suivant

## Dépendances importantes

- `000_base_tables.sql` DOIT être exécuté en premier
- `001_achievements_system.sql` dépend de: teens, user_xp, user_streaks (créés dans 000)
- `006_friend_challenges.sql` dépend de: 000, 001, 003
- `018_activity_feed.sql` dépend de: 002 (friend_connections)

## Vérification

Après toutes les migrations, exécutez cette requête pour vérifier:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Vous devriez voir au moins 50+ tables.
