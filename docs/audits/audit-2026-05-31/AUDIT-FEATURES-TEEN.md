# Audit — Features & cohérence des écrans · Compte Teen Nivy

> Audit lecture seule généré par workflow multi-agents (20 agents · 10 clusters · 104 écrans). Date : 2026-05-31. Branche : `milestone/v3-cablage-fiabilite`.

## Synthèse exécutive

**Verdict : l'app n'est pas vide — elle est invisible et incohérente.** Le backend de la plupart des features citées est réellement câblé (food, transport, anniversaire, quiz, épargne, corvées/« défi des parents », défis entre amis), mais ~50 écrans réels sont **orphelins** (aucune navigation), pendant que la page d'accueil et la nav mettent en avant du **faux contenu** et des **liens cassés**. Le problème n'est donc pas « il manque des features » mais « les bonnes features sont enterrées et entourées de décor mensonger ».

**Les 4 problèmes structurants (P0) :**

1. **Navigation mobile inexistante hors accueil.** La bottom-nav est montée *dans* le composant du dashboard (`teen-dashboard-content.tsx:238`), donc absente des ~66 autres pages. Pour une cible 100 % mobile, l'app est inutilisable au doigt dès qu'on quitte l'accueil.
2. **Du faux contenu en production.** MarketplaceOverlay (« Nike Morocco / Megarama » + bouton mort), SocialFeed (amis fictifs Amine/Sara/Lina), MapPreview (contacts factices « à 500 m »), skins avatar fantômes. Perte de confiance immédiate + risque légal (faux partenariats marques devant des mineurs).
3. **La règle « XP ≠ argent » est trahie dans le code.** Trois taux de conversion contradictoires (10 vs 100 XP/DH), un module entier `xp-converter.ts` qui institutionnalise la conversion, la boutique qui débite des XP avec « ≈ DH », et les défis entre amis qui *misent/transfèrent* de l'XP au gagnant. Cœur du pitch produit cassé + risque compliance.
4. **~50 écrans réels orphelins + liens cassés.** « Mes Achievements » (sidebar/header/navbar) ouvre une page vide ; la boucle crew ne mène nulle part ; food/rides/anniv/quiz/épargne ne sont dans aucune nav.

**Le dashboard (priorité du PO) :** ~11–13 sections empilées ; avant la 1ʳᵉ action utile, le teen voit son XP 3×, son niveau 4×, ses coins 3×. La « prochaine action » (le quiz, seule feature pleinement jouable) est noyée en 4ᵉ position et n'est dans aucune nav. **Cible : 4 blocs max, 1 chiffre = 1 affichage, 1 seul CTA primaire above-the-fold** (mockup ASCII en §3.1).

**La cible d'architecture : 15 entrées → 5 piliers** (identiques desktop + mobile) : **Accueil · Jouer · Crew · Services · Wallet**. Un nouveau hub `/teen/services` dé-orphélinise d'un coup events, transport, food, anniversaire, orientation, école, offres. Terminologie figée (Crew, Quête, Défi des parents) et économie unifiée (wallet = un seul hub, un seul pipeline débit/crédit).

**Roadmap recommandée (4 phases) :** Ph.1 « Stop the lies » (retirer mocks + liens cassés, surtout des quick wins) → Ph.2 « Mobile usable » (nav globale 5 piliers) → Ph.3 « Golden path » (dashboard allégé + quiz exposé + hub services + règle devise tranchée) → Ph.4 « Vendable » (Food, Crew, Anniversaire bout-en-bout). Détail, efforts et fichiers en §3.5.

> ⚠️ **État des features que tu présentes** (détail en §2.4) : **Quiz cérébral/culture = réel** ; **le « sport » n'est pas un quiz mais un _défi physique_** (`/teen/defis-physiques`, réel — clarification PO 2026-05-31 : il s'agit d'un défi, pas d'un quiz) ; **Anniversaire, Transport, Nourriture, Défi des parents, Créer entre amis = backend réel mais orphelins et/ou cassés en bout de chaîne** ; **« Club » = mot marketing** sans backend propre (recouvre crews + circles, deux systèmes à unifier).
>
> 🤖 **Le coach Niv fait l'objet d'un audit + blueprint dédié** : voir `AUDIT-COACH-NIV-IA.md` (même dossier).

## Chiffres clés

| Indicateur | Valeur |
|---|---|
| Écrans teen analysés | 104 |
| Note UX moyenne | **5.43 / 10** |
| Écrans non-réels (mock / stub / cassé / partiel) | **19** / 104 |
| Écrans orphelins ou en deep-link seul | **42** |

**Répartition par état des données :** 🟢 réel 59 · 🟡 partiel/mock 14 · 🔴 mock 2 · ↪️ redirect 26 · ⚪ stub/TODO 3

**Répartition par découvrabilité :** sidebar 18 · lien in-page 38 · quick-access 3 · bottom-nav 3 · ORPHELIN 28 · deep-link 14

### 12 écrans les plus faibles (UX)

| Écran | UX | État | Nav |
|---|---|---|---|
| `components/teen/marketplace-overlay.tsx` | 2 | 🔴 mock | lien in-page |
| `app/teen/settings/language/page.tsx` | 2 | ↪️ redirect | ORPHELIN |
| `app/teen/settings/notifications/page.tsx` | 2 | ↪️ redirect | ORPHELIN |
| `app/teen/settings/privacy/page.tsx` | 2 | ↪️ redirect | ORPHELIN |
| `app/teen/settings/visibility/page.tsx` | 2 | ↪️ redirect | ORPHELIN |
| `components/teen/dashboard/teen-dashboard-content.tsx` | 3 | 🟢 réel | sidebar |
| `components/teen/dashboard/map-preview.tsx` | 3 | 🟡 partiel/mock | lien in-page |
| `components/feed/social-feed.tsx` | 3 | 🟡 partiel/mock | lien in-page |
| `app/teen/games/page.tsx` | 3 | 🟡 partiel/mock | sidebar |
| `app/teen/games/games-client.tsx` | 3 | ⚪ stub/TODO | sidebar |
| `app/teen/achievements/page.tsx` | 3 | ↪️ redirect | deep-link |
| `app/gamification/leaderboard/page.tsx` | 3 | ↪️ redirect | deep-link |

---

## Table des matières

1. [Inventaire par cluster de features](#1-inventaire-par-cluster-de-features)
2. [Analyses transversales](#2-analyses-transversales)
3. [Blueprints (cible)](#3-blueprints-cible)

---

## 1. Inventaire par cluster de features

### 1.1 Dashboard / page d'accueil teen (app/teen/page.tsx + arbre components/teen/dashboard/*)

> Le PO a raison : la home empile ~13 sections lourdes et redondantes. Avant la moindre action utile (Mission prioritaire, ~4e bloc), le teen voit son XP 3 fois (TwinCurrencyGauge + OrbitingTokens + StatHero), son niveau 4 fois (header + gauge + orbit + StatHero), ses coins 3 fois (header + gauge + orbit) et son streak 2 fois (header + orbit). Le above-the-fold est saturé de chiffres décoratifs (mascotte en orbite animée + îlot sombre double-devise + carte sombre StatHero) qui répètent la même donnée sans hiérarchie, alors que le « next best action » est noyé plus bas. La charge cognitive est aggravée par des effets premium (tilt 3D, glow, shimmer, radar, halos animés) sur quasi chaque carte, contraires à la charte paper néo-brutaliste (« aucun blur/glow/grain »). Plusieurs surfaces affichent du faux contenu en prod (MarketplaceOverlay 100% mock + CTA mort, SocialFeed qui retombe sur Amine/Sara/Lina, MapPreview avec amis/events factices, QuickAccessGrid avec badges NEW/HOT/LIVE statiques). Enfin la nav mobile (MobileBottomNav) est montée DANS le dashboard et donc absente des ~60 autres pages teen.

**Note UX moyenne du cluster : 4.2 / 10**

| Écran | But | État | UX | Nav |
|---|---|---|---|---|
| `app/teen/page.tsx` | Page d'accueil teen : RSC qui fetch les données dashboard, rend AvatarCoach + TwinCurrencyGauge above-the-fold puis stream le reste du bento via Suspense. | 🟢 réel | 5 | sidebar |
| `components/teen/avatar-coach.tsx` | Centerpiece rétention §8 : salutation Niv + 1 CTA (quiz du jour ou quête) + éventuelle relance corvée (ChoreNudge). | 🟢 réel | 6 | lien in-page |
| `components/teen/twin-currency-gauge.tsx` | Affiche XP et coins côte à côte (variante full) sans flèche de conversion, conforme whitepaper §5 (XP ≠ coins, 1 DH = 100 coins). | 🟢 réel | 8 | lien in-page |
| `components/teen/dashboard/teen-dashboard-content.tsx` | Orchestrateur client below-the-fold : hero éditorial + OrbitingTokens, StatHero XP, PriorityMission, QuickAccess+OnlineFriends, Map+CrewHub, PurchasingPower+ProfileQuest, SocialFeed, MarketplaceOverlay, MobileBottomNav. | 🟢 réel | 3 | sidebar |
| `components/teen/dashboard/priority-mission.tsx` | CTA primaire : mission/quête du jour avec barre de progression et bouton GO/CONTINUER vers /teen/quests. | 🟡 partiel/mock | 5 | lien in-page |
| `components/teen/dashboard/quick-access-grid.tsx` | 4 raccourcis : Shop XP, Quêtes, Clubs, Crew Battle. | 🟡 partiel/mock | 4 | quick-access |
| `components/teen/dashboard/online-friends.tsx` | Carrousel d'avatars d'amis en ligne via présence temps réel + bouton Inviter. | 🟢 réel | 6 | lien in-page |
| `components/teen/dashboard/map-preview.tsx` | Aperçu carte découverte : marqueurs amis/events à proximité, CTA Explorer vers /teen/social?tab=map. | 🟡 partiel/mock | 3 | lien in-page |
| `components/teen/dashboard/crew-hub.tsx` | Bloc crew : tier, stats XP/events/battles, top membres, bouton 'Lancer une Crew Battle'. | 🟢 réel | 5 | lien in-page |
| `components/gamification/xp-purchase-power.tsx` | Montre la progression XP vers la prochaine récompense shop (nextReward) avec état débloqué/verrouillé, lien /teen/shop. | 🟢 réel | 6 | lien in-page |
| `components/teen/dashboard/profile-quest.tsx` | Quête de complétion de profil (photo/pseudo/bio/ville) avec XP par étape, lien /teen/profile/edit. | 🟢 réel | 5 | lien in-page |
| `components/feed/social-feed.tsx` | Fil d'activité 'en direct' des amis (likes/commentaires) + événements de présence temps réel. | 🟡 partiel/mock | 3 | lien in-page |
| `components/teen/marketplace-overlay.tsx` | Bandeau d'offres marques (deals XP) en bas du dashboard. | 🔴 mock | 2 | lien in-page |
| `components/teen/dashboard/mobile-nav.tsx` | Bottom-nav mobile flottante 4 entrées : Home, Explore(/teen/map), Crew(/teen/circles), Profile. | 🟢 réel | 4 | bottom-nav |
| `components/dashboard/teen/sidebar.tsx` | Sidebar desktop 15 entrées (hidden md:flex) : navigation principale teen. | 🟢 réel | 5 | sidebar |

<details><summary>Problèmes détaillés par écran (15)</summary>

**`app/teen/page.tsx`**

- Above-the-fold surchargé : AvatarCoach (+ possible ChoreNudge) PUIS TwinCurrencyGauge, soit déjà 2-3 cartes denses avant tout contenu actionnable.
- Données XP/level/coins fetchées 3x dans des sources parallèles (getAchievementStats, getUserRank, getRecentlyUnlocked) puis JETÉES (l.24-27 destructuring vide '// reserved for future use') — gaspillage de requêtes au render de la home.
- spendableCoins recalculé inline via une requête savings_goals supplémentaire dans page.tsx (l.59-75) alors que getTeenDashboardData fait déjà tout le reste — logique éparpillée.
- displayAction fabrique un fallback 'Connexion Quotidienne 50 XP' (l.86-92) : si aucune mission, la 'Mission prioritaire' affiche une action générique non vérifiable.

**`components/teen/avatar-coach.tsx`**

- Empile potentiellement 2 cartes (coach + ChoreNudgeSection) tout en haut, avant la gauge devise — concurrence le 'next best action' réel (Mission prioritaire) plus bas.
- ChoreNudgeSection (l.250-261) : classes Tailwind cassées 'bg-lime text-lime' (texte couleur fond = invisible) ; lien CTA illisible.
- Deux CTA d'entrée (Quiz du jour) + plus bas QuickAccessGrid 'Quêtes' + PriorityMission 'GO' → 3 points d'entrée quêtes/quiz concurrents au-dessus du pli.

**`components/teen/twin-currency-gauge.tsx`**

- Composant pédagogiquement correct et propre, MAIS redondant sur la home : XP+level+coins y sont déjà, puis re-répétés par OrbitingTokens et StatHero juste en dessous.
- Îlot sombre (night gradient) cohérent charte, mais 3e surface sombre/colorée d'affilée au-dessus du pli → fatigue visuelle.

**`components/teen/dashboard/teen-dashboard-content.tsx`**

- ~10 sections empilées en colonne unique max-w-1200 (l.97) avec space-y-8/10/12 : scroll très long, aucune priorisation au-dessus du pli.
- Hiérarchie incohérente : un 2e 'hero' (titre clamp 3.5rem + OrbitingTokens) APRÈS le hero above-the-fold (AvatarCoach+gauge) → deux héros concurrents.
- OrbitingTokens (l.114) ré-affiche XP/coins/level/streak DÉJÀ montrés par la gauge et le header — pur décor animé qui répète la donnée.
- StatHero (l.126) re-affiche XP+niveau une 3e fois immédiatement après l'orbite.
- La vraie 'next best action' (PriorityMission) n'arrive qu'en ~4e position après 3 répétitions de stats.
- Monte <MobileBottomNav/> ici (l.238) : la nav mobile n'existe donc que sur la home, absente des autres pages teen.
- Densité d'effets : MeshBackground + holographic borders + tilt 3D + shimmer sur quasi chaque carte → contraire charte 'aucun blur/glow/grain'.

**`components/teen/dashboard/priority-mission.tsx`**

- Devrait être le 'next best action' n°1 mais est rendu en 3e/4e position dans le scroll.
- Fallback générique 'Connexion Quotidienne' injecté par page.tsx quand pas de mission → CTA qui n'amène nulle part d'actionnable (/teen/quests sans highlight).
- Surcharge d'animations (tilt 3D, shimmer, glow cursor, icône flottante, particule pulsante) sur une carte au gradient vif — illisible vs charte paper.

**`components/teen/dashboard/quick-access-grid.tsx`**

- Doublon d'URL : 'Clubs' et 'Crew Battle' pointent tous deux vers /teen/circles (l.293 & l.305) → 2 cartes = même destination.
- Badges NEW/HOT/LIVE codés en dur (l.275/298/311), jamais pilotés par des données → faux signaux d'urgence permanents.
- 'Shop XP' → href /teen/shop qui est un REDIRECT vers /teen/wallet?tab=shop : saut de redirection inutile.
- Description 'Convertis tes XP en récompenses' : 'convertir' frôle la confusion devise (XP ne se convertit pas en coins ; ici c'est dépense XP→reward).
- Effets 3D/holographic lourds sur 4 petites cartes.

**`components/teen/dashboard/online-friends.tsx`**

- Utilise des tokens hors-charte (text-muted-foreground, bg-muted, border-border, text-info) au lieu des tokens paper (mute/ink/paper) du reste du dashboard → divergence visuelle.
- Titre 'Amis en ligne' dupliqué : déjà posé par SectionEyebrow 'Amis en ligne' dans le parent (teen-dashboard-content l.153) puis re-rendu en interne (l.69).
- Lien Inviter → /teen/social?tab=friends mais bottom-nav/sidebar parlent de Crew/Circles : terminologie amis vs crew floue.

**`components/teen/dashboard/map-preview.tsx`**

- Données factices en fallback : amis Max/Emma/Lucas '500m/1.2km' (l.105-109, l.134-137) et events 'Meetup Gaming/Challenge Fitness' (l.127-130, l.138) s'affichent dès que l'API /api/teen/friends échoue ou est vide.
- Aucune vraie carte : radar animé + grille + halos décoratifs simulent une map → promesse trompeuse.
- Lien vers /teen/social?tab=map alors que /teen/map existe mais redirige → routing à deux niveaux confus.
- Couche d'animations (radar sweep, pulse rings, meshes) très lourde et contraire charte.

**`components/teen/dashboard/crew-hub.tsx`**

- Carte très haute (header gradient + avatar + 3 stats + barre tier + 3 membres + gros bouton) : à elle seule une demi-page de scroll.
- Motto par défaut codé en dur 'Squad goals 🔥' (l.136) si crew sans motto.
- Terminologie : composant 'CrewHub' mais sidebar/quick-access disent 'Circles'/'Clubs' et bottom-nav 'Crew' → 3 mots pour la même entité.
- PremiumButton glow #8b5cf6 + holographic tier badge : hors charte paper.

**`components/gamification/xp-purchase-power.tsx`**

- Empty-safe corrigé (return null si pas de nextReward, cf. commentaire page.tsx l.48-53) — bon point.
- Lien /teen/shop = redirect vers /teen/wallet?tab=shop : saut inutile.
- Encore une barre de progression XP (4e barre de progression XP de la page après gauge, StatHero implicite, profile-quest).
- Tilt 3D + glow + shimmer sur charte paper.

**`components/teen/dashboard/profile-quest.tsx`**

- Étape 'username' basée sur profile.username (l.61) alors que le schéma réel a migré username→teens.pseudo (cf. mémoire drift schéma) : risque que l'étape reste 'à faire' à tort.
- handleComplete (l.76-80) ne complète rien : affiche un toast 'Ouvre l'édition du profil' puis confetti — étape cliquable trompeuse.
- Couleurs codées en hex (#3b82f6 teal, glow rgba) hors tokens charte.
- Se cache si progress===100 (l.82) : disparition silencieuse d'une section, layout qui saute.

**`components/feed/social-feed.tsx`**

- fallbackActivities (Amine/Sara/Lina, l.57-88) s'affichent dès que initialActivities est vide (l.172-174) — donc faux posts en prod pour tout teen sans feed amis.
- Section coiffée de DEUX badges 'En direct' (eyebrow + pastille animée, teen-dashboard-content l.213-217) : redondance de label.
- Le PO voit un 'fil live' qui ment quand il n'y a pas d'amis.

**`components/teen/marketplace-overlay.tsx`**

- 100% hardcodé : 'Nike Morocco -20% Jordan 500 XP' et 'Megarama 1200 XP' (l.8-25) — faux partenaires en prod.
- Bouton 'Débloquer la récompense' SANS href ni onClick (l.56-59) : CTA totalement mort.
- Aucun titre de section ni eyebrow dans le parent (teen-dashboard-content l.233) : apparaît sans contexte.
- Coûts libellés en 'XP' alors que c'est une offre marchande type marketplace — flou XP/coins/DH.

**`components/teen/dashboard/mobile-nav.tsx`**

- Montée uniquement dans teen-dashboard-content : ABSENTE des ~60 autres pages teen sur mobile (le layout ne la rend pas) → navigation mobile cassée hors home.
- Explore → /teen/map qui est un REDIRECT vers /teen/social?tab=map.
- hiddenPaths cache la nav sur /teen/quests et /teen/chat (l.164) mais comme elle n'est de toute façon montée que sur la home, ce réglage est inopérant ailleurs.
- 4 entrées seulement vs 15 dans la sidebar desktop : énorme asymétrie d'accès mobile/desktop.

**`components/dashboard/teen/sidebar.tsx`**

- 15 entrées sans regroupement (Events, Aide Scolaire, Défis, Passion, Games, Circles, Partager, Achievements, Coins, Streak, Récompenses, Classement, Profil, Paramètres) → menu plat surchargé.
- Expose seulement 15 des ~68 écrans teen ; la majorité (savings, rides, mentors, internships, food, vip-card, wellbeing, birthday...) est orpheline.
- 'Récompenses' → /teen/wallet?tab=shop et 'Mes Coins' → /teen/coins : deux entrées wallet distinctes, plus le Shop XP du quick-access → 3 portes vers l'économie.
- isActive = pathname===href strict : les sous-routes ne marquent jamais l'item parent actif.

</details>

**Incohérences internes :**

- Nav mobile orpheline : MobileBottomNav est rendue dans components/teen/dashboard/teen-dashboard-content.tsx (l.238) et NON dans app/teen/layout.tsx — sur mobile, toutes les pages hors home (quests, circles, wallet, profile...) n'ont aucune navigation persistante.
- Asymétrie nav : 15 entrées sidebar desktop vs 4 entrées bottom-nav mobile ; ~53 des ~68 écrans teen ne sont atteignables par AUCUNE nav.
- Double hero : AvatarCoach + TwinCurrencyGauge (above-the-fold, page.tsx) puis un 2e hero éditorial + OrbitingTokens (teen-dashboard-content l.101-123) → deux 'titres de page' concurrents.
- Routing à redirections en cascade depuis la home : QuickAccess 'Shop XP'→/teen/shop→/teen/wallet?tab=shop ; bottom-nav 'Explore'→/teen/map→/teen/social?tab=map ; MapPreview pointe directement /teen/social?tab=map (incohérent avec le bouton nav).
- PriorityMission (le 'next best action') arrive en 4e position après 3 répétitions de stats — l'action prioritaire n'est pas prioritaire visuellement.
- Divergence de design system : online-friends utilise muted-foreground/border/info (tokens shadcn génériques) tandis que tout le reste du dashboard utilise les tokens paper (ink/mute/paper/pink) → carte visuellement étrangère.
- Faux contenu en production sur 3 surfaces de la home (MarketplaceOverlay full-mock, SocialFeed fallback Amine/Sara/Lina, MapPreview amis/events factices) : le teen ne peut pas distinguer le vrai du décor.
- ChoreNudgeSection (avatar-coach.tsx l.252-256) a des classes 'bg-lime text-lime' → texte invisible : parcours corvée cassé visuellement.
- profile-quest lit profile.username alors que le schéma réel utilise teens.pseudo (drift schéma documenté) : l'étape 'pseudo' peut rester décochée à tort.

**Redondances / doublons :**

- `components/teen/twin-currency-gauge.tsx` = `components/brand/orbiting-tokens.tsx` = `components/brand/niv.tsx (StatHero)` = `components/dashboard/teen/header.tsx` — Above-the-fold : XP affiché 3x (gauge + orbit + StatHero), niveau 4x (header + gauge + orbit + StatHero), coins 3x (header + gauge + orbit), streak 2x (header + orbit). Quatre surfaces répètent les mêmes 4 chiffres avant tout contenu actionnable.
- `components/teen/dashboard/quick-access-grid.tsx` — Cartes 'Clubs' et 'Crew Battle' pointent toutes deux vers /teen/circles : 2 des 4 raccourcis = même destination.
- `app/teen/circles/page.tsx` = `app/teen/crews/page.tsx` = `app/gamification/crews/page.tsx` — Trois routes pour les crews ; gamification/crews redirige (308) vers /teen/circles, mais /teen/crews coexiste avec /teen/circles (dédoublonnage incomplet côté teen).
- `app/teen/shop/page.tsx` = `app/teen/wallet/page.tsx` = `app/teen/coins/page.tsx` = `app/gamification/boutique/page.tsx` — Économie éclatée : shop redirige vers wallet?tab=shop, boutique redirige aussi, coins est une page distincte. Sidebar expose 'Mes Coins' + 'Récompenses' + QuickAccess 'Shop XP' = 3 portes vers la même zone.
- `app/teen/map/page.tsx` = `app/teen/social/page.tsx` = `components/teen/dashboard/map-preview.tsx` — map redirige vers social?tab=map ; MapPreview et bottom-nav 'Explore' ciblent des chemins différents pour la même fonctionnalité carte.
- `components/teen/dashboard/online-friends.tsx` = `components/teen/dashboard/teen-dashboard-content.tsx` — Titre 'Amis en ligne' rendu deux fois (SectionEyebrow parent + header interne du composant). Idem 'En direct' affiché 2x sur la section SocialFeed.

**Devise / terminologie :**

- TwinCurrencyGauge respecte parfaitement la règle : XP (or, effort, 'ne se convertit pas en coins') et coins (corail, 1 DH = 100 coins, pré-payé parents) côte à côte sans flèche — c'est la référence à généraliser.
- QuickAccessGrid 'Shop XP' : description 'Convertis tes XP en récompenses' — le verbe 'convertir' est risqué ; il s'agit d'une DÉPENSE d'XP contre reward, pas d'une conversion XP→coins. À reformuler ('Échange/dépense tes XP').
- MarketplaceOverlay libelle des offres marchandes (Nike, Megarama) en 'XP' (500 XP / 1200 XP) : mélange marketplace (devrait être coins/DH ?) avec la monnaie d'effort XP — incohérent avec le modèle double-devise.
- OrbitingTokens affiche coins avec le glyphe ⊙ et XP sans unité, tandis que la gauge écrit 'coins' + '≈ X.XX DH' : deux représentations visuelles des coins sur le même écran.
- Terminologie crew/club/circle : sidebar='Circles', quick-access='Clubs' ET 'Crew Battle', bottom-nav='Crew', composant='CrewHub', routes /teen/circles + /teen/crews — au moins 4 termes pour une seule entité.
- Terminologie défi/quête/mission : sidebar 'Défis Physiques', quick-access 'Quêtes', PriorityMission parle de 'mission'/'Quotidien'/'Hebdo'/'Défi'/'Spécial', getTeenDashboardData mélange dailyMissions et 'Défis complétés' — vocabulaire flottant.
- Header affiche les coins mais PAS l'XP (l.118-132 : niveau + coins seulement), alors que la gauge met l'XP en avant — incohérence sur quelle devise est 'le' solde de référence dans la barre du haut.

**Recommandations prioritaires :**

1. DÉDUPLIQUER les stats above-the-fold : ne garder QU'UNE source de vérité visuelle pour XP/coins/level/streak (la TwinCurrencyGauge, conforme charte). Supprimer la répétition par OrbitingTokens (réduire à décor mascotte sans chiffres) et StatHero XP, et retirer level+coins du header OU de la gauge — viser 1 affichage par chiffre.
2. REMONTER le 'next best action' : placer PriorityMission (ou AvatarCoach CTA) en 1ère position above-the-fold, juste sous une barre devise compacte. Reléguer crew/map/profile-quest/social-feed/marketplace en sections repliables ou onglets sous le pli. Objectif : 1 action claire visible sans scroll.
3. PURGER le faux contenu en prod : MarketplaceOverlay (full-mock + CTA mort) à masquer tant qu'il n'y a pas de deals réels ; SocialFeed ne doit PAS retomber sur Amine/Sara/Lina (afficher un empty-state) ; MapPreview ne doit pas inventer Max/Emma/Lucas. Rendre chaque section empty-safe et honnête.
4. RÉPARER la navigation mobile : monter MobileBottomNav dans app/teen/layout.tsx (pas dans le contenu du dashboard) pour qu'elle persiste sur toutes les pages teen ; aligner ses cibles sur les URL canoniques (éviter /teen/map et /teen/shop qui ne sont que des redirects) et corriger le doublon QuickAccess Clubs/Crew Battle.
5. ALLÉGER la charte : retirer tilt 3D / glow / shimmer / radar / holographic-borders des cartes du dashboard (contraires au paper néo-brutaliste 'aucun blur/glow/grain'), unifier les tokens (online-friends utilise muted-foreground/border au lieu de ink/mute/paper), et figer le vocabulaire crew/circle/club et mission/quête/défi.

---

### 1.2 Wallet & économie (XP, coins/DH, épargne, boutique, récompenses, carte VIP, roue)

> Le wallet a été correctement consolidé : un seul hub (/teen/wallet) à 3 onglets (Coins/Boutique/Badges), une seule boutique « canon » alimentée par le RPC get_shop_rewards, et les anciennes pages concurrentes (/teen/shop, /teen/rewards, /gamification/boutique) ne sont plus que des redirects vers ?tab=shop ; la roue est retirée (410/redirect). Le composant TwinCurrencyGauge est excellent et impose visuellement le modèle double devise (XP effort vs coins prépayés, 1 DH = 100 coins, aucune flèche de conversion). MAIS le modèle est trahi par la boutique elle-même et par trois taux de change contradictoires : la boutique vend des items en XP (xp_cost, débit XP via purchase_reward) avec une « ≈ DH » alors que la charte dit que les XP ne se convertissent JAMAIS ; lib/payments/xp-converter applique 10 XP = 1 DH, la page /teen/xp-value applique 100 XP = 1 DH, et l'historique d'achats affiche coins_spent pour des achats payés en XP. Résultat : les coins (allowance, épargne) n'ont littéralement aucune boutique où être dépensés, et l'utilisateur voit trois équivalences DH différentes. Épargne et allowance sont propres mais orphelines (aucune entrée de nav).

**Note UX moyenne du cluster : 5.6 / 10**

| Écran | But | État | UX | Nav |
|---|---|---|---|---|
| `app/teen/wallet/page.tsx + app/teen/wallet/wallet-hub-client.tsx` | Hub wallet à 3 onglets (Coins, Boutique, Badges) avec jauge double devise et redeem XP→item. | 🟢 réel | 6 | bottom-nav |
| `app/teen/wallet/allowance/page.tsx` | Affiche la prochaine allowance (argent de poche) et l'historique des versements de coins. | 🟢 réel | 7 | ORPHELIN |
| `app/teen/coins/page.tsx` | Ancienne page Coins — désormais simple redirect vers /teen/wallet. | ↪️ redirect | 5 | sidebar |
| `app/teen/savings/page.tsx` | Liste des objectifs d'épargne en coins, avec verrouillage/retrait et match parental. | 🟢 réel | 7 | lien in-page |
| `app/teen/savings/new/page.tsx + components/teen/goal-form.tsx` | Création d'un objectif d'épargne (titre, visuel emoji, montant cible en coins). | 🟢 réel | 8 | lien in-page |
| `app/teen/xp-value/page.tsx` | Tableau de bord valeur des XP en DH : ValueCard, calculateur ROI, projections, historique, explication XP vs Coins. | 🟡 partiel/mock | 5 | lien in-page |
| `app/teen/shop/page.tsx` | Ancienne boutique — redirect vers /teen/wallet?tab=shop. | ↪️ redirect | 5 | quick-access |
| `app/teen/shop/checkout/page.tsx + checkout-client.tsx` | Checkout hybride XP + cash pour une réservation d'event (paramètre ?booking=uuid). | 🟢 réel | 6 | deep-link |
| `app/teen/shop/history/page.tsx` | Historique des achats boutique + codes de retrait des récompenses à utiliser. | 🟢 réel | 6 | ORPHELIN |
| `app/teen/rewards/page.tsx` | Ancienne page Récompenses — redirect vers /teen/wallet?tab=shop. | ↪️ redirect | 5 | sidebar |
| `app/teen/vip-card/page.tsx + vip-card-client.tsx` | Carte VIP : tier actuel (standard→legendary), avantages, progression XP vers le tier suivant. | 🟢 réel | 7 | lien in-page |
| `app/gamification/boutique/page.tsx` | Boutique gamification legacy — permanentRedirect (308) vers /teen/wallet?tab=shop. | ↪️ redirect | 5 | ORPHELIN |
| `app/gamification/roue/page.tsx` | Roue de la fortune — retirée ; permanentRedirect vers /teen. | ↪️ redirect | 5 | ORPHELIN |
| `lib/payments/xp-converter.ts` | Utilitaires de conversion XP↔DH et calcul de paiement hybride (XP + cash). | 🟢 réel | 5 | ORPHELIN |

<details><summary>Problèmes détaillés par écran (14)</summary>

**`app/teen/wallet/page.tsx + app/teen/wallet/wallet-hub-client.tsx`**

- Contradiction de devise au coeur de l'écran : la jauge (TwinCurrencyGauge) proclame 'XP ne se convertit pas en coins/DH', mais juste en dessous l'onglet Boutique vend des items en XP avec '≈ DH' (10 XP = 1 DH) — wallet-hub-client.tsx:93-105 et renderPriceTag l.342-357.
- Le solde 'coins' est affiché en grand (CoinsTab StatHero l.161-168) mais AUCUN onglet ne permet de dépenser des coins : la boutique débite des XP (handlePurchase l.306-340 → purchaseReward → RPC purchase_reward, prix en xp_cost). Les coins n'ont donc aucune destination de dépense.
- Le bandeau 'Au shop : 1 XP = 0.10 DH de remise (10 XP = 1 DH)' (l.96-100) entre en conflit avec /teen/xp-value qui affiche 100 XP = 1 DH.
- spendableCoins est recalculé à la main dans page.tsx (l.34-50, somme savings_goals.current_saved_coins) au lieu de réutiliser la vue user_coins_spendable employée par /teen/savings — deux sources de vérité pour la même donnée.
- CoinsTab et BadgesTab refetch /api/teen/wallet côté client alors que page.tsx a déjà chargé xp/coins/streak côté serveur — double fetch.

**`app/teen/wallet/allowance/page.tsx`**

- Aucune navigation ne pointe vers /teen/wallet/allowance (absente de sidebar, mobile-nav, quick-access et même de l'onglet Coins du wallet) — page atteignable uniquement en deep-link.
- Conversion DH affichée via Math.round(amount_dh * 100) = 1 DH→100 coins (l.61, 111) : cohérente avec le peg coins, mais incohérente avec le taux 'XP' du shop voisin.

**`app/teen/coins/page.tsx`**

- Entrée sidebar 'Mes Coins' (sidebar.tsx:34) et menu header (header.tsx:90) pointent vers /teen/coins qui ne fait que rediriger vers /teen/wallet (sans ?tab=coins). Redirect en cascade évitable : la nav devrait pointer directement vers /teen/wallet.
- Le commentaire interne note que coins n'était pas câblé et affichait un faux 1250 — confirme l'historique de mock.

**`app/teen/savings/page.tsx`**

- Orpheline de la nav principale : aucune entrée sidebar/mobile/quick-access ; le seul lien interne est savings/new vers lui-même. Le wallet hub ne lie pas l'épargne alors qu'il calcule pourtant les coins bloqués par l'épargne.
- Lit user_coins_spendable (vue) alors que le wallet recalcule la même chose autrement (page.tsx wallet l.34-50) — risque de chiffres divergents entre les deux écrans.
- Cohérence devise OK ici : tout est en coins (⊙) avec équivalent DH à 1 DH=100 coins.

**`app/teen/savings/new/page.tsx + components/teen/goal-form.tsx`**

- Formulaire propre (RHF+zod, presets emoji, équivalent DH live à /100, confetti). Cohérent avec le peg coins (goal-form.tsx:77-81).
- Atteignable seulement depuis /teen/savings, elle-même orpheline → profondeur d'accès élevée pour une fonctionnalité clé.

**`app/teen/xp-value/page.tsx`**

- Taux de change CONTRADICTOIRE : défaut xp_rate=100 → 100 XP = 1 DH (l.339, formatCurrency stats.xp_value_dh = total_xp/100), alors que lib/payments/xp-converter.ts impose 10 XP = 1 DH et le wallet affiche 10 XP = 1 DH. Trois écrans, trois équivalences.
- Contradiction conceptuelle : la section HowItWorks (l.314-316) affirme 'les XP ne se convertissent jamais en DH', mais toute la page chiffre 'la valeur de tes XP en DH', un calculateur ROI 'tu économises X DH' et des projections en DH — c'est exactement la conversion interdite.
- Projections fabriquées côté client à partir de lifetime_earned/6 (l.364-370) — heuristique factice présentée comme prévision ('D'ici 3 mois tu pourrais avoir X DH').
- Atteignable uniquement via le petit lien 'Voir le modèle d'économie' du wallet (deep-link de fait) ; charte 'paper' partiellement respectée mais palette legacy (text-green-400/bg-green-500/20 dans schema REWARD_TYPE_CONFIG, et bg-destructive) à côté des tokens charte.

**`app/teen/shop/page.tsx`**

- La carte quick-access 'Shop XP' (quick-access-grid.tsx:268-271) et le composant xp-purchase-power (l.66) pointent vers /teen/shop qui re-redirige — cascade évitable.
- Le label 'Shop XP' / 'Convertis tes XP en récompenses' assume le shop XP-only, ce qui renforce l'incohérence : les coins n'ont pas de boutique.

**`app/teen/shop/checkout/page.tsx + checkout-client.tsx`**

- C'est un checkout de RÉSERVATION (table bookings), pas de la boutique de récompenses — vit pourtant sous /teen/shop/, ce qui mélange deux notions. Sans ?booking il renvoie vers /teen/shop (donc vers le wallet).
- Utilise le rail XP→DH hybride (calculateHybridPayment, 10 XP=1 DH) — encore l'usage XP-as-money que la charte interdit, mais ici sur le flux paiement réel.
- Lit user_xp.total_xp par teen_id alors que le reste du wallet lit dashboardData.xp — sources multiples pour le solde XP.

**`app/teen/shop/history/page.tsx`**

- Affiche 'Coins dépensés' / ⊙ coins_spent (l.172-175, 269-271) pour des achats que la boutique a en réalité débités en XP (xp_cost / purchase_reward). Mismatch de devise frontal entre l'achat (XP) et son historique (coins).
- Orpheline : aucun lien depuis le wallet/boutique vers /teen/shop/history ; seuls des liens 'retour' internes vers ?tab=shop existent. L'utilisateur ne peut pas retrouver ses codes de retrait.
- Le bouton retour 'Retour à la boutique' suppose qu'on vient de la boutique, alors qu'aucun chemin n'y mène.

**`app/teen/rewards/page.tsx`**

- Entrée sidebar 'Récompenses' (sidebar.tsx:36) pointe vers /teen/wallet?tab=shop : OK fonctionnellement, mais 'Récompenses' et 'Boutique' (onglet) et 'Shop XP' (quick-access) désignent le même écran sous trois noms différents.
- Terminologie : 'Récompenses' suggère du gratuit/mérité, alors que l'écran est une boutique payante en XP.

**`app/teen/vip-card/page.tsx + vip-card-client.tsx`**

- Atteignable uniquement via le bouton 'Carte VIP' dans le header du wallet hub (wallet-hub-client.tsx:110) — pas dans la nav principale.
- Tiers et avantages dérivés de la config canon VIP (bien), mais avantages purement déclaratifs (ex. '20% bonus XP', 'Coach personnel') sans preuve qu'ils sont appliqués ailleurs dans l'app — potentiel avantage fantôme.
- Le CTA 'Voir les quêtes' renvoie vers /teen/quests (cohérent XP=effort).

**`app/gamification/boutique/page.tsx`**

- Doublon historique correctement neutralisé (308 + noindex). Le commentaire signale que shop-client.tsx associé est orphelin (code mort à mentionner, pas à supprimer ici).

**`app/gamification/roue/page.tsx`**

- Feature retirée (trigger wheel_streaks cassé, en attente de ratification). Redirect propre vers /teen + noindex. Plus de 'roue' concurrente côté économie — bon point.

**`lib/payments/xp-converter.ts`**

- XP_TO_DH_RATE = 0.10 (10 XP = 1 DH) — source du taux affiché dans le wallet et le checkout. En conflit direct avec /teen/xp-value (xp_rate=100).
- L'existence même d'un convertisseur XP→DH (et de seuils PARENTAL_APPROVAL_THRESHOLD_XP, MIN_XP_FOR_PAYMENT) institutionnalise la conversion XP→argent que la charte/whitepaper interdisent ('XP et coins NE se convertissent JAMAIS').
- Module utilisé par le checkout réservation et le wallet, jamais par les coins — donc l'argent réel (coins) ne passe pas par ce lib, seul l'XP 'argentisé' y passe.

</details>

**Incohérences internes :**

- TROIS taux de change XP→DH contradictoires coexistent : lib/payments/xp-converter.ts = 10 XP/DH ; app/teen/wallet (bandeau + renderPriceTag) = 10 XP/DH (cohérent) ; app/teen/xp-value/page.tsx = 100 XP/DH (xp_rate par défaut 100). Un même item de 500 XP vaut donc 50 DH au wallet et 5 DH sur xp-value.
- Violation de la règle 'XP ne se convertit jamais' : la boutique débite des XP avec affichage '≈ DH', xp-value chiffre la 'valeur DH des XP' + calculateur ROI 'tu économises X DH', et le checkout réservation paie en XP convertis en DH. Le TwinCurrencyGauge dit l'inverse sur le même écran wallet.
- Mismatch devise achat vs historique : la boutique facture en XP (xp_cost, purchase_reward, ShopReward.xp_cost), mais app/teen/shop/history affiche 'coins_spent' / ⊙ pour ces mêmes achats (shop_purchases.coins_spent).
- Les coins (allowance + épargne) n'ont AUCUNE boutique de dépense : tous les écrans 'boutique/récompenses' débitent des XP. Le solde coins mis en avant dans le wallet est donc un cul-de-sac fonctionnel.
- Parcours cassés / orphelins : /teen/savings, /teen/savings/new, /teen/wallet/allowance, /teen/shop/history et /teen/xp-value ne sont reliés par aucune nav principale (sidebar/mobile/quick-access). Les codes de retrait des récompenses (history) sont donc introuvables après achat.
- Cascades de redirects : sidebar 'Mes Coins'→/teen/coins→/teen/wallet ; quick-access 'Shop XP'→/teen/shop→/teen/wallet?tab=shop. La nav devrait pointer directement sur la destination finale.
- Deux sources de vérité pour 'coins disponibles' : le wallet recalcule spendable en sommant savings_goals (page.tsx l.34-50) tandis que /teen/savings lit la vue user_coins_spendable — divergence possible.
- Sources multiples pour le solde XP : getTeenDashboardData (wallet), /api/teen/wallet (CoinsTab/BadgesTab via user_xp), /api/payments/xp (xp-value), user_xp.total_xp direct (checkout) — risque d'écarts d'affichage.

**Redondances / doublons :**

- `app/teen/wallet/wallet-hub-client.tsx?tab=shop` = `app/teen/shop/page.tsx` = `app/teen/rewards/page.tsx` = `app/gamification/boutique/page.tsx` — Quatre routes 'boutique' pour un seul écran réel : seul ?tab=shop est canon ; les trois autres sont des redirects (308/redirect). Consolidation déjà faite, mais il reste 3 stubs et 3 libellés différents ('Boutique', 'Récompenses', 'Shop XP') pointant au même endroit.
- `app/gamification/boutique/shop-client.tsx (orphelin)` — Le commentaire de app/gamification/boutique/page.tsx indique que shop-client.tsx est orphelin (code mort). À mentionner, pas supprimer dans cet audit.
- `app/teen/coins/page.tsx` = `app/teen/wallet/wallet-hub-client.tsx (CoinsTab)` — /teen/coins est entièrement absorbé par l'onglet Coins du wallet ; il ne reste qu'un redirect, mais la sidebar et le header le ciblent encore au lieu de /teen/wallet.
- `app/teen/xp-value/page.tsx (HowItWorks)` = `components/teen/twin-currency-gauge.tsx` = `app/teen/wallet (bandeau économie)` — Trois explications concurrentes du modèle XP vs coins, avec des chiffres différents (rate). Devrait être une seule source documentaire référencée par tous.
- `app/teen/shop/checkout (calculateHybridPayment)` = `boutique purchase_reward (XP-only)` — Deux rails de paiement XP distincts : hybride XP+cash (réservations) et XP pur (récompenses), tous deux 'argentisant' l'XP — à clarifier conceptuellement.

**Devise / terminologie :**

- XP : présenté de façon cohérente comme 'effort, ne se convertit jamais' dans TwinCurrencyGauge et la première moitié de HowItWorks — MAIS la boutique le dépense comme une monnaie et xp-value/xp-converter le convertissent en DH. Le discours et l'implémentation se contredisent.
- Coins (⊙) : bien posés (1 DH = 100 coins, prépayé parent) dans gauge, savings, allowance, goal-form. Peg cohérent partout SAUF qu'aucune boutique ne les accepte.
- DH : sert à 3 usages mélangés — (a) peg des coins (1 DH = 100 coins, OK), (b) 'remise' XP au shop (10 XP = 1 DH), (c) 'valeur' des XP (100 XP = 1 DH). Les usages (b) et (c) sont contradictoires entre eux et avec la règle de non-conversion.
- 'Boutique' vs 'Récompenses' vs 'Shop XP' : trois noms pour le même écran. 'Récompenses' connote du mérité/gratuit alors que c'est payant en XP — choisir un seul terme.
- 'coins_spent' dans shop_purchases vs 'xp_cost/xp_spent' dans le RPC boutique : la donnée de prix d'achat est nommée en coins côté historique et en XP côté catalogue — à unifier (probablement renommer en xp_spent dans l'historique).
- VIP : 'tier/niveau VIP' (XP lifetime) distinct du 'niveau' XP du wallet (current_level) — deux notions de niveau coexistent sans pont explicite, risque de confusion.

**Recommandations prioritaires :**

1. Trancher la règle de devise et l'appliquer partout : si XP ne se convertit jamais (charte/whitepaper), supprimer toute mention 'XP ≈ DH' (wallet bandeau + renderPriceTag, page xp-value, calculateur ROI) et présenter les prix boutique en XP nus. Sinon, fixer UN seul taux dans lib/payments/xp-converter et le faire consommer par tous les écrans (corriger xp_rate=100 → 10 dans xp-value/page.tsx l.339 et l'API /api/payments/xp).
2. Donner une destination de dépense aux coins : soit créer/raccorder une boutique en coins (ou un onglet 'payer en coins'), soit clarifier que coins ne servent qu'aux réservations/allowance — aujourd'hui le solde coins mis en avant dans le wallet est un cul-de-sac.
3. Aligner l'historique d'achats sur la devise réelle : remplacer 'coins_spent / ⊙' par 'XP dépensés' dans app/teen/shop/history (l.172-175, 269-271) et la requête, puisque purchase_reward débite des XP — et exposer cet historique + les codes de retrait depuis l'onglet Boutique (actuellement orphelin).
4. Recâbler la navigation des écrans économie orphelins : ajouter Épargne et Allowance (et un accès à xp-value/VIP) dans le wallet hub et/ou la sidebar ; faire pointer la sidebar 'Mes Coins' directement sur /teen/wallet et 'Shop XP' directement sur /teen/wallet?tab=shop pour supprimer les cascades de redirects.
5. Unifier les sources de solde et la doc du modèle : utiliser la vue user_coins_spendable comme seule source de 'coins disponibles' (wallet + savings), une seule API pour le solde XP, et une seule explication 'XP vs coins' référencée par gauge, wallet et xp-value pour éliminer les chiffres divergents.

---

### 1.3 Quiz (sportif / cérébral / culture) & jeux — app/teen/quiz/** + app/teen/games/**

> Le pôle Quiz est le seul réellement jouable et complet : la banque de questions vit dans `educational_quizzes` (JSONB), le scoring est re-calculé côté serveur dans `app/api/teen/quiz/submit/route.ts`, l'attempt est persisté dans `quiz_attempts` et l'XP est crédité via la RPC `add_xp_to_user`. Le runner, l'historique, les stats et le quiz du jour (recommandeur + fallback curated) sont fonctionnels. EN REVANCHE le pôle Games est une coquille : l'infra backend (tables `mini_game_*`, RPCs create/join/start/submit/end, leaderboards, seeds music_quiz/memory/prédictions) existe, mais TOUS les boutons de `games-client.tsx` sont codés en dur `disabled` + "bientôt" et aucune route runner (`/teen/games/[slug]`) n'existe — donc 0 jeu jouable, stats forcément à zéro. La promesse PO « quiz sportif / cérébral / culturel » est fausse : il n'y a AUCUN quiz sportif dans le seed (038), seulement math/science/history/geography/french/culture. Le multijoueur quiz existe uniquement sous forme de `challenge_kind: "quiz_battle"` dans friend-defis, sans runner de quiz partagé.

**Note UX moyenne du cluster : 5.4 / 10**

| Écran | But | État | UX | Nav |
|---|---|---|---|---|
| `app/teen/quiz/page.tsx` | Hub quiz (RSC) : charge catégories/quiz par sujet, attempts récents, quiz du jour et stats, puis délègue au client QuizHubClient. | 🟢 réel | 8 | lien in-page |
| `app/teen/quiz/[id]/page.tsx` | Runner d'un quiz : charge le quiz par id via getQuizById, notFound() si inexistant ou sans questions, sinon rend QuizRunnerClient. | 🟢 réel | 8 | lien in-page |
| `app/teen/quiz/[id]/quiz-runner-client.tsx` | Composant client de jeu : navigation question par question, minuteur optionnel, soumission à /api/teen/quiz/submit, écran de résultat (score, XP, détail par question, confettis). | 🟢 réel | 8 | lien in-page |
| `app/teen/quiz/history/page.tsx` | Historique des quiz joués (50 derniers) + 3 stats (joués, moyenne %, XP total) ; liens vers chaque quiz rejouable. | 🟢 réel | 8 | lien in-page |
| `app/teen/games/page.tsx` | Hub jeux (RSC) : charge les types de mini-jeux (getMiniGameTypes) et les stats cumulées (getUserGameStats) puis rend GamesClient. | 🟡 partiel/mock | 3 | sidebar |
| `app/teen/games/games-client.tsx` | UI des jeux : onglets (all/daily/brain/pvp), stats cumulées, liste jeux quotidiens et défis multijoueur. | ⚪ stub/TODO | 3 | sidebar |

<details><summary>Problèmes détaillés par écran (6)</summary>

**`app/teen/quiz/page.tsx`**

- Aucune entrée 'Quiz' dans la sidebar (components/dashboard/teen/sidebar.tsx) ni dans le quick-access (components/teen/dashboard/quick-access-grid.tsx) : le hub n'est atteignable que via l'avatar-coach 'Quiz du jour' (components/teen/avatar-coach.tsx) et un QuickActionCard dans app/teen/quests/quests-hub-client.tsx (ligne 228). Découvrabilité faible alors que c'est la feature la plus aboutie.
- getQuizCategoriesForTeen ne sélectionne pas la colonne 'language' alors que getDailyQuizForTeen filtre dessus : risque d'incohérence d'inventaire entre le hub (toutes langues) et le quiz du jour (FR par défaut).

**`app/teen/quiz/[id]/page.tsx`**

- Garde stricte : un quiz actif mais à 0 question renvoie notFound() (page.tsx l.24). Les quiz 'curated' matérialisés par getDailyQuizForTeen avec questions=[] (lib/quiz/server.ts l.310) deviennent donc des liens morts (404) si surfacés.
- Le runner (quiz-runner-client.tsx) POST /api/teen/quiz/[id] au montage pour 'brûler' le slot no-repeat ; échec réseau silencieusement avalé (acceptable mais non signalé).

**`app/teen/quiz/[id]/quiz-runner-client.tsx`**

- answers.map((a) => (a < 0 ? 0 : a)) (l.101) : une question non répondue est envoyée comme réponse 0 (premier choix) ; mais le bouton Valider est déjà gardé par allAnswered, donc le cas est théorique — code défensif qui pourrait fausser un score si la garde sautait.
- Le drapeau correctAnswer est renvoyé au client dans la réponse submit (results[].correctAnswer) : acceptable post-soumission, mais le payload complet du quiz (avec q.correct) n'est jamais exposé avant soumission, ce qui est correct.

**`app/teen/quiz/history/page.tsx`**

- Atteignable uniquement depuis le hub quiz (bouton 'Historique') — donc deux niveaux de profondeur sous une feature déjà non exposée par la nav principale.
- href={attempt.quiz_id ? ... : '#'} : si quiz_id est null le lien pointe sur '#' (no-op silencieux) plutôt qu'un état désactivé explicite.

**`app/teen/games/page.tsx`**

- Le commentaire l.16-17 reconnaît que getUserGameStats n'expose pas de ventilation 'du jour' ni de win_streak réel ; total_xp = total_score/10 (heuristique, cf. gamification-system/features/mini-games/actions.ts l.785).
- Comme aucun jeu n'est jouable (boutons disabled, pas de runner), getUserGameStats renverra toujours 0/0/0 pour tout teen : les 3 StickerCards de stats sont structurellement vides.
- Exposé dans la sidebar (entrée 'Games' -> /teen/games) alors que la feature n'est pas livrée : la nav promet une page qui ne fait rien.

**`app/teen/games/games-client.tsx`**

- TOUS les CTA sont codés en dur disabled + suffixe 'bientôt' : Button 'Jouer · bientôt' (l.134-137) et 'Rejoindre · bientôt' (l.169). Aucun jeu n'est lançable.
- Aucune route runner : Glob app/teen/games/** ne renvoie que page.tsx, games-client.tsx, loading.tsx — pas de /teen/games/[slug]. Les RPCs create_game_session/start_game_session/submit_game_score existent côté DB mais ne sont câblées à aucune UI.
- Les filtres StickerTabs (all/daily/brain/pvp) ne filtrent RIEN : `category` est dans le state mais jamais utilisé pour filtrer dailyGames/challengeGames (l.47-48). Onglets purement décoratifs.
- game.icon affiché brut comme emoji (l.122-123, l.153-154) avec fallback '🎮' — incohérent avec la charte paper néo-brutaliste (icônes lucide ailleurs).
- GameType.color (hex gen-z type #EC4899 dans le seed 011) n'est même pas utilisé dans le rendu : champ mort.

</details>

**Incohérences internes :**

- Promesse PO non tenue : aucun quiz 'sportif' dans le seed (gamification-system/database/migrations/038_quiz_seed_content.sql) — seuls math, science, history, geography, french, culture existent. 'Cérébral' ≈ le hub quiz entier (titré 'Cerveau · Quiz' dans quiz-hub-client.tsx l.92) ; 'culture' = 1 seul quiz culture_general_v1.
- Catégories incohérentes entre catalogue et seed : lib/quiz/catalog.ts définit 9 catégories d'affichage (dont music, english, arabic) mais le seed 038 n'en peuple que 6 ; les sujets non seedés n'apparaîtront jamais, et un sujet DB inconnu retombe sur GENERIC_CATEGORY.
- Le quiz du jour utilise le filtre 'language' (lib/quiz/server.ts) que le hub n'applique pas : un teen non-FR pourrait voir un quiz du jour vide alors que le hub liste des quiz.
- Parcours games entièrement cassé : la sidebar expose /teen/games comme feature de premier niveau, mais 100% des actions y sont disabled 'bientôt' — l'utilisateur arrive sur une impasse.
- Multijoueur quiz fantôme : friend-defis (app/teen/quests/friend-defis/friend-defis-client.tsx) déclare un challenge_kind 'quiz_battle', mais il n'existe aucun runner de quiz partagé ; le 'défi quiz entre amis' n'est donc pas réellement jouable comme quiz (au mieux un suivi de score manuel via les API friend-challenges).
- Section 'Défis multijoueur' de games-client (l.145) et 'quiz_battle' de friend-defis couvrent le même besoin (jouer un quiz contre un ami) via deux infrastructures disjointes (mini_game_sessions vs friend_challenges).

**Redondances / doublons :**

- `app/teen/quiz/**` = `gamification-system/features/mini-games/actions.ts (music_quiz)` = `gamification-system/database/migrations/011_mini_games.sql (music_quiz_questions)` — Deux moteurs de quiz coexistent : (1) le quiz éducatif réel (educational_quizzes + /api/teen/quiz/submit) et (2) le 'Quiz Musical' des mini-jeux (music_quiz_questions + checkQuizAnswer/getRandomQuizQuestions). Le second est seedé et a des actions serveur mais aucune UI livrée.
- `app/gamification/page.tsx` = `app/gamification/missions/page.tsx` = `app/teen/games/page.tsx` = `app/teen/quests` — app/gamification/page.tsx et app/gamification/missions/page.tsx sont des permanentRedirect (vers /teen et /teen/quests) — anciens hubs sunset. Aucun écran games/quiz vivant sous app/gamification/** ne double app/teen/** ; la redondance est historique (routes legacy conservées en redirect).
- `app/teen/games/games-client.tsx (section multijoueur)` = `app/teen/quests/friend-defis/friend-defis-client.tsx (quiz_battle)` — Le 'défi multijoueur/PvP' de Games et le 'quiz_battle' des défis amis visent le même usage (affronter un ami) avec deux backends séparés (mini_game_sessions vs friend_challenges) — duplication conceptuelle non réconciliée.

**Devise / terminologie :**

- Devise : Quiz et Games ne manipulent QUE de l'XP (mérite) — aucune mention de coins/DH dans ce pôle, cohérent avec l'invariant XP≠coins. quiz-hub-client affiche 'XP Total', games-client 'XP gagnés'. RAS côté devise.
- Bonus XP quiz codé en dur dans deux endroits (app/api/teen/quiz/submit/route.ts l.86-91 : x1.5 si ≥90%, x1.25 si ≥80%) ; le commentaire indique que la logique est dupliquée depuis app/api/teen/education/quizzes/route.ts — risque de dérive entre les deux routes.
- Terminologie 'quiz' vs 'jeu' : le hub quiz se présente comme 'Cerveau · Quiz' tandis que la catégorie quests s'appelle 'brain' et l'onglet games 'brain' aussi — trois libellés (Cerveau/brain/cérébral) pour le même axe cognitif.
- 'défi' / 'quête' / 'mission' : friend-defis parle de 'Défis amis' avec challenge_kind 'quiz_battle' ; missions redirige vers quests ; le quick-access nomme une carte 'Quêtes' (Missions quotidiennes et défis) — vocabulaire défi/quête/mission interchangeable et non normalisé.
- GameType.base_xp affiché '+XX XP' sur des jeux non jouables : promesse de récompense XP qui ne pourra jamais être gagnée tant que le runner n'existe pas.

**Recommandations prioritaires :**

1. P0 — Honnêteté produit sur Games : soit livrer au moins un runner de mini-jeu (câbler getMiniGameTypes -> /teen/games/[slug] sur les RPCs create/start/submit déjà existantes), soit retirer l'entrée 'Games' de la sidebar et afficher un état 'bientôt disponible' assumé. Aujourd'hui la nav promet une feature 100% disabled (app/teen/games/games-client.tsx l.134,169).
2. P0 — Corriger la promesse PO 'quiz sportif' : il n'existe AUCUN quiz sportif. Ajouter un seed sujet 'sport' dans educational_quizzes (et l'entrée correspondante dans lib/quiz/catalog.ts) ou retirer 'sportif' du discours produit. Vérifier aussi que les 6 sujets du seed 038 sont bien appliqués en base (migration opt-in).
3. P1 — Rendre le hub quiz découvrable : ajouter une entrée 'Quiz' dans components/dashboard/teen/sidebar.tsx (à côté de 'Games') et/ou une carte quick-access ; la feature la plus aboutie du pôle n'est atteignable que via l'avatar-coach et un lien enfoui dans quests.
4. P1 — Activer le filtrage des onglets dans games-client.tsx : la variable `category` (all/daily/brain/pvp) est dans le state mais n'est jamais utilisée pour filtrer les listes — onglets trompeurs. Et conformer l'affichage des icônes (emoji brut '🎮') à la charte paper (icônes lucide).
5. P2 — Réconcilier le multijoueur : choisir UN backend pour 'jouer un quiz contre un ami' (mini_game_sessions PvP OU friend_challenges 'quiz_battle') et brancher un vrai runner de quiz partagé ; sinon supprimer le challenge_kind 'quiz_battle' tant qu'aucun runner ne l'honore. Mutualiser aussi le calcul de bonus XP quiz (dupliqué entre /api/teen/quiz/submit et /api/teen/education/quizzes).

---

### 1.4 Clubs / Circles / Crews & social (teen)

> Le domaine social de Nivy est massivement fragmenté : huit surfaces se chevauchent (circles, social, feed, activity, messages, friends, share, create) plus friend-defis, pour deux ou trois concepts réels seulement. La terminologie est incohérente (« club », « circle », « crew », « cercle de discussion », « collection » désignent au mieux 2 backends). Pire, /teen/circles empile DEUX backends distincts — les « crews » de gamification (crews/crew_members) et les « cercles de discussion » (circles/circle_members) — ce qui casse un parcours réel : créer/ouvrir un crew route vers /teen/circles/{crewId} alors que la page détail vérifie circle_members et renvoie l'utilisateur en arrière. La plupart de ces écrans sont fonctionnels côté données mais quasi tous orphelins : seuls /teen/circles (Circles, sidebar + bottom-nav + 2 cartes quick-access redondantes) et /teen/friends sont atteignables ; feed, social, activity, messages, share, create, friend-defis ne sont dans aucune nav principale. UX moyenne faible, surtout sur mobile où la bottom-nav n'existe que sur le dashboard.

**Note UX moyenne du cluster : 4.4 / 10**

| Écran | But | État | UX | Nav |
|---|---|---|---|---|
| `app/teen/circles/page.tsx` | Hub social principal : empile le client crews-gamification (CirclesPageClient) ET la liste des cercles de discussion (CirclesMessagingSection) sur une même page. | 🟢 réel | 4 | sidebar |
| `app/teen/circles/[circleId]/page.tsx` | Chat d'un cercle de discussion (backend circles/circle_members/circle_messages) réservé aux membres actifs. | 🟢 réel | 6 | lien in-page |
| `app/teen/crews/page.tsx` | Redirection 308 vers /teen/circles (convergence des doublons crew, #154). | ↪️ redirect | 5 | ORPHELIN |
| `app/teen/friends/page.tsx` | Hub amis : suggestions via RPC recommend_friends (SSR) + liste/recherche/invitations côté client. | 🟢 réel | 6 | lien in-page |
| `app/teen/feed/page.tsx` | Feed créateurs (posts feed_posts) avec pagination cursor SSR + load-more. | 🟢 réel | 6 | ORPHELIN |
| `app/teen/feed/[id]/page.tsx` | Détail d'un post feed avec likes/commentaires/partages + boutons d'engagement et signal d'analytics. | 🟢 réel | 7 | lien in-page |
| `app/teen/social/page.tsx` | Social hub à onglets (Crew / Amis / Classement / Carte) — méta-écran qui ré-agrège des features existant ailleurs. | 🟢 réel | 4 | ORPHELIN |
| `app/teen/activity/page.tsx` | Historique d'activité du teen (XP, quêtes, trophées, social, events) via /api/teen/activities, avec filtres. | 🟢 réel | 6 | ORPHELIN |
| `app/teen/messages/page.tsx` | Messagerie directe 1:1 (table direct_conversations) avec liste de conversations SSR + thread realtime. | 🟢 réel | 6 | lien in-page |
| `app/teen/share/page.tsx` | Générateur de cartes de partage (canvas PNG) pour accomplissements + cartes profil/invitation. | 🟡 partiel/mock | 5 | sidebar |
| `app/teen/create/page.tsx` | Composer de post (POST /api/teen/feed/submissions) avec type/catégorie/visibilité et aperçu live. | 🟢 réel | 7 | lien in-page |
| `app/teen/quests/friend-defis/page.tsx` | Défis entre amis 1v1 (table friend_challenges) avec buckets pending/active/completed et enjeu XP. | 🟢 réel | 6 | deep-link |
| `app/teen/quests/friend-defis/new/page.tsx` | Formulaire de création d'un défi entre amis : sélection d'un ami (friendships) + type + enjeu XP. | 🟢 réel | 6 | lien in-page |
| `app/gamification/crews/page.tsx` | Redirection 308 vers /teen/circles (couche moteur, #68). | ↪️ redirect | 5 | ORPHELIN |
| `app/gamification/collections/page.tsx` | Redirection 308 vers /teen/profile?tab=achievements (zone 'collections' supprimée). | ↪️ redirect | 5 | ORPHELIN |

<details><summary>Problèmes détaillés par écran (15)</summary>

**`app/teen/circles/page.tsx`**

- Deux backends fusionnés sur un écran : getUserCrew/searchCrews/getCrewLeaderboard (table crews/crew_members) via CirclesPageClient, puis CirclesList sur backend circles/circle_members via CirclesMessagingSection (page.tsx l.27-34). L'utilisateur voit 'Tes crews' + 'Cercles de discussion' sans comprendre la différence.
- Cible de 3 entrées de nav (sidebar 'Circles', bottom-nav 'Crew', quick-access 'Clubs' ET 'Crew Battle') — quatre intitulés différents pour la même URL.
- Aucune section 'Crew Battle' ni 'Clubs' réelle : les cartes quick-access promettent des features inexistantes sur la page d'arrivée.

**`app/teen/circles/[circleId]/page.tsx`**

- Parcours cassé : la page vérifie circle_members.status='active' (l.24-33) et redirige vers /teen/circles si non-membre. Or CirclesPageClient route 'Voir' et createCrew vers /teen/circles/{crew.id} (circles-client.tsx l.92, l.277) où crew.id vient du backend CREWS, pas circles → aucune membership trouvée → redirect immédiat. Créer/ouvrir un crew renvoie en boucle sur la liste.
- Atteignable uniquement via CirclesList (CirclesMessagingSection), pas via le client crews affiché au-dessus.

**`app/teen/crews/page.tsx`**

- Pur permanentRedirect + robots:noindex. Confirme que 'crews' et 'circles' sont traités comme synonymes côté routing, alors que l'UI conserve les deux mots.

**`app/teen/friends/page.tsx`**

- Absent de la sidebar, de la bottom-nav et du quick-access : atteignable seulement via liens internes (social-hub, friend-defis 'Ajouter des amis'). Hub structurant pourtant orphelin de la nav principale.
- Chevauche l'onglet 'friends' de /teen/social (SocialHubClient FriendsTab) qui appelle le même /api/teen/friends : deux écrans amis distincts.

**`app/teen/feed/page.tsx`**

- Aucune nav ne pointe vers /teen/feed (ni sidebar, ni bottom-nav, ni quick-access). Découvrable seulement en deep-link ou via /teen/create après publication.
- Header 'Ton crew poste' (l.59) mélange vocabulaire crew avec un feed public/créateurs sans rapport avec le backend crews.

**`app/teen/feed/[id]/page.tsx`**

- Atteignable uniquement depuis le feed (lui-même orphelin) ou après création de post.
- Affiche XP gagné par post (l.132-134) : cohérent avec 'XP = mérite', mais le feed parent n'explique pas comment ces XP sont attribués.

**`app/teen/social/page.tsx`**

- Doublon massif : l'onglet Crew duplique /teen/circles (et y renvoie via Link), l'onglet Amis duplique /teen/friends, l'onglet Classement duplique /teen/leaderboard, l'onglet Carte duplique /teen/map. social-hub-client.tsx l.110-113.
- Orphelin : aucune nav principale n'expose /teen/social. Écran de navigation… non navigable.
- Les actions 'Voir crew' et 'Chat crew' pointent toutes deux vers /teen/circles (l.227-237) — deux boutons, une seule destination.

**`app/teen/activity/page.tsx`**

- Orphelin total : aucune entrée de nav. Filtre 'Social' présent mais l'écran lui-même est inaccessible.
- Recoupe partiellement /teen/streak et le feed d'activité du dashboard : énième surface 'historique'.

**`app/teen/messages/page.tsx`**

- Backend DM (direct_conversations) totalement distinct du chat de cercle (circle_messages) : deux systèmes de messagerie séparés, aucun point d'entrée unifié.
- Orphelin de la nav : atteignable seulement via le bouton message d'une carte ami (/teen/messages?friend=ID dans social-hub-client.tsx l.351). Aucune icône 'inbox' globale.
- loadInbox lit teens.first_name/last_name (l.38) alors que MEMORY signale teens.pseudo comme champ réel → noms potentiellement 'Ami' partout (drift schéma).

**`app/teen/share/page.tsx`**

- shareableItems = [] codé en dur avec TODO(data) explicite (l.57-61) : la section 'Tes accomplissements à partager' est toujours vide, jamais câblée à /api/teen/achievements ou /api/teen/streak. Seules les 2 cartes statiques profil/invitation fonctionnent.
- handleCopyLink/handleSocialShare construisent des URLs /share/{id} avec id='profile'/'invite' (l.213,219) — liens non résolus côté backend.
- Watermark/nom de fichier 'teensparty-share-...' (l.205) : marque obsolète, pas 'Nivy'.

**`app/teen/create/page.tsx`**

- Atteignable seulement depuis le feed (orphelin) via '+ Créer'. Pas de FAB ni d'entrée de nav globale 'créer'.
- Visibilité propose 'crew' (l.18,41) comme audience, mais aucun écran n'explique de quel crew il s'agit ni ne montre les posts filtrés par crew.

**`app/teen/quests/friend-defis/page.tsx`**

- C'EST la feature 'créer un événement/défi entre amis' la plus aboutie, mais elle est enterrée sous /teen/quests/friend-defis sans entrée de nav directe.
- Mise en XP débitée à la création (RPC create_friend_challenge_v2) : XP utilisé comme enjeu pariable — à surveiller vis-à-vis du principe 'XP = mérite, ne s'achète pas'.
- Header 'Défie ton crew' (new/page.tsx l.69) alors que la cible est un AMI (friendships), pas un crew : terminologie crew/ami mélangée.

**`app/teen/quests/friend-defis/new/page.tsx`**

- Lit profiles.pseudo/avatar_url (l.46-48) tandis que friend-defis-list lit friend_challenges : cohérent mais dépend de profiles, table signalée en drift dans MEMORY.
- Texte 'Défie ton crew' (l.69) trompeur : on défie un ami unique, pas une crew.

**`app/gamification/crews/page.tsx`**

- Doublon de routing : 3e alias (avec /teen/crews et /teen/circles) pour le concept crew. Pur redirect noindex.

**`app/gamification/collections/page.tsx`**

- 'Collection' était un 4e terme social/achievement désormais sunset : confirme l'inflation de vocabulaire. Pur redirect.

</details>

**Incohérences internes :**

- PARCOURS CASSÉ MAJEUR : /teen/circles affiche le backend crews (CirclesPageClient) dont 'Voir' et createCrew routent vers /teen/circles/{crew.id} (circles-client.tsx l.92,277), mais /teen/circles/[circleId]/page.tsx vérifie circle_members (backend circles, distinct) et redirige vers /teen/circles si pas de membership → boucle. Créer ou ouvrir un crew ne mène jamais à un détail crew.
- DEUX BACKENDS sur une URL : crews/crew_members (gamification) ET circles/circle_members/circle_messages (messagerie) cohabitent sur /teen/circles sans distinction claire pour l'utilisateur (page.tsx l.27-34).
- TROIS systèmes de chat/messagerie séparés et non reliés : direct_conversations (/teen/messages, 1:1), circle_messages (/teen/circles/[id], cercle), et aucun chat de crew-gamification réel (le bouton 'Chat crew' de /teen/social pointe juste vers /teen/circles).
- NAV MOBILE QUASI INEXISTANTE : MobileBottomNav n'est rendue que dans components/teen/dashboard/teen-dashboard-content.tsx (l.238), PAS dans app/teen/layout.tsx. Sur mobile, dès qu'on quitte le dashboard (feed, circles, messages, friends…) il n'y a plus de barre de navigation basse. Confirmé par grep : aucune autre occurrence de MobileBottomNav.
- QUICK-ACCESS TROMPEUR : 'Clubs' et 'Crew Battle' pointent tous deux vers /teen/circles (quick-access-grid.tsx l.296,304) ; aucune page 'club' ni 'crew battle' n'existe — labels/badges (HOT/LIVE) mensongers.
- INTITULÉS DIVERGENTS pour la même destination /teen/circles : sidebar='Circles', bottom-nav='Crew', quick-access='Clubs' + 'Crew Battle', titre de page='Tes crews', sous-section='Cercles de discussion'.
- ÉCRANS ORPHELINS riches mais inaccessibles : /teen/feed, /teen/social, /teen/activity, /teen/messages, /teen/create, /teen/quests/friend-defis ne sont exposés par AUCUNE nav principale (vérifié : sidebar n'a ni Feed ni Social ni Messages ni Activity).
- /teen/social est un hub de navigation… non navigable (orphelin) qui ne fait que ré-router vers circles/friends/leaderboard/map déjà accessibles — couche d'indirection morte.
- DRIFT SCHÉMA : /teen/messages lit teens.first_name/last_name (messages/page.tsx l.38) alors que le champ réel est teens.pseudo (MEMORY schema-drift) → risque de 'Ami' générique partout.

**Redondances / doublons :**

- `app/teen/circles/page.tsx` = `app/teen/crews/page.tsx` = `app/gamification/crews/page.tsx` — Trois routes pour le concept crew ; /teen/crews et /gamification/crews ne sont que des 308 vers /teen/circles. Convergence routing OK mais l'UI garde les trois mots.
- `app/teen/social/page.tsx` = `app/teen/circles/page.tsx` = `app/teen/friends/page.tsx` = `app/teen/leaderboard/page.tsx` = `app/teen/map/page.tsx` — Les 4 onglets de /teen/social (Crew/Amis/Classement/Carte) dupliquent 4 écrans dédiés et y renvoient par Link. /teen/social est une 5e surface redondante qui n'ajoute rien.
- `app/teen/friends/page.tsx` = `app/teen/social/page.tsx` — Deux écrans 'amis' consommant /api/teen/friends : le hub friends dédié et l'onglet FriendsTab de social-hub-client.tsx.
- `app/teen/messages/page.tsx` = `app/teen/circles/[circleId]/page.tsx` — Deux messageries séparées (DM direct_conversations vs chat de cercle circle_messages) sans inbox unifiée ni passerelle.
- `app/teen/activity/page.tsx` = `app/teen/feed/page.tsx` = `app/teen/streak/page.tsx` — Plusieurs surfaces 'flux/historique' (activité perso, feed créateurs, streak) qui se chevauchent conceptuellement sans hiérarchie claire.
- `app/gamification/collections/page.tsx` = `app/teen/profile/page.tsx` — 'Collections' (achievements) supprimé et redirigé vers profile?tab=achievements — vestige d'un 4e vocabulaire social/achievement.

**Devise / terminologie :**

- CLUB / CIRCLE / CREW / CERCLE / COLLECTION : au moins 5 termes pour ~2 concepts réels. 'club' n'existe nulle part dans le code (juste un label quick-access). 'crew' = backend gamification (crews/crew_members). 'circle'/'cercle de discussion' = backend messagerie (circles/circle_members). 'collection' = ancien terme achievements, sunset. Recommandation : choisir UN mot exposé à l'utilisateur (ex. 'Crew') et garder l'autre backend invisible ou renommé clairement (ex. 'Discussions').
- DÉFI / QUÊTE / MISSION / BATTLE : friend_challenges = 'défis entre amis' (/teen/quests/friend-defis) ; 'Crew Battle' annoncé en quick-access mais inexistant ; 'Quêtes' (/teen/quests) ; 'missions' n'existe que côté gamification. La carte quick-access 'Quêtes' décrit 'Missions quotidiennes et défis' — trois mots dans une seule description.
- XP COMME ENJEU PARIABLE : friend-defis débite un stake_xp à la création et verse le xp_pot au gagnant (friend-defis/page.tsx l.63-65, RPC create_friend_challenge_v2). À arbitrer vis-à-vis du principe 'XP = mérite, ne se monnaie pas' : ici l'XP est misé/transféré entre joueurs, ce qui s'apparente à de la transaction d'XP.
- XP attribué par post de feed (feed/[id]/page.tsx l.133, xp_earned) : cohérent avec XP=mérite, mais aucune explication UX de la règle d'attribution.
- Aucune trace de coins/DH dans ce cluster social : la double devise n'est ni utilisée ni mentionnée ici (cohérent — le social ne doit pas s'acheter), mais les badges 'HOT/LIVE/NEW' sur les cartes Clubs/Crew Battle créent une fausse promesse de contenu premium.
- Marque obsolète : share/page.tsx génère des fichiers 'teensparty-share-*.png' (l.205) au lieu de 'Nivy' — résidu d'un ancien nom de produit.

**Recommandations prioritaires :**

1. 1. RÉPARER LE PARCOURS CREW CASSÉ (P0) : aligner les routes. Soit unifier crews et circles sur un seul backend, soit faire pointer le détail crew vers un vrai écran crew. Aujourd'hui CirclesPageClient route vers /teen/circles/{crewId} alors que [circleId]/page.tsx vérifie circle_members → redirect en boucle (circles-client.tsx l.92,277 vs [circleId]/page.tsx l.24-33).
2. 2. RENDRE LA BOTTOM-NAV GLOBALE SUR MOBILE (P0) : déplacer <MobileBottomNav /> de teen-dashboard-content.tsx (l.238) vers app/teen/layout.tsx, comme la sidebar desktop. Sinon tous les écrans hors dashboard (feed, circles, messages, friends, create) n'ont aucune navigation sur mobile.
3. 3. UNIFIER LA TERMINOLOGIE ET DÉ-ORPHELINISER (P1) : choisir un seul mot exposé (ex. 'Crew') et corriger sidebar/bottom-nav/quick-access pour qu'ils soient cohérents ; supprimer la carte quick-access dupliquée (Clubs ET Crew Battle → 1 seule, ou pointer 'Crew Battle' vers friend-defis qui est la vraie feature de défi).
4. 4. SUPPRIMER OU FUSIONNER /teen/social (P1) : c'est un hub orphelin qui ne fait que dupliquer circles/friends/leaderboard/map. Soit en faire le VRAI hub social exposé en nav (et retirer les écrans redondants), soit le supprimer et garder les écrans dédiés. Idem pour l'écran amis dupliqué.
5. 5. CÂBLER OU RETIRER LE MOCK DE /teen/share (P2) : shareableItems=[] avec TODO(data) (share/page.tsx l.57-61) rend la section principale toujours vide ; brancher /api/teen/achievements+streak ou retirer la section. Corriger aussi le nom de fichier 'teensparty' → 'nivy' (l.205).

---

### 1.5 Événements & Anniversaire (réservation, anniv_orders)

> Le domaine est fonctionnel mais incohérent. La réservation d'événement marche réellement (events → /agenda → /reservation → /api/bookings/create → bookings + booking_tickets + approbation parentale parental_approvals → check-in partenaire), mais l'écran /teen/events est une simple LISTE en lecture seule qui ne déclenche aucune réservation et renvoie vers /agenda. L'anniversaire est une VRAIE commande (anniv_orders) mais cohabite via DEUX parcours redondants et divergents : /anniversaires (configurateur 6 étapes, paiement DH, parent → anniv_orders) et /anniversaires/organiser (ado → demande de budget → approbation parent). /teen/birthday n'est qu'une landing statique orpheline vers /anniversaires. La création anniv a été recâblée sur le schéma lean réel (couche d'adaptation dans features/anniversaires), mais conserve des bugs résiduels de drift (organiser/actions.ts dépend de parent_teen_links.status, getMyAnnivOrders/getAnnivOrderById = code mort qui sélectionne des colonnes inexistantes).

**Note UX moyenne du cluster : 5.4 / 10**

| Écran | But | État | UX | Nav |
|---|---|---|---|---|
| `app/teen/events/page.tsx (+ events-client.tsx)` | Lister les événements à venir avec le statut d'inscription de l'ado et filtres (Tous/Confirmés/En attente/Recommandés). | 🟢 réel | 6 | sidebar |
| `app/teen/birthday/page.tsx` | Landing 'Organise ton anniversaire' côté ado : entrée marketing vers le configurateur /anniversaires. | ⚪ stub/TODO | 5 | ORPHELIN |
| `app/anniversaires/page.tsx (+ features/anniversaires/actions.ts)` | Configurateur anniversaire 6 étapes (date/invités, formule, extras, infos, récap, confirmation) créant une commande anniv_orders réelle, côté parent. | 🟡 partiel/mock | 6 | lien in-page |
| `app/anniversaires/organiser/page.tsx (+ organiser/actions.ts)` | Parcours ALTERNATIF côté ado : choisir un pack (3 packs en dur), une date, et envoyer une demande de budget au parent via approbation parentale. | 🟡 partiel/mock | 5 | ORPHELIN |
| `app/partner/anniversaires/page.tsx` | File des commandes anniversaire reçues par le partenaire (résolues via anniv_packs.partner_id -> anniv_orders). | 🟢 réel | 7 | sidebar |

<details><summary>Problèmes détaillés par écran (5)</summary>

**`app/teen/events/page.tsx (+ events-client.tsx)`**

- Données réelles via getTeenDashboardData({eventsLimit:50}) -> table events + bookings (lib/server/teen-dashboard.ts:255-318), correctement câblées.
- CONTRADICTION parcours : l'écran est en LECTURE SEULE. Aucune carte n'est cliquable, aucun CTA 'réserver' par event. La réservation réelle vit ailleurs (/agenda -> /reservation). L'utilisateur voit ses events mais ne peut RIEN faire ici (pas de lien vers le détail/RSVP par event).
- Le seul CTA pousse vers /agenda ('Explorer l'agenda', 'Agenda public') — l'écran /teen/events fait doublon avec /agenda sans valeur ajoutée actionnable.
- TODO assumé en commentaire (page.tsx:7) : pas de page détail /teen/events/[id] ; le signal 'view' est émis par impression de liste, pas par visite réelle de détail.
- events-client.tsx:11 typé `initialEvents: any[]` (perte de typage sur tout l'écran).

**`app/teen/birthday/page.tsx`**

- ORPHELIN : aucune navigation (sidebar, mobile-nav, quick-access, header) ne pointe vers /teen/birthday. Grep confirme zéro lien entrant dans app/ et components/. Atteignable seulement en deep-link.
- Page 100% statique : 1 CTA + 2 cartes 'Lieux partenaires' / 'Packs clé en main' qui pointent TOUTES vers /anniversaires. Aucune donnée, aucun aperçu de pack/prix réel.
- Surface sombre night codée en dur (DarkSurface) — OK charte, mais redondance documentée avec d'autres écrans (docs/refonte/_v2-issues/F2.md).
- Texte 'paie en coins' (page.tsx:30) : INCOHÉRENCE DEVISE — le flow /anniversaires facture en DH, pas en coins. La mémoire interdit la conversion XP/coins ; ici on promet coins alors que la réservation est en DH.

**`app/anniversaires/page.tsx (+ features/anniversaires/actions.ts)`**

- Commande RÉELLE : createAnnivOrder (actions.ts:288) insère dans anniv_orders avec mapping lean (parent_id, teen_id, pack_id, party_date, guest_count, total_dh, notes, status). Packs/extras lus depuis anniv_packs/anniv_extras réels.
- DRIFT/MOCK RÉSIDUEL : ligne récap '150 DH par invité supplémentaire' codée en dur (page.tsx:653) alors que calculateAnnivPrice (actions.ts:245) force extraGuestsPrice=0 (le schéma lean n'a pas de tarif progressif). Le récap affiche un coût d'invités supp. qui n'est JAMAIS facturé.
- L'écran de confirmation (étape 6) affiche orderCreated.party_date / total_price / payment_status / qr_code. Or l'INSERT renvoie le row lean : pas de payment_status (affiche '—'/undefined) ; total_price n'existe pas (la colonne est total_dh) -> 'Total' probablement vide. qr_code est généré en mémoire (non persisté) mais bien renvoyé.
- C'est un parcours PARENT (parent_id = user.id en dur, actions.ts:336) déclenché depuis un écran ado (/teen/birthday). Incohérence de rôle : un ado authentifié qui lance /anniversaires créerait une commande avec parent_id = son propre id.
- Étape 4 collecte childAge mais le champ n'est jamais envoyé (handlePayment:150). guest_names/theme/venue de la spec riche sont perdus (réduits au champ notes).
- CTA final 'Paiement sécurisé par carte bancaire ou virement' (page.tsx:688) mais aucun paiement réel n'est déclenché : la commande naît en status 'pending' sans passer par /reservation/paiement ni CMI. Promesse de paiement non tenue.
- Email de confirmation (sendBirthdayConfirmation) envoyé sur profiles.email — dépend d'une colonne email réelle sur profiles (présente d'après la mémoire).

**`app/anniversaires/organiser/page.tsx (+ organiser/actions.ts)`**

- PACKS EN DUR (page.tsx:14-39) : starter 3500/plus 5500/vip 12000 DH, slugs 'starter'/'plus'/'vip-premium'. Ces slugs sont ensuite cherchés en BDD (organiser/actions.ts:44 .eq('slug', packSlug)) — si anniv_packs n'a pas ces slugs, 'Invalid pack selected' -> erreur garantie. Prix UI ≠ prix BDD (double source).
- BUG schéma : actions.ts:30-35 lit parent_teen_links avec .eq('status','active').single(). La définition migration (all_migrations.sql:12) ne déclare PAS de colonne status ; usage incohérent avec le reste du code. Si pas de lien actif -> throw 'No active parent relationship'. Fragile.
- Crée anniv_orders (lean) + parental_approvals (action_type:'booking', details.type='birthday'). Mais d'après schema-drift, /api/parent/approvals ne dispatche PAS le type birthday -> le parent voit la demande (parental-approval-list.tsx:98 gère isBirthday) mais l'APPROBATION échoue (pas de RPC birthday). Parcours cassé à l'étape parent.
- ORPHELIN : aucun lien entrant trouvé vers /anniversaires/organiser (ni /teen/birthday ni sidebar n'y mènent ; les deux CTAs de /teen/birthday vont vers /anniversaires, pas /organiser).
- REDONDANT avec /anniversaires : deux configurateurs anniv concurrents avec des modèles de packs et des logiques de prix différents.

**`app/partner/anniversaires/page.tsx`**

- Lecture réelle alignée au schéma lean (V3 #196) : packs du partenaire -> anniv_orders (party_date, guest_count, total_dh, status). Pas de mock.
- Vue PASSIVE : le partenaire voit les commandes mais ne peut pas les confirmer/refuser ici (pas d'action). Le check-in d'anniversaire n'est pas relié (le QR ANNIV-<id> de /anniversaires n'est ni persisté ni reconnu par /api/check-in/*, qui ne gère que booking_reference/booking_tickets).
- STATUS_LABEL inclut 'completed' mais le flow ne passe jamais une commande à 'completed' (aucune transition de statut câblée côté partenaire/admin sur anniv_orders ici).

</details>

**Incohérences internes :**

- Parcours événement INCOHÉRENT : /teen/events (sidebar) est une liste morte sans action de réservation ; la réservation réelle vit sur /agenda + /agenda/[id] -> /reservation -> /api/bookings/create. L'utilisateur arrivant par la sidebar ne peut pas réserver et doit deviner d'aller sur /agenda.
- Deux parcours anniversaire concurrents et divergents : /anniversaires (parent, 6 étapes, anniv_orders direct, prétend payer par CB) vs /anniversaires/organiser (ado, demande budget -> approbation parentale). Modèles de packs différents (BDD vs 3 packs en dur), logiques de prix différentes, aucun ne référence l'autre.
- Approbation parentale d'un anniversaire CASSÉE en bout de chaîne : organiser/actions.ts crée une parental_approvals(details.type='birthday') mais /api/parent/approvals ne dispatche pas le type birthday (cf. schema-drift) -> le parent ne peut pas réellement approuver.
- Confirmation /anniversaires lit des colonnes inexistantes sur le row retourné (total_price, payment_status) -> champs vides/incohérents à l'écran de succès (page.tsx:734-747).
- Le QR d'anniversaire (ANNIV-<id>) est généré mais non persisté ; le check-in partenaire (/api/check-in/*) ne sait lire que les bookings d'événement (booking_reference/booking_tickets). Un anniversaire réservé n'a aucun chemin de check-in -> parcours réservation->check-in cassé pour l'anniv.
- Code mort trompeur : getMyAnnivOrders / getAnnivOrderById (actions.ts:450-524) sélectionnent des colonnes/relations riches inexistantes (celebration_date, order_type, event_id, venue_id, anniv_order_extras.unit_price/total_price) ; non câblées mais prêtes à planter si réutilisées.
- Rôle ambigu : /anniversaires force parent_id = user.id. Promu depuis /teen/birthday (écran ado), un ado y créerait une commande avec lui-même comme parent.

**Redondances / doublons :**

- `app/teen/events/page.tsx` = `app/agenda/page.tsx` = `app/agenda/[id]/page.tsx` — /teen/events double l'agenda public sans action : c'est /agenda + /agenda/[id] qui portent la réservation réelle. /teen/events n'ajoute qu'un compteur et des filtres de statut, puis renvoie vers /agenda.
- `app/anniversaires/page.tsx` = `app/anniversaires/organiser/page.tsx` — Deux configurateurs d'anniversaire concurrents. /anniversaires = parent, paiement DH, anniv_orders direct. /organiser = ado -> approbation parentale. Packs et prix divergents, aucun lien entre eux.
- `app/teen/birthday/page.tsx` = `app/anniversaires/page.tsx` — /teen/birthday n'est qu'une vitrine statique vers /anniversaires (3 liens identiques). Aucune valeur propre ; orpheline de surcroît.

**Devise / terminologie :**

- DEVISE : /teen/birthday promet 'paie en coins' (page.tsx:30) alors que tout le flow /anniversaires et /organiser facture en DH (base_price/price_dh, total_dh). Contradiction directe avec la règle 'coins/DH' vs 'XP'. À corriger : l'anniversaire est un achat en DH, jamais en coins ni XP.
- Aucune mention de XP dans le domaine anniversaire — cohérent (l'anniv est un achat, pas un mérite).
- TERMINOLOGIE événement : 'event' (anglais) dans toute l'UI teen (/teen/events, 'Tes prochains events', 'Ton crew sort') vs 'événement'/'agenda' ailleurs (/agenda, /admin/evenements, parent). Mélange FR/EN non harmonisé.
- TERMINOLOGIE booking : 'réservation' (FR, /reservation, partner) vs 'booking'/'bookings' (table, /api/bookings) vs 'commande' (anniv_orders). Trois mots pour des objets proches.
- anniv_orders.status (pending/confirmed/cancelled/completed) double parental_approvals.status (pending) : deux machines à états pour un même anniversaire, non synchronisées.

**Recommandations prioritaires :**

1. 1. UNIFIER le parcours anniversaire : choisir UNE seule entrée. Supprimer /anniversaires/organiser OU /anniversaires (recommandé : garder /organiser ado->approbation parent, qui respecte le modèle de consentement, et y intégrer les packs réels de la BDD au lieu des 3 packs en dur). Faire pointer /teen/birthday vers ce parcours unique.
2. 2. RÉPARER la fin de chaîne anniversaire : (a) câbler le dispatch 'birthday' dans /api/parent/approvals pour que le parent puisse approuver ; (b) corriger l'écran de confirmation /anniversaires (lire total_dh, retirer payment_status fantôme et la ligne '+150 DH/invité' jamais facturée) ; (c) décider du check-in anniv (persister un code reconnu par /api/check-in/* ou retirer la promesse de QR).
3. 3. RENDRE /teen/events ACTIONNABLE ou le fusionner avec /agenda : ajouter une page détail /teen/events/[id] + CTA réserver par event, ou rediriger /teen/events vers /agenda et supprimer le doublon. Aujourd'hui l'entrée sidebar 'Events' mène à un cul-de-sac en lecture seule.
4. 4. CORRIGER la devise sur /teen/birthday : remplacer 'paie en coins' par 'paie en DH' (page.tsx:30) — l'anniversaire est un achat DH, jamais coins/XP, conformément à la règle de double devise.
5. 5. NETTOYER le code mort de features/anniversaires : getMyAnnivOrders/getAnnivOrderById/cancelAnnivOrder/updateAnnivPaymentStatus sélectionnent des colonnes inexistantes (celebration_date, order_type, payment_status, unit_price...) ; les aligner sur le schéma lean ou les supprimer pour éviter une régression silencieuse à la prochaine réutilisation.

---

### 1.6 Transport (rides) & Nourriture (food)

> Contrairement à beaucoup d'écrans Nivy, rides ET food sont des features RÉELLES, pas des stubs : les deux pages de formulaire POSTent vers de vraies routes API qui appellent des RPC SECURITY DEFINER substantielles (request_ride en 060b, place_food_order en 058) avec débit coins, approbation parentale, garde couvre-feu (22h-5h), gating halal/calories/budget, cashback XP 10%, et même un parcours partenaire (accept/reject + refund). Des scripts de vérification end-to-end existent (scripts/verify-transport.ts, scripts/verify-food.ts). MAIS : (1) découvrabilité = zéro — aucun des deux n'apparaît dans la sidebar, la mobile-nav ou le quick-access ; le layout teen lui-même (commentaire lignes 57-63) les qualifie de « Wave 3 stubs ». (2) Bug de câblage : l'adresse de livraison food n'est jamais persistée (le client envoie deliveryAddress, la route lit body.address). Verdict : moteur back-end solide, vitrine front-end orpheline et partiellement mal branchée. Paiement = coins/DH (XP jamais accepté, conforme à la charte) ; approbation parentale = bien implémentée côté DB.

**Note UX moyenne du cluster : 5.4 / 10**

| Écran | But | État | UX | Nav |
|---|---|---|---|---|
| `app/teen/rides/page.tsx` | Hub des trajets du teen : liste « À venir » et « Historique » de ride_bookings, avec statut FR, fournisseur, mode de paiement et coût en DH ; CTA vers la demande de trajet. | 🟢 réel | 6 | ORPHELIN |
| `app/teen/rides/request/page.tsx` | Page serveur d'enrobage : en-tête éditorial « Réserve ton trajet », coach Niv expliquant la validation parentale, puis montage du formulaire client RequestRideForm (passe eventId depuis searchParams). | 🟢 réel | 7 | lien in-page |
| `app/teen/rides/request/request-form.tsx` | Formulaire react-hook-form + zod : pickup, dropoff, date/heure, coût estimé DH, méthode de paiement (coins/dh/split_with_parent) ; POST /api/teen/rides/request puis redirige vers /teen/rides. | 🟢 réel | 6 | lien in-page |
| `app/teen/food/page.tsx` | Découverte food : liste des partenaires actifs dont sub_category ∈ restaurant/cafe/bakery/fast_food/catering/grocery, filtres catégorie + tag nutrition + halal, cartes vers le menu du restaurant. | 🟢 réel | 6 | ORPHELIN |
| `app/teen/food/[partner_id]/page.tsx` | Page serveur du menu d'un restaurant : charge partner + menu_items actifs (prix DH + coins, calories, tags, halal, allergènes) et monte MenuCartClient ; supporte la transition View Transitions vt-restaurant. | 🟢 réel | 7 | lien in-page |
| `app/teen/food/[partner_id]/menu-cart-client.tsx` | Panier client + checkout : ajout/retrait d'articles avec juice, total en coins, formulaire (type pickup/delivery, adresse si livraison, notes, paiement coins/dh) ; POST /api/teen/food/order de façon optimiste avec rollback. | 🟢 réel | 5 | lien in-page |
| `app/teen/food/order/[id]/page.tsx` | Suivi de commande food : timeline 6 statuts (pending→delivered) via SegmentedProgress, liste des articles, total coins + équivalent DH, cashback XP, mention « en attente d'approbation parent », confetti à la livraison. | 🟢 réel | 6 | deep-link |

<details><summary>Problèmes détaillés par écran (7)</summary>

**`app/teen/rides/page.tsx`**

- Aucune navigation ne pointe vers /teen/rides (absent de sidebar.tsx, mobile-nav.tsx, quick-access-grid.tsx) : page atteignable seulement en deep-link ; le layout teen la qualifie elle-même de « Wave 3 stub » (app/teen/layout.tsx lignes 57-63).
- RIDE_STATUS_CLS (lignes 27-35) n'a pas de clé 'requested' alors que request_ride (060b) crée la course avec status='requested' : le pill tombe sur le fallback gris/muted 'bg-muted text-mute', incohérent avec rideStatusLabel() qui, lui, gère 'requested'.
- Le coût n'est affiché qu'en DH (ligne 199 : actual_dh ?? estimated_dh) alors que le paiement par défaut est en coins (PAYMENT_LABELS affiche « Coins ⊙ ») : devise affichée ≠ devise de paiement, pas d'équivalent ⊙ comme côté food.
- Aucun moyen d'ouvrir le détail d'un trajet ni de l'annuler depuis cette liste, alors que l'API /api/teen/rides/[id]/cancel existe : RideRow est purement statique.

**`app/teen/rides/request/page.tsx`**

- Atteignable uniquement via le bouton « Nouveau trajet » de /teen/rides, elle-même orpheline : profondeur de deep-link x2, aucun point d'entrée en nav.
- Le message NivCoach mentionne « partagé avec le parent » pour le paiement, ce qui est cohérent avec l'option split_with_parent du formulaire — OK, mais aucune explication du couvre-feu 22h-5h qui rejettera la demande côté RPC (curfew_violation) sans warning préalable dans l'UI.

**`app/teen/rides/request/request-form.tsx`**

- Le champ date/heure (datetime-local) permet de saisir une heure dans la fenêtre couvre-feu 22h-5h ; la RPC request_ride (060b lignes 51-56) lève 'curfew_violation' mais l'UI n'affiche aucune contrainte avant soumission — l'erreur brute du RPC remonte telle quelle dans globalError.
- « Coût estimé (DH) » est saisi manuellement par l'ado sans aucune estimation calculée : friction et donnée peu fiable pour un mineur ; estimatedDh facultatif part en estimated_dh nul.
- Le formulaire propose paymentMethod en coins par défaut mais ne montre nulle part le solde de coins disponible : l'ado peut demander un trajet qu'il ne pourra pas payer (le débit n'a lieu qu'au complete_ride).

**`app/teen/food/page.tsx`**

- Aucune navigation ne pointe vers /teen/food (absent de sidebar.tsx, mobile-nav.tsx, quick-access-grid.tsx) : orpheline, deep-link only ; layout teen la qualifie de « Wave 3 stub ».
- Utilise createServiceRoleClient() côté page serveur publique (lignes 56-67) pour lister les partenaires : contourne la RLS sans contrôle de rôle dans la page elle-même (la route GET /api/teen/food/restaurants existe pourtant en parallèle) — incohérence d'accès données et risque si la page est servie hors contexte teen.
- Les cartes affichent toutes « ⊙ accepte tes coins » en dur (ligne 218) sans vérifier qu'au moins un menu_item du partenaire a un price_coins : promesse non garantie.
- L'eyebrow « Food halal · payable en coins » et la description annoncent « Halal par défaut » mais la liste ne filtre PAS halal par défaut (filters.halal n'est vrai que si sp.halal==='true') : le copy contredit le comportement.

**`app/teen/food/[partner_id]/page.tsx`**

- createServiceRoleClient() en page serveur sans vérif de rôle (lignes 28-46) : même contournement RLS que la page de découverte.
- items typés `as any[]` (ligne 68) avec eslint-disable : perte de sûreté de type entre le serveur et MenuCartClient.
- Atteignable uniquement depuis /teen/food (orpheline), donc deep-link de profondeur x2.

**`app/teen/food/[partner_id]/menu-cart-client.tsx`**

- BUG DE CÂBLAGE : le client envoie `deliveryAddress` dans le body (ligne 154) mais la route /api/teen/food/order lit `body.address` (route.ts ligne 73) → l'adresse de livraison saisie par l'ado n'est JAMAIS transmise au RPC place_food_order, delivery_address persiste toujours NULL pour les commandes en livraison.
- Le formulaire n'offre que paymentMethod coins/dh, mais le RPC accepte aussi 'split' et le formulaire rides propose split_with_parent : incohérence d'options de paiement entre les deux features.
- Après une commande réussie, le banner n'affiche que « Commande #xxxxxxxx » en texte (lignes 415-418) sans lien vers /teen/food/order/[id] : le teen ne peut pas atteindre le suivi de commande, qui devient de facto un écran orphelin.
- Le total est affiché en coins (⊙) uniquement dans le panier alors que le paiement peut être en DH : pas d'équivalent DH affiché au moment du checkout (incohérent avec la page de suivi qui montre les deux).

**`app/teen/food/order/[id]/page.tsx`**

- createServiceRoleClient() sans aucun contrôle d'ownership (lignes 40-48) : n'importe quel utilisateur connaissant un id de commande peut lire la food_order d'un autre teen (adresse, articles, montants) — fuite de données via deep-link.
- Aucun lien entrant : ni menu-cart-client (qui n'affiche que le n° en texte) ni aucune nav ne pointe ici ; le teen ne peut pas retrouver ses commandes en cours (pas de page « Mes commandes food »).
- Pas de rafraîchissement temps réel ni de polling : la timeline est figée au render serveur, le teen doit recharger manuellement pour voir l'avancement.

</details>

**Incohérences internes :**

- Découvrabilité nulle : /teen/rides et /teen/food n'apparaissent dans AUCUNE nav (sidebar.tsx 15 entrées, mobile-nav.tsx 4 entrées, quick-access-grid.tsx 4 cartes — vérifié). Le PO veut « commander le transport » et « commander de la nourriture » mais aucun utilisateur ne peut découvrir ces écrans hors deep-link. Le layout teen (app/teen/layout.tsx lignes 57-63) les nomme explicitement « Wave 3 stubs ».
- Parcours food cassé en sortie : après commande, menu-cart-client.tsx (lignes 415-418) n'affiche que « Commande #xxxx » sans lien — la page de suivi /teen/food/order/[id] est inatteignable depuis l'app, et il n'existe aucune page « Mes commandes » listant les food_orders du teen (alors que /teen/rides existe pour les rides).
- Bug de contrat client/serveur food : deliveryAddress (client) vs body.address (route) → adresse de livraison perdue silencieusement (menu-cart-client.tsx ligne 154 vs route.ts ligne 73).
- Couvre-feu non signalé en amont : request_ride rejette 22h-5h (curfew_violation, 060b) mais le formulaire de demande de trajet n'affiche aucune contrainte ; l'ado reçoit l'erreur brute après soumission.
- Statut 'requested' non stylé : request_ride crée status='requested' mais RIDE_STATUS_CLS (rides/page.tsx) ne mappe pas cette clé → pill gris au lieu d'un état « en attente » visible.
- Accès données incohérent : les pages food utilisent createServiceRoleClient() (bypass RLS) en RSC sans contrôle d'ownership/rôle, tandis que des routes API parallèles (GET /api/teen/food/restaurants, /menu/[partner_id]) font le même travail proprement — double implémentation, et la page de suivi expose les commandes d'autrui par id.

**Redondances / doublons :**

- `app/teen/food/page.tsx` = `app/api/teen/food/restaurants/route.ts` — Double accès aux mêmes données partenaires/restaurants : la page RSC interroge partners directement via service-role, et une route GET dédiée fait la même découverte. L'une des deux est redondante.
- `app/teen/food/[partner_id]/page.tsx` = `app/api/teen/food/menu/[partner_id]/route.ts` — Le menu d'un partenaire est lu deux fois : par la page RSC (service-role) et par une route GET dédiée. Doublon de logique de chargement de menu_items.
- `app/teen/rides/page.tsx` = `app/api/teen/rides/route.ts` — La liste upcoming/history des trajets existe en RSC (rides/page.tsx) et en route GET /api/teen/rides : même requête ride_bookings + split upcoming/history dupliquée.

**Devise / terminologie :**

- XP n'est JAMAIS accepté comme paiement pour rides ni food (conforme charte) : les enums de paiement sont coins/dh/split(_with_parent). XP n'intervient que comme cashback (place_food_order : cashback_xp = 10% des coins), sans conversion coins↔XP — règle respectée.
- Affichage des devises incohérent : food affiche systématiquement coins (⊙) avec parfois l'équivalent DH (page de suivi), tandis que rides affiche UNIQUEMENT en DH (actual_dh/estimated_dh) — même domaine « commande », deux conventions d'affichage opposées.
- Options de paiement divergentes entre les deux features : le formulaire rides propose coins/dh/split_with_parent ; le formulaire food propose seulement coins/dh (le RPC place_food_order accepte pourtant 'split'). Terminologie du split aussi divergente : split_with_parent (rides) vs split (RPC food).
- Conversion 1 DH = 100 coins appliquée partout en fallback (price_coins ?? price_dh*100) : cohérent avec la charte, mais le checkout food affiche le total en coins sans rappeler l'équivalent DH même quand paymentMethod='dh'.
- Libellés fournisseurs/paiement présentés en FR via maps de présentation (PAYMENT_LABELS, PROVIDER_LABELS) plutôt que slugs DB bruts : bonne pratique, mais ces maps sont dupliquées dans rides/page.tsx au lieu d'être centralisées comme les status-labels.

**Recommandations prioritaires :**

1. P0 — Corriger le bug d'adresse de livraison food : aligner le contrat client/serveur (route.ts lit body.address mais menu-cart-client envoie deliveryAddress ; ajouter scheduledFor aussi). Sans ça, toute commande en livraison part avec delivery_address NULL.
2. P0 — Rendre les features découvrables : ajouter « Trajets » et « Food » à la sidebar teen (components/dashboard/teen/sidebar.tsx) ET à la mobile-nav (components/teen/dashboard/mobile-nav.tsx) ou au quick-access-grid. Aujourd'hui ces écrans réels sont 100% orphelins — le besoin PO (« commander transport/nourriture ») est techniquement livré mais inaccessible.
3. P0 — Sécuriser la lecture de commande : /teen/food/order/[id] utilise service-role sans vérifier l'ownership → fuite des commandes d'autrui par id. Ajouter un contrôle teen_id == session (et idem pour les pages food en service-role) ou passer par les routes API protégées.
4. P1 — Boucler le parcours food : faire pointer le banner de succès (menu-cart-client.tsx) vers /teen/food/order/[orderId], et créer une page « Mes commandes food » symétrique à /teen/rides pour que le suivi ne soit pas orphelin.
5. P1 — Cohérence devise & paiement : harmoniser l'affichage (montrer coins ET DH des deux côtés), aligner les options de paiement (split partout, même slug), mapper le statut 'requested' dans RIDE_STATUS_CLS, et signaler la fenêtre couvre-feu 22h-5h dans le formulaire de trajet avant soumission.

---

### 1.7 Défis & défi des parents (challenges / chores / défis-physiques / quests / gamification defis-missions)

> Le "défi des parents" proposé par le PO existe déjà, sous le nom de "corvées" : app/parent/chores/new crée des parent_chores ("Créer une mission" / "Nouvelle corvée"), que l'ado consulte à /teen/chores. C'est réel et câblé (lecture parent_chores + chore_targets, complétion + vérif parentale, double récompense DH+XP). Problème majeur : cet écran n'est dans AUCUNE navigation persistante — il n'est atteignable que via le nudge conditionnel de l'avatar-coach. À côté, il existe au moins 5 concepts "défi/quête/mission" vivants et redondants (chores, quests hub, friend-défis, défis-physiques, plus le détail quête) et 4 routes de redirection legacy (challenges, gamification/defis, gamification/defis-physiques, gamification/missions). La terminologie est incohérente (corvée=mission=défi=quête), et les friend-défis MISENT de l'XP en escrow, ce qui viole frontalement la règle de charte "XP = mérite, ne s'achète/se convertit jamais".

**Note UX moyenne du cluster : 5.1 / 10**

| Écran | But | État | UX | Nav |
|---|---|---|---|---|
| `app/teen/chores/page.tsx` | Le vrai « défi des parents » : liste les corvées (parent_chores) assignées à l'ado, avec récompense DH+XP et bouton de complétion. | 🟢 réel | 6 | ORPHELIN |
| `app/parent/chores/new/page.tsx` | Côté parent : créer le « défi des parents » (une corvée parent_chores avec récompense + fréquence) pour un teen lié. | 🟢 réel | 6 | lien in-page |
| `app/teen/defis-physiques/page.tsx` | Défis sportifs (physical_challenges) avec suivi de progression et validation ; pilier vitalité. | 🟢 réel | 7 | sidebar |
| `app/teen/quests/page.tsx` | Hub « quêtes » unifié : agrège quiz, défis physiques, tutoriels passion et events en une grille à onglets piliers + défis du jour. | 🟡 partiel/mock | 5 | quick-access |
| `app/teen/quests/[id]/page.tsx` | Détail d'une quête : tente `quests`, retombe sur `daily_challenges`/`challenges`, puis rend le client de détail. | 🟡 partiel/mock | 5 | lien in-page |
| `app/teen/quests/friend-defis/page.tsx` | Liste les défis entre amis (friend_challenges) où le teen est créateur ou adversaire, par statut (pending/active/completed). | 🟢 réel | 6 | lien in-page |
| `app/teen/quests/friend-defis/new/page.tsx` | Formulaire de création d'un défi entre amis : choisir un adversaire, un type, et une mise en XP. | 🟢 réel | 6 | lien in-page |
| `app/teen/challenges/page.tsx` | Redirection legacy : /teen/challenges → /teen/quests?tab=body (entonne vers l'onglet Corps du hub). | ↪️ redirect | 5 | deep-link |
| `app/gamification/defis/page.tsx` | Redirection legacy : /gamification/defis → /teen/quests/friend-defis. | ↪️ redirect | 5 | deep-link |
| `app/gamification/defis-physiques/page.tsx` | Redirection legacy : /gamification/defis-physiques → /teen/defis-physiques. | ↪️ redirect | 5 | deep-link |
| `app/gamification/missions/page.tsx` | Redirection legacy : /gamification/missions → /teen/quests (consolidation des trois surfaces de quêtes). | ↪️ redirect | 5 | deep-link |

<details><summary>Problèmes détaillés par écran (11)</summary>

**`app/teen/chores/page.tsx`**

- Aucune entrée de nav persistante : ni sidebar, ni mobile-nav, ni quick-access ne pointent vers /teen/chores. Seul accès = le nudge conditionnel de components/teen/avatar-coach.tsx (ligne 252) qui n'apparaît QUE s'il existe une corvée ouverte (getChoreNudge dans lib/server/unified-quest-engine.ts). C'est donc l'écran le plus important du « défi des parents » mais quasi introuvable.
- Le bouton « Retour » renvoie vers /teen en dur (ligne 70-73) au lieu d'une nav de domaine.
- Titre « Mes corvées » + sous-titre « Termine tes missions familiales » : mélange corvée/mission dans le même écran (page.tsx l.80-83).
- Layout artisanal py-32 max-w-3xl, pas la même charpente que le hub quests.

**`app/parent/chores/new/page.tsx`**

- Terminologie triple sur un seul écran : eyebrow « Créer une mission », titre « Nouvelle corvée », description « Définis la mission… » (l.38-44). Le PO parle de « défi des parents » — encore un 4e mot pour la même chose.
- C'est ici que vit réellement le concept « défi des parents » ; il faudrait décider d'un nom unique (corvée vs mission vs défi) et l'imposer côté parent ET côté teen.

**`app/teen/defis-physiques/page.tsx`**

- Données réelles (physical_challenges + teen_physical_challenge_progress) et la seule surface « défi » présente dans la sidebar (components/dashboard/teen/sidebar.tsx l.28).
- Redondance fonctionnelle : les mêmes physical_challenges sont aussi agrégés dans /teen/quests onglet « Corps » (lib/server/unified-quest-engine.ts l.59-78 + quests-hub-client.tsx l.109), donc l'ado voit les défis physiques à deux endroits avec deux UI différentes.
- Absent de la mobile-nav : sur mobile l'écran n'est atteignable par aucune nav (sidebar masquée md:flex).

**`app/teen/quests/page.tsx`**

- getUnifiedQuests (lib/server/unified-quest-engine.ts) lit de vraies tables MAIS renvoie un ordre ALÉATOIRE à chaque rendu : `return quests.sort(() => Math.random() - 0.5)` (l.119) — pas de hiérarchie ni de stabilité.
- L'XP des events est fabriquée en dur : `xp_reward: 500, // Fixed for events` (l.110).
- L'onglet « daily » fabrique des UnifiedQuest depuis dailyChallenges et, si vide, tombe sur `quests.slice(0,6)` (quests-hub-client.tsx l.94-105) : le contenu « du jour » est arbitraire.
- Plafonds en dur (quiz .limit(3), défis physiques .limit(2), passion .limit(2)) : le hub ne montre jamais l'ensemble réel.
- Atteignable seulement via quick-access carte « Quêtes » (quick-access-grid.tsx l.281-290) ; ni sidebar ni mobile-nav. Et la mobile-nav CACHE explicitement /teen/quests (mobile-nav.tsx l.164 hiddenPaths).

**`app/teen/quests/[id]/page.tsx`**

- Lookup fragile à deux tables avec `.single()` : un id provenant de getUnifiedQuests peut être un id de physical_challenges / educational_quizzes / event — qui n'existe NI dans `quests` NI dans `daily_challenges` → notFound(). Donc cliquer une carte du hub peut mener à un 404 (page.tsx l.74-76).
- Valeurs par défaut codées en dur quand les colonnes manquent : duration '10 min'/'15 min', difficulty 'medium', xp_reward 50, pillar 'vitality'/'intellect' (l.36-58).
- Le href des cartes est `/teen/quests/${quest.id}` (quests-hub-client.tsx l.208) sans tenir compte du type → incohérence d'identité de quête.

**`app/teen/quests/friend-defis/page.tsx`**

- Atteignable seulement via l'onglet « Défis amis » du hub quests qui fait un router.push (quests-hub-client.tsx l.47, l.84-88) — pas de lien direct stable, et caché de la mobile-nav (le hub /teen/quests est dans hiddenPaths).
- Modèle de devise problématique : ces défis reposent sur stake_xp / xp_pot / winner_id (page.tsx l.61-64) — l'XP est MISÉE puis transférée au gagnant. Voir currencyTerminologyNotes : viole « XP = mérite, ne s'achète/convertit jamais ».

**`app/teen/quests/friend-defis/new/page.tsx`**

- Texte explicite de pari : « Choisis bien ton enjeu : pas de remboursement après acceptation » (l.79-81) et « La mise est débitée à la création… le pot va au gagnant » (l.71-75). new-friend-defi-form.tsx confirme `xpStake`, débit immédiat + escrow (l.35,56,190-191).
- Transforme l'XP (monnaie de mérite non transférable) en jeton de pari peer-to-peer transférable — incohérence de fond avec la charte économique.
- Atteignable uniquement depuis la liste friend-defis (lien « Retour » l.59) → profondeur de nav élevée pour une feature mise en avant (« Défie ton crew »).

**`app/teen/challenges/page.tsx`**

- permanentRedirect 308 (l.9). Pur stub de compat ; n'apporte aucun écran. Le commentaire d'en-tête prétend filtrer pillar='vitality'||type='challenge', ce qui double les défis physiques déjà visibles dans /teen/defis-physiques (sidebar).

**`app/gamification/defis/page.tsx`**

- permanentRedirect (l.16), robots noindex. Ancien client friend-défi supprimé du disque (commentaire l.8-12). Aucun contenu propre.

**`app/gamification/defis-physiques/page.tsx`**

- permanentRedirect 308 + robots noindex (#184, l.1-11). Doublon historique de la page canonique défis physiques.

**`app/gamification/missions/page.tsx`**

- permanentRedirect (l.10). missions-client.tsx « gardé sur disque pour l'historique git mais plus câblé » (l.6) = code mort. Confirme qu'il existait une 3e surface « missions » désormais fusionnée dans quests.

</details>

**Incohérences internes :**

- « Défi des parents » = corvées (parent_chores). Le PO devrait être informé que la feature EXISTE déjà : création parent à app/parent/chores/new, consommation teen à /teen/chores. Pas besoin d'un nouveau concept ; il faut surtout la rendre découvrable.
- Parcours cassé majeur : /teen/chores n'est dans aucune nav persistante (sidebar 15 entrées sans Corvées ; mobile-nav 4 entrées ; quick-access 4 cartes). Accès unique = nudge conditionnel de l'avatar-coach (avatar-coach.tsx l.252) qui ne s'affiche que s'il y a une corvée ouverte. Si zéro corvée ouverte, l'ado ne peut PAS découvrir la feature.
- Parcours cassé : le hub /teen/quests est explicitement masqué de la mobile-nav (mobile-nav.tsx l.164 hiddenPaths=['/teen/chat','/teen/quests']). Sur mobile, la principale surface « quêtes/défis » n'est donc atteignable que via la carte quick-access du dashboard — fragile.
- Parcours potentiellement 404 : les cartes du hub pointent vers /teen/quests/[id] mais le détail ne sait lire que `quests` et `daily_challenges` ; les quêtes agrégées depuis physical_challenges/educational_quizzes/passion_tutorials/events n'y existent pas → notFound (quest/[id]/page.tsx l.21-45,74).
- Double surface pour les défis physiques : /teen/defis-physiques (sidebar, page réelle) ET /teen/quests onglet Corps (même table physical_challenges, UI DefiCard différente). L'ado voit le même défi sous deux libellés.
- Quick-access : la carte « Crew Battle » et la carte « Clubs » pointent toutes deux vers /teen/circles (quick-access-grid.tsx l.296,307) — 2 cartes/4 mènent à la même URL ; « Crew Battle » n'a pas de surface dédiée.
- Incohérence statuts : UnifiedQuest fixe status:'available' en dur pour quiz/défis/passion (unified-quest-engine.ts l.51,72,93) ; la progression réelle (teen_physical_challenge_progress, daily_challenges.status) n'est pas reflétée dans le hub → l'ado voit « Commencer » sur des défis déjà commencés/terminés.
- L'ordre aléatoire du hub (Math.random, l.119) casse toute mémoire de position : à chaque navigation/refresh la grille se réorganise.

**Redondances / doublons :**

- `app/teen/quests/page.tsx` = `app/teen/defis-physiques/page.tsx` — Les physical_challenges sont rendus dans les DEUX : page dédiée défis-physiques (sidebar) + onglet Corps du hub quests (unified-quest-engine.ts l.59-78). Deux UI, une seule source de données.
- `app/teen/challenges/page.tsx` = `app/teen/defis-physiques/page.tsx` = `app/teen/quests/page.tsx` — /teen/challenges redirige vers /teen/quests?tab=body, qui re-filtre les défis physiques déjà servis par /teen/defis-physiques. Trois chemins pour le même contenu « challenge corps ».
- `app/gamification/defis/page.tsx` = `app/teen/quests/friend-defis/page.tsx` — gamification/defis = simple redirect vers la surface canonique friend-defis. Doublon historique, client legacy supprimé.
- `app/gamification/defis-physiques/page.tsx` = `app/teen/defis-physiques/page.tsx` — gamification/defis-physiques = redirect 308 vers teen/defis-physiques. Doublon de route.
- `app/gamification/missions/page.tsx` = `app/teen/quests/page.tsx` — gamification/missions = redirect vers teen/quests ; missions-client.tsx laissé mort sur disque. Confirme qu'une 3e surface « missions » a été fusionnée dans le hub quests.
- `app/teen/chores/page.tsx` = `app/parent/chores/new/page.tsx` — Concept unique « corvée/mission/défi des parents » réparti sur deux côtés avec un vocabulaire divergent ; pas un doublon d'écran mais un doublon de NOMMAGE qui fragmente le mental model.

**Devise / terminologie :**

- VIOLATION DE CHARTE (XP) : les défis entre amis MISENT de l'XP. new-friend-defi-form.tsx utilise xpStake, débité immédiatement en escrow (l.35,56,190), et friend-defis/page.tsx lit stake_xp/xp_pot/winner_id (l.61-63). Le pot d'XP est transféré au gagnant. Or la règle est « XP = mérite, ne s'achète JAMAIS, ne se convertit JAMAIS ». Ici l'XP devient un jeton de pari transférable entre joueurs — à arbitrer d'urgence (faut-il parier des coins/DH à la place, ou supprimer la mise ?).
- Corvées = double devise correcte : reward_dh (coins/DH) + reward_xp affichés côte à côte (chores-list.tsx l.71-76, avatar-coach.tsx l.245-247). Cohérent avec la charte ; bon modèle de référence.
- Terminologie « défi/quête/mission » totalement non normalisée : un même objet est appelé « corvée » + « mission » + « tâche » (/teen/chores titre l.80 + sous-titre l.82 + avatar-coach « Tâche à finir »), « mission » + « corvée » + « défi des parents » côté parent (chores/new l.38-44), « quête » + « défi » dans le hub (quests-hub-client eyebrow « Ton crew · Défis » + h1 « Tes quêtes », l.129-132). PILLAR_CONFIG mélange aussi « Défis cerveau »/« Quêtes créa » (l.52-73).
- « crew » vs « club » vs « circle » : quick-access a une carte « Clubs » ET « Crew Battle » pointant toutes deux vers /teen/circles ; le hub quests parle de « Ton crew » et « Défie ton crew ». Trois mots pour la même primitive sociale.
- Le QuickActionCard « Défie un ami » du hub pointe vers /teen/social?tab=crew (quests-hub-client.tsx l.234) alors que la vraie création de défi ami est /teen/quests/friend-defis/new — lien probablement faux/incohérent.

**Recommandations prioritaires :**

1. 1. Répondre au PO : ne pas créer de nouveau concept. Le « défi des parents » = corvées, déjà réel (app/parent/chores/new → /teen/chores). Action prioritaire : rendre /teen/chores DÉCOUVRABLE — ajouter une entrée dédiée dans la sidebar ET la mobile-nav (aujourd'hui 0 nav persistante, accessible seulement via un nudge conditionnel).
2. 2. Trancher la terminologie une fois pour toutes (1 mot par concept) : ex. « Corvées » (défi des parents, DH+XP) / « Quêtes » (contenu app: quiz/passion/physique) / « Défis amis » (P2P). Renommer côté parent ET teen pour aligner chores/new (« mission/corvée/défi ») et le hub (« quête/défi »).
3. 3. Arbitrer la mise d'XP des friend-défis : c'est une violation directe de la règle « XP ne s'achète/convertit/transfère jamais ». Décider : (a) miser des coins/DH à la place, ou (b) défi sans enjeu transférable (XP gagnée par mérite individuel). Bloquant compliance économique.
4. 4. Stabiliser et fiabiliser le hub /teen/quests : supprimer le sort aléatoire (unified-quest-engine.ts l.119), refléter le vrai statut (pas tout 'available' en dur), retirer l'XP event fixée à 500, et corriger /teen/quests/[id] qui 404 sur les ids agrégés (physical/quiz/passion/event absents des tables quests/daily_challenges).
5. 5. Résorber les doublons : choisir UNE surface pour les défis physiques (page dédiée OU onglet hub, pas les deux), corriger la carte quick-access « Crew Battle » qui duplique « Clubs » (même URL /teen/circles), et garder les 4 redirections gamification/* uniquement le temps des bookmarks puis les retirer.

---

### 1.8 Éducation & parcours (aide scolaire, academic, passions, pathways, mentors, sessions, stages)

> Le domaine éducation est globalement REEL et bien câblé : aide-scolaire, grades, tutors, pathways, mentors, mentor-sessions et internships interrogent tous de vraies tables Supabase (teen_grades migr.022 ; mentors/mentor_sessions/career_pathways/teen_pathway_progress/internships migr.059). Les career_pathways sont seedées (5 parcours), mentors et internships dépendent d'un onboarding réel d'où des états vides honnêtes (NivEmpty). Le gros problème n'est PAS le mock mais la découvrabilité et la cohérence : la sidebar n'expose que aide-scolaire et passions (qui n'est qu'un redirect vers quests) ; pathways, mentors, mentor-sessions et internships sont des orphelins atteignables seulement par deep-link ou liens in-page entre eux. La bottom-nav mobile (4 entrées) n'est rendue QUE sur /teen et n'apparaît pas sur les pages éducation. Terminologie « parcours » surchargée (pathways carrière vs passions vs quests). academic et gamification/aide-scolaire & gamification/parcours sont des redirects de dédoublonnage corrects.

**Note UX moyenne du cluster : 6 / 10**

| Écran | But | État | UX | Nav |
|---|---|---|---|---|
| `app/teen/aide-scolaire/page.tsx` | Hub aide scolaire : XP total, hub vers notes/tuteurs, grille des matières avec moyennes calculées à partir des notes approuvées. | 🟢 réel | 7 | sidebar |
| `app/teen/academic/page.tsx` | Ancien doublon d'aide-scolaire, désormais simple redirect vers /teen/aide-scolaire. | ↪️ redirect | 6 | ORPHELIN |
| `app/teen/aide-scolaire/tutors/page.tsx` | Annuaire des centres/profs partenaires (partners.partner_type='education', status='active'). | 🟢 réel | 6 | lien in-page |
| `app/teen/aide-scolaire/grades/page.tsx` | Liste des notes de l'ado avec moyenne /20, XP gagné, statut de validation. | 🟢 réel | 7 | lien in-page |
| `app/teen/passions/page.tsx` | Entrée sidebar 'Parcours Passion' — en réalité un redirect vers /teen/quests?tab=creative. | ↪️ redirect | 4 | sidebar |
| `app/teen/pathways/page.tsx` | Hub d'orientation carrière : catalogue de career_pathways + progression déclarée (teen_pathway_progress), liens vers mentors et stages par tag. | 🟢 réel | 7 | deep-link |
| `app/teen/mentors/page.tsx` | Découverte de mentors actifs+KYC approuvés, filtres par domaine/âge/note, vers la fiche mentor. | 🟢 réel | 7 | deep-link |
| `app/teen/mentors/[id]/page.tsx` | Fiche mentor + bio + réassurance sécurité (NivCoach) + CTA réservation de session (RPC book_mentor_session). | 🟢 réel | 8 | lien in-page |
| `app/teen/mentor-sessions/page.tsx` | Mes RDV mentor : à venir / historique, statut d'approbation parentale, montant (coins et/ou DH). | 🟢 réel | 7 | deep-link |
| `app/teen/internships/page.tsx` | Catalogue de stages partenaires ouverts, filtres âge/durée/ville/rémunéré/distance. | 🟢 réel | 6 | deep-link |
| `app/gamification/aide-scolaire/page.tsx` | Ancien mock statique, désormais permanentRedirect (308) + noindex vers /teen/aide-scolaire. | ↪️ redirect | 7 | ORPHELIN |
| `app/gamification/parcours/page.tsx` | Ancien mock 'parcours' sans consommateur, permanentRedirect (308) + noindex vers /teen/quests. | ↪️ redirect | 6 | ORPHELIN |

<details><summary>Problèmes détaillés par écran (12)</summary>

**`app/teen/aide-scolaire/page.tsx`**

- Lit teen_grades en RSC (status='approved') — réel. teenId = teenData?.id ?? profileId, robuste.
- Charte paper respectée (StickerCard, StatHero, Niv). Bon état vide.
- Toutes les cartes matière pointent vers la même URL /teen/aide-scolaire/grades (pas de filtre par matière) — clic peu différencié.
- Atteignable via sidebar mais PAS via la bottom-nav mobile (absente de cette page).

**`app/teen/academic/page.tsx`**

- redirect() runtime (302) au lieu de permanentRedirect comme les autres dédoublonnages (gamification/aide-scolaire utilise 308 + noindex) — incohérence de méthode de dédup.
- Aucune nav ne pointe vers /teen/academic : orphelin de fait, ne sert qu'à absorber d'anciens liens.

**`app/teen/aide-scolaire/tutors/page.tsx`**

- Réel mais probablement vide en l'absence de partenaires education seedés — état vide honnête (NivEmpty 'Bientôt des tuteurs').
- Carte tuteur sans lien : 'Partenaire vérifié' mais aucun CTA pour contacter/réserver — cul-de-sac.
- Atteignable uniquement depuis le hub aide-scolaire (in-page), pas dans la nav.

**`app/teen/aide-scolaire/grades/page.tsx`**

- teenId = info?.teenData?.id SANS fallback profileId (contrairement au hub) : si la vue teen_full_profile ne renvoie pas de ligne, les notes apparaissent vides à tort — divergence de résolution d'id à corriger.
- Le sous-titre 'Validées par tes profs partenaires' contredit le schéma migr.022 (validated_by = 'Parent qui a valide') — modèle de validation ambigu prof vs parent.
- Affiche validated_at pour le statut, mais le hub filtre sur status='approved' : deux sources de vérité de validation (validated_at vs status) potentiellement désynchronisées.

**`app/teen/passions/page.tsx`**

- La sidebar affiche 'Parcours Passion' (icône Sparkles) mais aboutit à l'onglet creative des quêtes : l'utilisateur croit ouvrir une section passions dédiée et tombe sur les quêtes — attente trompée.
- Collision terminologique : 'Parcours Passion' (sidebar) ≠ 'parcours' carrière (/teen/pathways) ≠ 'quests' (cible réelle). Trois sens de 'parcours'.
- Aucun écran 'passions' réel n'existe — la fonctionnalité a été fusionnée dans quests sans renommer l'entrée de nav.

**`app/teen/pathways/page.tsx`**

- ORPHELIN : aucune entrée sidebar/mobile-nav/quick-access ne mène à /teen/pathways. Atteignable seulement en tapant l'URL — feature riche et seedée (5 parcours) mais quasi invisible.
- Le label de progression affiche 'X / Y XP' alors que la valeur est milestones_completed/total_milestones (jalons, PAS des XP) — confusion devise/unité.
- Titre 'Tes parcours' partage le mot 'parcours' avec l'entrée sidebar 'Parcours Passion' qui va ailleurs (quests).

**`app/teen/mentors/page.tsx`**

- ORPHELIN : atteignable seulement via /teen/pathways (in-page, lui-même orphelin) ou deep-link. Pas de mention dans la nav principale.
- Réel via table mentors ; vide en pré-bêta (NivEmpty honnête).
- Affiche le nom du mentor comme concaténation de tags d'expertise ('Médecine / Code'), jamais le vrai nom de la personne — anonymisation peut-être voulue mais déroutante.
- Tarif en DH/h affiché ; OK côté devise (DH réel, pas coins).

**`app/teen/mentors/[id]/page.tsx`**

- Très bon écran : View Transitions morph, encart sécurité/consentement parental, gating isBookable (status active + kyc approved).
- Atteignable uniquement depuis /teen/mentors (lui-même orphelin) — donc profondément enfoui.
- Tarif et 'Première session' en DH ; cohérent.

**`app/teen/mentor-sessions/page.tsx`**

- ORPHELIN : aucun lien entrant trouvé (grep) vers /teen/mentor-sessions ; seuls des liens SORTANTS vers /teen/mentors. L'ado ne peut pas retrouver ses propres sessions sans deep-link.
- Affiche un prix mixte coins ('⊙ 123') ET DH sur la même ligne (amount_coins + amount_dh) — cohérent avec la double-devise mais risque de double-comptage visuel si les deux sont >0.
- Statuts riches et bien tokenisés (pending_approval, denied par parent, etc.) — flux d'approbation parental crédible.

**`app/teen/internships/page.tsx`**

- ORPHELIN : atteignable seulement via /teen/pathways (in-page) ou deep-link.
- CUL-DE-SAC : les cartes de stage ne sont PAS des liens et il n'existe AUCUNE page détail/candidature sous app/teen/internships/ — pourtant l'API app/api/teen/internships/[id]/apply/route.ts et la table internship_applications existent. La candidature est donc impossible depuis l'UI.
- La rémunération (stipend_dh) est affichée avec l'icône Coins de lucide alors que l'unité est DH — confusion iconographique coins vs DH.
- Deux <span><MapPin> côte à côte : un pour la ville, un pour les places restantes — icône MapPin réutilisée à tort pour 'places libres'.

**`app/gamification/aide-scolaire/page.tsx`**

- Dédoublonnage propre (308 + robots noindex). Aucune nav n'y pointe.
- Méthode de redirect (permanentRedirect) plus correcte que app/teen/academic (redirect 302) — incohérence interne entre les deux dédup.

**`app/gamification/parcours/page.tsx`**

- Le commentaire dit '410-gone' mais le code fait un permanentRedirect 308 vers /teen/quests — divergence commentaire/comportement.
- Redirige 'parcours' vers quests, alors que les vrais parcours carrière sont /teen/pathways : renforce la confusion sur le mot 'parcours' (quests vs pathways).

</details>

**Incohérences internes :**

- Découvrabilité cassée : 4 écrans éducation réels et aboutis (/teen/pathways, /teen/mentors, /teen/mentor-sessions, /teen/internships) ne sont dans AUCUNE navigation (ni sidebar 15 entrées, ni bottom-nav, ni quick-access). Ils ne forment qu'une grappe interne reliée par liens in-page, dont la seule porte d'entrée (pathways) est elle-même orpheline. Tout le sous-domaine orientation/mentorat/stages est donc invisible pour un utilisateur normal.
- La bottom-nav mobile (MobileBottomNav) n'est PAS montée dans app/teen/layout.tsx ; elle n'est rendue que dans components/teen/dashboard/teen-dashboard-content.tsx (page /teen). Conséquence : sur aide-scolaire, pathways, mentors, etc., l'utilisateur mobile n'a AUCUNE navigation (la sidebar est hidden md:flex). Seul le lien 'Retour' (vers /teen) sauve la navigation mobile.
- Entrée sidebar 'Parcours Passion' -> /teen/passions -> redirect /teen/quests?tab=creative : le libellé promet une section passions/parcours et livre des quêtes. Parcours brisé d'attente.
- Modèle de validation des notes incohérent : grades/page.tsx affiche 'Validées par tes profs partenaires' et statut via validated_at, mais teen_grades.validated_by est documenté 'Parent qui a valide' (migr.022) et le hub filtre status='approved'. Deux acteurs (prof/parent) et deux champs (status/validated_at) coexistent.
- Résolution de l'identité teen divergente entre écrans : aide-scolaire = teenData?.id ?? profileId ; grades = teenData?.id (sans fallback) ; pathways = profileId ; mentor-sessions = mentee_user_id = profileId. Tous égaux en pratique (teens.id === auth.users.id), mais la grades page peut afficher des notes vides à tort si teen_full_profile ne renvoie pas de ligne.
- Stages : flux de candidature mort — l'UI liste les stages sans aucun lien/CTA vers la page détail/candidature, qui n'existe pas, alors que l'API d'application est implémentée. Parcours conversion impossible.

**Redondances / doublons :**

- `app/teen/academic/page.tsx` = `app/teen/aide-scolaire/page.tsx` = `app/gamification/aide-scolaire/page.tsx` — Trois URLs pour l'aide scolaire. Canonique = /teen/aide-scolaire ; academic et gamification/aide-scolaire sont des redirects. Dédup correcte mais avec deux méthodes différentes (academic=redirect 302 sans noindex ; gamification=permanentRedirect 308 + noindex).
- `app/teen/passions/page.tsx` = `app/gamification/parcours/page.tsx` = `app/teen/quests` = `app/teen/pathways/page.tsx` — Le mot 'parcours' désigne 3 choses : passions->quests, gamification/parcours->quests, et pathways (carrière). passions et gamification/parcours redirigent tous deux vers quests, doublonnant la cible. pathways reste l'unique vrai 'parcours' mais n'a pas le mot dans la nav.
- `app/teen/aide-scolaire/page.tsx` = `app/teen/aide-scolaire/grades/page.tsx` — SUBJECT_META dupliqué (couleurs+icônes côté hub, labels+icônes côté grades) — deux tables de métadonnées matières à maintenir en parallèle, déjà signalées comme 'alignées' en commentaire mais non factorisées.

**Devise / terminologie :**

- XP : correctement réservé au mérite scolaire (teen_grades.xp_awarded, StatHero 'XP total', tone gold) et aux jalons. JAMAIS converti en coins ici — conforme à la règle.
- Bug d'unité dans pathways : la progression affiche 'milestones_completed / total_milestones XP' alors que ce sont des JALONS, pas des XP. Le suffixe 'XP' est faux et brouille la frontière XP/progression.
- DH vs coins : mentor-sessions affiche correctement la double-devise (amount_coins '⊙ N' coral + amount_dh 'N DH' mute). Mentors et fiche mentor affichent les tarifs en DH (réel, pas coins) — cohérent.
- Internships : stipend en DH affiché avec l'icône lucide 'Coins' — l'icône évoque la devise coins alors que la valeur est en DH. Iconographie à corriger pour éviter la confusion coins/DH.
- 'Parcours' surchargé : sidebar 'Parcours Passion' (->quests), /teen/pathways 'Tes parcours' (carrière), /gamification/parcours (->quests). Recommander de réserver 'Parcours' à l'orientation carrière (pathways) et renommer l'entrée sidebar en 'Passions' ou 'Créatif'.
- 'défi/quête/mission' hors périmètre direct ici, mais passions et gamification/parcours pointent vers quests/quests?tab=creative — la cible mélange déjà ces concepts.

**Recommandations prioritaires :**

1. 1. EXPOSER la grappe orientation : ajouter une entrée sidebar 'Orientation' (ou 'Parcours & Mentors') vers /teen/pathways, et des liens depuis le dashboard, afin que pathways/mentors/mentor-sessions/internships ne soient plus des orphelins atteignables seulement par deep-link.
2. 2. RENDRE la bottom-nav mobile globale : monter MobileBottomNav dans app/teen/layout.tsx (au lieu de seulement teen-dashboard-content.tsx) pour que les pages éducation aient une navigation sur mobile ; sinon l'app est quasi inutilisable au doigt hors page d'accueil.
3. 3. FERMER le cul-de-sac stages : créer app/teen/internships/[id]/page.tsx avec un CTA de candidature branché sur l'API existante /api/teen/internships/[id]/apply, et transformer les cartes en liens. Aujourd'hui la table internship_applications et l'API sont inaccessibles depuis l'UI.
4. 4. CORRIGER les libellés trompeurs : (a) pathways — remplacer 'X / Y XP' par 'X / Y jalons' ; (b) sidebar — renommer 'Parcours Passion' en 'Passions' (ou pointer vers un vrai écran) ; (c) internships — remplacer l'icône Coins par une icône DH/Banknote sur le stipend.
5. 5. ALIGNER le modèle de validation des notes : trancher prof vs parent (teen_grades.validated_by), unifier l'usage status='approved' vs validated_at, et ajouter le fallback profileId manquant dans grades/page.tsx pour éviter des notes faussement vides.

---

### 1.9 Progression & stats (achievements, streak, leaderboard, avatar, niveaux)

> Le domaine progression est éclaté et incohérent. Trois surfaces sont de vrais redirects (toutes les pages /gamification/* du domaine), une est une coquille (avatar 100% mock), une mélange deux concepts (leaderboard créateurs vendu comme « XP global ») et la cible canonique des achievements (/teen/profile?tab=achievements) est cassée — l'onglet n'existe pas dans ProfileHubClient. La streak est solide et bien chartée mais ses milestones et passes sont config en dur. Le système XP/niveaux n'a aucune surface dédiée (le seul vrai leaderboard XP du code n'est rendu nulle part) et deux formules de niveau divergent. Moyenne UX faible, dominée par redirects et écrans non découvrables sur mobile.

**Note UX moyenne du cluster : 3.7 / 10**

| Écran | But | État | UX | Nav |
|---|---|---|---|---|
| `app/teen/achievements/page.tsx` | Point d'entrée historique des achievements, désormais simple redirect permanent vers l'onglet achievements du profil. | ↪️ redirect | 3 | deep-link |
| `app/teen/streak/page.tsx` | Affiche la streak de connexion : streak actuelle/best, multiplicateur XP, milestones, historique, missions du jour, passes de protection. | 🟡 partiel/mock | 7 | sidebar |
| `app/teen/leaderboard/page.tsx` | Classement mensuel des CRÉATEURS de contenu (creator_monthly_stats), podium top-3 + reste, filtres par catégorie. | 🟢 réel | 6 | sidebar |
| `app/teen/avatar/page.tsx` | Personnalisation de la mascotte/coach Niv : humeur + skins déblocables à l'XP. | 🔴 mock | 4 | ORPHELIN |
| `app/gamification/leaderboard/page.tsx` | Ancienne URL du leaderboard, désormais redirect 308 vers /teen/leaderboard. | ↪️ redirect | 3 | deep-link |
| `app/gamification/page.tsx` | Ancien hub gamification fusionné, désormais redirect 308 vers /teen. | ↪️ redirect | 3 | deep-link |
| `gamification-system/features (stats-dashboard, achievements, leaderboard)` | Couche server actions de la progression : stats à vie, achievements, leaderboard XP, niveaux, streak de login. | 🟡 partiel/mock | 5 | lien in-page |

<details><summary>Problèmes détaillés par écran (7)</summary>

**`app/teen/achievements/page.tsx`**

- permanentRedirect('/teen/profile?tab=achievements') — mais cette cible est CASSÉE : ProfileHubClient (app/teen/profile/profile-hub-client.tsx:52-57) ne déclare que les onglets profile/stats/activity/settings. tab=achievements retombe silencieusement sur l'onglet 'profile' (currentTab par défaut, ligne 49).
- L'utilisateur cliquant 'Mes Achievements' n'atterrit donc PAS sur une vue achievements mais sur le profil générique.
- Aucun rendu propre ; écran fantôme.

**`app/teen/streak/page.tsx`**

- Données réelles (getLifetimeStats/getActivityHistory/getDailyMissions) MAIS les milestones (lignes 44-51) et le multiplicateur (ligne 59) sont une config en dur côté code, sans table de backing — l'écran l'admet en commentaire (« Static milestones config — no backing table yet »).
- streakPasses lu via cast (lifetimeStats as any).streak_passes (ligne 62) : colonne probablement inexistante → affiche toujours 0 ; la carte 'Protection streak' (streak-client.tsx:245-259) est donc décorative.
- Le multiplicateur XP affiché (x1.0 à x3.0) n'est appliqué nulle part dans le calcul d'XP réel — promesse non tenue.
- Le bouton 'Compléter pour maintenir la streak' pointe vers /daily (streak-client.tsx:188), route hors arborescence /teen — lien probablement mort.
- Non atteignable sur mobile : absent de la bottom-nav (4 entrées) et MobileBottomNav n'est monté que dans teen-dashboard-content.tsx, pas dans le layout.

**`app/teen/leaderboard/page.tsx`**

- Écran de qualité (charte paper respectée, podium 1-2-3, enrichissement pseudo/avatar via profiles, dégradation gracieuse sur erreur RPC) mais MAL ÉTIQUETÉ : la sidebar l'appelle 'Classement' (sidebar.tsx:37) et le lien interne l'appelle 'XP global' (page.tsx:111-113) alors qu'il classe par xp_earned de créateur de contenu, pas par l'XP/niveau global du joueur.
- Le vrai leaderboard XP/niveaux (gamification-system/features/leaderboard/actions.ts → RPC get_leaderboard sur user_xp, avec all_time/weekly/monthly/friends/city) n'est rendu par AUCUNE page.
- Lien interne 'Feed' vers /teen/feed et 'XP global' vers lui-même (boucle) — le 'XP global' renvoie à la même page créateurs.
- Dépend de l'enrichissement sur table profiles (pseudo/avatar_url) ; or le drift schéma (cf. MEMORY) note profiles divergent du code — risque d'avatars/pseudos vides ('Anonyme').

**`app/teen/avatar/page.tsx`**

- Catalogue de skins 100% en dur (avatar-client.tsx:20-25) avec un seul skin 'actif', les autres affichant un coût XP (500/1200/2500) NON fonctionnel — commentaire explicite « Le déblocage réel par XP arrive avec l'économie skins ».
- Seule l'humeur est persistée (POST /api/teen/avatar set_mood, best-effort, sur table avatars) ; aucun état d'humeur n'est lu au montage → revient toujours sur 'happy' (useState('happy') ligne 37).
- Confusion devise/charte : les skins coûtent 'XP' (avatar-client.tsx:111) — or l'XP est censé être le mérite non dépensable ; mélange potentiel avec coins/DH (le brief : XP ne s'achète/dépense jamais en boutique).
- ORPHELIN total : absent de la sidebar (15 entrées), de la bottom-nav et du quick-access. Atteignable uniquement par URL directe (/teen/avatar).

**`app/gamification/leaderboard/page.tsx`**

- permanentRedirect('/teen/leaderboard'). Contradiction directe avec le commentaire du layout (app/teen/layout.tsx:8) qui désigne /gamification/leaderboard comme l'URL CANONIQUE du leaderboard — la doc et le code se contredisent.
- La cible (/teen/leaderboard) est un classement créateurs, pas le leaderboard XP attendu sous 'gamification' — la redirection trompe l'intention.

**`app/gamification/page.tsx`**

- permanentRedirect('/teen'). Hub sunset ; aucun écran de progression unifié ne le remplace (la progression est éparpillée entre /teen/streak, /teen/leaderboard, /teen/profile?tab=stats, /teen/wallet?tab=badges).
- Tout le répertoire app/gamification/* est en sunset : collections→profil, roue→/teen (410 'wheel_streaks trigger broken'), parcours→/teen/quests (410 mock), defis→/teen/quests/friend-defis. Aucune surface de progression vivante sous /gamification.

**`gamification-system/features (stats-dashboard, achievements, leaderboard)`**

- leaderboard/actions.ts expose un vrai leaderboard XP multi-périodes (get_leaderboard, get_city_leaderboard, get_friends_leaderboard, get_user_rank) qui n'est consommé par AUCUNE page — code mort côté UI.
- Deux formules de niveau divergentes : stats-dashboard/actions.ts:704-709 calcule level via 'xpRequired += floor(100*level*1.5)', tandis que le profil lit teenData.level brut (profile/page.tsx:79) et le dashboard reçoit un xpData.level d'une 3e source — aucune source de vérité unique du niveau.
- leaderboard/schema.ts RANK_TIERS (lignes 34-58) utilise des couleurs Tailwind hors-charte (yellow-400/zinc-300/amber-600, bg-*/20) au lieu des tokens paper (gold/teal/coral/ink) — divergence charte si jamais rendu.
- stats-dashboard revalide des chemins legacy /stats et /profile (lignes 54-55, 183) qui ne correspondent pas aux routes /teen/* réelles — revalidations sans effet.
- achievements/actions.ts revalide /achievements et /gamification (lignes 184-185) — routes non canoniques (achievements = redirect, gamification = redirect).

</details>

**Incohérences internes :**

- Cible canonique des achievements CASSÉE : sidebar.tsx:33, header.tsx:87 et navbar.tsx:217-218 pointent vers /teen/profile?tab=achievements, mais ProfileHubClient ne définit pas d'onglet 'achievements' (tabs profile/stats/activity/settings) → l'utilisateur tombe sur l'onglet profil par défaut. Le vrai listing de badges est ailleurs : /teen/wallet?tab=badges (lien 'Voir tout' profile-hub-client.tsx:166).
- Trois entrées d'achievements concurrentes : /teen/achievements (redirect), /gamification/collections (redirect), onglet profil (inexistant) et /teen/wallet?tab=badges (réel) — quatre chemins, aucun cohérent.
- Leaderboard à double identité : /teen/leaderboard est un classement CRÉATEURS mais est libellé 'Classement' (sidebar) et 'XP global' (lien interne page.tsx:111). Le vrai leaderboard XP/niveaux du code (features/leaderboard) n'a pas de page.
- Contradiction doc/code : app/teen/layout.tsx:8 déclare /gamification/leaderboard canonique, alors que cette route redirige vers /teen/leaderboard.
- Aucun hub de progression : l'ancien /gamification (et /gamification/leaderboard) sont sunset ; la progression est dispersée (streak, leaderboard créateurs, profil/stats, wallet/badges, avatar) sans page d'ensemble du niveau/XP.
- Parcours mobile cassé : streak/leaderboard/avatar absents de la bottom-nav (4 entrées Home/Explore/Crew/Profile) et MobileBottomNav n'est monté que dans teen-dashboard-content.tsx (home), pas dans le layout → pas de nav basse sur ces pages.
- Streak : multiplicateur XP affiché (x1→x3) jamais appliqué au calcul d'XP réel ; passes de protection toujours à 0 (colonne absente) ; bouton vers /daily hors arborescence /teen.
- Quick-access incohérent avec le domaine progression : 'Crew Battle' et 'Clubs' pointent tous deux vers /teen/circles (quick-access-grid.tsx:291,304), aucun raccourci vers streak/leaderboard/achievements.

**Redondances / doublons :**

- `app/teen/achievements/page.tsx` = `app/gamification/collections/page.tsx` = `app/teen/profile (tab=achievements)` = `app/teen/wallet (tab=badges)` — Quatre surfaces pour 'achievements/badges' : deux redirects vers une cible inexistante (onglet profil), plus le vrai listing dans wallet/badges. À consolider sur une seule destination réelle.
- `app/teen/leaderboard/page.tsx` = `app/gamification/leaderboard/page.tsx` = `gamification-system/features/leaderboard/actions.ts` — Deux concepts de leaderboard (créateurs rendu vs XP/niveaux non rendu) + une URL redirect, le tout étiqueté de façon interchangeable ('Classement'/'XP global'). Le leaderboard XP du code est orphelin.
- `gamification-system/features/stats-dashboard/actions.ts (getUserGlobalRank)` = `gamification-system/features/leaderboard/actions.ts (getUserRank)` — Deux implémentations indépendantes du rang global de l'utilisateur (une sur user_lifetime_stats.total_xp, une via RPC get_user_rank sur user_xp) — sources de vérité divergentes.
- `app/teen/streak/page.tsx (MILESTONES)` = `gamification-system/features/achievements/actions.ts (streak_3/7/14/30/60/90/180/365)` — Deux barèmes de jalons de streak en parallèle : milestones d'affichage en dur (3/7/14/30/60/100) côté streak vs achievements de streak (3/7/14/30/60/90/180/365) côté achievements — paliers et récompenses non alignés.

**Devise / terminologie :**

- XP : utilisé correctement comme mérite sur streak/leaderboard créateurs/profil. MAIS l'écran avatar fait payer les skins en 'XP' (avatar-client.tsx:111, '500 XP/1200 XP/2500 XP') et le bouton 'Gagner de l'XP' — laisse croire que l'XP se dépense, ce qui contredit la règle 'XP ne s'achète/dépense jamais'. Ambiguïté à trancher (coins/DH ou simple seuil de déblocage non dépensé).
- Quick-access 'Shop XP' (quick-access-grid.tsx:268, 'Convertis tes XP en récompenses') renforce la confusion : l'XP est présenté comme convertible/dépensable.
- Terminologie progression flottante : 'milestones' (streak) vs 'objectifs' (titre section streak) vs 'achievements/succès/badges/collection/trophées' — au moins 5 termes pour la même notion (profile-hub-client.tsx 'Trophées' ligne via t('trophies'), navbar 'Mes badges'/'Ma collection', wallet 'Badges', sidebar 'Mes Achievements').
- 'Niveau' (level) affiché sur profil et dashboard mais calculé par 2 formules différentes et sans page de progression XP→niveau lisible (pas de courbe 'XP avant prochain niveau' centralisée).
- club/circle/crew : le quick-access mélange 'Clubs' et 'Crew Battle' pointant tous deux vers /teen/circles — confusion club vs crew non résolue dans le domaine progression.
- défi/quête/mission : la page streak appelle les missions du jour 'DAILY_TASKS'/'missions', le dashboard parle de 'mission', le quick-access de 'Quêtes (missions quotidiennes et défis)' — trois termes empilés.

**Recommandations prioritaires :**

1. P0 — Réparer la cible achievements : soit ajouter un onglet 'achievements' à ProfileHubClient (profile-hub-client.tsx:52) et y rendre le vrai listing de badges, soit re-pointer sidebar/header/navbar et les redirects (/teen/achievements, /gamification/collections) vers /teen/wallet?tab=badges qui contient déjà la vraie donnée. Aujourd'hui tout 'Mes Achievements' atterrit sur l'onglet profil par défaut.
2. P0 — Clarifier le leaderboard : renommer /teen/leaderboard en 'Top créateurs' partout (sidebar 'Classement' et lien 'XP global' page.tsx:111), puis soit créer une page rendant le vrai leaderboard XP (features/leaderboard/get_leaderboard) soit supprimer ce code mort. Lever la contradiction layout.tsx:8 (canonique annoncé = /gamification/leaderboard alors que c'est un redirect).
3. P1 — Unifier le calcul de niveau XP : une seule source de vérité (une formule/RPC) consommée par profil, dashboard et stats-dashboard, et exposer une vraie barre 'XP → prochain niveau'. Aligner aussi getUserGlobalRank (stats-dashboard) et getUserRank (leaderboard).
4. P1 — Honorer ou retirer les promesses de la streak : appliquer réellement le multiplicateur XP affiché OU le retirer ; brancher streak_passes sur une vraie colonne OU masquer la carte protection ; corriger le bouton /daily vers une route /teen valide ; aligner les paliers streak (page) avec les achievements de streak.
5. P2 — Décider du modèle économique de l'avatar et le rendre découvrable : trancher si les skins coûtent des coins/DH (pas de l'XP) ou un seuil XP non dépensé, persister/relire l'humeur, et exposer /teen/avatar dans la nav (sidebar ou onglet profil) — actuellement orphelin et 100% mock.

---

### 1.10 Profil, paramètres & services divers (profile, settings, notifications, offres, partenaires, map, wellbeing)

> Le profil ado est consolidé dans un hub à 4 onglets (profile/stats/activity/settings) bien dans la charte paper, mais l'onglet Paramètres est quasi vide : aucune commande de langue, notifs, privacy ou visibility — les 4 routes /teen/settings/* sont de simples redirects vers ?tab=settings qui n'offre QUE « éditer le profil » + déconnexion. Le profil lit profiles.username et profiles.bio qui n'existent pas dans le schéma live (drift confirmé) : le pseudo @ et la bio ne s'affichent jamais. Offres (recommandation réelle), Partenaires (lit partners) et Map (réel via TeenMapWrapper) sont fonctionnels mais ORPHELINS : aucune navigation .tsx ne les expose. Wellbeing est un placeholder pur (« à venir » partout), pas réel. Problème systémique majeur : la bottom-nav mobile n'est rendue que dans le dashboard /teen, donc absente de profil/settings/offres/etc. en mobile.

**Note UX moyenne du cluster : 4.4 / 10**

| Écran | But | État | UX | Nav |
|---|---|---|---|---|
| `app/teen/profile/page.tsx` | Server component qui charge profil + stats (achievements, rank, lifetime, friends) et rend le hub profil client. | 🟡 partiel/mock | 6 | sidebar |
| `app/teen/profile/edit/page.tsx` | Édition du profil : nom complet + pseudo, formulaire dans une StickerCard. | 🟢 réel | 6 | lien in-page |
| `app/teen/settings/page.tsx` | Redirect vers /teen/profile?tab=settings. | ↪️ redirect | 3 | sidebar |
| `app/teen/settings/language/page.tsx` | Redirect vers /teen/profile?tab=settings (réglage langue consolidé). | ↪️ redirect | 2 | ORPHELIN |
| `app/teen/settings/notifications/page.tsx` | Redirect vers /teen/profile?tab=settings (réglages notifs consolidés). | ↪️ redirect | 2 | ORPHELIN |
| `app/teen/settings/privacy/page.tsx` | Redirect vers /teen/profile?tab=settings (réglages confidentialité consolidés). | ↪️ redirect | 2 | ORPHELIN |
| `app/teen/settings/visibility/page.tsx` | Redirect vers /teen/profile?tab=settings (réglages visibilité consolidés). | ↪️ redirect | 2 | ORPHELIN |
| `app/teen/notifications/page.tsx` | Redirect vers /teen/activity (inbox ado canonique). | ↪️ redirect | 4 | ORPHELIN |
| `app/teen/offres/page.tsx` | Découverte personnalisée d'offres/défis partenaires via RPC recommend_for_teen + capture de signaux, CTA serveur (scan ou redirection partenaire). | 🟢 réel | 7 | ORPHELIN |
| `app/teen/partenaires/page.tsx` | Annuaire des partenaires actifs (boutiques/lieux/clubs/restos/écoles) avec badge « accepte tes coins ». | 🟢 réel | 6 | ORPHELIN |
| `app/teen/map/page.tsx` | Redirect vers /teen/social?tab=map. | ↪️ redirect | 5 | bottom-nav |
| `app/teen/wellbeing/page.tsx` | Espace bien-être : surface calme avec mascotte Niv + 3 cartes Sommeil/Respiration/Équilibre. | ⚪ stub/TODO | 4 | ORPHELIN |

<details><summary>Problèmes détaillés par écran (12)</summary>

**`app/teen/profile/page.tsx`**

- getTeenProfile fait select(*) sur profiles puis sérialise profile.username / profile.bio côté hub, mais le schéma live de profiles n'a NI username NI bio (cf. memory schema-drift) : ces champs sont toujours undefined.
- achievements totalCount fallback codé en dur à 50 (ligne 60) et titleIcon fallback '🌱' / title 'Rookie' (lignes 91-92) si teens.title absent.
- Atteignable par sidebar (desktop) et bottom-nav (mobile) MAIS la bottom-nav n'est rendue que sur /teen ; sur cette page en mobile il n'y a aucune nav.

**`app/teen/profile/edit/page.tsx`**

- Correctement aligné sur le schéma réel : pseudo lu depuis teens.pseudo (lignes 36-46), full_name depuis profiles. Conforme à la mémoire.
- L'avatar est en lecture seule : le bouton caméra du hub (profile-hub-client ligne 80-87) pointe ici mais le form affiche « La personnalisation d'avatar arrive bientôt » (profile-edit-form ligne 89) — la promesse 'Modifier la photo de profil' ne mène à rien d'actionnable.
- Pas de champ bio (cohérent avec le schéma, mais le hub affiche quand même une carte Bio toujours vide).

**`app/teen/settings/page.tsx`**

- C'est la cible de l'entrée sidebar « Paramètres » (sidebar.tsx ligne 39). Le redirect fonctionne mais aboutit à un onglet Settings très pauvre (voir profile-hub-client SettingsTab) : pas de langue, notifs, privacy, visibility.
- Redirect chain : sidebar /teen/settings -> profile?tab=settings.

**`app/teen/settings/language/page.tsx`**

- Redirect pur (#109). Or l'onglet settings cible ne contient AUCUN sélecteur de langue alors que le hook useT / lib/i18n existe : la promesse de consolidation n'est pas tenue, le réglage langue n'existe nulle part dans l'UI teen.
- Aucun lien entrant : route deep-link/orphan.

**`app/teen/settings/notifications/page.tsx`**

- Redirect pur. La cible n'expose aucun réglage de notifications, alors qu'un PushPermissionPrompt et un SW push existent dans le layout : impossible pour l'ado de gérer ses notifs.
- Aucun lien entrant.

**`app/teen/settings/privacy/page.tsx`**

- Redirect pur. La cible n'offre aucun contrôle de confidentialité : seul un encart statique « Privacy » (ProfileTab, profile-hub-client lignes 187-195) en lecture seule existe, sans réglage actionnable. Sensible pour une app mineurs 13-17.
- Aucun lien entrant.

**`app/teen/settings/visibility/page.tsx`**

- Redirect pur. Aucune commande de visibilité de profil/leaderboard dans la cible.
- Aucun lien entrant.

**`app/teen/notifications/page.tsx`**

- Redirect pur vers /teen/activity (qui existe, vérifié). Choix de routing cohérent avec routing.locked.md, mais /teen/notifications n'est lié nulle part.
- L'onglet 'activity' du hub profil duplique partiellement la notion d'inbox (ActivityTab fetch /api/teen/activities) — confusion possible activité-profil vs inbox /teen/activity.

**`app/teen/offres/page.tsx`**

- Écran réel et soigné (recommend_for_teen + record_signal, empty state Niv, charte paper respectée) MAIS aucun lien de navigation .tsx n'y mène (grep href offres = uniquement docs) : totalement orphelin malgré sa qualité.
- rewardXp heuristique codée en dur à 25 XP pour les défis (ligne 303) — valeur d'affichage non garantie par le serveur, risque d'incohérence avec l'XP réellement attribuée au scan.
- Les CTA externes des offres dépendent de partners.booking_url/website_url ; fallback vers /teen/map sinon — chaîne correcte mais map = /teen/social?tab=map (le lien interne /teen/map redirige).

**`app/teen/partenaires/page.tsx`**

- Lit la table partners réelle (status=active, limit 48). Fonctionnel et dans la charte.
- Aucun lien de navigation .tsx n'y mène : orphelin.
- Aucune action depuis une carte partenaire (pas de lien vers offres/map du partenaire, pas de fiche) : annuaire en cul-de-sac.
- Redondance conceptuelle forte avec /teen/offres (mêmes partenaires) sans lien entre les deux écrans.

**`app/teen/map/page.tsx`**

- La bottom-nav mobile « Explore » pointe vers /teen/map (mobile-nav.tsx ligne 56) qui redirige vers /teen/social?tab=map : double saut à chaque clic Explore, et le calcul isActive de la bottom-nav (pathname startsWith /teen/map) ne matchera jamais sur /teen/social — l'onglet Explore n'apparaît jamais actif.
- Les liens internes de offres (target /teen/map?offer=...) et le fallback buildExternalUrl perdent le query param offer/city au redirect (le redirect ne propage pas la querystring).
- La carte réelle (TeenMapWrapper) vit bien dans /teen/social — donc la fonctionnalité existe, c'est le routing qui est fragile.

**`app/teen/wellbeing/page.tsx`**

- Placeholder pur : commentaire « différé au canon §19.4 » (ligne 8), texte « s'enrichira bientôt », « Quiet hours 22h–7h — à venir », « Pauses guidées à venir » (lignes 27, 35, 38). Aucune donnée ni interaction réelle.
- Aucun lien de navigation .tsx n'y mène : orphelin.
- Visuellement conforme charte mais ne fait rien — ne devrait pas être présenté comme une feature.

</details>

**Incohérences internes :**

- Bottom-nav mobile absente hors dashboard : MobileBottomNav n'est rendue que dans components/teen/dashboard/teen-dashboard-content.tsx (ligne 238), utilisé uniquement par /teen (via lazy-components). app/teen/layout.tsx ne la rend PAS. Conséquence : profil, settings, offres, partenaires, wellbeing, activity n'ont AUCUNE navigation en mobile (sidebar = hidden md:flex). Parcours mobile cassé sur tout le cluster.
- Sidebar « Mes Achievements » -> /teen/profile?tab=achievements, mais profile-hub-client ne gère que les tabs profile|stats|activity|settings (lignes 139-142) : tab=achievements affiche le header puis une zone de contenu VIDE. Parcours cassé.
- Onglet Explore (bottom-nav) -> /teen/map -> redirect /teen/social?tab=map : l'état actif n'est jamais détecté (isActive teste startsWith('/teen/map') alors que l'URL finale est /teen/social) et le double redirect dégrade le perçu.
- Profil affiche @username (profile-hub-client lignes 93-94) et bio (ligne 158) depuis profiles, colonnes inexistantes en live (schema-drift confirmé) : le @pseudo n'apparaît jamais sur le profil (alors qu'il est éditable et stocké sur teens.pseudo) et la bio est toujours l'état vide.
- Le bouton caméra 'Modifier la photo de profil' (hub ligne 80) et la carte Avatar du formulaire promettent une personnalisation d'avatar qui n'existe pas ('arrive bientôt', profile-edit-form ligne 89).
- Consolidation des réglages annoncée (#109) mais non tenue : les 4 redirects settings/language|notifications|privacy|visibility pointent vers un onglet Settings qui ne contient AUCUN de ces réglages (profile-hub-client SettingsTab = edit profil + logout uniquement).
- offres et partenaires couvrent le même écosystème partenaire sans aucun lien croisé ni point d'entrée commun.

**Redondances / doublons :**

- `app/teen/notifications/page.tsx` = `app/teen/activity/page.tsx` = `app/teen/profile/profile-hub-client.tsx (ActivityTab)` — Trois surfaces 'activité/notifs' : /teen/notifications redirige vers /teen/activity (inbox canonique), tandis que l'onglet Activity du hub profil refait un fetch /api/teen/activities. Notion d'historique dupliquée entre inbox et profil.
- `app/teen/offres/page.tsx` = `app/teen/partenaires/page.tsx` — Mêmes partenaires sous deux angles (offres recommandées vs annuaire) ; les deux écrans sont orphelins et ne se référencent pas. Candidats à fusion ou à mise en relation.
- `app/teen/settings/language/page.tsx` = `app/teen/settings/notifications/page.tsx` = `app/teen/settings/privacy/page.tsx` = `app/teen/settings/visibility/page.tsx` — Quatre routes settings réduites à un même redirect vers ?tab=settings : redondance de stubs sans destination réelle (les réglages correspondants n'existent pas dans la cible).

**Devise / terminologie :**

- Devise respectée globalement : la carte Quick Stats du profil affiche les coins (icône Coins, profile-hub-client lignes 121) et l'onglet Stats affiche le total XP via StatHero (lignes 204-210) — XP et coins restent séparés, pas de conversion. Conforme à la règle XP≠coins.
- Offres : descriptionFor mélange correctement -X% / prix en DH (lignes 287-291) et coinReward/xpReward distincts (DefiCard). DH et coins coexistent sans laisser entendre une conversion XP. Le badge partenaires '⊙ accepte tes coins' est cohérent (1 DH = 100 coins non affiché ici mais pas contredit).
- Terminologie défi/quête/mission incohérente sur le cluster : offres parle d'« Offres & défis » et de « défis » ; l'onglet Stats du profil compte des « missions » (statMissions, profile-hub-client ligne 218) alimentées par lifetime.total_missions_completed ; la sidebar n'a ni 'missions' ni 'quêtes' (a 'Défis Physiques', 'Parcours Passion'). Trois mots pour des concepts proches, sans glossaire unifié.
- Crew/circle/club : la bottom-nav nomme 'Crew' une entrée vers /teen/circles (mobile-nav ligne 60) ; partenaires utilise 'Club' comme type de partenaire (TYPE_LABEL). Le mot 'circle/crew' reste flou côté ado.
- Le badge partenaire utilise le glyphe '⊙' pour symboliser les coins (partenaires ligne 76) alors que le reste de l'app utilise l'icône lucide Coins : symbole de devise non standardisé.

**Recommandations prioritaires :**

1. P0 — Réparer la navigation mobile globale : déplacer <MobileBottomNav /> de teen-dashboard-content.tsx vers app/teen/layout.tsx pour qu'elle existe sur toutes les pages teen (profil, settings, offres, etc.). Sinon tout ce cluster est inatteignable et sans retour en mobile.
2. P0 — Réparer le lien sidebar 'Mes Achievements' (-> /teen/profile?tab=achievements) : soit ajouter un handler tab 'achievements' dans profile-hub-client, soit repointer vers /teen/wallet?tab=badges (déjà utilisé par le lien 'voir tout'). Aujourd'hui il ouvre une page au contenu vide.
3. P1 — Tenir la promesse de l'onglet Paramètres : y câbler les réglages réels (sélecteur de langue via lib/i18n, gestion des notifications/push, confidentialité/visibilité). En l'état, 4 routes settings redirigent vers un onglet qui n'offre que 'éditer profil' + déconnexion — manquement sensible pour une app de mineurs.
4. P1 — Donner un point d'entrée aux écrans orphelins de qualité (offres, partenaires) et clarifier wellbeing : exposer Offres/Partenaires (p.ex. dans l'onglet map/explore ou une carte quick-access), relier les deux entre eux, et soit masquer wellbeing tant qu'il est vide soit l'étiqueter clairement 'bientôt'.
5. P2 — Aligner le profil sur le schéma réel : retirer ou rebrancher profile.username vers teens.pseudo (le @pseudo éditable n'apparaît jamais) et masquer la carte Bio vide tant que profiles.bio n'existe pas ; aligner le double-redirect /teen/map -> /teen/social?tab=map (corriger isActive de la bottom-nav et la perte des query params offer/city).

---

## 2. Analyses transversales

### 2.1 Architecture d'information & navigation

J'ai tout ce qu'il faut. Vérifications de code confirmées. Voici le diagnostic.

---

# DIAGNOSTIC IA — Architecture de navigation Nivy (domaine teen)

## 0. Vérification du code (faits, pas hypothèses)

J'ai vérifié les quatre points d'entrée de navigation. Résultats :

- **`app/teen/layout.tsx`** : monte `TeenHeader` (l.54) + `TeenSidebar` (l.56). Il ne monte **PAS** `MobileBottomNav`. Le `<main>` réserve juste un padding bas `pb-[calc(6rem...)]` « pour dégager le dock mobile que la page oublierait » (l.57-67) — mais le dock lui-même n'est jamais rendu par le layout.
- **`MobileBottomNav`** (grep global) : importé et rendu **à un seul endroit** — `components/teen/dashboard/teen-dashboard-content.tsx:238`, lui-même utilisé uniquement par `/teen` (la home). **L'affirmation de l'inventaire est exacte et confirmée** : la bottom-nav mobile n'existe QUE sur le dashboard.
- **Navigation mobile alternative** : le `TeenHeader` contient bien un menu hamburger (`Sheet`, header.tsx l.68-96) visible `md:hidden`. **Mais il ne contient que 4 liens en dur** : Dashboard, Events, Achievements (`?tab=achievements` — cassé), Mes Coins. Donc sur mobile, depuis une page interne, **le seul moyen de naviguer est ce Sheet à 4 entrées** (dont une cassée), pas la sidebar (`hidden md:flex`, sidebar.tsx l.46) ni la bottom-nav.
- **Quick-access** (quick-access-grid.tsx l.266-316) : 4 cartes confirmées — Shop XP (`/teen/shop`, redirect), Quêtes (`/teen/quests`), Clubs (`/teen/circles`), Crew Battle (`/teen/circles`). **Doublon d'URL confirmé** : `Clubs` et `Crew Battle` pointent tous deux vers `/teen/circles` (l.295 et l.307). Badges `NEW`/`HOT`/`LIVE` codés en dur (l.275/299/311).
- **Inventaire des pages** (glob) : **67 fichiers `page.tsx` sous `app/teen/**`**.

**Conclusion factuelle sur la navigation mobile interne** : un teen sur mobile qui quitte la home se retrouve avec **un menu hamburger à 4 liens (1 cassé) comme unique navigation**. Il n'a aucun retour structurel — la plupart des pages comptent sur un bouton "Retour vers /teen" codé en dur (ex. `app/teen/chores/page.tsx`). C'est le défaut systémique le plus grave de l'app.

---

## 1. Incohérence desktop (15) vs mobile (4 bottom-nav + 4 sheet) vs quick-access (4, 2 doublons)

Trois inventaires de navigation **disjoints**, qui ne se recoupent presque pas :

| Surface | Où | Nb entrées | Contenu |
|---|---|---|---|
| **Sidebar desktop** | `components/dashboard/teen/sidebar.tsx` l.24-40 | **15** | Dashboard, Events, Aide Scolaire, Défis Physiques, Parcours Passion, Games, Circles, Partager, Mes Achievements, Mes Coins, Ma Streak, Récompenses, Classement, Mon Profil, Paramètres |
| **Bottom-nav mobile** | `mobile-nav.tsx` l.43-68 (montée seulement sur `/teen`) | **4** | Home, Explore (`/teen/map`→redirect), Crew (`/teen/circles`), Profile |
| **Sheet hamburger mobile** | `header.tsx` l.80-93 | **4** | Dashboard, Events, Achievements (cassé), Mes Coins |
| **Quick-access dashboard** | `quick-access-grid.tsx` l.266-316 | **4 (2 doublons)** | Shop XP, Quêtes, Clubs→`/teen/circles`, Crew Battle→`/teen/circles` |

**Incohérences concrètes :**
- **Asymétrie 15 vs 4** : le desktop expose 15 destinations, le mobile (bottom-nav) seulement 4, et **ces 4 ne sont qu'un sous-ensemble réduit** (Home/Explore/Crew/Profile). Aucune des 4 ne mène à Aide Scolaire, Streak, Défis, Récompenses, Games, etc. exposés côté desktop.
- **3 vocabulaires pour `/teen/circles`** : sidebar dit « Circles », bottom-nav dit « Crew », quick-access dit « Clubs » ET « Crew Battle ». Quatre libellés, une seule URL.
- **Cascades de redirects depuis la nav** : sidebar « Mes Coins » → `/teen/coins` → `/teen/wallet` ; sidebar « Récompenses » → `/teen/wallet?tab=shop` ; quick-access « Shop XP » → `/teen/shop` → `/teen/wallet?tab=shop` ; bottom-nav « Explore » → `/teen/map` → `/teen/social?tab=map`. Le calcul `isActive` de la bottom-nav (`pathname.startsWith('/teen/map')`, l.219-220) **ne matche jamais** car l'URL finale est `/teen/social` → l'onglet Explore n'est jamais surligné.
- **`isActive` strict sidebar** : `pathname === item.href` (sidebar.tsx l.50) → une sous-route (`/teen/aide-scolaire/grades`) ne marque jamais le parent actif.
- **Doublon quick-access** : 2 cartes sur 4 (50 %) mènent au même écran `/teen/circles`. « Crew Battle » n'a aucune surface dédiée.
- **Lien cassé partagé** : sidebar « Mes Achievements », sheet « Achievements » et navbar pointent vers `/teen/profile?tab=achievements`, **onglet qui n'existe pas** dans `ProfileHubClient` → retombe sur l'onglet profil par défaut.

---

## 2. Écrans orphelins / non navigables

**67 pages teen, ~15 exposées** par une nav. Voici les features clés **réelles et fonctionnelles** mais inaccessibles autrement qu'en deep-link ou via un lien in-page enfoui :

| Feature (réelle) | Chemin | État data | Accès actuel |
|---|---|---|---|
| **Anniversaire** | `app/teen/birthday/page.tsx` → `app/anniversaires/page.tsx` | réel (anniv_orders) | **orphelin total** (0 lien entrant) |
| **Food / commande** | `app/teen/food/page.tsx`, `.../order/[id]` | réel (place_food_order) | **orphelin** — « Wave 3 stub » (layout l.61) |
| **Transport / rides** | `app/teen/rides/page.tsx`, `.../request` | réel (request_ride) | **orphelin** — « Wave 3 stub » |
| **Quiz** (la feature la + aboutie) | `app/teen/quiz/page.tsx` | réel | **aucune entrée nav** — seulement avatar-coach + lien enfoui dans quests |
| **Épargne** | `app/teen/savings/page.tsx`, `.../new` | réel (user_coins_spendable) | orphelin |
| **Allowance** | `app/teen/wallet/allowance/page.tsx` | réel | orphelin |
| **Mentors** | `app/teen/mentors/page.tsx`, `.../[id]` | réel | orphelin (accessible seulement via pathways, lui-même orphelin) |
| **Sessions mentor** | `app/teen/mentor-sessions/page.tsx` | réel | orphelin (0 lien entrant) |
| **Stages** | `app/teen/internships/page.tsx` | réel | orphelin + cul-de-sac (pas de page candidature) |
| **Parcours carrière** | `app/teen/pathways/page.tsx` | réel (5 seedés) | **deep-link only** |
| **Offres partenaires** | `app/teen/offres/page.tsx` | réel | orphelin (0 lien `.tsx`) |
| **Annuaire partenaires** | `app/teen/partenaires/page.tsx` | réel | orphelin |
| **Friend-défis** | `app/teen/quests/friend-defis` | réel | enterré sous quests, masqué de la bottom-nav |
| **Corvées (« défi des parents »)** | `app/teen/chores/page.tsx` | réel | accessible **seulement** via nudge conditionnel avatar-coach |
| **Historique achats / codes retrait** | `app/teen/shop/history/page.tsx` | réel | orphelin (codes de retrait introuvables) |
| **VIP / xp-value / activity / feed / messages / create / friends** | divers | réel | orphelins ou deep-link |
| **Wellbeing** | `app/teen/wellbeing/page.tsx` | **stub (« à venir »)** | orphelin — ne devrait pas être présenté comme feature |

**Constat** : ~50 des 67 écrans ne sont atteignables par AUCUNE navigation persistante. Trois domaines entiers (économie : savings/allowance/history ; orientation : pathways/mentors/sessions/stages ; services : food/rides/anniversaire) sont invisibles malgré un backend réel et câblé.

---

## 3. Sur-fragmentation : trop de destinations concurrentes pour un même besoin

| Besoin | Destinations concurrentes | Verdict |
|---|---|---|
| **Crew / club / circle** | `/teen/circles`, `/teen/crews` (308→circles), `/gamification/crews` (308→circles) ; + 2 backends fusionnés sur une URL (`crews` vs `circles` messaging) | 5 termes (Circles/Crew/Club/Crew Battle/Cercle), parcours crew **cassé** (route vers `/teen/circles/{crewId}` mais détail vérifie `circle_members` → boucle) |
| **Économie / boutique** | `/teen/wallet?tab=shop` (canon), `/teen/shop` (redirect), `/teen/rewards` (redirect), `/gamification/boutique` (308) ; + sidebar « Mes Coins » + « Récompenses » + quick-access « Shop XP » | 1 écran réel, **3 noms + 4 routes** |
| **Carte / explore** | `/teen/map` (redirect) → `/teen/social?tab=map` ; MapPreview pointe directement `/teen/social?tab=map` ; bottom-nav « Explore » → `/teen/map` | routing à 2 niveaux, `isActive` cassé |
| **Défi / quête / mission** | `/teen/defis-physiques` (sidebar), `/teen/quests` onglet Corps (même table), `/teen/challenges` (redirect→quests?tab=body), `/teen/chores`, `/teen/quests/friend-defis` | défis physiques rendus à 2 endroits ; vocabulaire « corvée/mission/défi/quête » non normalisé |
| **Achievements / badges** | `/teen/achievements` (redirect cassé), `/gamification/collections` (redirect), `/teen/profile?tab=achievements` (**onglet inexistant**), `/teen/wallet?tab=badges` (seul réel) | 4 chemins, seul le dernier fonctionne |
| **Hub social** | `/teen/social` (orphelin) duplique circles + friends + leaderboard + map et y re-route | couche d'indirection morte |
| **Amis** | `/teen/friends` + onglet Friends de `/teen/social` (même API) | 2 écrans amis |
| **Messagerie** | `/teen/messages` (DM) vs `/teen/circles/[id]` (chat cercle) | 2 systèmes sans inbox unifiée |
| **Anniversaire** | `/teen/birthday` (vitrine) + `/anniversaires` (parent) + `/anniversaires/organiser` (ado) | 2 configurateurs divergents, packs/prix différents |

**Pattern systémique** : chaque besoin a été ré-implémenté 2 à 5 fois au fil des waves, sans jamais retirer l'ancien — d'où une nav plate de 15 entrées qui n'expose ni l'essentiel ni le cohérent.

---

## 4. Structure de navigation cible (5 piliers max + hubs)

**Principe directeur** : 1 besoin = 1 destination canonique. Bottom-nav et sidebar partagent **les 5 mêmes piliers** (parité mobile/desktop). Chaque pilier est un **hub** qui regroupe les écrans orphelins par onglets/sections. Tout le reste devient une sous-route d'un hub, jamais une entrée de nav de premier niveau.

### Correctif systémique préalable (P0, bloquant)
Déplacer `<MobileBottomNav />` de `components/teen/dashboard/teen-dashboard-content.tsx:238` vers **`app/teen/layout.tsx`** (à côté de `TeenSidebar`). Sans ça, aucune restructuration ne tient sur mobile. Aligner ensuite les 5 items de la bottom-nav sur les 5 piliers ci-dessous, en pointant sur les **URL canoniques** (pas `/teen/map` ni `/teen/shop` qui sont des redirects). Remplacer le Sheet à 4 liens du header par ces mêmes 5 piliers.

### Les 5 piliers cibles

**1. Accueil** — `/teen` (icône Home)
Dashboard allégé = 1 barre devise compacte (TwinCurrencyGauge, source unique) + 1 *next best action* (PriorityMission/quiz du jour) above-the-fold. Supprimer OrbitingTokens chiffré, StatHero redondant, MarketplaceOverlay (mock), fallbacks SocialFeed/MapPreview. Plus de doublons de stats.

**2. Jouer** — `/teen/quests` (icône Target/Zap)
Hub unique des contenus à gagner de l'XP. Onglets : **Quêtes** (quiz + passion), **Quiz** (`/teen/quiz` — remonter la feature la + aboutie, aujourd'hui invisible), **Défis physiques** (`/teen/defis-physiques` — fusionner, ne plus exposer en double), **Jeux** (`/teen/games` — ou masquer tant que disabled), **Défis amis** (`/teen/quests/friend-defis`). Retirer `/teen/quests` de `hiddenPaths` (mobile-nav.tsx l.164).

**3. Social** — `/teen/social` (icône Users) — en faire le VRAI hub
Onglets : **Crew** (`/teen/circles`, unifier le backend, réparer la boucle de routing), **Amis** (`/teen/friends` — supprimer le doublon), **Feed/Activité** (`/teen/feed` + `/teen/activity`), **Messages** (`/teen/messages` + chat cercle, inbox unifiée), **Classement** (`/teen/leaderboard`, renommé « Top créateurs »). Figer le mot unique « Crew ». Supprimer les écrans dédiés que ce hub absorbe.

**4. Services** — nouveau hub `/teen/services` (icône Compass/MapPin)
Regroupe TOUTE la grappe orpheline « vie réelle » : **Events/Agenda** (`/teen/events`→actionnable ou fusion `/agenda`), **Transport** (`/teen/rides`), **Food** (`/teen/food`), **Anniversaire** (`/teen/birthday`→parcours unique), **Orientation** (`/teen/pathways` + `/teen/mentors` + `/teen/mentor-sessions` + `/teen/internships`), **Aide scolaire** (`/teen/aide-scolaire`), **Offres/Partenaires** (`/teen/offres` + `/teen/partenaires`, reliés). C'est ici qu'on dé-orphelinise ~15 écrans réels d'un coup.

**5. Wallet** — `/teen/wallet` (icône Coins) — déjà bien consolidé
Onglets existants Coins/Boutique/Badges + **rattacher les orphelins économie** : Épargne (`/teen/savings`), Allowance (`/teen/wallet/allowance`), Historique+codes retrait (`/teen/shop/history`), VIP (`/teen/vip-card`), modèle XP (`/teen/xp-value`). Faire pointer sidebar « Mes Coins »/« Récompenses »/« Mes Achievements » directement ici (supprimer les cascades de redirects et l'onglet `?tab=achievements` cassé → `?tab=badges`).

### Profil/Paramètres
Accès via le header (avatar dropdown, déjà présent) — pas un 6e pilier. Réparer l'onglet Paramètres (langue/notifs/privacy actuellement vides) et le lien achievements.

### Ce qui disparaît de la nav de premier niveau
Les 15 entrées plates → **5 piliers**. `Partager`, `Ma Streak`, `Games`, `Parcours Passion` (qui n'est qu'un redirect vers quests), `Mes Coins`, `Récompenses`, `Mes Achievements`, `Classement` deviennent des **sections de hub**, pas des entrées. Quick-access du dashboard : réduire à des raccourcis vers les 5 hubs (supprimer le doublon Clubs/Crew Battle, les badges NEW/HOT/LIVE en dur, et le verbe « Convertis tes XP » contraire au modèle devise).

---

**Fichiers à modifier en priorité** : `C:\Users\Shadow\Desktop\NIVY\app\teen\layout.tsx` (monter la bottom-nav globalement), `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\mobile-nav.tsx` (aligner 5 piliers + URL canoniques + retirer `/teen/quests` de hiddenPaths), `C:\Users\Shadow\Desktop\NIVY\components\dashboard\teen\sidebar.tsx` (15→5 piliers), `C:\Users\Shadow\Desktop\NIVY\components\dashboard\teen\header.tsx` (Sheet à 4 liens → 5 piliers + retirer le `?tab=achievements` cassé), `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\quick-access-grid.tsx` (doublon Clubs/Crew Battle, badges en dur), `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\teen-dashboard-content.tsx:238` (retirer le montage local de MobileBottomNav).

### 2.2 Modèle économique & wallet

I have enough to produce the analysis. Here it is.

---

# Analyse de l'économie Nivy — devises, confusions, boutiques, wallet

## 1. Cartographie des devises réellement présentes

| Devise / instrument | Définition censée s'appliquer | Où elle apparaît réellement | Source de vérité |
|---|---|---|---|
| **XP** | Mérite, ne s'achète JAMAIS, ne se convertit JAMAIS | Gauge, boutique (prix en `xp_cost`), cashback food/rides, défis amis (mise), avatar skins, quiz, niveaux | RPC `add_xp_to_user`, `user_xp.total_xp`, `getTeenDashboardData().xp` |
| **Coins (⊙)** | Monnaie chargée par les parents, 1 DH = 100 coins (peg verrouillé) | Gauge, épargne, allowance, food/rides (paiement), badge partenaires « accepte tes coins » | `user_coins.balance` + vue `user_coins_spendable` |
| **DH (dirham)** | Argent réel | Peg des coins, anniv (achat), rides/food, et — illégalement — « valeur » et « remise » des XP | mélangé (voir §2) |
| **« XP-as-DH » (taux de conversion)** | N'existe PAS dans la charte | `lib/payments/xp-converter.ts` (`XP_TO_DH_RATE = 0.10`), bandeau wallet, `renderPriceTag`, checkout réservation, page xp-value | **3 valeurs contradictoires** |
| **Crédits / lots de roue** | — | **Aucun** : `app/gamification/roue/page.tsx` est un `permanentRedirect('/teen')` (feature retirée, trigger `wheel_streaks` cassé). Plus aucune devise « lot/crédit » vivante. | n/a (mort) |
| **Réductions partenaires** | Offres marchandes | `app/teen/offres`, badge `partenaires`, `MarketplaceOverlay` (mock) libellées tantôt en `-X%`/DH, tantôt en « XP » (Nike 500 XP) | incohérent |

**Constat clé** : il y a **3 vraies devises** (XP, coins, DH lié au peg) + **1 pseudo-devise illégale** (XP convertie en DH). La roue et les « crédits » sont morts. Les réductions partenaires ne sont pas une devise mais sont parfois libellées en XP, ce qui crée une 5e confusion.

## 2. Confusions / risques

**a) Violation de la règle « XP ne se convertit jamais » — institutionnalisée dans le code.**
`lib/payments/xp-converter.ts` est un convertisseur XP↔DH complet (`convertXPToDH`, `convertDHToXP`, `calculateHybridPayment`, seuils `PARENTAL_APPROVAL_THRESHOLD_XP=1000`, `MIN_XP_FOR_PAYMENT=50`). Il contredit frontalement la charte. Il est consommé par :
- `app/teen/wallet/page.tsx:7,67-69` (injecte `xpToDhRate` + `xpValueDH` dans le wallet)
- `app/teen/wallet/wallet-hub-client.tsx:13,96-100,342-357` : bandeau « Au shop : 1 XP = 0.10 DH de remise » et `renderPriceTag` qui affiche « ≈ X DH » sous chaque prix XP — **sur le même écran que la `TwinCurrencyGauge` qui proclame « XP ne se convertit pas »**.

**b) Trois taux de change XP→DH contradictoires.**
- `lib/payments/xp-converter.ts:10` → **10 XP = 1 DH** (`0.10`)
- `app/teen/wallet/wallet-hub-client.tsx:100` → **10 XP = 1 DH** (cohérent avec le converter)
- `app/teen/xp-value/page.tsx:88,339,357,360` → **100 XP = 1 DH** (`xp_rate` défaut = 100)
→ Un item à 500 XP « vaut » **50 DH** dans le wallet et **5 DH** sur xp-value. La doc HowItWorks de xp-value (`page.tsx:324`) affirme par ailleurs que le cashback XP est « la seule passerelle » entre devises — ce qui contredit le bandeau de remise du wallet.

**c) « spendable » vs « balance » — deux sources de vérité.**
- Le wallet recalcule le spendable **à la main** : `app/teen/wallet/page.tsx:34-50` somme `savings_goals.current_saved_coins` (status active) et fait `balance - locked`.
- L'épargne lit la **vue dédiée** `user_coins_spendable` (`total`, `locked_in_goals`, `spendable`) : `app/teen/savings/page.tsx:35-40`.
→ Deux algorithmes pour le même chiffre. Risque de divergence (ex. si un goal `achieved` non retiré est compté différemment). La vue `user_coins_spendable` est la source correcte ; le wallet devrait la consommer.

**d) Mismatch achat vs historique (devise).**
La boutique débite des **XP** (`purchaseReward` → RPC `purchase_reward`, `gamification-system/features/shop/actions.ts:163-167` ; champ `ShopReward.xp_cost`, `schema.ts:163`), mais `app/teen/shop/history` affiche `coins_spent / ⊙`. L'achat est en XP, son historique en coins.

**e) Les coins n'ont AUCUN point de dépense.**
La gauge met le solde coins en grand (`CoinsTab` StatHero, `wallet-hub-client.tsx:161-168`), l'épargne et l'allowance les alimentent, mais **toutes les boutiques débitent des XP**. Les seules dépenses réelles de coins sont hors wallet (food/rides). Le solde coins du wallet est donc un **cul-de-sac fonctionnel**.

**f) `xp_rate` codé en dur dans le mock xp-value.**
`app/teen/xp-value/page.tsx:108,110,133-134,357,369` fabrique « valeur DH », ROI et projections (`lifetime/xp_rate`) — exactement la conversion interdite, présentée comme une fonctionnalité.

## 3. Boutiques / points de dépense concurrents

| Surface | URL | Devise débitée | Statut |
|---|---|---|---|
| Boutique canonique | `/teen/wallet?tab=shop` | XP (`purchase_reward`) | **Canon** (réel, RPC `get_shop_rewards`) |
| Shop legacy | `/teen/shop` | — | Redirect → `?tab=shop` |
| Rewards legacy | `/teen/rewards` | — | Redirect → `?tab=shop` |
| Boutique gamification | `/gamification/boutique` | — | Redirect 308 → `?tab=shop` (`boutique/page.tsx`), `shop-client.tsx` orphelin (code mort) |
| Roue | `/gamification/roue` | lots (mort) | Redirect 308 → `/teen` |
| Checkout réservation | `/teen/shop/checkout` | XP + cash (hybride) | Réel mais sous `/teen/shop` (confusion avec la boutique récompenses) |

**Verdict** : la **consolidation des boutiques est déjà faite** (1 boutique réelle + 3 stubs redirect + roue morte). Le travail restant n'est pas de fusionner des écrans mais de :
1. **Trancher la devise de la boutique** : XP nus (et supprimer les « ≈ DH ») OU créer un onglet/rail « payer en coins » pour donner une destination aux coins.
2. **Séparer le checkout réservation** (`/teen/shop/checkout`) de la notion « boutique récompenses » — ce sont deux concepts (rail XP+cash via `calculateHybridPayment` vs redemption XP pure).
3. Mentionner (sans supprimer) le code mort : `app/gamification/boutique/shop-client.tsx`, et dans le converter les fonctions hybrides utilisées seulement par le checkout réservation.

## 4. Le wallet actuel : forces et faiblesses

### Forces (« bien »)
- **Consolidation réussie** : un hub unique 3 onglets (Coins/Boutique/Badges, `wallet-hub-client.tsx:56-60`), 3 anciennes routes neutralisées en redirects, roue retirée proprement.
- **`TwinCurrencyGauge`** : référence pédagogique du modèle double-devise (XP et coins côte à côte, **aucune flèche de conversion**) — `wallet-hub-client.tsx:83-91`. C'est le composant à généraliser.
- **Boutique réelle** : alimentée par le RPC canon `get_shop_rewards` (`shop/actions.ts:74-79`), achat serveur via `purchase_reward`, plus de mock.
- **Épargne + allowance propres et cohérentes** : tout est en coins avec peg 1 DH = 100 coins respecté (`savings/page.tsx`, `wallet/allowance/page.tsx:61,111`, `goal-form.tsx:78-81`).
- Empty-states honnêtes (badges, transactions) — les placeholders fictifs ont été retirés (`wallet-hub-client.tsx:526`).

### Faiblesses concrètes (« perfectible »)
1. **Contradiction de devise au cœur de l'écran** : la gauge dit « XP ≠ DH », le bandeau juste en dessous (`:96-100`) et chaque prix (`renderPriceTag :342-357`) affichent « ≈ DH ». Auto-contradiction visible en un seul scroll.
2. **Coins = cul-de-sac** : solde coins affiché en grand (StatHero `:161-168`) sans aucun onglet pour les dépenser.
3. **Double source du spendable** : recalcul manuel `page.tsx:34-50` au lieu de la vue `user_coins_spendable` déjà utilisée par l'épargne.
4. **Double fetch** : `page.tsx` charge déjà xp/coins/streak côté serveur, mais `CoinsTab` et `BadgesTab` refetch `/api/teen/wallet` côté client (`:136,512`).
5. **Orphelins de l'économie non liés depuis le wallet** : ni épargne (`/teen/savings`), ni allowance (`/teen/wallet/allowance`), ni historique d'achats (`/teen/shop/history`), ni xp-value ne sont accessibles depuis le hub (seuls VIP et xp-value ont un lien). Les **codes de retrait** des récompenses (history) sont introuvables après achat.
6. **Taux incohérent avec xp-value** (10 vs 100 XP/DH) : un même solde XP montre deux valeurs DH selon l'écran.

### Recommandations prioritaires
- **P0 — Trancher la règle XP** : si « XP ne se convertit jamais », retirer le bandeau `:96-100`, le « ≈ DH » de `renderPriceTag`, l'affordability banner DH (`:375-379`) et la page xp-value (ROI/projections). Sinon, fixer **un seul** taux dans `xp-converter.ts` et corriger `xp_rate=100` → `10` partout (`xp-value/page.tsx:339,360` + API `/api/payments/xp`).
- **P0 — Donner une destination aux coins** OU clarifier que les coins ne servent qu'aux réservations/food/rides/épargne.
- **P1 — Source unique du spendable** : remplacer le recalcul `wallet/page.tsx:34-50` par la vue `user_coins_spendable`.
- **P1 — Câbler les orphelins économie** dans le hub (Épargne, Allowance, Historique d'achats, VIP) et aligner l'historique sur la devise réelle (XP, pas `coins_spent`).

**Fichiers cités** : `C:\Users\Shadow\Desktop\NIVY\lib\payments\xp-converter.ts`, `C:\Users\Shadow\Desktop\NIVY\gamification-system\features\shop\actions.ts`, `...\shop\schema.ts`, `C:\Users\Shadow\Desktop\NIVY\app\teen\wallet\page.tsx`, `...\wallet\wallet-hub-client.tsx`, `...\wallet\allowance\page.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\teen\savings\page.tsx`, `...\savings\new\page.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\teen\goal-form.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\teen\xp-value\page.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\gamification\roue\page.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\gamification\boutique\page.tsx`.

### 2.3 Cohérence terminologique

J'ai confirmé les libellés exacts. Les findings JSON couvrent déjà le reste de façon exhaustive. Voici l'analyse de cohérence terminologique.

---

# Analyse de cohérence terminologique — Nivy (espace ado)

Constat global : l'app utilise **au moins 4 termes par concept** et **mélange français et anglais dans la même barre de nav**. Pour des ados marocains 13-17 ans, chaque mot supplémentaire pour la même chose augmente la charge cognitive et casse le modèle mental. Ci-dessous, les familles de termes concurrents, le terme canonique recommandé, et les alias à retirer.

---

## 1. Familles de termes concurrents

### Famille A — Le social / groupe : `club` / `circle` / `crew` / `cercle` / `collection`

| Terme | Où il apparaît | Backend réel |
|---|---|---|
| **Circles** | sidebar (`sidebar.tsx:31`), titre de page `/teen/circles` | `circles` / `circle_members` (messagerie) |
| **Crew** | bottom-nav (`mobile-nav.tsx:57`), titre page « Tes crews », composant `CrewHub` | `crews` / `crew_members` (gamification) |
| **Clubs** | quick-access carte 1 (`quick-access-grid.tsx:292`) | aucun — pointe vers `/teen/circles` |
| **Crew Battle** | quick-access carte 2 (`quick-access-grid.tsx:304`) | aucun — pointe aussi vers `/teen/circles` (doublon d'URL) |
| **Cercle de discussion** | sous-section de `/teen/circles` (`CirclesMessagingSection`) | `circle_messages` |
| **Collection** | `/gamification/collections` (sunset, redirect) | ancien terme achievements |

**Gravité : critique.** Non seulement 6 mots pour ~2 concepts, mais les deux backends (`crews` vs `circles`) sont fusionnés sur une seule URL, ce qui casse un parcours réel (créer un crew route vers `/teen/circles/{crewId}` que la page détail rejette car elle vérifie `circle_members`). « Clubs » et « Crew Battle » pointent vers la même page sans surface dédiée (badges HOT/LIVE mensongers).

---

### Famille B — La tâche à accomplir : `défi` / `quête` / `mission` / `challenge` / `corvée`

| Terme | Où il apparaît | Backend réel |
|---|---|---|
| **Quêtes** | quick-access (`quick-access-grid.tsx:281`), hub `/teen/quests` (h1 « Tes quêtes ») | agrégat `unified-quest-engine` |
| **Mission** | `PriorityMission` (dashboard), description quick-access « Missions quotidiennes », onglet Stats profil `statMissions` | `daily_missions` / agrégat |
| **Défis Physiques** | sidebar (`sidebar.tsx:28`), `/teen/defis-physiques` | `physical_challenges` |
| **Défis amis** | `/teen/quests/friend-defis`, « Défie ton crew » | `friend_challenges` |
| **Corvée** | `/teen/chores` titre « Mes corvées », sous-titre « missions familiales » | `parent_chores` |
| **Mission** (côté parent) | `/parent/chores/new` : eyebrow « Créer une mission », titre « Nouvelle corvée » | `parent_chores` |
| **Challenge** | `/teen/challenges` (redirect), `challenge_kind` | redirects legacy |
| **Battle** | « Crew Battle » (quick-access) | inexistant |

**Gravité : critique.** Un même objet `parent_chores` est appelé « corvée » + « mission » + « tâche » + (PO) « défi des parents » sur 2 écrans. Le hub mélange « quête » et « défi » dans le même header (« Ton crew · Défis » / « Tes quêtes »).

---

### Famille C — Le parcours d'apprentissage : `parcours` / `pathway` / `passion`

| Terme | Où il apparaît | Cible réelle |
|---|---|---|
| **Parcours Passion** | sidebar (`sidebar.tsx:29`) | redirect → `/teen/quests?tab=creative` (PAS un écran passions) |
| **Parcours** (carrière) | `/teen/pathways` titre « Tes parcours » | `career_pathways` (réel, orphelin) |
| **Parcours** (legacy) | `/gamification/parcours` | redirect → `/teen/quests` |
| **Passion** | tutoriels passion agrégés dans quests | `passion_tutorials` |

**Gravité : élevée.** Le mot « parcours » désigne 3 destinations différentes (quests créatif, carrière, quests générique). L'entrée sidebar « Parcours Passion » promet une section dédiée et livre l'onglet créatif des quêtes.

---

### Famille D — L'économie / dépense : `shop` / `boutique` / `wallet` / `récompenses` / `coins`

| Terme | Où il apparaît | Cible réelle |
|---|---|---|
| **Shop XP** | quick-access (`quick-access-grid.tsx:268`), `xp-purchase-power` | `/teen/shop` → redirect `/teen/wallet?tab=shop` |
| **Boutique** | onglet du wallet hub, `/gamification/boutique` | `/teen/wallet?tab=shop` (canon) |
| **Récompenses** | sidebar (`sidebar.tsx:36`), `/teen/rewards` | redirect → `/teen/wallet?tab=shop` |
| **Wallet** | `/teen/wallet` (hub à 3 onglets) | canon |
| **Mes Coins** | sidebar (`sidebar.tsx:34`) | `/teen/coins` → redirect `/teen/wallet` |

**Gravité : élevée.** 4 libellés (« Shop XP » / « Boutique » / « Récompenses » / « Mes Coins ») pour le même hub `/teen/wallet`, avec des cascades de redirects. Pire, « Récompenses » connote du gratuit/mérité alors que l'écran est payant en XP, et « Shop XP » + « Convertis tes XP » suggère une conversion interdite par la charte.

---

## 2. Terme canonique recommandé + alias à retirer

> Principe : **un mot exposé à l'utilisateur par concept**, en français ado-friendly, court, marocain-compatible. Les noms de tables/backend peuvent rester techniques mais ne doivent JAMAIS fuiter dans l'UI.

### Famille A → **« Crew »**
- **Canonique : « Crew »** (déjà utilisé, court, ado, conserve le côté « ma bande ». Préférable à « Cercle » trop formel et à « Club » qui évoque l'institutionnel).
- Alias à retirer de l'UI : `Circles`, `Cercle de discussion`, `Clubs`, `Crew Battle`, `Collection`.
- Actions de nommage :
  - Renommer l'entrée sidebar « Circles » → **« Crew »** (aligner avec la bottom-nav).
  - Supprimer la carte quick-access « Clubs » (doublon d'URL) ; renommer « Crew Battle » → la pointer vers `/teen/quests/friend-defis` (la vraie feature de défi) OU supprimer si la feature n'existe pas.
  - La messagerie de groupe (`circles`/`circle_messages`) doit s'appeler **« Discussions »** dans l'UI, distincte des Crews — ne plus dire « Cercle ».
  - « Collection » est déjà sunset → garder le redirect, ne plus l'employer.

### Famille B → **« Défi »** (P2P + parents) / **« Quête »** (contenu app)
Ce concept mérite **2 mots distincts** parce qu'il y a 2 réalités :
- **« Quête »** = contenu produit par l'app (quiz, passion, défis physiques agrégés dans le hub). Canonique pour `/teen/quests`.
- **« Défi »** = affrontement/engagement avec une personne (ami ou parent). Canonique pour `friend_challenges` ET `parent_chores`.
- **Cas parent_chores → « Défi des parents »** (terme du PO, ado-friendly et valorisant ; abandonner « corvée » qui est dévalorisant et « mission » qui est ambigu).
- Alias à retirer : `mission`, `corvée`, `challenge`, `battle`, `tâche`.
- Actions de nommage :
  - `/teen/chores` + `/parent/chores/new` : remplacer « Mes corvées » / « Nouvelle corvée » / « Créer une mission » par **« Défis des parents »** / **« Nouveau défi »** des deux côtés.
  - `PriorityMission` (dashboard) et la description quick-access « Missions quotidiennes et défis » → **« Quête du jour »** / **« Quêtes quotidiennes »**.
  - Onglet Stats profil `statMissions` → libeller **« Quêtes complétées »**.
  - Conserver **« Défis Physiques »** (sidebar) car c'est bien un défi, mais éviter de le re-libeller « Quête Corps » dans le hub : choisir un seul mot.

### Famille C → **« Passions »** (créatif) / **« Orientation »** (carrière)
- Réserver **« Parcours »** à un seul usage, idéalement **l'orientation carrière** (`/teen/pathways`), ou abandonner totalement le mot s'il prête trop à confusion.
- **Renommer l'entrée sidebar « Parcours Passion » → « Passions »** (ou « Créatif ») — et idéalement la pointer vers un vrai écran, pas un redirect vers quests.
- Exposer `/teen/pathways` sous le libellé **« Orientation »** (et non « Parcours ») pour le dé-orphéliniser sans réutiliser le mot ambigu.
- Alias à retirer de l'UI : `Parcours Passion`, `parcours` (au sens quests), `pathway` (anglais).

### Famille D → **« Wallet »** comme hub, **« Boutique »** comme onglet
- **Canonique hub : « Wallet »** (ou « Mon porte-monnaie » si on veut tout-français ; « Wallet » est acceptable et déjà installé).
- **Canonique onglet dépense : « Boutique »** (neutre, n'implique ni conversion ni gratuité).
- Alias à retirer : `Shop XP`, `Récompenses`, `Mes Coins` (comme libellés de nav séparés).
- Actions de nommage :
  - Sidebar : fusionner « Mes Coins » + « Récompenses » → une seule entrée **« Wallet »** pointant directement sur `/teen/wallet` (et `/teen/wallet?tab=shop` pour la boutique), supprimant les cascades de redirects.
  - quick-access « Shop XP » → **« Boutique »**, href direct `/teen/wallet?tab=shop`, et remplacer « Convertis tes XP en récompenses » par **« Dépense tes XP »** (« convertir » est interdit par la charte double-devise).

---

## 3. Incohérences FR/EN dans la navigation

La sidebar (`sidebar.tsx:24-40`) et la bottom-nav (`mobile-nav.tsx:43-68`) **mélangent les deux langues**, parfois dans la même barre.

### Sidebar (15 entrées) — état actuel
`Dashboard` (EN), `Events` (EN), `Aide Scolaire` (FR), `Défis Physiques` (FR), `Parcours Passion` (FR), `Games` (EN), `Circles` (EN), `Partager` (FR), `Mes Achievements` (EN+FR hybride), `Mes Coins` (FR), `Ma Streak` (EN+FR hybride), `Récompenses` (FR), `Classement` (FR), `Mon Profil` (FR), `Paramètres` (FR).

→ **6 anglicismes** (`Dashboard`, `Events`, `Games`, `Circles`, `Achievements`, `Streak`) dans une nav majoritairement française. « Mes Achievements » et « Ma Streak » sont même des hybrides (possessif FR + nom EN).

### Bottom-nav (4 entrées) — **100 % anglais**
`Home`, `Explore`, `Crew`, `Profile`.

→ Asymétrie totale avec la sidebar française : `Home` ≠ `Dashboard`, `Profile` ≠ `Mon Profil`. Le même utilisateur voit deux mots pour l'accueil (Dashboard/Home) et deux pour le profil (Mon Profil/Profile) selon desktop/mobile.

### Recommandation : tout-français ado-friendly, identique desktop ↔ mobile

| Actuel (sidebar / bottom-nav) | Canonique recommandé |
|---|---|
| `Dashboard` / `Home` | **Accueil** |
| `Events` | **Événements** (ou « Sorties » si plus ado) |
| `Games` | **Jeux** |
| `Circles` / `Crew` | **Crew** *(seul anglicisme conservé, car identitaire et installé)* |
| `Mes Achievements` | **Mes trophées** (ou « Mes badges ») |
| `Ma Streak` | **Ma série** (ou garder « Streak » si jugé installé — mais alors l'assumer comme terme produit, pas hybride) |
| `Explore` | **Explorer** |
| `Profile` / `Mon Profil` | **Mon profil** |
| `Récompenses` + `Mes Coins` | **Wallet** *(2e anglicisme toléré, hub installé)* |
| `Parcours Passion` | **Passions** |

Règle simple : **viser le tout-français** sauf 2-3 termes-marques assumés (`Crew`, `Wallet`, éventuellement `Streak`) qui font partie de l'identité produit. Si ces 3 restent en anglais, alors les supprimer de TOUTE forme hybride (jamais « Ma Streak » / « Mes Achievements ») et les traiter comme des noms propres.

### Cohérence supplémentaire à corriger
- **`Home` (bottom-nav) vs `Dashboard` (sidebar)** pour la même URL `/teen` → un seul mot : **Accueil**.
- **`Profile` vs `Mon Profil`** pour `/teen/profile` → **Mon profil** partout.
- **Glyphe coins non standardisé** : `⊙` (partenaires, gauge, allowance) vs icône lucide `Coins` (header, profil) — choisir un seul symbole pour la devise coins dans toute l'UI.
- **`Events` (EN, teen) vs `événement`/`agenda` (FR, parent/admin)** : harmoniser sur **Événements**.

---

## Synthèse des actions prioritaires (nommage seul)

1. **Crew** : 6 mots → 1. Renommer sidebar « Circles » → « Crew » ; supprimer la carte « Clubs » ; rediriger/retirer « Crew Battle ».
2. **Défi / Quête** : trancher « Quête » (contenu app) vs « Défi » (P2P + parents) ; renommer « corvée/mission » → **« Défis des parents »** côté teen ET parent.
3. **Parcours** : libérer le mot. Sidebar « Parcours Passion » → **« Passions »** ; `/teen/pathways` → **« Orientation »**.
4. **Wallet** : fusionner « Mes Coins » + « Récompenses » + « Shop XP » → un seul **« Wallet »** (hub) / **« Boutique »** (onglet) ; remplacer « Convertis tes XP » par « Dépense tes XP ».
5. **FR/EN** : franciser la nav (Accueil/Événements/Jeux/Mon profil/Explorer/Mes trophées), aligner desktop ↔ mobile, ne garder en anglais que 2-3 termes-marques assumés (Crew, Wallet) — jamais en hybride.

Fichiers nav porteurs de ces libellés : `C:\Users\Shadow\Desktop\NIVY\components\dashboard\teen\sidebar.tsx` (l.24-40), `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\mobile-nav.tsx` (l.43-68), `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\quick-access-grid.tsx` (l.266-316).

### 2.4 État réel des features (reality check)

All claims verified. `MobileBottomNav` is only in `teen-dashboard-content.tsx` (and its own definition) — never in `app/teen/layout.tsx`, confirming the mobile-nav-orphan systemic issue. The schema-drift memory confirms the `profiles.username`/`bio`, `bookings`, and `anniv_orders` claims. Producing the reality table now.

---

# TABLEAU DE L'ÉTAT RÉEL — Nivy (reality check)

Source : `dataState` des findings, recoupé avec la mémoire `schema-drift-live-vs-code.md` et vérification directe du code (4 claims load-bearing confirmés : pas d'onglet `achievements` dans `profile-hub-client.tsx` ; bug `deliveryAddress`≠`body.address` dans food ; boutons games `disabled`+« bientôt » ; mocks MarketplaceOverlay/SocialFeed/MobileBottomNav).

## 1. Écrans regroupés par état réel

### REAL (donnée réelle, câblé, fonctionnel)
| Écran | Domaine |
|---|---|
| `app/teen/page.tsx` | Dashboard (fetch réel, mais empile mocks below-the-fold) |
| `components/teen/avatar-coach.tsx` | Dashboard (CTA réel ; ChoreNudge `bg-lime text-lime` = texte invisible) |
| `components/teen/twin-currency-gauge.tsx` | Wallet (référence devise) |
| `components/teen/dashboard/online-friends.tsx`, `crew-hub.tsx` | Dashboard |
| `app/teen/wallet/page.tsx` + `wallet-hub-client.tsx` | Wallet (mais contradiction devise interne) |
| `app/teen/wallet/allowance/page.tsx`, `savings/page.tsx`, `savings/new/page.tsx` | Économie (orphelins) |
| `app/teen/quiz/page.tsx`, `[id]/page.tsx`, `[id]/quiz-runner-client.tsx`, `history/page.tsx` | Quiz (seul pôle pleinement jouable) |
| `app/teen/circles/page.tsx`, `circles/[circleId]/page.tsx`, `friends/page.tsx`, `feed/page.tsx`, `feed/[id]/page.tsx`, `social/page.tsx`, `activity/page.tsx`, `messages/page.tsx`, `create/page.tsx` | Social (réels mais orphelins/parcours cassé) |
| `app/teen/quests/friend-defis/page.tsx`, `friend-defis/new/page.tsx` | Défis amis (réel mais mise XP = violation charte) |
| `app/partner/anniversaires/page.tsx` | Anniversaire partenaire (lecture lean réelle) |
| `app/teen/rides/page.tsx`, `rides/request/page.tsx`, `rides/request/request-form.tsx` | Transport (réel, orphelin) |
| `app/teen/food/page.tsx`, `[partner_id]/page.tsx`, `food/order/[id]/page.tsx` | Nourriture (réel, orphelin, bug adresse + fuite ownership) |
| `app/teen/chores/page.tsx`, `app/parent/chores/new/page.tsx` | Défi des parents = corvées (réel, orphelin) |
| `app/teen/defis-physiques/page.tsx` | Défis physiques (réel) |
| `app/teen/aide-scolaire/page.tsx`, `tutors/page.tsx`, `grades/page.tsx` | Éducation |
| `app/teen/pathways/page.tsx`, `mentors/page.tsx`, `mentors/[id]/page.tsx`, `mentor-sessions/page.tsx`, `internships/page.tsx` | Orientation (réels, orphelins, stages = cul-de-sac sans détail) |
| `app/teen/leaderboard/page.tsx` | Progression (réel mais mal étiqueté « XP global ») |
| `app/teen/profile/edit/page.tsx` | Profil (aligné `teens.pseudo`) |
| `app/teen/offres/page.tsx`, `partenaires/page.tsx` | Services (réels, orphelins) |

### PARTIAL-MOCK (réel + segments mockés/faux)
| Écran | Mock résiduel (preuve) |
|---|---|
| `components/teen/dashboard/priority-mission.tsx` | Fallback générique « Connexion Quotidienne 50 XP » injecté par `page.tsx` |
| `components/teen/dashboard/quick-access-grid.tsx` | Badges `NEW/HOT/LIVE` codés en dur ; Clubs+Crew Battle → même URL `/teen/circles` |
| `components/teen/dashboard/map-preview.tsx` | Fallback amis Max/Emma/Lucas + events factices |
| `app/teen/profile/page.tsx` + `profile-hub-client.tsx` | Lit `profiles.username`/`bio` **inexistants en live** (drift) ; totalCount=50 en dur |
| `app/teen/xp-value/page.tsx` | Taux `xp_rate=100` (≠ 10 ailleurs) ; projections `lifetime/6` fabriquées |
| `app/anniversaires/page.tsx` | « 150 DH/invité » jamais facturé ; confirmation lit `total_price`/`payment_status` **inexistants** (drift `anniv_orders`) ; paiement CB promis jamais déclenché |
| `app/anniversaires/organiser/page.tsx` | 3 packs en dur ; lit `parent_teen_links.status` (colonne absente) ; approbation parent cassée (pas de RPC birthday) |
| `app/teen/games/page.tsx` | Stats structurellement à 0 (aucun jeu jouable) |
| `app/teen/quests/page.tsx`, `quests/[id]/page.tsx` | Ordre `Math.random()` ; XP event `500` en dur ; `[id]` 404 sur ids agrégés |
| `app/teen/streak/page.tsx` | Milestones/multiplicateur en dur ; `streak_passes` colonne absente → toujours 0 ; bouton `/daily` mort |
| `app/teen/share/page.tsx` | `shareableItems=[]` TODO ; watermark obsolète `teensparty` |
| `gamification-system/features/*` | Leaderboard XP réel mais rendu nulle part ; 2 formules de niveau divergentes |

### FULL-MOCK (vitrine : 100% faux)
| Écran | Preuve |
|---|---|
| `components/teen/marketplace-overlay.tsx` | « Nike Morocco » (l.11) + « Megarama » (l.19) en dur ; CTA sans `href`/`onClick` |
| `app/teen/avatar/page.tsx` | Skins 100% en dur (coûts XP non fonctionnels) ; humeur jamais relue |

### STUB-TODO (coquille « bientôt », pas de feature)
| Écran | Preuve |
|---|---|
| `app/teen/games/games-client.tsx` | Tous CTA `disabled title="Bientôt disponible"` + « bientôt » (vérifié l.134, l.169) ; onglets ne filtrent rien ; aucun runner `/teen/games/[slug]` |
| `app/teen/birthday/page.tsx` | Landing statique ; texte « paie en coins » (anniv facturé en DH) |
| `app/teen/wellbeing/page.tsx` | « à venir » partout, zéro interaction |

### BROKEN (parcours cassé bien que données réelles)
| Écran | Cassure |
|---|---|
| `app/teen/circles/[circleId]/page.tsx` | Boucle : crews routent `/teen/circles/{crewId}` mais la page vérifie `circle_members` (backend distinct) → redirect immédiat |
| `app/teen/profile?tab=achievements` (cible) | **Onglet `achievements` inexistant** dans `profile-hub-client.tsx` (vérifié : tabs = profile/stats/activity/settings) → retombe sur « profile » |
| `app/teen/food/order` (sortie) | Banner succès sans lien → page de suivi orpheline + fuite ownership (service-role sans contrôle teen_id) |

### REDIRECT (stubs de routing, aucun écran propre)
`app/teen/coins`, `shop`, `rewards`, `map`, `crews`, `academic`, `passions`, `challenges`, `achievements`, `notifications`, `settings`, `settings/{language,notifications,privacy,visibility}` · `app/gamification/{boutique,roue,crews,collections,defis,defis-physiques,missions,parcours,aide-scolaire,leaderboard,page}`
> Note : `academic` = `redirect` 302 vs les autres `permanentRedirect` 308 (incohérence) ; `gamification/leaderboard` redirige alors que `layout.tsx:8` le déclare « canonique » (doc≠code).

---

## 2. Features présentées par le PO comme existantes — état réel

| Feature PO | État réel | Preuve (chemin) |
|---|---|---|
| **Club** | **Inexistante en tant que telle** — « club » n'existe nulle part dans le code, juste un label `quick-access` pointant vers `/teen/circles`. Recouvre 2 backends confondus (crews + circles). | `components/teen/dashboard/quick-access-grid.tsx` (label « Clubs » → `/teen/circles`) ; aucune table/route `club` |
| **Anniversaire** | **Partielle / dégradée** — commande `anniv_orders` réelle mais 2 parcours concurrents divergents, paiement CB jamais déclenché, approbation parent **cassée** (pas de RPC birthday), confirmation lit colonnes **inexistantes** (`total_price`, `payment_status`) — drift confirmé en mémoire. | `app/anniversaires/page.tsx` + `features/anniversaires/actions.ts` ; `app/anniversaires/organiser/page.tsx` ; `app/teen/birthday/page.tsx` (stub) ; mémoire `anniv_orders` lean |
| **Quiz sportif** | **Inexistante** — aucun quiz « sport » dans le seed (math/science/history/geography/french/culture uniquement). | `gamification-system/database/migrations/038_quiz_seed_content.sql` |
| **Quiz cérébral** | **Réelle** — = le hub quiz entier (« Cerveau · Quiz »), pleinement jouable, scoring serveur + `quiz_attempts` + `add_xp_to_user`. | `app/teen/quiz/**`, `app/api/teen/quiz/submit/route.ts` |
| **Quiz culture** | **Réelle mais minimale** — 1 seul quiz `culture_general_v1`. | seed `038` |
| **Créer (défi/event) entre amis** | **Réelle mais enterrée + non-conforme** — `friend_challenges` câblé (RPC `create_friend_challenge_v2`), mais profondément orphelin et **mise/escrow d'XP transféré au gagnant = violation « XP ne se convertit/transfère jamais »**. | `app/teen/quests/friend-defis/**` (`stake_xp`/`xp_pot`/`winner_id`) |
| **Transport** | **Réelle mais 100% orpheline** — `request_ride` (RPC 060b) avec coins/parental/couvre-feu, mais absent de toute nav (sidebar/mobile/quick-access) ; statut `requested` non stylé. | `app/teen/rides/**` ; absent de `components/dashboard/teen/sidebar.tsx`, `mobile-nav.tsx` |
| **Nourriture** | **Réelle mais orpheline + bug câblage** — `place_food_order` (RPC 058) réel, **mais l'adresse de livraison est perdue** : client envoie `deliveryAddress`, route lit `body.address` (vérifié `route.ts:73` + `menu-cart-client.tsx:154`). Suivi orphelin + fuite ownership. | `app/teen/food/**` ; `app/api/teen/food/order/route.ts:73` |
| **Défi des parents** | **Réelle mais quasi-introuvable** — = les corvées `parent_chores` (création parent → consommation teen, double récompense DH+XP). Dans **aucune nav persistante** ; seul accès = nudge conditionnel de l'avatar-coach. | `app/parent/chores/new/page.tsx`, `app/teen/chores/page.tsx` |

---

## 3. Top des écrans « vitrine » — risque produit (mock qui fait croire à une feature)

Classés du plus trompeur au moins trompeur :

1. **`app/teen/games/games-client.tsx`** (stub-todo, exposé en SIDEBAR) — La nav promet une feature de jeux ; **100% des boutons sont `disabled` + « bientôt »**, aucun runner n'existe, onglets décoratifs, stats à 0. Pire cas : feature mise en avant qui ne fait littéralement rien.

2. **`components/teen/marketplace-overlay.tsx`** (full-mock, sur la home prod) — Faux partenaires « Nike Morocco / Megarama » en dur, **CTA mort sans `href`/`onClick`**. Fait croire à un partenariat marchand inexistant, devant un ado.

3. **`components/feed/social-feed.tsx`** (partial-mock, sur la home prod) — `fallbackActivities` Amine/Sara/Lina (l.57-88) s'affichent dès que le feed est vide → **faux « fil live » qui ment** à tout teen sans amis.

4. **`components/teen/dashboard/map-preview.tsx`** (partial-mock, home prod) — Amis Max/Emma/Lucas « 500m/1.2km » + events factices en fallback ; **aucune vraie carte** (radar simulé). Promesse de géoloc trompeuse.

5. **`app/teen/avatar/page.tsx`** (full-mock) — Skins facturés en « XP » non fonctionnels (« déblocage réel arrive avec l'économie skins »). Double risque : vitrine **+ confusion devise** (laisse croire que l'XP se dépense).

6. **`app/anniversaires/page.tsx`** (partial-mock) — CTA « Paiement sécurisé par CB ou virement » qui **ne déclenche aucun paiement** ; écran de confirmation affiche des champs vides (`total_price`/`payment_status` absents du schéma live). Promesse de transaction non tenue.

7. **`app/teen/share/page.tsx`** (partial-mock) — Section principale « Tes accomplissements à partager » **toujours vide** (`shareableItems=[]` TODO) ; liens `/share/{id}` non résolus ; watermark `teensparty` obsolète.

8. **`app/teen/birthday/page.tsx`** (stub) — Landing « paie en coins » alors que l'anniv est facturé en **DH** : vitrine + incohérence devise.

9. **`app/teen/streak/page.tsx`** (partial-mock) — Multiplicateur XP (x1→x3) **affiché mais jamais appliqué** au calcul réel ; carte « Protection streak » décorative (`streak_passes` colonne absente → toujours 0). Promesses de mécaniques inexistantes.

10. **`app/teen/profile?tab=achievements`** (broken-vitrine) — Toute la nav (sidebar/header/navbar + redirects `/teen/achievements`, `/gamification/collections`) promet « Mes Achievements » mais **l'onglet n'existe pas** (vérifié) → page vide. Le vrai listing est ailleurs (`/teen/wallet?tab=badges`).

---

## Croisement avec le drift schéma (mémoire `schema-drift-live-vs-code.md`)

- **`profiles`** (live = `id,email,full_name,avatar_url,role,...`, **NO `username`/`bio`**) → confirme que `app/teen/profile/profile-hub-client.tsx` affiche `@username` et carte Bio **toujours vides** ; le `@pseudo` éditable (stocké `teens.pseudo`) n'apparaît jamais sur le profil. `profile/edit` est, lui, **correctement aligné** (`teens.pseudo` + `full_name`).
- **`anniv_orders`** (live lean, **NO `total_price`/`payment_status`/`celebration_date`/`order_type`...**) → confirme la confirmation `/anniversaires` à champs vides et le **code mort** `getMyAnnivOrders`/`getAnnivOrderById`/`cancel`/`updatePayment` qui sélectionnent des colonnes inexistantes (planteront à la réutilisation).
- **`bookings`** (live, **NO `qr_code`/`teen_id`/`event_date`**, une seule FK `event_id`) → confirme que le **QR anniversaire `ANNIV-<id>` n'est ni persisté ni reconnu** par `/api/check-in/*` (qui ne lit que `booking_reference`→`booking_tickets`→`teens`) ; parcours réservation→check-in cassé pour l'anniv. Dispatcher Stripe = **code mort marqué INACTIF**.
- **`parental_approvals`** (`action_type`/`details` jsonb) → `/api/parent/approvals` **ne dispatche pas `birthday`** : l'approbation parentale d'un anniversaire échoue côté parent (limitation connue, honnête).
- **`messages`** lit `teens.first_name/last_name` alors que le champ réel est `teens.pseudo` → risque de « Ami » générique partout (drift non corrigé sur cet écran).

### 2.5 Critique de complétude (écrans/features non couverts)

**Écrans existants non audités :** `app/teen/calendar/page.tsx (+ app/teen/calendar/calendar-client.tsx) — SEUL ecran teen reellement absent de la liste auditee. Ecran calendrier complet et distinct : grille mensuelle navigable (prev/next mois), selection de jour, pastilles d'evenements par type (event/challenge/battle/workshop/sport), badge RSVP, sidebar 'A venir'. Alimente par getTeenDashboardData({eventsLimit:30}). Triple emploi avec /teen/events et /app/agenda (3 surfaces evenements) — concept de duplication non releve.`

**Features/concepts non couverts :**

- Contradiction monnaie majeure NON couverte : lib/payments/xp-converter.ts est un module entier de CONVERSION XP<->DH (XP_TO_DH_RATE=0.10, convertXPToDH/convertDHToXP, calculateHybridPayment 'hybrid XP + DH payments', PARENTAL_APPROVAL_THRESHOLD_XP). Cela contredit frontalement la regle produit 'XP et coins ne se convertissent JAMAIS'. Le fichier est dans la liste auditee mais cette contradiction de modele economique n'apparait pas signalee.
- Incoherence de taux entre fichiers : xp-converter.ts utilise 1 XP = 0.10 DH (10 XP = 1 DH) alors que app/teen/xp-value/page.tsx utilise xp_rate=100 (100 XP = 1 DH) et /api/payments/xp. Deux taux divergents d'un facteur 10 pour la meme conversion XP->DH. Non releve.
- Page xp-value se contredit elle-meme : affiche 'Valeur de tes XP' en DH + calculateur ROI simulant un paiement en XP, tout en contenant un bloc HowItWorks affirmant 'Les XP ne se convertissent jamais en DH ni en coins'. Contradiction interne sur le meme ecran, non signalee.
- components/gamification/xp-purchase-power.tsx viole la charte 'paper neo-brutaliste' : entete de code 'Elite Silicon Valley Grade', effets holographiques, particules, tilt 3D framer-motion, glow radial, couleurs hardcodees violet/emeraude (#8b5cf6, #10b981, rgba 139,92,246) et tokens brand-soft. La memoire indique '7 primitives gen-z supprimees / garde CI charte' mais ce composant gen-z survit. Concept de conformite charte non couvert pour ce composant.
- 21 modules backend sous gamification-system/features/ (actions.ts/schema.ts) representent des features produit non representees comme ecrans : annual-wrapped (retro annuelle facon Spotify Wrapped), mini-games, wheel (roue), seasonal-challenges, event-challenges, special-challenges, vip-system, pillars, profile-customization, social-sharing, activity-feed, onboarding, notifications, shop, missions, collections, challenges, crews. La liste auditee ne cite que 3 d'entre eux (stats-dashboard, achievements, leaderboard).
- Comptes parent / partenaire / ambassadeur entierement hors perimetre : l'enonce decrit 4 types de comptes mais la liste auditee ne couvre que teen + gamification. Ecrans non audites incluent app/parent/*, app/partner/* (dashboard, profile, awards, scanner, anniversaires), app/devenir-* (ambassadeur, mentor, coach, dj, driver, influenceur, partenaire, restaurant, organisateur, createur, anniv-host, teacher), app/autorisations/* (approbation parentale), app/account/* (export/delete RGPD), app/onboarding/*. Hors scope teen/gamification mais ce sont des pans produit entiers.
- Surface 'achat avec XP dans la boutique' : xp-purchase-power lie vers /teen/shop avec xpCost (XP comme pouvoir d'achat de recompenses). A clarifier vs la regle 'XP ne s'achete pas' — ambiguite entre 'XP achete des recompenses' et 'XP ne s'achete pas'. Concept non desambiguise.

**Affirmations à revérifier :**

- TOUS les 11 ecrans app/gamification/**/page.tsx sont des stubs permanentRedirect (308) ou 410-gone SANS aucune UI : boutique->wallet?tab=shop, defis->quests/friend-defis, missions->quests, crews->circles, collections->profile?tab=achievements, parcours->quests, leaderboard->teen/leaderboard, aide-scolaire->teen/aide-scolaire, defis-physiques->teen/defis-physiques, roue->teen (wheel retiree), page (hub)->teen. Si les findings ont audite ces entrees comme de vrais ecrans (decrivant layout/UI/UX/composants/notes /10), ces affirmations sont fausses : il n'y a rien a auditer cote rendu, juste un redirect.
- Entree auditee 'app/gamification/roue/page.tsx' : le fichier porte un commentaire 'wheel_streaks trigger broken; wheel feature retired pending founder ratification' et fait permanentRedirect('/teen'). Toute description d'une vraie roue de la fortune jouable serait non verifiee.
- Entree auditee 'app/teen/academic/page.tsx' : c'est un redirect('/teen/aide-scolaire') (doublon quasi ligne-pour-ligne supprime). Pas un ecran reel.
- Entree auditee 'app/teen/challenges/page.tsx' : c'est un permanentRedirect('/teen/quests?tab=body'), pas un ecran avec UI propre.
- Entree auditee 'gamification-system/features (stats-dashboard, achievements, leaderboard)' : ces dossiers existent mais ne contiennent que du backend (actions.ts/schema.ts/index.ts) — quasi aucun .tsx (1 seul tsx dans tout features/ : crews/crew-pulse.tsx). Toute affirmation d'avoir audite des 'ecrans' rendus a ce chemin est non verifiee : ce sont des modules logique, pas des pages.
- Entree auditee 'app/gamification/boutique/page.tsx' : redirect vers /teen/wallet?tab=shop ; le commentaire precise meme que shop-client.tsx est orphelin. Auditer une 'boutique' a ce chemin = surface inexistante.

Scope strict (app/teen/**/page.tsx + app/gamification/**/page.tsx) : 68 pages teen + 11 pages gamification = 79 routes. Comparaison a la liste auditee : un SEUL ecran teen vraiment manquant = app/teen/calendar. Cote gamification, les 11 routes sont TOUTES dans la liste auditee MAIS sont 100% des redirects/410-gone — c'est le point le plus important : la liste donne une fausse impression de couverture d'ecrans gamification qui n'existent plus. Plusieurs entrees 'teen' auditees sont aussi des redirects (academic, challenges). Le risque de complETUDE ici n'est pas 'ecrans oublies' (presque tout teen est couvert) mais 'ecrans fantomes audites comme reels' + une contradiction non detectee du modele economique XP/coins (xp-converter.ts + xp-value se contredisent et utilisent 2 taux differents 0.10 vs 0.01 DH/XP) qui touche le coeur de la regle produit 'XP ne se convertit jamais'. Verifie par lecture directe des fichiers (chemins absolus sous C:/Users/Shadow/Desktop/NIVY/). Hors scope strict mais pertinents pour les concepts produit : app/agenda (3e surface evenements), app/xp-shop (redirect wallet), app/carte-vip, app/parent/*, app/partner/*, app/devenir-*, app/autorisations/* non audites."

---

## 3. Blueprints (cible)

### 3.1 Refonte du dashboard / page d'accueil

I have confirmed the exact structure. The home renders: AvatarCoach + TwinCurrencyGauge (above-the-fold in `page.tsx`), then the OrbitingTokens hero, StatHero, PriorityMission, QuickAccess+OnlineFriends, MapPreview+CrewHub, PurchasingPower+ProfileQuest, SocialFeed, MarketplaceOverlay (in `teen-dashboard-content.tsx`). That's the full picture. Now I'll write the blueprint.

# BLUEPRINT DE REFONTE — Dashboard / Accueil teen

> Cible : `app/teen/page.tsx` + `components/teen/dashboard/teen-dashboard-content.tsx`
> Charte : paper néo-brutaliste (aucun blur/glow/grain/tilt 3D). Mobile-first.
> Invariant produit : XP (mérite) et coins/DH ne se convertissent JAMAIS.

---

## 1. Diagnostic chiffré de la surcharge actuelle

### Inventaire réel (vérifié dans le code)

L'accueil empile **11 sections** réparties sur 2 fichiers :

| # | Section | Fichier / ligne | Verdict |
|---|---------|-----------------|---------|
| 1 | `AvatarCoach` (+ ChoreNudge) | `page.tsx:103` | Garder (CTA réel) |
| 2 | `TwinCurrencyGauge` (full) | `page.tsx:108` | **Source unique devise** → garder |
| 3 | Hero éditorial + `OrbitingTokens` | `content:101-123` | **SORT** (2e hero + stats répétées) |
| 4 | `StatHero` XP | `content:126-133` | **SORT** (XP répété une 3e fois) |
| 5 | `PriorityMission` | `content:135-139` | **REMONTE** en position 1 |
| 6 | `QuickAccessGrid` | `content:143-150` | Garder (nettoyé) |
| 7 | `OnlineFriends` | `content:152-159` | → hub Social |
| 8 | `MapPreview` | `content:164-179` | → hub Social (mock + faux contenu) |
| 9 | `CrewHub` | `content:181-188` | → hub Social |
| 10 | `PurchasingPower` | `content:193-198` | → hub Wallet |
| 11 | `ProfileQuest` | `content:200-207` | → onboarding / repli |
| 12 | `SocialFeed` | `content:211-230` | → hub Social (fallback Amine/Sara/Lina) |
| 13 | `MarketplaceOverlay` | `content:233` | **SUPPRIMÉ** (100% mock, CTA mort) |

### Redondances de stats above-the-fold (chiffrées)

Avant la première action utile (`PriorityMission`, ~4e bloc visible), le teen voit :

| Donnée | Affichée | Surfaces |
|--------|----------|----------|
| **XP** | **3×** | Gauge + OrbitingTokens + StatHero |
| **Niveau** | **4×** | Header + Gauge + OrbitingTokens + StatHero |
| **Coins** | **3×** | Header + Gauge + OrbitingTokens |
| **Streak** | **2×** | Header + OrbitingTokens |

→ **12 répétitions de 4 chiffres** avant tout contenu actionnable.

### Faux contenu en prod (à purger de l'accueil)

- `MarketplaceOverlay` : « Nike Morocco », « Megarama », CTA sans `href`/`onClick`.
- `SocialFeed` : retombe sur Amine/Sara/Lina si feed vide.
- `MapPreview` : invente Max/Emma/Lucas « 500m/1.2km » + events factices.
- `QuickAccessGrid` : badges `NEW/HOT/LIVE` codés en dur ; « Clubs » et « Crew Battle » → même URL.

### Ce qui doit SORTIR de l'accueil

- **Supprimé pur** : `MarketplaceOverlay`, `OrbitingTokens` (en version chiffrée), `StatHero` XP.
- **Déplacé vers hubs** : `OnlineFriends`, `MapPreview`, `CrewHub`, `SocialFeed` → Social ; `PurchasingPower` → Wallet.
- **Cible** : passer de **11–13 sections → 4 blocs max.**

---

## 2. Principe directeur

> **« 1 accueil = 1 question : qu'est-ce que je fais maintenant ? »**

L'accueil n'est pas un tableau de bord exhaustif ni une vitrine. C'est un **lanceur d'action**. Tout ce qui n'aide pas à répondre à « ma prochaine action » descend d'un cran (hub dédié) ou disparaît.

Trois règles dérivées :

1. **Une donnée = une surface.** Chaque chiffre (XP / coins / niveau / streak) n'apparaît qu'**une seule fois** sur l'accueil, dans la `TwinCurrencyGauge`.
2. **L'action prioritaire est above-the-fold**, visible sans scroll, sur mobile comme desktop.
3. **Honnêteté.** Aucune section ne s'affiche avec du faux contenu : chaque bloc est *empty-safe* (état vide explicite) ou ne se rend pas.

---

## 3. Nouvelle structure — MOCKUP ASCII (mobile-first)

Maximum **4 blocs**. Above-the-fold (≈ 1er écran mobile, ~720px) = Salutation compacte + Devise + **Prochaine action**.

### Mobile (≤ 640px) — colonne unique

```
┌─────────────────────────────────────┐
│ ☰  NIVY                    🔔  [N]   │  ← header (hamburger = 5 piliers)
├─────────────────────────────────────┤
│                                       │
│  AUJOURD'HUI · TON CREW               │  ← eyebrow mono uppercase
│  Salut Mehdi 👋                       │  ← Niv petit (mascotte, AUCUN chiffre)
│                                       │
│ ┌─────────────────────────────────┐  │  ░ BLOC 1 — DEVISE (gauge unique)
│ │  XP            │     COINS       │  │    TwinCurrencyGauge variant="compact"
│ │  2 480         │     ⊙ 1 250     │  │    XP gold | coins coral, SANS flèche
│ │  Niv. 7 ▓▓▓▓░  │     ≈ 12,50 DH  │  │    (1 seul affichage de chaque chiffre)
│ └─────────────────────────────────┘  │
│                                       │
│  ━━━━━━━━ above the fold ━━━━━━━━━━━  │
│                                       │
│  TA PROCHAINE ACTION                  │  ← eyebrow
│ ┌─────────────────────────────────┐  │  ░ BLOC 2 — NEXT BEST ACTION (CTA #1)
│ │ ◆ Quiz du jour · Cerveau        │  │    PriorityMission OU AvatarCoach CTA
│ │   Réponds à 5 questions          │  │    1 SEUL CTA primaire dominant
│ │   ▓▓▓▓▓▓░░░░  +50 XP             │  │    (carte paper, bord franc, pas de glow)
│ │              [  GO  →  ]         │  │
│ └─────────────────────────────────┘  │
│                                       │
│  ACCÈS RAPIDE                         │  ← eyebrow
│ ┌────────┬────────┬────────┬───────┐ │  ░ BLOC 3 — 4 RACCOURCIS vers hubs
│ │ Jouer  │ Wallet │ Social │Services│ │    (= les 4 autres piliers de nav)
│ │  🎯    │  ⊙     │  👥    │  🧭    │ │    PAS de badges NEW/HOT/LIVE en dur
│ └────────┴────────┴────────┴───────┘ │
│                                       │
│  (repli onboarding — voir §5)         │  ░ BLOC 4 — ProfileQuest SI < 100%
│ ┌─────────────────────────────────┐  │    Sinon : ne se rend pas (pas de saut)
│ │ Complète ton profil  3/4  →      │  │
│ └─────────────────────────────────┘  │
│                                       │
├─────────────────────────────────────┤
│  🏠      🎯      ⊙      👥      🧭    │  ← BOTTOM-NAV (5 piliers, montée
│ Accueil  Jouer  Wallet Social Services│    dans app/teen/layout.tsx — pas ici)
└─────────────────────────────────────┘
```

### Desktop (≥ 1024px) — même ordre, devise + action côte à côte

```
┌──────┬──────────────────────────────────────────────────────────┐
│      │  AUJOURD'HUI · TON CREW                                    │
│ SIDE │  Salut Mehdi 👋  (Niv mascotte, sans chiffres)             │
│ BAR  │                                                            │
│  5   │ ┌────────────────────────┐ ┌───────────────────────────┐  │
│piliers│ │ ░ BLOC 1 — DEVISE      │ │ ░ BLOC 2 — PROCHAINE ACTION│  │
│      │ │  XP 2 480  Niv.7 ▓▓▓▓░  │ │  ◆ Quiz du jour            │  │
│ 🏠   │ │  COINS ⊙1250 ≈12,50DH   │ │  ▓▓▓▓▓░ +50 XP   [ GO → ]  │  │
│ 🎯   │ └────────────────────────┘ └───────────────────────────┘  │
│ ⊙    │  ━━━━━━━━━━━━━━ above the fold ━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 👥   │  ACCÈS RAPIDE                                              │
│ 🧭   │ ┌────────┬────────┬────────┬────────┐                     │
│      │ │ Jouer  │ Wallet │ Social │Services│  ░ BLOC 3            │
│ ───  │ └────────┴────────┴────────┴────────┘                     │
│ 👤   │  ┌──────────────────────────────────┐                     │
│Profil│  │ Complète ton profil 3/4 →  ░ BLOC 4 (conditionnel)     │
│      │  └──────────────────────────────────┘                     │
└──────┴──────────────────────────────────────────────────────────┘
```

**Note ASCII :** le `░ BLOC` indique un des 4 blocs max. Above-the-fold mobile = Blocs 1 + 2. Bloc 3 (raccourcis) et Bloc 4 (onboarding conditionnel) sont au scroll immédiat. **Aucun 2e hero, aucune orbite chiffrée, aucun StatHero, aucune marketplace.**

---

## 4. Ce qui est déplacé vers des hubs dédiés

L'accueil ne « contient » plus ces features — il **pointe** vers elles via le Bloc 3 (4 raccourcis = 4 piliers) et la nav.

| Composant retiré de l'accueil | Destination | Action concrète |
|---|---|---|
| `CrewHub` | **Social** (`/teen/social` onglet Crew) | Déplacer le rendu ; sur l'accueil → raccourci « Social ». |
| `OnlineFriends` | **Social** (onglet Amis) | Idem. |
| `MapPreview` | **Social** (onglet Carte / `?tab=map`) | Retirer le fallback Max/Emma/Lucas (empty-safe). |
| `SocialFeed` | **Social** (onglet Feed/Activité) | Retirer fallback Amine/Sara/Lina → état vide honnête. |
| `PurchasingPower` (`xp-purchase-power`) | **Wallet** (`/teen/wallet`) | Déplacer ; alléger la charte (retirer tilt 3D / glow / particules / hex `#8b5cf6`). |
| `StatHero` XP + `OrbitingTokens` chiffrés | **Progression** (lecture via Wallet `?tab=badges` + profil/stats) | Supprimer de l'accueil. `OrbitingTokens` peut rester en **décor mascotte SANS chiffres** si besoin visuel. |
| `MarketplaceOverlay` | **Supprimé** | Mock + CTA mort : ne pas réafficher tant qu'il n'y a pas de deals réels. |

> Les 4 raccourcis du Bloc 3 (**Jouer / Wallet / Social / Services**) sont strictement les 4 autres piliers de la nav cible (Accueil étant le 5e). Cela aligne accueil ↔ sidebar ↔ bottom-nav et supprime le doublon « Clubs / Crew Battle ».

**Prérequis systémique (P0, hors accueil mais bloquant la cohérence mobile) :** retirer `<MobileBottomNav />` de `teen-dashboard-content.tsx:238` et le monter dans `app/teen/layout.tsx`, sinon la nav mobile reste orpheline sur les ~60 autres pages.

---

## 5. Règles de hiérarchie

### 5.1 — Un seul CTA primaire

- **Bloc 2 = LE seul bouton primaire de l'accueil** (Quiz du jour / Mission prioritaire). Style plein, contraste fort, libellé verbe d'action (« GO », « CONTINUER »).
- Tous les autres clics (raccourcis, gauge, profil) sont **secondaires** : style outline/ghost, pas de remplissage dominant.
- **Dédoublonner les entrées quêtes/quiz** : aujourd'hui AvatarCoach « Quiz du jour » + QuickAccess « Quêtes » + PriorityMission « GO » = 3 portes concurrentes. Cible : `AvatarCoach` et `PriorityMission` fusionnent en **un seul Bloc 2** (si une mission existe → mission ; sinon → quiz du jour). Pas de fallback générique « Connexion Quotidienne 50 XP ».

### 5.2 — Densité

- **4 blocs maximum.** Si un 5e devient nécessaire, il remplace un existant.
- **Espacement cohérent** : un seul rythme vertical (remplacer `space-y-8 sm:space-y-10 md:space-y-12` par un `space-y-6 md:space-y-8` unique).
- **Une donnée = une surface** (voir §2, règle 1). Zéro répétition de chiffre.
- **Empty-safe partout** : un bloc sans données réelles ne s'affiche pas (Bloc 4 profil masqué si 100%) — mais **sans faux contenu** de remplissage.

### 5.3 — Charte paper néo-brutaliste

- **Retirer** de toutes les cartes de l'accueil : tilt 3D, glow/halo, shimmer, radar sweep, holographic borders, particules, `MeshBackground` animé intense. La charte impose « aucun blur/glow/grain ».
- **Bordures franches, ombres dures (offset), aplats**. Tokens charte uniquement : `ink` / `mute` / `paper` / `pink` / `gold` (XP) / `coral` (coins). **Bannir** `text-muted-foreground`, `bg-muted`, `border-border`, `text-info` (cf. `online-friends`) et les hex en dur (`#8b5cf6`, `#3b82f6`, `#10b981`).
- **Devise (Bloc 1)** : XP en **gold**, coins en **coral**, jamais reliés par une flèche. La `TwinCurrencyGauge` est la référence à généraliser. Coins affichés avec `≈ X,XX DH` (peg 1 DH = 100 coins) ; XP sans équivalent DH.
- **Vocabulaire figé** sur l'accueil : « Crew » (pas Circles/Clubs/Crew Battle), « Quête »/« Défi » selon le concept, « Dépense tes XP » (jamais « Convertis »).

### 5.4 — Récap des invariants de hiérarchie

| Règle | Valeur cible |
|---|---|
| Blocs max | **4** |
| CTA primaires | **1** (Bloc 2) |
| Répétitions par chiffre | **1** |
| Sections de faux contenu | **0** |
| Effets hors-charte | **0** |
| Above-the-fold mobile | Devise + Prochaine action |
| Parité raccourcis ↔ nav | 4 raccourcis = 4 piliers |

---

### Fichiers à modifier

- `C:\Users\Shadow\Desktop\NIVY\app\teen\page.tsx` — réduire les fetchs jetés (`getAchievementStats`/`getUserRank`/`getRecentlyUnlocked` destructurés vides l.24-33), passer la gauge en `variant="compact"`, supprimer le fallback mission générique (l.86-92).
- `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\teen-dashboard-content.tsx` — supprimer hero `OrbitingTokens` chiffré (l.101-123), `StatHero` (l.126-133), déplacer `OnlineFriends`/`MapPreview`/`CrewHub`/`PurchasingPower`/`SocialFeed` vers leurs hubs, supprimer `MarketplaceOverlay` (l.233), retirer le montage local de `MobileBottomNav` (l.238).
- `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\quick-access-grid.tsx` — réduire aux 4 piliers, retirer badges `NEW/HOT/LIVE` en dur et le doublon Clubs/Crew Battle, corriger « Convertis » → « Dépense ».
- `C:\Users\Shadow\Desktop\NIVY\components\gamification\xp-purchase-power.tsx` — alléger la charte (retirer effets gen-z) avant remontage dans le hub Wallet.
- `C:\Users\Shadow\Desktop\NIVY\app\teen\layout.tsx` — monter `<MobileBottomNav />` globalement (prérequis P0).

### 3.2 Navigation unifiée (desktop + mobile)

I have everything I need. The glob confirms 68 teen `page.tsx` files including `app/teen/calendar/page.tsx` (the missed screen). Current nav state confirmed. Producing the blueprint.

# BLUEPRINT DE NAVIGATION UNIFIÉE — Nivy (espace ado)

> Objectif : **1 besoin = 1 destination canonique**, **une seule IA partagée desktop + mobile**, **5 piliers max**. Range les 68 écrans `app/teen/**/page.tsx` + les écrans `/anniversaires` rattachés, signale fusions/suppressions, et cartographie chaque orphelin et chaque doublon `teen/*` vs `gamification/*`.

---

## 0. Principe directeur & correctif bloquant (P0)

**Règle d'or** : la bottom-nav mobile et la sidebar desktop exposent **les 5 MÊMES piliers**, dans le même ordre, avec les mêmes labels FR. Chaque pilier est un **hub** ; tout écran non-pilier devient une **sous-route / onglet** d'un hub, jamais une entrée de nav de premier niveau.

**Correctif systémique préalable** (sans lui, rien ne tient sur mobile) :
- Déplacer `<MobileBottomNav />` de `components/teen/dashboard/teen-dashboard-content.tsx:238` → `app/teen/layout.tsx` (à côté de `TeenSidebar`). Aujourd'hui la bottom-nav n'existe QUE sur la home.
- Remplacer le `Sheet` hamburger à 4 liens du `header.tsx` par ces 5 mêmes piliers (ou le supprimer, la bottom-nav devenant globale).
- Pointer tous les items sur les **URL canoniques** (jamais `/teen/map`, `/teen/shop`, `/teen/coins` qui sont des redirects).
- `isActive` : passer de `pathname === href` (strict) à `pathname.startsWith(href)` pour que les sous-routes surlignent le pilier parent.

---

## 1. Les 5 piliers (IA unique desktop + mobile)

| # | Icône (lucide) | Label FR | URL canonique | Rôle |
|---|----------------|----------|---------------|------|
| 1 | `Home` | **Accueil** | `/teen` | Dashboard allégé : 1 barre devise + 1 next-best-action |
| 2 | `Target` | **Jouer** | `/teen/quests` | Hub de tout ce qui rapporte de l'XP (mérite) |
| 3 | `Users` | **Crew** | `/teen/social` | Hub social unique (crew, amis, feed, messages, classement) |
| 4 | `Compass` | **Services** | `/teen/services` *(nouveau hub)* | Vie réelle : events, transport, food, anniv, orientation, école, offres |
| 5 | `Wallet` | **Wallet** | `/teen/wallet` | Économie : coins, boutique, badges, épargne, allowance, VIP |

**Profil + Paramètres** : accès via le **dropdown avatar du header** (déjà présent), PAS un 6e pilier.

---

## 2. Bottom-nav mobile = 5 onglets (= sidebar desktop, miroir exact)

### Onglet 1 — Accueil (`Home` → `/teen`)
Dashboard refondu. Écrans/composants rattachés :
- `app/teen/page.tsx` (allégé : 1 `TwinCurrencyGauge` compacte = **source unique** XP/coins/level/streak + 1 `PriorityMission` above-the-fold)
- **À SUPPRIMER de la home** (mock/redondance) : `marketplace-overlay.tsx` (full-mock, CTA mort), fallbacks `social-feed.tsx` (Amine/Sara/Lina), `map-preview.tsx` (Max/Emma/Lucas factices), `orbiting-tokens` chiffré, `StatHero` XP dupliqué.
- **Quick-access** réduit à 4 raccourcis vers les piliers 2-5 (retirer doublon Clubs/Crew Battle, badges NEW/HOT/LIVE en dur, verbe « Convertis tes XP »).

### Onglet 2 — Jouer (`Target` → `/teen/quests`)
Hub à onglets de tout le contenu rémunéré en XP. Retirer `/teen/quests` de `hiddenPaths` (`mobile-nav.tsx:164`).

| Sous-onglet | Écran(s) source |
|---|---|
| Quêtes | `app/teen/quests/page.tsx`, `app/teen/quests/[id]/page.tsx` |
| Quiz | `app/teen/quiz/page.tsx`, `quiz/[id]/page.tsx`, `quiz/[id]` runner, `quiz/history/page.tsx` *(feature la + aboutie, aujourd'hui invisible — à remonter)* |
| Corps | `app/teen/defis-physiques/page.tsx` *(fusionner : ne plus exposer en double avec l'onglet Corps de quests)* |
| Jeux | `app/teen/games/page.tsx` *(MASQUER l'onglet tant que tous les CTA sont `disabled`+« bientôt » ; ne pas mentir)* |
| Défis amis | `app/teen/quests/friend-defis/page.tsx`, `friend-defis/new/page.tsx` *(⚠ mise XP = violation charte, à arbitrer)* |

### Onglet 3 — Crew (`Users` → `/teen/social`)
Faire de `/teen/social` le **vrai** hub social (aujourd'hui orphelin qui ne fait que re-router). Figer le mot **« Crew »** partout.

| Sous-onglet | Écran(s) source |
|---|---|
| Crew | `app/teen/circles/page.tsx`, `circles/[circleId]/page.tsx` *(unifier les 2 backends crews/circles, réparer la boucle de routing)* |
| Amis | `app/teen/friends/page.tsx` *(supprimer le doublon FriendsTab de social)* |
| Feed | `app/teen/feed/page.tsx`, `feed/[id]/page.tsx`, `create/page.tsx` |
| Activité | `app/teen/activity/page.tsx` |
| Messages | `app/teen/messages/page.tsx` + chat cercle (`circles/[circleId]`) *(inbox unifiée)* |
| Classement | `app/teen/leaderboard/page.tsx` *(renommer « Top créateurs », pas « XP global »)* |

### Onglet 4 — Services (`Compass` → `/teen/services`, **NOUVEAU hub**)
Dé-orphélinise ~15 écrans réels d'un coup.

| Sous-section | Écran(s) source |
|---|---|
| Agenda / Events | `app/teen/events/page.tsx` + `app/teen/calendar/page.tsx` *(FUSIONNER les 2 + `/agenda` : 3 surfaces events → 1)* |
| Transport | `app/teen/rides/page.tsx`, `rides/request/page.tsx` *(« Wave 3 stub » mais réel)* |
| Food | `app/teen/food/page.tsx`, `food/[partner_id]/page.tsx`, `food/order/[id]/page.tsx` |
| Anniversaire | `app/teen/birthday/page.tsx` → parcours unique vers `/anniversaires` *(choisir 1 des 2 configurateurs)* |
| Orientation | `app/teen/pathways/page.tsx`, `mentors/page.tsx`, `mentors/[id]/page.tsx`, `mentor-sessions/page.tsx`, `internships/page.tsx` |
| Aide scolaire | `app/teen/aide-scolaire/page.tsx`, `aide-scolaire/grades/page.tsx`, `aide-scolaire/tutors/page.tsx` |
| Offres & Partenaires | `app/teen/offres/page.tsx`, `partenaires/page.tsx` *(relier les deux)* |
| Bien-être | `app/teen/wellbeing/page.tsx` *(MASQUER tant que « à venir », ou label honnête)* |

### Onglet 5 — Wallet (`Wallet` → `/teen/wallet`)
Déjà bien consolidé (3 onglets Coins/Boutique/Badges). Rattacher les orphelins économie.

| Sous-onglet / lien | Écran(s) source |
|---|---|
| Coins | onglet existant (= absorbe `app/teen/coins/page.tsx` redirect) |
| Boutique | onglet existant (= absorbe `shop`, `rewards`, `gamification/boutique`) |
| Badges | onglet existant *(= cible réelle des « achievements », corriger `?tab=achievements` cassé → `?tab=badges`)* |
| Épargne | `app/teen/savings/page.tsx`, `savings/new/page.tsx` |
| Allowance | `app/teen/wallet/allowance/page.tsx` |
| Historique & codes | `app/teen/shop/history/page.tsx` *(codes de retrait aujourd'hui introuvables)* |
| Carte VIP | `app/teen/vip-card/page.tsx` |
| Modèle XP | `app/teen/xp-value/page.tsx` *(⚠ taux 100 XP/DH ≠ 10 ailleurs — trancher)* |

### Header dropdown (hors piliers)
- `app/teen/profile/page.tsx`, `profile/edit/page.tsx`
- `app/teen/settings/page.tsx` *(câbler langue/notifs/privacy/visibility, aujourd'hui vides)*
- `app/teen/avatar/page.tsx` *(full-mock — masquer ou assumer « bientôt »)*

---

## 3. Sidebar desktop = miroir strict

`components/dashboard/teen/sidebar.tsx` passe de **15 entrées plates** → **5 piliers identiques** à la bottom-nav :

```
Accueil          /teen
Jouer            /teen/quests
Crew             /teen/social
Services         /teen/services
Wallet           /teen/wallet
─────────────────────────────  (séparateur)
[avatar ▾] Mon profil · Paramètres   (footer sidebar / header)
```

**Disparaissent de la nav de 1er niveau** (deviennent sections de hub) : `Events`, `Aide Scolaire`, `Défis Physiques`, `Parcours Passion`, `Games`, `Circles`, `Partager`, `Mes Achievements`, `Mes Coins`, `Ma Streak`, `Récompenses`, `Classement`.

---

## 4. Mapping « ancienne route → nouvelle place »

### 4.a Doublons teen/* vs gamification/* (tous redirects → garder le temps des bookmarks, puis retirer)

| Ancienne route | Statut actuel | Nouvelle place canonique |
|---|---|---|
| `app/gamification/page.tsx` | 308 → /teen | Pilier **Accueil** `/teen` |
| `app/gamification/boutique/page.tsx` | 308 → wallet?tab=shop | **Wallet** › Boutique (`shop-client.tsx` = code mort, à mentionner) |
| `app/gamification/roue/page.tsx` | 308 → /teen (feature retirée) | Supprimer (wheel mort) |
| `app/gamification/crews/page.tsx` | 308 → /teen/circles | **Crew** › Crew |
| `app/gamification/collections/page.tsx` | 308 → profile?tab=achievements | **Wallet** › Badges *(corriger la cible cassée)* |
| `app/gamification/defis/page.tsx` | 308 → quests/friend-defis | **Jouer** › Défis amis |
| `app/gamification/defis-physiques/page.tsx` | 308 → teen/defis-physiques | **Jouer** › Corps |
| `app/gamification/missions/page.tsx` | 308 → teen/quests | **Jouer** › Quêtes |
| `app/gamification/parcours/page.tsx` | 308 → teen/quests | **Jouer** › Quêtes *(libérer le mot « parcours »)* |
| `app/gamification/aide-scolaire/page.tsx` | 308 → teen/aide-scolaire | **Services** › Aide scolaire |
| `app/gamification/leaderboard/page.tsx` | 308 → teen/leaderboard | **Crew** › Classement *(corriger `layout.tsx:8` qui le dit « canonique »)* |

### 4.b Redirects internes teen/* (faire pointer la nav DIRECTEMENT sur la cible finale — supprimer les cascades)

| Ancienne route (redirect) | Cible réelle | Nouvelle place |
|---|---|---|
| `app/teen/coins/page.tsx` → /teen/wallet | Wallet | **Wallet** › Coins (pointer la nav sur `/teen/wallet` directement) |
| `app/teen/shop/page.tsx` → wallet?tab=shop | Boutique | **Wallet** › Boutique (href direct) |
| `app/teen/rewards/page.tsx` → wallet?tab=shop | Boutique | **Wallet** › Boutique |
| `app/teen/map/page.tsx` → social?tab=map | Carte | **Crew** ou **Services** › Carte (href direct, corrige `isActive`) |
| `app/teen/academic/page.tsx` → aide-scolaire | Aide scolaire | **Services** › Aide scolaire *(passer 302→308 pour cohérence)* |
| `app/teen/passions/page.tsx` → quests?tab=creative | Quêtes créa | **Jouer** › Quêtes *(renommer label « Passions »)* |
| `app/teen/challenges/page.tsx` → quests?tab=body | Corps | **Jouer** › Corps |
| `app/teen/achievements/page.tsx` → profile?tab=achievements | **CASSÉ** | **Wallet** › Badges *(repointer)* |
| `app/teen/notifications/page.tsx` → /teen/activity | Activité | **Crew** › Activité |
| `app/teen/settings/{language,notifications,privacy,visibility}/page.tsx` → ?tab=settings | Settings | Header › Paramètres *(câbler les vrais réglages)* |
| `app/teen/crews/page.tsx` → /teen/circles | Crew | **Crew** › Crew |

### 4.c Orphelins réels (0 entrée nav aujourd'hui) → rattachés à un pilier

| Orphelin (réel) | Nouvelle place |
|---|---|
| `app/teen/quiz/**` | **Jouer** › Quiz |
| `app/teen/quests/friend-defis/**` | **Jouer** › Défis amis |
| `app/teen/chores/page.tsx` *(« défi des parents »)* | **Jouer** › Défis (+ entrée dédiée découvrable) |
| `app/teen/friends`, `feed`, `feed/[id]`, `social`, `activity`, `messages`, `create` | **Crew** (onglets) |
| `app/teen/rides/**`, `food/**` | **Services** › Transport / Food |
| `app/teen/birthday` + `/anniversaires` + `/anniversaires/organiser` | **Services** › Anniversaire *(1 seul parcours)* |
| `app/teen/pathways`, `mentors/**`, `mentor-sessions`, `internships` | **Services** › Orientation |
| `app/teen/offres`, `partenaires` | **Services** › Offres & Partenaires |
| `app/teen/calendar` *(écran oublié de l'audit)* | **Services** › Agenda *(fusion events/calendar/agenda)* |
| `app/teen/savings/**`, `wallet/allowance`, `shop/history`, `vip-card`, `xp-value` | **Wallet** (sous-sections) |
| `app/teen/shop/checkout` | **Services** › Events *(c'est un checkout de réservation, pas la boutique — déplacer hors `/teen/shop`)* |
| `app/teen/streak` | **Accueil** (carte) ou Header › Profil › Stats |
| `app/teen/share` | Header › Profil *(câbler `shareableItems` ou masquer ; fix watermark « teensparty »)* |
| `app/teen/wellbeing`, `avatar` | Masquer tant que stub/mock |

---

## 5. Arbre ASCII de l'IA cible

```
NIVY · Espace ado
│
├── 🏠 ACCUEIL ......................... /teen
│     ├─ Barre devise (TwinCurrencyGauge — SOURCE UNIQUE)
│     ├─ Next best action (PriorityMission / Quiz du jour)
│     ├─ Streak (carte)            ← /teen/streak
│     └─ Quick-access (4 raccourcis → piliers 2-5)
│        ✘ SUPPRIMÉ : marketplace-overlay, fallbacks feed/map, orbiting-tokens chiffré, StatHero dup
│
├── 🎯 JOUER ........................... /teen/quests
│     ├─ Quêtes .................... /teen/quests · /teen/quests/[id]
│     ├─ Quiz ...................... /teen/quiz · /quiz/[id] · /quiz/history
│     ├─ Corps ..................... /teen/defis-physiques        (⊆ fusion, plus de double)
│     ├─ Jeux ...................... /teen/games                  (⚠ masqué tant que disabled)
│     └─ Défis ....................  /teen/quests/friend-defis    (⚠ mise XP à arbitrer)
│                                    /teen/chores  («défi des parents» — rendre découvrable)
│
├── 👥 CREW ............................ /teen/social   (ex-orphelin → vrai hub)
│     ├─ Crew ...................... /teen/circles · /circles/[circleId]  (unifier backends, fix boucle)
│     ├─ Amis ..................... /teen/friends
│     ├─ Feed ..................... /teen/feed · /feed/[id] · /teen/create
│     ├─ Activité ................. /teen/activity
│     ├─ Messages ................. /teen/messages   (+ chat cercle, inbox unifiée)
│     └─ Classement ............... /teen/leaderboard  («Top créateurs»)
│
├── 🧭 SERVICES ........................ /teen/services   (NOUVEAU hub)
│     ├─ Agenda .................... /teen/events + /teen/calendar + /agenda  (3→1)
│     ├─ Transport ................ /teen/rides · /rides/request
│     ├─ Food ..................... /teen/food · /food/[partner_id] · /food/order/[id]
│     ├─ Anniversaire ............. /teen/birthday → /anniversaires  (1 parcours)
│     ├─ Orientation .............. /teen/pathways · /mentors · /mentors/[id]
│     │                             /mentor-sessions · /internships
│     ├─ Aide scolaire ............ /teen/aide-scolaire · /grades · /tutors
│     ├─ Offres & Partenaires ..... /teen/offres · /teen/partenaires
│     └─ Bien-être ................ /teen/wellbeing   (⚠ masqué tant que «à venir»)
│
├── 👛 WALLET .......................... /teen/wallet
│     ├─ Coins ..................... ?tab=coins        (← /teen/coins redirect)
│     ├─ Boutique ................. ?tab=shop          (← /shop, /rewards, /gamification/boutique)
│     ├─ Badges ................... ?tab=badges        (← cible réelle «achievements», fix tab cassé)
│     ├─ Épargne .................. /teen/savings · /savings/new
│     ├─ Allowance ................ /teen/wallet/allowance
│     ├─ Historique & codes ....... /teen/shop/history
│     ├─ Carte VIP ................ /teen/vip-card
│     └─ Modèle XP ................ /teen/xp-value     (⚠ trancher taux 10 vs 100 XP/DH)
│
└── 👤 [Header ▾]  (hors piliers)
      ├─ Mon profil ............... /teen/profile · /profile/edit
      ├─ Paramètres ............... /teen/settings  (câbler langue/notifs/privacy/visibility)
      ├─ Partager ................. /teen/share      (câbler ou masquer ; fix watermark)
      └─ Avatar ................... /teen/avatar     (⚠ masqué tant que mock)

  Checkout réservation /teen/shop/checkout → déplacer sous SERVICES › Agenda (n'est PAS la boutique)
```

---

## 6. Récap des 68 écrans rangés

- **Accueil** : 1 (`page.tsx`) + streak/share/avatar référencés ailleurs.
- **Jouer** : 9 (`quests`, `quests/[id]`, `quiz`, `quiz/[id]`, `quiz/history`, `defis-physiques`, `games`, `friend-defis`, `friend-defis/new`) + `chores`.
- **Crew** : 9 (`social`, `circles`, `circles/[circleId]`, `friends`, `feed`, `feed/[id]`, `create`, `activity`, `messages`, `leaderboard`).
- **Services** : 18 (`events`, `calendar`, `rides`, `rides/request`, `food`, `food/[partner_id]`, `food/order/[id]`, `birthday`, `pathways`, `mentors`, `mentors/[id]`, `mentor-sessions`, `internships`, `aide-scolaire`, `aide-scolaire/grades`, `aide-scolaire/tutors`, `offres`, `partenaires`, `wellbeing`).
- **Wallet** : 9 (`wallet`, `savings`, `savings/new`, `wallet/allowance`, `shop/history`, `vip-card`, `xp-value`, `shop/checkout`, +Badges).
- **Header** : `profile`, `profile/edit`, `settings`, `share`, `avatar`.
- **Redirects à conserver puis retirer** : `coins`, `shop`, `rewards`, `map`, `academic`, `passions`, `challenges`, `achievements`, `notifications`, `crews`, `settings/{language,notifications,privacy,visibility}` (4).

**À FUSIONNER** : events+calendar+agenda → 1 Agenda ; defis-physiques (double quests) → 1 ; friends (double social) → 1 ; les 2 configurateurs anniv → 1.
**À MASQUER/SUPPRIMER de l'UI** (mock/stub) : `marketplace-overlay`, fallbacks `social-feed`/`map-preview`, `games` (CTA), `wellbeing`, `avatar`, section mock de `share`.

---

## 7. Fichiers à modifier (chemins absolus)

- `C:\Users\Shadow\Desktop\NIVY\app\teen\layout.tsx` — monter `<MobileBottomNav />` globalement.
- `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\teen-dashboard-content.tsx` (l.238) — retirer le montage local de la bottom-nav.
- `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\mobile-nav.tsx` (l.43-68, l.164) — 5 piliers, URL canoniques, retirer `/teen/quests` de `hiddenPaths`, fix `isActive`.
- `C:\Users\Shadow\Desktop\NIVY\components\dashboard\teen\sidebar.tsx` (l.24-40, l.50) — 15→5 piliers, `isActive` en `startsWith`.
- `C:\Users\Shadow\Desktop\NIVY\components\dashboard\teen\header.tsx` (l.80-93) — Sheet 4 liens → 5 piliers, retirer `?tab=achievements` cassé.
- `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\quick-access-grid.tsx` (l.266-316) — doublon Clubs/Crew Battle, badges en dur, verbe « Convertis ».
- Nouveau : `C:\Users\Shadow\Desktop\NIVY\app\teen\services\page.tsx` — hub Services.

**Décisions produit à trancher en parallèle (hors IA pure)** : mise XP des friend-défis (violation charte), taux XP→DH unique (10 vs 100), onglet `?tab=achievements` cassé, boucle de routing crew/circle, bug `deliveryAddress`/`body.address` food.

### 3.3 Wallet v2 & hub d'économie

I have enough verified context. The audit confirms the key facts: the boutique debits XP with a `convertXPToDH` "≈ DH" tag, three contradictory rates (10 vs 100 XP/DH), coins have no spend destination, savings/allowance/history are orphans, and there's a hybrid `calculateHybridPayment` rail for reservations. Here's the blueprint.

---

# BLUEPRINT WALLET v2 — Nivy

> Cadre : double devise. **XP = mérite/statut** (gagné, jamais acheté, jamais converti, jamais transféré). **Coins = pouvoir d'achat** (chargés par le parent, 1 DH = 100 coins, peg verrouillé). Aucune flèche entre les deux. Ce document corrige les 3 incohérences fondatrices détectées à l'audit : (a) la boutique débite des XP avec un faux « ≈ DH », (b) trois taux XP→DH contradictoires (10 vs 100), (c) les coins n'ont aucune destination de dépense.

---

## 1. Forces à garder (ne pas casser)

| Force | Où | Pourquoi on garde |
|---|---|---|
| **Hub unique 3-onglets déjà consolidé** | `wallet-hub-client.tsx:56-60` | La consolidation est faite : 1 vrai écran + 3 redirects (`/teen/shop`, `/teen/rewards`, `/gamification/boutique`) + roue retirée. On ÉTEND, on ne refait pas. |
| **`TwinCurrencyGauge`** | `components/teen/twin-currency-gauge.tsx` | Référence pédagogique : XP et coins côte à côte, **sans flèche de conversion**, peg `≈ X DH` sur les coins uniquement. C'est le modèle à généraliser. |
| **Boutique réelle (RPC canon)** | `shop/actions.ts` `get_shop_rewards` / `purchase_reward` | Plus de mock catalogue. Achat re-vérifié côté serveur. Garder le pipeline serveur. |
| **Épargne + allowance propres** | `savings/page.tsx`, `wallet/allowance/page.tsx`, `goal-form.tsx` | Tout en coins, peg 1 DH = 100 coins respecté, RHF+zod, équivalent DH live. Code sain — juste orphelin. |
| **Empty-states honnêtes** | `wallet-hub-client.tsx:526` | Badges/transactions vides montrent un état Niv, pas de faux placeholders. |
| **Vue SQL `user_coins_spendable`** | utilisée par `/teen/savings` | Source de vérité « disponible vs bloqué » déjà existante — on l'impose partout. |
| **Charte paper sur le hub** | StickerCard, StatHero, NivCoach, DarkSurface | Conforme. (À nettoyer ailleurs : `xp-purchase-power.tsx` est hors-charte, mais hors périmètre wallet.) |

---

## 2. Modèle clair des 2 devises — présentation anti-confusion

### 2.1 Règle de fond (à graver dans le code)

```
XP    → mérite & statut.  Gagné par l'effort. Ne s'achète pas. Ne se dépense pas en argent.
                          Sert à : niveau, VIP, classement, déblocage de paliers.
COINS → pouvoir d'achat.  Chargé par le parent. 1 DH = 100 coins (peg verrouillé).
                          Sert à : boutique, food, rides, events, épargne.
JAMAIS de conversion XP ↔ coins ↔ DH dans aucun sens.
```

### 2.2 Décision tranchée sur les 3 incohérences (toutes au profit de la charte)

| Incohérence détectée | Décision v2 |
|---|---|
| Boutique débite des **XP** avec « ≈ DH » (`renderPriceTag`, bandeau `wallet-hub-client.tsx:96-105`) | **La boutique se paie en COINS**, pas en XP. Prix affichés en `⊙ coins` + `(X,XX DH)` rappel peg. On supprime le débit XP de `purchase_reward` comme moyen de paiement de récompenses marchandes. *(Les paliers gratuits débloqués par seuil XP restent possibles mais s'affichent « Débloqué au niveau N », pas « coûte N XP ».)* |
| `lib/payments/xp-converter.ts` = **10 XP/DH** vs `xp-value` = **100 XP/DH** | **Supprimer toute conversion XP→DH du parcours d'achat.** `xp-converter.ts` n'est conservé QUE pour le checkout réservation hybride existant, et marqué `@deprecated — ne pas étendre`. Retirer le bandeau « 1 XP = 0,10 DH de remise » et le `renderPriceTag` « ≈ DH ». La page `xp-value` devient une page **statut** (« ton XP raconte ton effort »), sans ROI ni projection DH. |
| Coins = cul-de-sac (aucune boutique ne les accepte) | **Les coins deviennent la SEULE devise de dépense** du hub (boutique + épargne). Le solde coins en grand pointe enfin vers une vraie destination. |

### 2.3 Vocabulaire visuel (1 règle par devise)

- **XP** : ton or (gold), glyphe `⚡` ou icône lucide `Zap`, jamais d'équivalent DH à côté. Libellé : « XP » nu.
- **Coins** : ton corail (coral), glyphe `⊙` **standardisé partout** (aujourd'hui `⊙` et icône `Coins` cohabitent → choisir `⊙`), avec rappel peg discret `(12,50 DH)`.
- **Interdits de copy** : « convertir tes XP », « valeur de tes XP en DH », « 1 XP = X DH ». Remplacer « Convertis tes XP en récompenses » par **« Dépense tes coins »** (quick-access).
- **Deux blocs visuellement séparés** dans le solde : un encart XP (statut, non dépensable, fond clair) et un encart Coins (dépensable, fond corail). Jamais sur la même ligne d'addition.

---

## 3. Fusion en UN hub d'économie cohérent

### 3.1 Nouveaux onglets (4) — remplace `Coins / Boutique / Badges`

```
WALLET = /teen/wallet
 ├─ Solde      (?tab=solde)      ← défaut. Gauge XP+coins, allowance à venir, accès VIP, badges (résumé + lien)
 ├─ Boutique   (?tab=boutique)   ← catalogue, payé en COINS, codes de retrait visibles ici
 ├─ Épargne    (?tab=epargne)    ← absorbe /teen/savings + /teen/savings/new + allowance
 └─ Historique (?tab=historique) ← absorbe /teen/shop/history : achats, recharges, épargne, cashback — un seul registre
```

**Badges** : ne disparaît pas mais cesse d'être un onglet de premier rang — il migre en **section de l'onglet Solde** (résumé + « Voir tous mes badges »). Ça libère un slot pour Épargne/Historique et **répare le lien cassé** `?tab=achievements` (la nav pointe désormais sur `/teen/wallet?tab=solde#badges`).

### 3.2 Routes absorbées / redirigées (table de migration)

| Route actuelle | Devient | Statut |
|---|---|---|
| `/teen/savings`, `/teen/savings/new` | `?tab=epargne` (sous-vue création en modale/sous-route) | section du hub |
| `/teen/wallet/allowance` | carte « Prochaine allowance » dans `?tab=solde` + détail dans `?tab=historique` | section du hub |
| `/teen/shop/history` | `?tab=historique` | section du hub |
| `/teen/coins` (redirect→wallet) | sidebar pointe **directement** `/teen/wallet` | supprimer la cascade |
| `/teen/shop`, `/teen/rewards`, `/gamification/boutique` | `?tab=boutique` direct | redirects conservés, libellés nav unifiés → « Boutique » |
| `/teen/xp-value` | page **statut XP** (plus dans le wallet de dépense) ; lien depuis l'encart XP | dé-monétisée |
| `/teen/vip-card` | bouton « Carte VIP » conservé dans le header du hub | inchangé |

### 3.3 Source de vérité unique (corrige les doubles fetch / doubles calculs)

- **Coins disponibles** : TOUJOURS la vue `user_coins_spendable` (`total`, `locked_in_goals`, `spendable`). **Supprimer** le recalcul manuel `wallet/page.tsx:34-50` (somme `savings_goals`). Une seule requête, un seul chiffre, plus de divergence wallet vs épargne.
- **Solde XP** : une seule source `getTeenDashboardData().xp`. Supprimer les refetch client `/api/teen/wallet` dans `CoinsTab`/`BadgesTab`.
- **Historique** : un seul registre `wallet_ledger` (voir §5) au lieu de `shop_purchases.coins_spent` + lignes allowance + lignes épargne dispersées.

---

## 4. Mockup ASCII — Wallet hub cible (mobile d'abord, 360px)

### Onglet **Solde** (défaut)

```
┌─────────────────────────────────────┐
│  TON ARGENT                          │
│  Ton wallet                       👑 │  ← Carte VIP (bouton)
│  Coins, épargne & boutique au même   │
│  endroit.                            │
├─────────────────────────────────────┤
│  ┌── XP · STATUT ───────────────┐    │  ← encart clair, NON dépensable
│  │ ⚡ 4 820 XP      Niveau 12    │    │
│  │ ▓▓▓▓▓▓▓░░░  180 XP → niv.13  │    │
│  │ Gagné par l'effort. Ne se    │    │
│  │ dépense pas.   → Mon statut  │    │  → /teen/xp-value (statut)
│  └──────────────────────────────┘    │
│                                       │
│  ┌── COINS · À DÉPENSER ─────────┐    │  ← encart corail, dépensable
│  │ ⊙ 1 250 coins     (12,50 DH) │    │
│  │ dont ⊙ 400 bloqués (épargne) │    │
│  │ Dispo : ⊙ 850     (8,50 DH)  │    │  ← user_coins_spendable
│  └──────────────────────────────┘    │
│                                       │
│  ┌── PROCHAINE ALLOWANCE ────────┐    │
│  │ ⊙ 500 le 1er juin (de Papa)  │    │  → détail dans Historique
│  └──────────────────────────────┘    │
│                                       │
│  MES BADGES                  6 / 24   │  #badges (répare ?tab=achievements)
│  🏅 🏅 🏅 🏅 …          Voir tout →   │
├─────────────────────────────────────┤
│ [ Solde ] Boutique  Épargne  Histo.  │  ← HubTabs (sticky)
└─────────────────────────────────────┘
   [Accueil] [Jouer] [Social] [Services] [Wallet●]   ← bottom-nav globale (P0)
```

### Onglet **Boutique** (payé en coins)

```
┌─────────────────────────────────────┐
│  BOUTIQUE                            │
│  Dispo : ⊙ 850  (8,50 DH)           │  ← spendable, pas de "≈ DH" sur l'XP
│  [Tout][Goodies][Bons][VIP][Digital] │
├─────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐      │
│  │  🎧         │  │  🎟️         │      │
│  │ Casque Niv │  │ Bon ciné   │      │
│  │ ⊙ 600      │  │ ⊙ 1 200    │      │
│  │ (6,00 DH)  │  │ (12,00 DH) │      │
│  │ [ Acheter ]│  │  Manque ⊙350│     │  ← gating sur spendable
│  └────────────┘  └────────────┘      │
│  ⓘ Payé avec tes coins. Tes XP ne    │
│    s'achètent ni ne se dépensent.    │
├─────────────────────────────────────┤
│ Solde [ Boutique ] Épargne  Histo.   │
└─────────────────────────────────────┘
```

### Onglet **Épargne**

```
┌─────────────────────────────────────┐
│  ÉPARGNE                  + Objectif │
│  Bloqué : ⊙ 400   Dispo : ⊙ 850     │
├─────────────────────────────────────┤
│  ┌──────────────────────────────┐    │
│  │ 🎮 Console                   │    │
│  │ ⊙ 400 / 3 000   ▓▓░░░░ 13%   │    │
│  │ (4,00 / 30,00 DH)            │    │
│  │ Match parent +20% 🎁         │    │
│  │ [Ajouter] [Retirer]          │    │
│  └──────────────────────────────┘    │
├─────────────────────────────────────┤
│ Solde  Boutique [ Épargne ] Histo.   │
└─────────────────────────────────────┘
```

### Onglet **Historique** (registre unique)

```
┌─────────────────────────────────────┐
│  HISTORIQUE        [Tout][Achats][⊙] │
├─────────────────────────────────────┤
│  − ⊙600  Casque Niv    02/06        │
│        Code retrait: NIVY-7F3K  📋   │  ← codes enfin retrouvables
│  + ⊙500  Allowance Papa 01/06        │
│  → ⊙400  Vers épargne « Console »    │
│  + ⚡25   Cashback food (statut)  ⓘ  │  ← XP cashback = statut, séparé
├─────────────────────────────────────┤
│ Solde  Boutique  Épargne [ Histo. ]  │
└─────────────────────────────────────┘
```

> Note charte : aucun blur/glow/tilt. Encarts = StickerCard. XP en gold, coins en corail. Le `(X,XX DH)` n'apparaît QUE sous les coins (peg), jamais sous l'XP.

---

## 5. Parcours de dépense unifié — un seul pipeline débit/crédit

Aujourd'hui chaque domaine a son rail : boutique débite XP (`purchase_reward`), food débite coins (`place_food_order`), rides débite coins (`request_ride`/`complete_ride`), events passent par `calculateHybridPayment` (XP+cash). Quatre logiques, deux devises mélangées, un historique incohérent. **v2 = un seul service de transaction coins, un seul registre.**

### 5.1 Principe

```
Toute dépense réelle (boutique, food, rides, events, épargne) = DÉBIT DE COINS.
XP n'est JAMAIS débité comme paiement. XP n'est crédité que comme cashback/mérite.
Un seul registre append-only : wallet_ledger.
```

### 5.2 Service unique : `spendCoins()` (idempotent, parental-aware)

```
spendCoins({
  teenId,
  amountCoins,            // toujours en coins (peg 1 DH = 100 coins)
  reason: 'shop'|'food'|'ride'|'event'|'savings_lock',
  refId,                  // reward_id | food_order_id | ride_id | booking_id | goal_id
  idempotencyKey,         // = refId, anti-double-débit
})
→ 1. lit user_coins_spendable (source unique)
  2. si amount > spendable → { error: 'INSUFFICIENT_COINS', missing }
  3. si amount ≥ seuil parental (ex. 5 000 coins / 50 DH) → crée parental_approval
        et renvoie { status: 'pending_approval' } (pas de débit avant accord)
  4. sinon débit atomique user_coins.balance -= amount
  5. INSERT wallet_ledger (type='debit', reason, refId, amountCoins, balanceAfter)
  6. crédite le cashback XP éventuel via add_xp_to_user (mérite, jamais paiement)
        + INSERT wallet_ledger (type='xp_reward', amountXp)
  7. retourne { status:'done', ledgerId, newSpendable }
```

Inverse symétrique : `creditCoins()` (allowance parent, refund food/ride annulé, retrait d'épargne) → même `wallet_ledger`, `type='credit'`.

### 5.3 Câblage par domaine (ce qui change)

| Domaine | Avant | v2 |
|---|---|---|
| **Boutique** | `purchase_reward` débite **XP** | `spendCoins(reason:'shop', refId:reward_id)` débite **coins** ; le code de retrait est écrit dans `wallet_ledger` et affiché dans Historique |
| **Food** | `place_food_order` débite coins (OK) **mais** cashback XP en parallèle, historique en `coins_spent` | passe par `spendCoins(reason:'food')` ; cashback XP via l'étape 6 ; bug d'adresse corrigé en amont (`deliveryAddress`→`body.address`) |
| **Rides** | `request_ride`/`complete_ride` débite coins au complete | `spendCoins(reason:'ride')` au `complete_ride` ; statut `requested` n'engage aucun débit |
| **Events** | `calculateHybridPayment` (XP+cash, 10 XP/DH) | **abandon de la part XP** ; réservation payée en coins via `spendCoins(reason:'event')` ; la part cash réelle (CMI) reste hors-coins et trace une ligne `wallet_ledger` `type='external_cash'` |
| **Épargne** | mouvements directs `savings_goals` | verrou = `spendCoins(reason:'savings_lock')` ; retrait = `creditCoins` ; reflété dans `user_coins_spendable` automatiquement |

### 5.4 Registre unique `wallet_ledger`

```
wallet_ledger (
  id, teen_id, created_at,
  type        text,    -- 'debit' | 'credit' | 'xp_reward' | 'external_cash'
  reason      text,    -- 'shop'|'food'|'ride'|'event'|'savings_lock'|'allowance'|'refund'|'cashback'
  ref_id      uuid,    -- pointe vers reward/food_order/ride/booking/goal
  amount_coins int,    -- + ou − (NULL pour xp_reward)
  amount_xp    int,    -- pour cashback uniquement (NULL sinon)
  balance_after int,   -- coins après opération (cohérence)
  redeem_code  text,   -- code de retrait boutique (NULL sinon)
  idempotency_key text unique
)
```

L'onglet **Historique** lit uniquement cette table → un seul registre, devise jamais ambiguë (les lignes coins et les lignes XP-cashback sont visuellement séparées), codes de retrait enfin retrouvables.

### 5.5 Garanties

- **Atomicité** : débit + ligne ledger dans la même transaction RPC.
- **Idempotence** : `idempotency_key = ref_id` empêche le double-débit (re-soumission réseau food/ride).
- **Consentement** : seuil parental sur `spendCoins` → `parental_approvals`, débit différé jusqu'à l'accord (cohérent app mineurs).
- **Invariant économique vérifiable** : `SUM(amount_coins) == user_coins.balance` et `user_coins_spendable.spendable == balance − SUM(savings_lock actifs)`. Testable en CI.

---

## Plan d'exécution (ordre, vérifiable)

1. **P0 — Trancher la devise boutique** : boutique en coins via `spendCoins`, supprimer le bandeau « 1 XP = 0,10 DH » et le `renderPriceTag` « ≈ DH » (`wallet-hub-client.tsx:96-105, 342-357`). *Check : aucun prix XP marchand à l'écran.*
2. **P0 — Source unique spendable** : remplacer `wallet/page.tsx:34-50` par `user_coins_spendable`. *Check : wallet et /savings affichent le même « dispo ».*
3. **P1 — 4 onglets + dé-orphelinisation** : Solde/Boutique/Épargne/Historique ; absorber savings/allowance/history ; réparer `?tab=achievements`→`#badges`. *Check : codes de retrait visibles, 0 écran économie orphelin.*
4. **P1 — `wallet_ledger` + `spendCoins`/`creditCoins`** : un RPC, un registre ; brancher shop puis food/ride/event/savings. *Check : invariant SUM == balance vert en CI.*
5. **P2 — Dé-monétiser `xp-value`** : page statut sans ROI/projection DH ; marquer `xp-converter.ts @deprecated`. *Check : plus aucune mention « valeur DH de tes XP ».*

**Fichiers porteurs** : `C:\Users\Shadow\Desktop\NIVY\app\teen\wallet\page.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\teen\wallet\wallet-hub-client.tsx`, `C:\Users\Shadow\Desktop\NIVY\gamification-system\features\shop\actions.ts`, `C:\Users\Shadow\Desktop\NIVY\app\teen\savings\page.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\teen\wallet\allowance\page.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\teen\shop\history\page.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\teen\xp-value\page.tsx`, `C:\Users\Shadow\Desktop\NIVY\lib\payments\xp-converter.ts` (à figer `@deprecated`).

### 3.4 Modèle économique & gamification cible

I have verified the load-bearing facts: the XP↔DH converter exists (10 XP = 1 DH), the TwinCurrencyGauge enforces "no conversion" (1 DH = 100 coins), the shop debits `xp_cost`, and `parent_chores` carries both `reward_xp` and `reward_dh`. I have enough to design the blueprint grounded in the real code.

# BLUEPRINT — Modèle économique & gamification cible (Nivy)

> Cible : ados marocains 13-17 ans. Charte « paper néo-brutaliste ». Double devise **XP** (mérite) et **coins** (pré-payé parents, peg verrouillé **1 DH = 100 coins**). Règle absolue, non négociable : **XP et coins ne se convertissent JAMAIS, dans aucun sens.**

---

## 0. Les trois invariants (à graver, tout le reste en découle)

| # | Invariant | Conséquence code immédiate |
|---|---|---|
| **I1** | **XP = mérite.** Se gagne par l'effort. Se *dépense* uniquement contre des récompenses **non monétaires** (skins, badges, accès, tirages-mérite). Ne s'achète pas, ne se transfère pas entre joueurs, ne se convertit pas en DH. | Supprimer `lib/payments/xp-converter.ts` (le module entier est la violation racine : `XP_TO_DH_RATE`, `convertXPToDH`, `calculateHybridPayment`). Retirer la mise XP des friend-défis. Retirer `≈ DH` de `renderPriceTag` et le bandeau « 10 XP = 1 DH » du wallet. Supprimer/refactorer `app/teen/xp-value` (ROI/projections DH). |
| **I2** | **Coins = argent réel des parents.** Peg fixe **1 DH = 100 coins**, déjà tenu par `TwinCurrencyGauge`. Se charge par le parent, se dépense sur des **biens/services réels** (food, rides, anniversaire, marketplace partenaires). | Une seule source de vérité « spendable » = vue `user_coins_spendable`. Le wallet arrête de recalculer à la main (`wallet/page.tsx:34-50`). |
| **I3** | **Le seul pont autorisé est à sens unique et hors-conversion : le cashback.** Dépenser des coins (food/rides) peut *créditer* un peu d'XP (10 %, déjà câblé dans `place_food_order`). On ne reprend jamais des coins contre de l'XP. C'est une *récompense de mérite pour avoir agi*, pas un taux de change. | Documenter `cashback_xp` comme « bonus mérite », jamais comme « valeur DH des coins ». |

Les deux devises vivent en **rails parallèles**. Le mur central sans flèche de la `TwinCurrencyGauge` est la métaphore de design canonique — on l'applique partout.

---

## 1. Boucle d'engagement — schéma earn → spend

### 1.1 Schéma global (deux rails)

```
                        ┌──────────────────── RAIL XP (mérite) ────────────────────┐
                        │                                                            │
   EARN XP              │   STORE XP (solde, ne se convertit jamais)                 │   SPEND XP
 ───────────            │   ────────────────                                         │  ──────────
 • Quêtes (quiz,        │                                                            │ • Boutique XP
   passion, physique) ──┼──▶  user_xp.total_xp  ──▶  level (1 formule unique)  ──────┼──▶  (skins Niv,
 • Streak quotidien     │            │                                               │      badges, titres,
 • Défi des parents ────┤            │  multiplicateur streak (réel, pas décoratif)  │      thèmes profil,
   (part XP)            │            ▼                                               │      accès VIP-mérite)
 • Défis amis (mérite,  │      progression / niveaux / leaderboard XP                │ • Tirage-mérite
   PAS de mise) ────────┘      VIP tier (lifetime XP)                                │   (coût XP, jamais DH)
                                                                                     │
   ══════════════════════════  AUCUNE FLÈCHE ENTRE LES DEUX RAILS  ═══════════════════
                                                                                     │
                        ┌─────────────────── RAIL COINS (argent) ──────────────────┐ │
 EARN COINS             │   STORE COINS (1 DH = 100 coins, peg verrouillé)          │ │  SPEND COINS
 ───────────            │   ────────────────                                        │ │  ──────────
 • Recharge parent ─────┼──▶ user_coins.balance ─┬─▶ spendable (vue                 │ │ • Food / Rides
   (allowance, ponctuel)│                         │   user_coins_spendable)         │ │ • Anniversaire (DH)
 • Match parental ──────┤                         └─▶ locked (épargne savings_goals)│ │ • Marketplace partenaires
   sur épargne          │                                                           │ │ • Mentors / stages payants
 • Récompense $ d'un    │                                                           │ │ • Épargne (lock, pas dépense)
   défi parent (reward_dh)                                                          │ │
                        └────────────────────────────────────────────────────────┘ │
                                                                          │          │
                                          ▲                               ▼          │
                                          └──── CASHBACK XP (I3, 10%) ◀── dépense coins
                                               (mérite pour avoir agi, sens unique)
```

### 1.2 Tableau earn/spend canonique

| | **XP (mérite)** | **Coins (argent, 1 DH=100c)** |
|---|---|---|
| **Comment on GAGNE** | Quêtes complétées · quiz réussis (bonus ×1.25 / ×1.5 déjà câblés) · streak quotidien · part XP du défi des parents · défis amis (gain de mérite individuel) · cashback I3 | Recharge parent (allowance récurrente + ponctuel) · match parental sur un objectif d'épargne · part DH du défi des parents (`reward_dh`) |
| **Où on DÉPENSE** | Boutique XP : skins Niv, badges, titres, thèmes profil, **accès** (early-access events, déblocage de contenu) · tirage-mérite (coût XP) | Food · Rides · Anniversaire · Marketplace partenaires · mentors/stages payants · verrouillage en épargne (transfert, pas perte) |
| **Ce qu'on ne fait JAMAIS** | acheter de l'XP · convertir XP→DH/coins · transférer/parier de l'XP entre joueurs | convertir coins→XP · gagner des coins « par effort » sans flux d'argent réel parent |

### 1.3 Boucle quotidienne (le « daily loop » que le teen ressent)

1. **Ouvre l'app** → above-the-fold : barre devise compacte (1 source) + **next best action** (quête du jour / défi parent en attente).
2. **Agit** (1 quête OU 1 réponse à un défi parent) → gagne XP (+ éventuellement coins si c'est un défi parent rémunéré).
3. **Maintient son streak** → multiplicateur XP **réel** appliqué au gain (à câbler — aujourd'hui décoratif).
4. **Dépense** : soit XP en boutique (cosmétique/mérite), soit coins sur un service réel → **cashback XP** referme la boucle vers le rail mérite.
5. **Progresse** : XP → niveau → tier VIP (mérite) ; coins → épargne (objectif financier réel).

Deux moteurs de motivation distincts et non-fongibles : **statut/mérite (XP)** et **pouvoir d'achat réel (coins)**. C'est le cœur pédagogique du produit pour des mineurs.

---

## 2. Taxonomie unifiée — défi / quête / mission / chore

### 2.1 Le problème : aujourd'hui 6+ mots pour 3 réalités

L'audit confirme : `corvée`, `mission`, `tâche`, `défi`, `quête`, `challenge`, `battle` désignent au mieux **3 concepts**, créés par **3 émetteurs différents**. La fragmentation vient de « qui crée la tâche », pas de « ce que fait la tâche ». On taxonomise donc **par émetteur**.

### 2.2 Taxonomie cible : 3 types, 1 mot chacun, classés par émetteur

| Concept produit | Mot UI canonique | **Qui crée** | Récompense | Backend réel | Vocabulaire à retirer |
|---|---|---|---|---|---|
| Tâche générée par l'app (quiz, passion, défi physique, contenu) | **Quête** | **Système Nivy** | XP only (mérite pur) | `unified-quest-engine`, `educational_quizzes`, `physical_challenges`, `passion_tutorials` | mission, challenge, tâche |
| Tâche donnée par un parent à son ado | **Défi des parents** | **Parent** | **XP + Coins** (double devise — c'est le seul earn « par effort » qui crédite des coins, car les coins viennent du budget parent) | `parent_chores` (`reward_xp` + `reward_dh`), `chore_targets`, RPC `chore_verify` (083) | corvée, mission, tâche |
| Affrontement entre deux ados | **Défi entre amis** | **Ami (pair)** | XP **gagné par mérite** (pas de mise, pas d'escrow, pas de transfert) | `friend_challenges` (refactor : retirer `stake_xp`/`xp_pot`) | battle, crew battle, quiz_battle |

**Règle de nommage** : *Système → « Quête ». Parent → « Défi des parents ». Ami → « Défi entre amis ».* Trois émetteurs, trois mots, zéro synonyme.

### 2.3 Schéma de la taxonomie

```
                 QUI CRÉE LA TÂCHE ?
        ┌────────────┼────────────────────────┐
        ▼            ▼                          ▼
   SYSTÈME        PARENT                      AMI
   « Quête »      « Défi des parents »        « Défi entre amis »
   ────────       ───────────────────         ──────────────────
   quiz / passion  parent_chores              friend_challenges
   défi physique   (reward_xp + reward_dh)    (XP de mérite, 0 mise)
   contenu app
        │            │                          │
        ▼            ▼                          ▼
   XP only       XP + COINS                 XP de mérite
   (mérite)      (effort récompensé          (gain individuel,
                  par budget parent)          jamais transféré)
```

### 2.4 Modèle d'état unifié (commun aux 3 types)

Un seul cycle de vie, quel que soit l'émetteur, pour que l'UI soit cohérente :

```
disponible → en cours → soumis → [vérifié ?] → récompensé
                                       │
                          ┌────────────┴────────────┐
                  auto-vérif (quête système)   vérif humaine
                  (quiz scoré serveur)         (parent valide le défi parent ;
                                                pair/serveur arbitre le défi ami)
```

- **Quête** : vérif automatique (score serveur, déjà fait pour quiz).
- **Défi des parents** : vérif **parentale obligatoire** avant crédit (`chore_verify` RPC 083 existe). C'est le gate de confiance.
- **Défi entre amis** : arbitrage par résultat objectif (score quiz partagé) — **un seul backend** (`friend_challenges`), supprimer la duplication `mini_game_sessions` PvP.

### 2.5 Conséquences concrètes

- **Défis physiques** : exposés **une seule fois** (soit page dédiée, soit onglet du hub Quêtes — pas les deux).
- **Friend-défis** : suppression de la mise XP (`stake_xp`/`xp_pot`/`winner_id` → violation I1). Le gagnant gagne de l'XP de mérite *crédité par le système*, le perdant n'en perd pas. Si l'on veut un enjeu, ce sera **coins** (avec garde parentale), jamais XP.
- **Redirects legacy** (`/teen/challenges`, `/gamification/{defis,missions,defis-physiques}`) : conservés en 308 le temps des bookmarks, puis retirés.

---

## 3. Le « défi des parents » — central et lisible

C'est la feature que le PO réclame et qui **existe déjà** (`parent_chores` + `chore_targets` + RPC `chore_verify`), mais qui est **introuvable** (aucune nav, accès uniquement via un nudge conditionnel). C'est aussi le **seul mécanisme qui matérialise la double devise dans un seul acte** : le parent récompense l'effort en **XP (mérite) ET en coins (argent)**. Il doit devenir un pilier.

### 3.1 Pourquoi c'est le pivot du modèle

Le défi des parents est l'unique endroit où **les deux rails se rejoignent sans se convertir** :
- Part **XP** (`reward_xp`) → rail mérite (statut, niveau).
- Part **Coins** (`reward_dh` → coins) → rail argent (l'argent vient réellement du parent, donc cohérent avec I2 : pas de coins « créés par effort », ils sont *débités du budget parent au moment de la validation*).

C'est la démonstration pédagogique vivante : *« Ton effort te donne du statut (XP) ; et parce que c'est tes parents qui le financent, ça te donne aussi du pouvoir d'achat réel (coins). »*

### 3.2 Parcours cible : parent crée → teen répond → récompense

```
 PARENT                          TEEN                         PARENT                SYSTÈME
 ──────                          ────                         ──────                ───────
 1. Crée un « Défi des parents »
    - intitulé
    - récompense XP (mérite)
    - récompense Coins (= reward_dh,
      débitée de SON solde à la validation)
    - échéance / récurrence
    - cible 1+ ados (chore_targets)
          │
          ▼ (notification push)
                            2. Voit le défi dans le
                               hub « Défis des parents »
                               (entrée nav persistante)
                                    │
                                    ▼
                            3. Réalise → marque
                               « fait » + preuve optionnelle
                                    │
                                    ▼ (notification push)
                                                         4. Vérifie (chore_verify RPC 083)
                                                            ✅ valide  / ❌ refuse / 🔁 redemande
                                                                  │ (si ✅)
                                                                  ▼
                                                                              5. add_xp_to_user(reward_xp)
                                                                                 + crédit coins(reward_dh×100)
                                                                                 débité du solde parent
                                                                                 + cashback éventuel = 0 (déjà mérité)
                                    ◀──────── notification « +X XP, +Y coins » ────────┘
```

### 3.3 Rendre central et lisible — checklist UX

1. **Entrée de nav persistante** côté teen ET parent. Côté teen : section/onglet **« Défis des parents »** dans le hub social ou un pilier dédié — **plus jamais** réservée à un nudge conditionnel. Côté parent : carte de premier niveau du dashboard parent.
2. **Lisibilité de la double récompense** : chaque carte de défi affiche **deux pastilles côte à côte** — `⚡ +X XP` (or) et `🪙 +Y coins (≈ Z DH)` (corail) — en réutilisant la grammaire visuelle de `TwinCurrencyGauge` (deux rails, pas de flèche).
3. **Transparence du financement** : côté parent, au moment de fixer `reward_dh`, afficher « cette récompense sera débitée de ton solde coins à la validation » → renforce I2 (les coins = vrai argent).
4. **Boucle de confiance visible** : statut clair (en attente de ta validation / validé / refusé). Le gate parental est une *feature de confiance*, pas un frein — l'expliquer via Niv.
5. **Réparer la terminologie** : `/teen/chores` titre « Mes corvées » + sous-titre « missions familiales » + `/parent/chores/new` « Créer une mission / Nouvelle corvée » → **partout « Défi des parents » / « Nouveau défi »**.
6. **Réparer le bug d'affichage** : `ChoreNudgeSection` (`avatar-coach.tsx`) a des classes `bg-lime text-lime` (texte invisible) → corriger le contraste.

### 3.4 Garde-fous économiques (mineurs)

- La part **coins** d'un défi parent est **débitée du solde parent** à la validation (jamais « créée »). Si le parent n'a pas le solde, le défi ne peut pas porter de récompense coins (XP seul reste possible).
- La part **XP** est créditée via `add_xp_to_user` (mérite, pas de coût parent).
- Le gate `chore_verify` empêche l'auto-attribution : un ado ne peut pas se créditer seul.

---

## 4. Cohérence avec le Wallet v2

Le wallet est déjà bien consolidé (hub 3 onglets, boutique canon via `get_shop_rewards`, roue retirée, `TwinCurrencyGauge` excellente). Le blueprint **referme les 3 incohérences économiques** sans rouvrir de chantier de fusion d'écrans.

### 4.1 Architecture Wallet v2 cible

```
/teen/wallet  ── TwinCurrencyGauge (source UNIQUE des soldes, 2 rails) ──┐
   ├─ Onglet COINS    : solde + spendable (vue user_coins_spendable) +    │
   │                    accès Allowance, Épargne, Historique services     │ rail
   │                    « Où dépenser mes coins » : Food / Rides / Anniv  │ COINS
   │                    / Marketplace  ← donne enfin une destination      │
   ├─ Onglet BOUTIQUE : récompenses payées en XP NUS (pas de « ≈ DH »)    ┐
   │                    + Historique d'achats XP + codes de retrait       │ rail
   │                    (libellé « XP dépensés », pas « coins_spent »)     │ XP
   └─ Onglet BADGES   : achievements (cible canonique unique)             ┘
```

### 4.2 Les 4 correctifs de cohérence (alignés sur le modèle ci-dessus)

| Incohérence actuelle | Correctif v2 | Invariant |
|---|---|---|
| Boutique débite XP mais affiche « ≈ DH » / bandeau « 10 XP = 1 DH » | **Prix boutique en XP nus.** Retirer `renderPriceTag ≈ DH`, le bandeau, l'affordability DH. | I1 |
| 3 taux XP→DH contradictoires (10 vs 100) + module `xp-converter.ts` | **Supprimer `xp-converter.ts`** et la page `xp-value` (ROI/projections). Le seul « pont » documenté = cashback (I3). | I1, I3 |
| Historique affiche `coins_spent ⊙` pour des achats payés en XP | **Renommer en « XP dépensés »** (UI + colonne logique). | I1 |
| Coins = cul-de-sac (aucune dépense dans le wallet) | **Onglet Coins liste les destinations réelles** (Food/Rides/Anniv/Marketplace) + rattache Épargne/Allowance/Historique services. | I2 |

### 4.3 Source de vérité unique des soldes

- **XP** : `user_xp.total_xp` (une seule API, un seul niveau calculé par **une seule formule** — aujourd'hui 2 formules divergent).
- **Coins total / spendable / locked** : vue **`user_coins_spendable`** (le wallet arrête le recalcul manuel `page.tsx:34-50` ; l'épargne l'utilise déjà → plus de divergence).
- La `TwinCurrencyGauge` reste le **composant unique** d'affichage des soldes : supprimer les répétitions décoratives (OrbitingTokens chiffré, StatHero XP, coins dans le header) pour viser **1 affichage par chiffre**.

### 4.4 Où chaque devise « atterrit » dans le wallet (cohérence finale)

| Action de gain | Crédite | Visible dans |
|---|---|---|
| Quête / quiz / streak | XP | Gauge (rail XP), Boutique |
| Défi des parents (validé) | **XP + Coins** | Gauge (les 2 rails), Coins + Boutique |
| Défi entre amis (gagné) | XP de mérite | Gauge (rail XP) |
| Recharge parent / match épargne | Coins | Gauge (rail coins), Allowance, Épargne |
| Cashback (food/rides) | XP (I3) | Gauge (rail XP) — libellé « bonus mérite » |

| Action de dépense | Débite | Écran |
|---|---|---|
| Skin Niv / badge / titre / accès | XP | Boutique (onglet Wallet) |
| Tirage-mérite | XP | Boutique |
| Food / Rides | Coins (+ cashback XP) | Hubs services, liés depuis onglet Coins |
| Anniversaire | Coins/DH (jamais coins via conversion XP) | Parcours anniversaire unifié |
| Marketplace partenaires | Coins | Onglet Coins → marketplace réel (pas le mock actuel) |
| Verrouillage épargne | Coins (locked, pas perdu) | Épargne |

---

## Synthèse — ce qui change vs aujourd'hui

1. **Une règle, trois invariants** : XP mérite (jamais convertie/transférée), coins argent (peg fixe), cashback = seul pont à sens unique. → suppression de `xp-converter.ts`, des « ≈ DH » et de la mise XP des friend-défis.
2. **Taxonomie par émetteur** : Système = **Quête**, Parent = **Défi des parents**, Ami = **Défi entre amis**. Trois mots, zéro synonyme.
3. **Défi des parents central** : pilier de nav (teen + parent), double récompense XP+coins lisible (deux pastilles), gate de validation parentale, coins débités du budget parent. C'est l'incarnation pédagogique de la double devise.
4. **Wallet v2 cohérent** : boutique en XP nus, soldes via sources uniques (`user_xp` + `user_coins_spendable`), historique en « XP dépensés », et les coins reçoivent enfin une destination de dépense réelle.

**Fichiers porteurs des décisions** (pour l'implémentation aval) : `C:\Users\Shadow\Desktop\NIVY\lib\payments\xp-converter.ts` (à supprimer), `C:\Users\Shadow\Desktop\NIVY\components\teen\twin-currency-gauge.tsx` (grammaire visuelle canonique à généraliser), `C:\Users\Shadow\Desktop\NIVY\app\teen\wallet\page.tsx` + `wallet-hub-client.tsx` (retrait `≈ DH`/bandeau, source unique spendable), `C:\Users\Shadow\Desktop\NIVY\app\teen\xp-value\page.tsx` (à retirer), `C:\Users\Shadow\Desktop\NIVY\app\teen\chores\page.tsx` + `C:\Users\Shadow\Desktop\NIVY\app\parent\chores\new\page.tsx` (renommage « Défi des parents », nav), `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\083_chore_verify_rpc.sql` (gate validation), `C:\Users\Shadow\Desktop\NIVY\app\teen\quests\friend-defis\` (retrait mise XP).

### 3.5 Roadmap « best-seller » priorisée

Je vais produire la roadmap directement à partir du diagnostic fourni. J'ai tout le matériel nécessaire (findings par cluster + analyses transversales nav/économie/terminologie/état data + gaps). Pas besoin de relire le code : les claims load-bearing sont déjà vérifiés dans le diagnostic.

# ROADMAP "BEST-SELLER" — Nivy (espace teen)

> Diagnostic de base : 67-68 écrans teen, ~15 exposés en nav, 3 violations de la règle devise « XP ne se convertit jamais », nav mobile inexistante hors home, ~7 surfaces qui mentent en prod. L'app a un backend largement réel mais une vitrine cassée. **Le travail n'est pas de coder des features — c'est de câbler, dé-orpheliniser, dé-mocker et trancher la devise.**

---

## 1. Top 10 des problèmes par impact

| # | Problème | Impact | Prio | Effort | Fichiers clés |
|---|----------|--------|------|--------|---------------|
| 1 | **Nav mobile inexistante hors home** : `MobileBottomNav` montée dans `teen-dashboard-content.tsx:238`, pas dans le layout. Sur mobile, ~66 pages n'ont aucune navigation (seul un Sheet à 4 liens, dont 1 cassé). | App inutilisable au doigt hors accueil. Killer pour des ados 100% mobile. | **P0** | **M** | `app/teen/layout.tsx`, `components/teen/dashboard/mobile-nav.tsx`, `teen-dashboard-content.tsx` |
| 2 | **Faux contenu en prod** : MarketplaceOverlay (Nike/Megarama + CTA mort), SocialFeed (Amine/Sara/Lina), MapPreview (Max/Emma/Lucas), avatar skins fantômes. | L'ado ne distingue pas le vrai du décor → perte de confiance immédiate. Risque légal (faux partenariats marques). | **P0** | **S** | `marketplace-overlay.tsx`, `feed/social-feed.tsx`, `map-preview.tsx`, `teen/avatar/page.tsx` |
| 3 | **Violation règle devise XP** : 3 taux contradictoires (10 vs 100 XP/DH), boutique débite XP avec « ≈ DH », `xp-converter.ts` institutionnalise la conversion, friend-defis mise/transfère de l'XP. | Cœur du modèle produit trahi. Confusion totale + risque compliance (mineurs). | **P0** | **M** | `lib/payments/xp-converter.ts`, `wallet-hub-client.tsx`, `xp-value/page.tsx`, `quests/friend-defis/*` |
| 4 | **~50 écrans réels orphelins** : food, rides, anniversaire, quiz, savings, allowance, pathways, mentors, internships, chores, friend-defis — backend câblé mais 0 nav. | Features livrées = invisibles. Le PO croit l'app vide alors qu'elle ne l'est pas. | **P0** | **L** | `sidebar.tsx`, `mobile-nav.tsx`, + nouveau hub `/teen/services` |
| 5 | **Lien « Mes Achievements » cassé partout** : sidebar/header/navbar + 2 redirects pointent vers `?tab=achievements`, onglet inexistant dans `ProfileHubClient`. | Le bouton « trophées » ouvre une page vide. Cassure visible dès le 1er clic. | **P0** | **S** | `profile-hub-client.tsx`, `sidebar.tsx`, `header.tsx`, `navbar.tsx` |
| 6 | **Games exposé en sidebar mais 100% disabled** (« bientôt »), aucun runner. | Feature mise en avant qui ne fait littéralement rien. | **P1** | **S** (cacher) / **L** (livrer) | `app/teen/games/games-client.tsx`, `sidebar.tsx` |
| 7 | **Dashboard surchargé** : XP affiché 3-4×, niveau 4×, coins 3× au-dessus du pli ; le « next best action » (PriorityMission) arrive en 4e position. | Charge cognitive énorme, action prioritaire noyée → faible activation. | **P1** | **M** | `teen-dashboard-content.tsx`, `orbiting-tokens`, `stat-hero`, `twin-currency-gauge` |
| 8 | **Parcours crew cassé (boucle)** : crews routent vers `/teen/circles/{crewId}` mais la page détail vérifie `circle_members` (backend distinct) → redirect immédiat. | Créer/ouvrir un crew ne mène jamais nulle part. Feature sociale phare KO. | **P1** | **M** | `circles-client.tsx`, `circles/[circleId]/page.tsx` |
| 9 | **Anniversaire cassé en bout de chaîne** : 2 parcours divergents, paiement CB jamais déclenché, approbation parent sans RPC `birthday`, confirmation lit colonnes inexistantes. | Promesse de transaction non tenue sur une feature monétisable. | **P1** | **L** | `app/anniversaires/*`, `app/api/parent/approvals`, `features/anniversaires/actions.ts` |
| 10 | **Bug food : adresse de livraison perdue** (`deliveryAddress` envoyé, `body.address` lu) + fuite ownership sur `/order/[id]` (service-role sans contrôle teen_id). | Commande livraison part avec adresse NULL + fuite de données mineurs. | **P1** | **S** | `food/[partner_id]/menu-cart-client.tsx:154`, `api/teen/food/order/route.ts:73`, `food/order/[id]/page.tsx` |

---

## 2. Golden path d'un nouveau teen (premiers 5 minutes) — et ce qui le casse

**Le parcours idéal :**
1. **Onboarding** → arrive sur `/teen` (accueil).
2. **Comprend ses 2 soldes** (XP gagné, coins chargés par le parent) en un coup d'œil.
3. **Voit UNE action claire** : « Fais le quiz du jour, gagne 50 XP » → clique → joue → gagne de l'XP.
4. **Revient sur l'accueil**, voit sa progression bouger, son streak démarrer.
5. **Explore** : trouve facilement Crew, Boutique, ou une vraie activité (food/event).

**Ce qui le casse aujourd'hui, étape par étape :**

| Étape | Ce qui casse | Gravité |
|-------|--------------|---------|
| 2 — Comprendre les soldes | XP affiché 3× (gauge + orbit + StatHero), coins 3×, niveau 4× au-dessus du pli. Le header montre coins mais pas XP. **Confusion : quel est « le » solde ?** | Haute |
| 3 — Une action claire | Le « next best action » (PriorityMission) est en 4e position après 3 répétitions de stats. AvatarCoach propose un CTA, mais 3 entrées quêtes/quiz concurrentes au-dessus du pli. **Pas d'action unique évidente.** | Haute |
| 3 — Jouer | Le quiz (seule feature pleinement jouable) **n'est dans aucune nav** — atteignable seulement via avatar-coach. Si le teen rate ce CTA, il ne trouve pas le quiz. | Critique |
| 4 — Voir sa progression | Streak affiche un multiplicateur XP **jamais appliqué** et une « protection streak » toujours à 0. Le bouton « maintenir streak » pointe vers `/daily` (route morte). | Moyenne |
| 4 — Trophées | Clique « Mes Achievements » → **page vide** (onglet inexistant). | Haute |
| 5 — Explorer (mobile) | Quitte l'accueil → **plus aucune navigation**. Tombe sur MarketplaceOverlay (faux Nike), SocialFeed (faux amis), MapPreview (faux contacts à 500m). **Tout ce qu'il découvre est faux ou inaccessible.** | Critique |

**Verdict** : aujourd'hui, un teen mobile qui rate le CTA quiz de l'avatar-coach n'a **aucun chemin** vers une activité réelle, et tout ce qu'il voit en scrollant ment. Le golden path est cassé à l'étape 3.

**Cible 5 min** : accueil = 1 barre devise compacte (XP + coins, source unique) + 1 carte « Quête du jour → GO » plein écran. Bottom-nav persistante à 5 piliers. Zéro faux contenu.

---

## 3. Les 3 features à finir pour rendre l'app vendable

> Principe : on finit ce dont le backend est **déjà réel**, on cache le reste.

### À FINIR (1) — **Le Wallet + boutique cohérents (économie)**
C'est le cœur du pitch « XP mérite vs coins prépayés ». Aujourd'hui il se contredit lui-même.
- **Trancher la règle** : XP ne se convertit jamais → retirer tout « ≈ DH », le bandeau remise, la page xp-value (ROI/projections), neutraliser `xp-converter.ts` pour le wallet. Prix boutique en **XP nus**.
- **Donner une destination aux coins** : soit un onglet/rail « payer en coins », soit assumer clairement que coins = food/rides/épargne/réservations uniquement.
- **Aligner l'historique** sur la devise réelle (XP, pas `coins_spent`) et exposer les **codes de retrait** (aujourd'hui orphelins).
- Source unique du spendable (vue `user_coins_spendable`).

### À FINIR (2) — **Le pôle Quiz/Quêtes (la seule feature pleinement jouable)**
Le quiz est complet (scoring serveur, attempts, XP crédité) mais **invisible**.
- L'exposer en nav (pilier « Jouer »).
- Stabiliser le hub : retirer l'ordre `Math.random()`, refléter le vrai statut (pas tout « available »), retirer l'XP event fixée à 500, corriger le 404 sur `/teen/quests/[id]`.
- Ajouter **1 quiz « sport »** au seed (promesse PO non tenue) OU retirer « sportif » du discours.

### À FINIR (3) — **Un service « vie réelle » bout-en-bout : Food OU Rides**
Choisir **Food** (le plus abouti) comme vitrine du modèle coins/DH + approbation parentale.
- Corriger le bug adresse (`body.address` ← `deliveryAddress`).
- Sécuriser `/order/[id]` (contrôle ownership).
- Boucler le parcours : banner succès → page de suivi + page « Mes commandes ».
- L'exposer en nav (pilier « Services »).

### À RETIRER / CACHER (mock qui fait croire à une feature)
| Surface | Action |
|---------|--------|
| `MarketplaceOverlay` (full-mock, CTA mort) | **Retirer du dashboard** tant que pas de deals réels. |
| `SocialFeed` fallback Amine/Sara/Lina | **Empty-state honnête**, jamais de faux posts. |
| `MapPreview` amis/events factices | **Empty-state**, pas de fausse géoloc. |
| `app/teen/games` (100% disabled) | **Retirer de la sidebar** + état « bientôt » assumé. |
| `app/teen/avatar` (skins fantômes en XP) | **Cacher** ou retirer les prix XP non fonctionnels. |
| `app/teen/wellbeing` (« à venir » partout) | **Cacher** tant que vide. |
| `app/teen/share` (`shareableItems=[]`, watermark « teensparty ») | **Cacher la section vide** + corriger watermark → Nivy. |
| Streak : multiplicateur/passes décoratifs | **Retirer** les promesses non tenues. |

---

## 4. Quick wins (<1 jour) vs chantiers structurants

### Quick wins (<1 jour chacun — effort S)
1. **Retirer MarketplaceOverlay + fallbacks SocialFeed/MapPreview** du dashboard (3 fichiers, suppression de mocks).
2. **Réparer le lien achievements** : repointer sidebar/header/navbar + redirects vers `/teen/wallet?tab=badges` (la vraie donnée existe). 1 ligne × 4 endroits.
3. **Corriger le bug adresse food** (`body.address` → `deliveryAddress`) + ajouter contrôle ownership sur `/order/[id]`.
4. **Retirer « Games » de la sidebar** + désactiver l'entrée tant que pas de runner.
5. **Fixer ChoreNudge** `bg-lime text-lime` → texte invisible (1 classe Tailwind).
6. **Supprimer le doublon quick-access** Clubs/Crew Battle (2 cartes → même URL) + retirer badges NEW/HOT/LIVE en dur.
7. **Corriger watermark** `teensparty` → `nivy` sur share.
8. **Mapper le statut `requested`** dans `RIDE_STATUS_CLS` (pill gris → état visible).
9. **Corriger « paie en coins » → « paie en DH »** sur `/teen/birthday`.
10. **Pointer sidebar « Mes Coins »/« Récompenses »** directement sur `/teen/wallet` (supprimer cascades de redirects).

### Chantiers structurants (M/L)
- **[M] Nav mobile globale** : monter `MobileBottomNav` dans `layout.tsx`, aligner 5 piliers sur URL canoniques, retirer `/teen/quests` de `hiddenPaths`, remplacer le Sheet header par les 5 piliers.
- **[L] Refonte IA navigation 15→5 piliers** : Accueil / Jouer / Social / Services / Wallet. Créer le hub `/teen/services` pour dé-orpheliniser ~15 écrans.
- **[M] Allègement dashboard** : 1 source de vérité par chiffre, remonter le next-best-action above-the-fold.
- **[M] Trancher + propager la règle devise** sur tous les écrans.
- **[M] Réparer la boucle crew** (unifier backend ou rediriger vers un vrai détail crew).
- **[L] Unifier le parcours anniversaire** (1 entrée, packs DB, dispatch approbation `birthday`).
- **[L] Boucler Food bout-en-bout** + l'exposer.

---

## 5. Séquence recommandée — 4 phases

### Phase 1 — « Stop the lies » (1 semaine) — *crédibilité*
Tout ce qui ment ou casse au 1er clic. Quasi 100% quick wins.
- Retirer/empty-state tous les mocks de prod (MarketplaceOverlay, SocialFeed, MapPreview, avatar, games, wellbeing, share).
- Réparer lien achievements, bug adresse food + ownership, ChoreNudge, doublon quick-access, watermark.
- **Sortie** : aucune surface ne ment, aucun clic ne mène à du vide.

### Phase 2 — « Mobile usable » (1 semaine) — *survie produit*
- Monter `MobileBottomNav` dans le layout (5 piliers, URL canoniques).
- Remplacer le Sheet header par les 5 piliers, franciser la nav (Accueil/Jouer/Social/Services/Mon profil).
- Supprimer les cascades de redirects dans la nav.
- **Sortie** : l'app est navigable au doigt sur toutes les pages.

### Phase 3 — « Golden path » (2 semaines) — *activation*
- Alléger le dashboard (1 chiffre = 1 affichage, next-best-action en haut).
- Exposer + stabiliser le pôle Quiz/Quêtes (pilier « Jouer »).
- Créer le hub `/teen/services` et y dé-orpheliniser économie + orientation + services.
- Trancher et propager la règle devise (wallet cohérent, prix XP nus, coins avec destination).
- **Sortie** : un nouveau teen vit le golden path 5 min sans accroc.

### Phase 4 — « Vendable » (2-3 semaines) — *monétisation & profondeur*
- Boucler Food bout-en-bout (suivi + « Mes commandes »).
- Réparer la boucle crew + figer la terminologie (Crew / Quête / Défi des parents).
- Unifier le parcours anniversaire (paiement réel, approbation parent, confirmation correcte).
- Arbitrer la mise XP des friend-defis (coins/DH ou sans enjeu transférable — **bloquant compliance**).
- **Sortie** : 3 features vendables finies (Wallet, Quiz, Food) + features sociales/monétisables réparées.

---

**Chiffrage global** : Phase 1+2 (~2 semaines, surtout S) débloque 80% de la perception de qualité. Phases 3+4 (~4-5 semaines, M/L) rendent l'app réellement vendable. **Total ~6-7 semaines** pour passer de « démo qui ment » à « best-seller câblé », sans écrire une seule feature backend nouvelle — uniquement câblage, dé-mock, dé-orphelinisation et arbitrage devise.

Fichiers pivots à toucher en priorité : `app/teen/layout.tsx`, `components/teen/dashboard/mobile-nav.tsx`, `components/dashboard/teen/sidebar.tsx`, `components/dashboard/teen/header.tsx`, `components/teen/dashboard/teen-dashboard-content.tsx`, `lib/payments/xp-converter.ts`, `app/teen/wallet/wallet-hub-client.tsx`, `app/teen/profile/profile-hub-client.tsx`.
