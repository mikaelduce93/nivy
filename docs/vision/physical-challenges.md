# Vision audit — Défis physiques (Physical Challenges)

Read-only audit of the sport / physical-challenge surface.

---

## 1. Résumé exécutif

Nivy embarque un module "Défis Physiques" pensé pour faire bouger des ados marocains (push-ups, planche, course, marathon mensuel…) avec récompense XP. La surface est **partiellement câblée** : les tables existent en base (`physical_challenges`, `teen_physical_challenge_progress`, `teen_personal_records`), un seed de 5 défis est présent, deux UIs côté teen consomment Supabase, et deux endpoints REST gèrent start/update/complete + records. **Mais** la vision "validation parentale / coach / preuve photo vérifiée" et "défis de groupe" n'est, à ce jour, **pas implémentée**. Le seed est minuscule (5 lignes) et le composant client a encore des `TODO(data)` pour le streak, les minutes/semaine et l'historique. Aucun teen n'a encore démarré un défi (`teen_physical_challenge_progress` = 0 ligne) ni enregistré un record (`teen_personal_records` = 0 ligne).

Confusion d'architecture importante à signaler : le nom de migration cité dans le brief (`008_special_challenges.sql`) ne traite **pas** des défis physiques. Cette migration définit les défis "soirée" (photo, quiz, géoloc, flash, social, créatif) liés aux events. Les défis physiques sont définis dans `022_pillars_system.sql` (Section 3) et exposés via le pillier "Sport". Ce sont deux univers parallèles.

---

## 2. Surface code & data — inventaire

### Pages / UI
- `app/teen/defis-physiques/page.tsx` — server component, charge `physical_challenges` actifs + progress du teen, expose `ApiChallenge[]` au client. Bug latent : il `select` `*` puis lit `challenge.title` côté client alors que la colonne DB est `name` (cf. §6).
- `app/teen/defis-physiques/defis-physiques-client.tsx` — UI motion/lucide, sépare `daily` vs autres ("programmes"), calcule progression du jour, affiche stats, catégories (Force/Cardio/Core), historique. Plusieurs valeurs sont hard-codées à 0 avec `TODO(data)` : `currentStreak`, `minutesThisWeek`, `workoutHistory`. Pas de bouton fonctionnel pour démarrer un défi (le `Button` "Commencer" n'a pas de `onClick`).
- `app/gamification/defis-physiques/page.tsx` — simple `redirect("/teen/defis-physiques")` (consolidation Wave 1).
- `components/sport/physical-challenges.tsx` — composant alternatif, présent mais non monté sur la route principale.
- `app/teen/challenges/page.tsx` — surface "challenges" plus large, à clarifier vs défis physiques.

### API REST (côté Next.js)
- `app/api/teen/sport/challenges/route.ts` — GET liste + progress, POST avec `action ∈ {start,update,complete}`. Le complete prend `proofUrl` et `proofType` mais marque tout de suite `validated=true` sans aucune vérification (auto-validation).
- `app/api/teen/sport/records/route.ts` — GET / POST records personnels. Catalogue `RECORD_TYPES` codé en dur dans le fichier (15 types : pompes, tractions, squats, planche, course, sprint, sauts…). Crée le record avec `verified=false` et calcule du XP en fonction du `improvement_percent`.

### Schémas SQL
- `gamification-system/database/migrations/022_pillars_system.sql` (lignes 314-…) — définit `physical_challenges`, `teen_physical_challenge_progress`, `teen_personal_records` dans le cadre du pilier Sport.
- `gamification-system/database/migrations/008_special_challenges.sql` — défis spéciaux d'event party (photo/quiz/géoloc/flash/social/creative) **sans rapport direct** avec le sport. Tables : `special_challenge_types`, `special_challenges`, `special_challenge_submissions`, `challenge_votes`, `quiz_questions`, `geolocation_zones`. C'est cette migration qui contient le mécanisme de soumission photo, vote, validation. Pertinente comme référence si on veut porter le pattern aux défis physiques.
- `gamification-system/features/special-challenges/{schema.ts,actions.ts}` — TypeScript serveur miroir de la migration 008.

### DB live (Supabase project `imchornjvmgmaovhypco / nivy`)
- `physical_challenges` : 16 colonnes, **5 lignes** actuellement (10 Pompes, Planche 60s, Course 5km, 100 Pompes, Marathon Mensuel).
- `teen_physical_challenge_progress` : 16 colonnes (incl. `proof_type`, `proof_url`, `validated`, `validated_at`, `xp_earned`), **0 ligne**.
- `teen_personal_records` : 12 colonnes (incl. `proof_url`, `verified`, `improvement_percent`), **0 ligne**.
- `friend_challenges` : 14 colonnes, structure 1v1 / team (`creator_id`, `target_value`, `stake_xp`, `winning_team`), **0 ligne**, **non rattachée** à `physical_challenges`. Tables connexes : `circle_challenges`, `crew_*`, `seasonal_challenges`, `event_challenges`. `user_personal_records` (à ne pas confondre avec `teen_personal_records`) coexiste, 7 colonnes, vide.

---

## 3. Réponses aux questions ciblées

### Types de défi : enum ou texte libre ?
Semi-enum. `challenge_type` est contraint par CHECK à `'daily' | 'weekly' | 'monthly' | 'special'`. `objective_type` est contraint à `'count' | 'duration' | 'distance' | 'weight'`. En revanche `sport_category` est `VARCHAR(50)` libre (le seed utilise `cardio`, `strength`), et `difficulty` est `VARCHAR(20)` libre (`easy`, `normal`, `hard`). Côté record : `record_category` libre (le code applicatif passe `strength | cardio | flexibility | speed | power`).

### Validation : quel mécanisme est implémenté ?
**Aucun mécanisme de vérification réel.** Le POST `action='complete'` accepte un `proofUrl` optionnel, set `validated=true` immédiatement, attribue le XP via `add_xp_to_user` et c'est tout. Pas de file de modération, pas de toggle parent, pas de revue coach, pas d'IA. Le champ `proof_type` accepte `'photo'|'video'|'screenshot'|'manual'` mais n'est qu'un libellé. Les records personnels sont créés avec `verified=false` et **rien ne fait passer à `verified=true`** dans le code actuel.

### Défis de groupe : crews / friend_challenges / standalone ?
**Non rattachés.** `friend_challenges` existe avec stake XP, équipes, statut, gagnant — mais pointe vers une table `challenge_types` générique, **pas** vers `physical_challenges`. Les `crew_*` (members, stats hebdo, achievements) tournent autour des crews mais aucune table de jonction `crew_physical_challenge` n'existe. Les défis physiques actuels sont donc tous individuels.

### Formule XP
Per-défi : colonne `xp_reward INTEGER DEFAULT 50` figée par ligne (10/25/75/100/500 dans le seed). Côté records, formule applicative en escalier :
- `improvement_percent ≥ 20%` → +100 XP
- `≥ 10%` → +75 XP
- `≥ 5%` → +50 XP
- sinon → +25 XP
- premier record d'un type → 50 XP

Pas de multiplicateur de difficulté ni de bonus streak.

### Coach
**N'existe pas.** Aucune table `coaches`. Table `partners` existe mais ne contient qu'un `partner_type='venue'` en prod. Pas d'enum `'coach'` introduit. Pas de RLS ou route admin permettant à un coach de valider un défi. La vision "approbation coach" est entièrement à construire.

---

## 4. Écart vision vs implémentation

| Attendu vision | État réel |
|---|---|
| Défis daily/weekly | OK (enum + seed minimal) |
| Photo/vidéo de preuve | Champ `proof_url` en DB, **upload non câblé**, validation auto |
| Confirmation parent | Aucun lien `parent_teen_links` → progress, pas de UI parent dédiée |
| Approbation coach | Rôle coach inexistant |
| Défis de groupe / crew | Tables présentes mais déconnectées des `physical_challenges` |
| Repas sain en photo | Aucun `objective_type='photo'` ou catégorie nutrition |
| Wallet economy | XP earn OK via `add_xp_to_user`, pas de conversion en monnaie virtuelle visible ici |
| Équilibre temps écran | Aucun lien avec un module "screen time" (pas trouvé) |

---

## 5. Questions pour le founder

1. **Curation** : Les 5 défis seedés sont des placeholders. Les défis officiels seront-ils écrits par un coach/staff Nivy, générés par IA via le chatbot, crowdsourcés par les teens, ou un mix ? Cela conditionne s'il faut une UI back-office et un workflow d'approbation.
2. **Vérification de preuve** : Quelle est l'ambition réaliste — modération manuelle (qui ?), revue par parent via app parent, modèle vision IA (CLIP/Gemini), confiance + report communautaire, ou pas de vérif (XP "honor system") ? Aujourd'hui c'est honor system de fait.
3. **Privacy photos/vidéos teens 13-17** : Où sont stockées les preuves (Supabase Storage public ? privé ?), qui peut les voir (autres teens ? parents ? jamais ?), retention, droit RGPD/CNDP marocain ? Aucun bucket ou policy n'est référencé dans le code lu.
4. **Défis de groupe** : Doit-on étendre `physical_challenges` avec un mode "crew/friends" ou créer une table de jonction, ou recycler `friend_challenges` en lui ajoutant un FK vers `physical_challenges` ?
5. **Coach** : Persona prévue dans le modèle économique (partenariat coachs marocains rémunérés ? bénévoles ? gamifiés eux-mêmes ?), ou pivot uniquement parent + IA ?
6. **Healthy lifestyle vs gym-bro** : Vision veut "promouvoir bien-être et équilibre écran/vie". Le seed actuel est très orienté perf (marathon mensuel pour ado de 13 ans?). Faut-il calibrer par âge / niveau de base ?

---

## 6. Risques techniques relevés

- **Bug column mismatch** : `app/teen/defis-physiques/defis-physiques-client.tsx` consomme `challenge.title` mais la colonne DB est `name`. Le `select("*")` ne renomme pas. Tous les titres affichés sont `undefined` actuellement.
- **Bouton "Commencer" inerte** : pas d'`onClick` ni de fetch vers l'endpoint POST. La page est en lecture seule de fait.
- **Auto-validation systématique** : le moindre POST `complete` avec un `proofUrl` (ou même sans) crédite le XP. Risque de farming trivial.
- **Confusion 008 vs 022** : le brief, et probablement la doc historique, mélangent deux systèmes. Prévoir une renommage clair (`event_challenges` vs `physical_challenges`).
- **Doublon** : `teen_personal_records` (utilisée) vs `user_personal_records` (vide, schéma divergent). À fusionner ou documenter.
- **XP attribution** : POST complete fait `rpc("add_xp_to_user", { p_teen_id, p_xp_amount, ... })`. Vérifier que cette RPC existe et attribue bien au profil teen (non audité ici).

---

## Fichiers / objets référencés

- `app/teen/defis-physiques/page.tsx`
- `app/teen/defis-physiques/defis-physiques-client.tsx`
- `app/gamification/defis-physiques/page.tsx`
- `app/api/teen/sport/challenges/route.ts`
- `app/api/teen/sport/records/route.ts`
- `components/sport/physical-challenges.tsx`
- `gamification-system/database/migrations/022_pillars_system.sql`
- `gamification-system/database/migrations/008_special_challenges.sql`
- `gamification-system/features/special-challenges/schema.ts`
- `gamification-system/features/special-challenges/actions.ts`

DB tables : `physical_challenges`, `teen_physical_challenge_progress`, `teen_personal_records`, `friend_challenges`, `partners` (no coach), `user_personal_records` (orphan duplicate).
