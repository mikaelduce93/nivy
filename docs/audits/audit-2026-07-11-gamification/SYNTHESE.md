# Synthèse — audit gamification focalisé (2026-07-11)

Branche `refonte/home-nav-lifestyle` (post-Wave P0.5). Trois regards croisés :
[defis.md](./defis.md) · [quiz.md](./quiz.md) · [parcours-enfant.md](./parcours-enfant.md).

## Verdict global

**Une seule boucle de récompense fonctionne réellement de bout en bout pour un enfant : quiz solo → scoring → XP crédité → badge.** Le défi 1v1 entre amis fonctionne aussi (invitation → résolution cron → XP), mais en auto-déclaré. Tout le reste de la gamification est soit cassé (quêtes quotidiennes inatteignables), soit un cul-de-sac (défis physiques sans validateur), soit du théâtre (games, skins, crew battles inexistants), soit incohérent (coins affichés partout, boutique en XP).

## Ce qui FONCTIONNE (à préserver)

| Boucle | Preuve |
|---|---|
| Quiz solo → XP → badge | `api/teen/quiz/submit/route.ts:136` → RPC `add_xp_to_user` |
| Défi 1v1 entre amis | `/teen/quests/friend-defis` : invite → accept → progress → cron horaire → XP |
| Coach Niv (recommandations réelles) | RPC `recommend_for_teen` + `avatar_messages` |
| Wallet : solde, badges, épargne | tables réelles, RPC `purchase_reward` |
| Crews : créer/rejoindre + stats | `/api/teen/crew` réel |

## Trouvailles bloquantes croisées (P0)

1. **Quêtes quotidiennes 100 % inatteignables** (double bug) — D1 : toute carte « Quotidien » du hub route vers `/teen/defis-physiques` (`quests-hub-client.tsx:41-54`) ; D2 : la seule page de complétion (`/daily`) appelle `getMyTeens()` scopé **parent** (`features/teens/actions.ts:82-96`) → un ado obtient 0 résultat et est redirigé vers un écran parent.
2. **Modération du contenu IA contournée** — le cron `generate-daily-content/route.ts:271-291` insère les quiz IA `is_active: true` avec préfixe `DAILY_`, la page admin review ne cherche que `AI_%` inactifs (`app/admin/content/review/page.tsx:62-73`). File vide en permanence : du contenu IA part en ligne pour des mineurs sans validation humaine.
3. **Farm d'XP illimité** — pas de `UNIQUE(teen_id, quiz_id)` sur `quiz_attempts` et `submit` ne vérifie pas les attempts réussis : rejouer le même quiz en boucle crédite l'XP à chaque fois.
4. **Défis physiques = cul-de-sac** — preuve photo exigée (`api/teen/sport/challenges/route.ts:288-362`), endpoint admin de validation existant, mais aucune inscription en `moderation_queue` ni page admin listant les soumissions : l'XP n'arrive jamais.
5. **Double moteur missions/défis, pire que documenté (N7)** — triggers SQL (`003_missions_system.sql:548-598`) : une action solo coche silencieusement 2-3 `user_missions` affichées « complétées avec XP », mais `claimMissionReward` n'est appelé par aucune UI. Promesse non tenue aujourd'hui + risque de double/triple-crédit dès qu'un bouton « Réclamer » sera branché.
6. **Incohérence de devise XP vs coins** — header + onglet Solde célèbrent les **coins ⊙**, la Boutique du wallet débite de l'**XP** (`wallet-hub-client.tsx:330,352,374`). Incompréhensible pour un enfant ; contredit le canon économique (XP = effort, coins = argent parent).

## P1 (importants)

- **Banque de quiz minuscule** : 9 quiz / 37 questions seedés (migration 038 opt-in, non garantie en prod) — épuisée en 1-2 semaines de jeu quotidien.
- **« Adaptatif » trompeur** : `teens.learning_style` (V11) n'est lu par aucun `recommend_for_teen` — il n'influence que le ton du coach conversationnel, jamais la sélection/difficulté des quiz.
- **Aucun défi de groupe réel** : pas de crew battle malgré le copy (« Affronte ton crew ») ; `group_actions` = commerce collectif uniquement ; le 1v1 friend-défis est auto-déclaré (« +1 » libre, sans lien aux actions réelles).
- **Multijoueur quiz absent** (confirmé sans changement) : `quiz_battle` = label sur `friend_challenges`, aucune infra temps réel.
- **Nav mobile ampute la gamification** : streak invisible (header `hidden md:flex`), vrai leaderboard XP enterré dans `/teen/social?tab=ranking`, lien « XP global » circulaire, fuite du streak vers `/daily` (chrome public).
- **Théâtre UI** : `/teen/games` (orphelin + tout disabled), skins avatar mock, « Inviter » crew disabled, `xp_reward: 500` hardcodé sur le hub, streak fabriqué (`completedCount`), coins header figés.

## Matrice pour le brainstorm

| Famille | État | Effort pour rendre vivant |
|---|---|---|
| Quiz solo | ✅ vivant | garde anti-rejeu (S) + banque de contenu (M) + modération IA (S) |
| Quêtes quotidiennes | ❌ cassé (2 bugs) | routage + scope teen (S/M) |
| Défis 1v1 amis | ✅ vivant | vérification réelle des complétions (M) |
| Défis physiques | 🚧 cul-de-sac | câbler la file admin (S/M) |
| Défis de groupe / crew battles | ❌ inexistant | conception + build (L) — décision produit |
| Missions (2e moteur) | 🎭 double emploi | réconcilier ou tuer (M) — décision produit |
| Économie visible (XP vs coins) | 🎭 incohérent | arbitrage PO puis harmonisation UI (S/M) |
| Games / skins / roue | 🎭 théâtre ou retiré | construire ou retirer honnêtement (décision PO) |
