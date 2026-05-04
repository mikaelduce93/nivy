# Guide d'exécution des migrations SQL

## Option 1: Via Supabase Dashboard (Recommandé)

1. Va sur https://supabase.com/dashboard
2. Sélectionne ton projet `jyixeidmuvecienbkkrw`
3. Va dans **SQL Editor**
4. Exécute chaque fichier dans l'ordre:

```
001_achievements_system.sql
002_leaderboard_system.sql
003_missions_system.sql
004_rewards_shop.sql
005_fortune_wheel.sql
006_friend_challenges.sql
007_crews_system.sql
008_special_challenges.sql
009_event_challenges.sql
010_seasonal_challenges.sql
011_mini_games.sql
012_user_stats_dashboard.sql
013_annual_wrapped.sql
014_profile_customization.sql
015_collections.sql
016_gamified_notifications.sql
017_vip_system.sql
018_activity_feed.sql
019_social_sharing.sql
```

## Option 2: Via Supabase CLI

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref jyixeidmuvecienbkkrw

# Exécuter les migrations
supabase db push
```

## Option 3: Script Node.js

Utilise le script `run-migrations.ts` dans ce dossier.

```bash
npx tsx gamification-system/database/run-migrations.ts
```

## Vérification

Après l'exécution, vérifie que les tables suivantes existent:

- achievements
- user_achievements
- leaderboard_entries
- missions
- user_missions
- shop_items
- user_purchases
- wheel_segments
- wheel_spins
- challenges
- challenge_participants
- crews
- crew_members
- mini_games
- game_sessions
- collections
- collection_items
- user_collection_items
- vip_tiers
- user_vip_status
- activities
- activity_reactions
- notifications
- referral_codes
- referral_uses
