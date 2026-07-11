# Parcours transversal d'un ado de 13 ans — gamification Nivy (2026-07-11)

Branche `refonte/home-nav-lifestyle` · lecture seule · 3e regard de l'équipe d'audit (défis et quiz couverts par `defis.md` et `quiz.md`).

## Cadre de nav (ce qui est ATTEIGNABLE)

La nav est unifiée en **5 piliers**, identiques sur desktop (`sidebar.tsx`) et mobile (`mobile-nav.tsx`), montés dans `app/teen/layout.tsx` :
`Accueil (/teen)` · `Jouer (/teen/quests)` · `Crew (/teen/circles)` · `Services (/teen/services)` · `Wallet (/teen/wallet)` + Profil/Paramètres.

Conséquence directe : **streak, games, feed, leaderboard, avatar, /teen/social, roue** ne sont PAS des piliers → atteignables seulement par deep-link, header desktop, ou cartes internes. Sur **mobile** (l'appareil d'un ado de 13 ans), le header stats-bar est `hidden md:flex` (`components/dashboard/teen/header.tsx:117`) : le compteur de streak et son lien disparaissent.

## 1) Tableau par surface

| Surface | Atteignable | Données | CTA réels | Récompense créditée | Verdict |
|---|---|---|---|---|---|
| **Accueil** `/teen` | ✅ pilier | ✅ réelles (XP, coins, level via `getTeenDashboardData`) | ✅ AvatarCoach → `/teen/quiz` ou `/teen/quests` | n/a (lanceur) | ✅ fonctionne |
| **Coach Niv (bloc CTA)** | ✅ home | ✅ `recommend_for_teen` RPC + `avatar_messages` réels | ✅ liens vivants | n/a | ✅ fonctionne |
| **Jouer / hub** `/teen/quests` | ✅ pilier | ⚠️ mixte : `getUnifiedQuests` réel mais `xp_reward:500`/`status:"available"` hardcodés (`unified-quest-engine.ts:52,74,95,110`) ; `streak={completedCount}` fabriqué (`quests-hub-client.tsx:169`) | ⚠️ cartes routent, MAIS « Défie un ami » mort | via quiz/défis sous-jacents | 🎭 théâtre partiel |
| **Quiz** `/teen/quiz` + `/[id]` | ✅ via Jouer + coach | ✅ 100 % réelles | ✅ runner complet | ✅ XP crédité via `add_xp_to_user` (`api/teen/quiz/submit/route.ts:136`) | ✅ fonctionne |
| **Wallet** `/teen/wallet` | ✅ pilier | ✅ réelles (`user_coins.balance`, `get_shop_rewards`, `user_achievements`, `savings_goals`) | ✅ onglets vivants | ✅ achats via RPC `purchase_reward` | ⚠️ incohérence devise (voir Boutique) |
| **Boutique** (onglet Wallet) | ✅ | ✅ rewards réels | ✅ `purchaseReward` → RPC réel (`wallet-hub-client.tsx:352`) | ✅ débit **XP** réel | 🎭 incohérence : paie en XP, le header et l'onglet Solde célèbrent les **coins ⊙** |
| **Badges** (onglet Wallet) | ✅ | ✅ `user_achievements` réels | lecture seule | reflet réel | ✅ fonctionne |
| **Épargne** (onglet Wallet) | ✅ | ✅ `savings_goals` réels | ✅ → `/teen/savings/new` | n/a | ✅ fonctionne |
| **Streak** `/teen/streak` | 🔗 orphelin mobile (header desktop only, `header.tsx:119`) | ✅ réelles | ⚠️ « Compléter » → `/daily` (3e système, chrome public) `streak-client.tsx:180` | reflet réel | 🔗 orphelin + fuite hors app |
| **Leaderboard** `/teen/leaderboard` | 🔗 quasi-orphelin | ✅ réel mais = classement **créateurs** (`creator_monthly_stats`), pas XP | ⚠️ lien « XP global » → lui-même (`leaderboard/page.tsx:122`) | n/a | ❌ trompeur |
| **Vrai leaderboard XP** | 🔗 enterré dans `/teen/social?tab=ranking` | ✅ réel (`/api/teen/leaderboard`) | ✅ | n/a | 🔗 orphelin |
| **Crew** `/teen/circles` | ✅ pilier | ✅ réelles (`/api/teen/crew`) | ✅ join/create réels ; ❌ « Inviter (bientôt) » disabled (`circles-client.tsx:198`) | bonus XP collectif affiché | ✅ fonctionne (sauf invite) |
| **Roue de la fortune** | ❌ n'existe plus | — | `/gamification/roue` = 410-gone → redirect | — | ❌ retirée |
| **Collections** | ❌ | — | `/gamification/collections` redirect (fusionnée dans Badges) | — | ❌ retirée |
| **Games** `/teen/games` | 🔗 orphelin total (aucun lien) | ✅ réelles (`getMiniGameTypes`/`getUserGameStats`) | ❌ tous disabled « bientôt » (`games-client.tsx:134,171`) | jamais | 🎭 théâtre |
| **Feed** `/teen/feed` | 🔗 via leaderboard/social | ✅ réel | ✅ | n/a | ✅ mais hors pilier |
| **Avatar/skins** `/teen/avatar` | 🔗 via coach | ⚠️ mood réel, skins 100 % mock (`SKINS` en dur) | 🎭 achat skin non fonctionnel | jamais | 🎭 théâtre (skins) |
| **Services** `/teen/services` | ✅ pilier | ✅ liste vers écrans réels | ✅ 15 cartes vivantes | n/a | ✅ (hors scope gamif) |

## 2) Top 10 points de friction pour un enfant

1. **Incohérence devise XP vs coins — la plus grave.** Le header (`components/dashboard/teen/header.tsx:137-142`) et l'onglet Solde (`wallet-hub-client.tsx:160-199`, « Ton solde grossit à chaque quête ») mettent les **coins ⊙** en avant, mais la Boutique dépense de l'**XP** (`wallet-hub-client.tsx:330,352,374`). L'enfant accumule des coins visibles… qui n'achètent rien dans la boutique du wallet.
2. **Streak fabriqué sur le hub Jouer.** `OrbitingTokens streak={completedCount}` (`app/teen/quests/quests-hub-client.tsx:169`) affiche le nombre de quêtes faites comme si c'était la streak.
3. **« Défie un ami » mort.** `quests-hub-client.tsx:251-254` pointe vers `/teen/social?tab=crew` au lieu de `/teen/quests/friend-defis/new`. (Déjà noté le 3/07, toujours là.)
4. **`/teen/games` = vitrine morte.** Boutons `disabled title="Bientôt disponible"` (`games-client.tsx:134,171`) avec stats réelles chargées. Orphelin de nav en plus.
5. **Faux lien « XP global ».** `leaderboard/page.tsx:122-124` : le lien pointe vers la page elle-même (classement créateurs). Aucun vrai classement XP atteignable par ce chemin.
6. **Streak invisible sur mobile.** Seul point d'entrée = compteur header en `hidden md:flex` (`header.tsx:117,119`).
7. **Fuite hors app depuis le streak.** « Compléter pour maintenir la streak » → `/daily` (`streak-client.tsx:180`), 3e système de quêtes avec Navbar/Footer publics.
8. **Coins du header périmés.** `currentCoins` figé au chargement (`header.tsx:46`, « keep static ») : après un gain, le header ne bouge pas sans reload.
9. **Skins avatar = promesse non tenue.** `SKINS` en dur dans `app/teen/avatar/avatar-client.tsx`, coûts affichés (500/1200/2500), déblocage jamais implémenté.
10. **« Inviter » crew disabled.** `circles-client.tsx:198-201` : l'enfant crée une crew mais ne peut pas y ajouter ses amis.

## 3) « Si mon fils de 13 ans utilise l'app 15 minutes ce soir »

Il arrive sur l'accueil, Niv le salue par son prénom et lui propose un vrai quiz du jour : **ça, ça marche bien** — il le fait, répond, et l'XP est réellement crédité en base, avec confettis et récap. C'est la seule boucle de récompense de bout en bout **solide** de l'app. Il retourne à l'accueil, voit son XP et ses coins monter dans la jauge. Il tape « Jouer », parcourt ses quêtes — mais le compteur de streak affiché ici est bidon, et s'il clique « Défie un ami », il atterrit sur une liste d'équipes. Curieux, il va au Wallet : il a des **coins** plein le solde, il ouvre la Boutique… et découvre que tout est prix en **XP** — ses coins ne servent à rien ici, incompréhensible à son âge. S'il cherche les mini-jeux ou la roue : la roue n'existe plus, et `/teen/games` est introuvable dans le menu — même en deep-link, tout est grisé « bientôt ». Sur son téléphone, il ne trouvera jamais la page Streak. **Bilan : le quiz→XP→badges fonctionne vraiment et suffit à l'occuper ; mais la moitié des promesses visuelles (coins dépensables, jeux, défis d'amis, roue, skins, streak mobile, classement XP) sont du théâtre, des culs-de-sac ou des incohérences de monnaie** — un enfant attentif remarquera vite que « ça clignote mais ça ne fait rien ».
