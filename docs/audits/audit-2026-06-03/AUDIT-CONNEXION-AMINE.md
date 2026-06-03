# Audit final — Bug de connexion teen « Error fetching user crew: {} » et drift schéma `profiles`

**Projet :** nivy (Supabase `imchornjvmgmaovhypco`, pg17) · **Branche :** `milestone/v6-le-collectif` · **Date :** 2026-06-03
**Méthode :** 5 dimensions auditées, chaque finding vérifié en live (READ-ONLY) avec preuve adversariale (SQLSTATE capturé) ; les findings réfutés sont relégués en annexe.

---

## 1. Résumé exécutif

**La cause racine du bug Amine est un drift de colonnes dans la RPC `public.get_user_crew`.** Cette fonction (`LANGUAGE plpgsql`, `prosecdef=false`) agrège les membres d'un crew via `JOIN profiles p` et lit `p.pseudo` et `p.level`. Or la table `profiles` live ne contient que `{id, email, full_name, avatar_url, role, created_at, updated_at, is_onboarded, is_deletion_pending}` — ni `pseudo`, ni `level`, ni `xp`. Ces données vivent ailleurs : `pseudo` sur `teens` (et la vue `teen_full_profile`), `level`/`current_level` sur `user_xp`/`user_progression`. Dès qu'un teen possède un crew actif, la RPC franchit le `IF NOT FOUND` et atteint cette sous-requête, ce qui lève **42703 `column p.pseudo does not exist`**. La preuve a été capturée en exécutant la vraie RPC pour Amine (`37ff4a09-25ca-44c2-a313-141ab6d7e1b9`, membre actif du crew public « Rabat Riders ») : `ERROR 42703 ... CONTEXT: PL/pgSQL function get_user_crew(uuid) line 21`.

**Verdict global sur le chemin de connexion :** le login teen lui-même n'est PAS bloqué. Le middleware (`proxy.ts`) et le layout (`getUserRole` → `teen_full_profile`, qui expose bien `pseudo`/`level`) sont sains. La landing `/teen` se peint proprement (toutes ses lectures sont `.catch`-gardées et alignées sur le schéma réel). Le seul point qui jette à la connexion est `/teen/circles` (et tout consommateur de `getUserCrew`). Le `.catch` de la page empêche le crash de rendu mais **avale l'erreur** : l'ado avec un crew voit un faux état « pas de crew » et un `console.error` opaque `{}` est loggé à chaque visite. La feature crew est donc silencieusement non-fonctionnelle pour tout teen ayant un crew.

**Le `{}` opaque est un problème d'observabilité distinct mais aggravant.** Le `PostgrestError` (objet plain, non-instance d'`Error`) passé tel quel à `console.error` se sérialise `{}` en RSC Next 16, ce qui a masqué le SQLSTATE 42703 pendant longtemps. Ce même drift `profiles` se répète sur **9 fonctions DB** (dont 7 référençant la relation totalement fantôme `user_profiles` → 42P01) et sur **~15 sites de code TS/TSX**. La plupart sont hors chemin de connexion et/ou latents (code mort, tables vides), mais constituent un champ de mines à corriger. Enfin, l'audit a révélé une **fuite PII de mineurs pré-auth** (policy `teens` `qual=true`) qui est le seul vrai P0 de sécurité de ce sweep.

---

## 2. Le bug reporté, expliqué de bout en bout

```
Login teen (Amine)
  │
  ├─ proxy.ts : getUser() ×2, lit profiles(role, is_onboarded) [colonnes existent → OK], gate onboarding+role, laisse passer /teen
  │
  ├─ app/teen/layout.tsx (RSC) : getUserRole() → profiles(id,email,full_name,role) [OK] + branche teen lit teen_full_profile.* [OK : la vue a pseudo,level,coins_balance,total_xp]
  │     monte GamificationProvider, StreakPinger, TeenHeader [OK]
  │
  └─ app/teen/circles/page.tsx:14 : Promise.all([ getUserCrew(), searchCrews(), getCrewLeaderboard() ]) chacun .catch
        │
        └─ getUserCrew()  [gamification-system/features/crews/actions/get-crews.ts:24]
              │  supabase.rpc("get_user_crew", { p_user_id: user.id })
              │
              ▼  RPC public.get_user_crew (plpgsql, prosecdef=false → RLS active à l'intérieur)
                   1) SELECT crew_members JOIN crews         → Amine a 1 ligne 'active' ⇒ IF NOT FOUND franchi
                                                               (crew « Rabat Riders » is_public=true ⇒ crews_public_read laisse passer le JOIN crews)
                   2) bloc membres (line 21) :
                        jsonb_build_object('pseudo', p.pseudo, …, 'level', p.level)
                        FROM crew_members cm JOIN profiles p ON cm.user_id = p.id
                                                               ▲ profiles n'a NI pseudo NI level
                              ─────────────────────────────►  ERROR 42703 column p.pseudo does not exist
              │
              ▼  supabase-js renvoie { data: null, error: PostgrestError(42703) }
              │  get-crews.ts:29  console.error("Error fetching user crew:", error)  ← PostgrestError sérialisé "{}" en RSC
              │  get-crews.ts:30  return { data: null, error: error.message }
        │
        ▼  circles/page.tsx:15  .catch(() => ({ data: null, error: "load-error" }))  ← le champ error n'est JAMAIS relu
           circles/page.tsx:21  const myCrew = userCrewResult.data ? … : null  ⇒ myCrew = null
        │
        ▼  CirclesPageClient (props {myCrew, discoverCrews, leaderboard} — aucun slot erreur)
           ⇒ Amine (crew RÉEL) voit « pas de crew », zéro signal UI, log opaque {} côté serveur à chaque visite
```

La page **ne crashe pas** ; elle **dégrade silencieusement**. C'est la conjonction (a) drift de colonnes côté RPC, (b) log opaque du PostgrestError, (c) consommateur qui ignore `.error` qui produit le symptôme reporté.

---

## 3. Inventaire par sévérité

### P0 — Bloquant / sécurité

**P0-1 · `get_user_crew` lit `profiles.pseudo`/`profiles.level` fantômes → 42703 (LE bug reporté)**
- **Localisation :** DB `public.get_user_crew(uuid)`, bloc membres line 21 (`JOIN profiles p`, `jsonb_build_object('pseudo',p.pseudo,…,'level',p.level)`). Call site : `gamification-system/features/crews/actions/get-crews.ts:24` ; consommé par `app/teen/circles/page.tsx:15`.
- **Cause :** RPC `prosecdef=false` ; après `IF NOT FOUND`, agrège les membres via `JOIN profiles p` et lit `p.pseudo`/`p.level`, absents de `profiles`.
- **Preuve :** `SELECT public.get_user_crew('37ff4a09-…')` → `ERROR 42703: column p.pseudo does not exist / CONTEXT: PL/pgSQL function get_user_crew(uuid) line 21`. `crew_members` : 1 ligne `active` pour Amine ⇒ `NOT FOUND` franchi. `information_schema.columns(profiles)` ne liste ni `pseudo` ni `level`. Cibles du fix vérifiées présentes : `teens.pseudo`, `teens.avatar_url`, `user_xp.teen_id`, `user_xp.current_level`.
- **Fix :** voir §5 (migration `119_realityfix_get_user_crew_profiles_drift.sql`). Remplacer `p.pseudo → t.pseudo` (`JOIN teens t ON t.id = cm.user_id`), `p.level → ux.current_level` (`LEFT JOIN user_xp ux ON ux.teen_id = cm.user_id`), avatar via `COALESCE(t.avatar_url, p.avatar_url)`. Le 42703 se produit même en SECURITY DEFINER : la correction de colonnes est la vraie cause, le `prosecdef` n'est qu'un facteur aggravant à corriger en option.

**P0-2 · Fuite PII mineurs : policy `teens` `qual=true` lisible pré-auth (réhaussé de P1)**
- **Localisation :** DB policy `public."Users can view all teens"` (table `teens`, SELECT, role `{public}`).
- **Cause :** `teens` contient `first_name, last_name, date_of_birth, city, region, school_type, gender, grade_level`. Une policy permissive `qual=true` pour `{public}` est OR'd avec la restrictive `teens_self_read`, qu'elle neutralise. Le rôle est `public` (`polroles=[0]`) et `anon` détient le grant SELECT.
- **Preuve :** preuve live = 5/5 lignes lisibles par un appelant **anonyme non authentifié** (divulgation pré-auth, en masse, de nom complet + date de naissance de mineurs). Contrôle : après `DROP`, 1 ligne propre pour l'auth, 0 pour anon.
- **Fix :** `DROP POLICY "Users can view all teens" ON public.teens;` (garder `teens_self_read`). Si une visibilité `pseudo`/`avatar` est requise pour crews/leaderboard, l'exposer via une vue dédiée — jamais `qual=true` sur la table brute. À noter (hors scope) : auditer les autres tables PII pour la même exposition.

### P1 — Dégradation fonctionnelle majeure

**P1-1 · `get_user_challenges` : sous-requête participants `JOIN profiles` lit `p.pseudo` → 42703**
- **Localisation :** DB `public.get_user_challenges(uuid, varchar)` ; appelée par `gamification-system/features/challenges/actions.ts:75`.
- **Cause :** SECURITY DEFINER, mais la sous-requête participants fait `JOIN profiles p ON cp.user_id = p.id` et lit `p.pseudo`. Référence résolue **au plan**, donc l'erreur est **inconditionnelle** : elle se déclenche même avec **zéro défi** et un user sans participation. Seul `p.pseudo` est fautif (`p.avatar_url` existe).
- **Preuve :** appel forcé dans le canal d'erreur → `42703 column p.pseudo does not exist`, alors que `total_challenges=0` et `amine_participations=0`. La feature challenges est cassée à chaque appel de la RPC, pour n'importe quel user.
- **Fix :** `JOIN teens t ON cp.user_id = t.id`, `'pseudo', t.pseudo`, `'avatar_url', t.avatar_url`.

**P1-2 · `end_game_session` : `JOIN user_profiles up` → relation fantôme → 42P01**
- **Localisation :** DB `public.end_game_session(uuid)` ; appelée par `gamification-system/features/mini-games/actions.ts:282`.
- **Cause :** référence la relation `user_profiles` qui n'existe nulle part (`to_regclass('public.user_profiles')=null`, 0 colonne). Échoue au plan, avant même d'évaluer `up.pseudo`.
- **Preuve :** SQLSTATE capturé `42P01 relation "user_profiles" does not exist`. Caller : `actions.ts:286 if (error) throw error`. (`mini_game_sessions`/`mini_game_participants` = 0 ligne ⇒ jamais exercé en live, bug latent total.)
- **Fix :** `JOIN teens up ON up.id = p.user_id` pour `up.pseudo`/`up.avatar_url`. Aucune source XP lue ici.

**P1-3 · `get_game_leaderboard` : `JOIN user_profiles up` dans les 3 branches → 42P01**
- **Localisation :** DB `public.get_game_leaderboard(varchar, varchar, int)`, branches daily/weekly/all ; appelée par `gamification-system/features/mini-games/actions.ts:665`.
- **Cause :** même relation fantôme `user_profiles`. Les 3 périodes cassent.
- **Preuve :** `42P01` capturé sur les 3 branches, avec slug factice (`quiz`) ET slug réel (`daily_quiz`). Caller : `if (error) throw error` → retourne `{success:false}` silencieux. Leaderboard jeux 100 % cassé, toutes périodes.
- **Fix :** dans les 3 branches, `JOIN teens up ON up.id = <d|w>.user_id` ; `up.pseudo`/`up.avatar_url`. `score`/`total_xp` viennent déjà de `daily_game_scores`/`weekly_game_leaderboard`.

**P1-4 · `complete_seasonal_challenge` : `UPDATE user_profiles SET xp/total_xp` → 42P01**
- **Localisation :** DB `public.complete_seasonal_challenge(uuid, uuid)` ; appelée par `gamification-system/features/seasonal-challenges/actions.ts:202`.
- **Cause :** écrit dans `user_profiles` (fantôme). L'UPDATE est atteignable (les relations lues avant existent), aucun `EXCEPTION` interne ⇒ **toute la transaction RPC rollback** : ni XP crédité, ni `user_seasonal_progress.status='completed'` persisté. **`xp` est aussi un fantôme** — aucune table réelle n'a de colonne `xp`, seul `total_xp` existe.
- **Preuve :** `42P01` capturé sur l'UPDATE exact. `to_regclass` : `seasonal_challenges`/`user_seasonal_progress` existent (UPDATE non masqué). Caller : `actions.ts:207 if (error) throw error`.
- **Fix :** `UPDATE user_xp SET total_xp = total_xp + v_xp_earned WHERE teen_id = p_user_id;` (clé `teen_id`, **pas** `id`) ; **supprimer entièrement** l'affectation `xp = …`.

**P1-5 · Création/recherche de teen par parent : `profiles.username` + `linking_code` + `parent_id` (3 colonnes fantômes)**
- **Localisation :** `app/api/parent/teens/create/route.ts:116-120` & `227-234` ; `app/api/parent/teens/search/route.ts:28-33`.
- **Cause :** `username` n'existe nulle part (pseudo = `teens.pseudo`) ; `linking_code` non plus (table réelle `linking_codes.code`) ; `parent_id` est sur `teens`, pas `profiles`.
- **Preuve :** 3 chemins reproduisent 42703 en live. **Dégât dur = `search`** : `.single()` capture le 42703 → **404 systématique** → la fonctionnalité parent « rechercher/lier un teen existant » est totalement morte (UI affiche toujours « Aucun teen trouvé »), câblée à `components/parent/add-teen-form.tsx:353`. Pour `create` : le contrôle d'unicité pseudo cross-profiles et l'UPDATE `is_onboarded`/`avatar_url` sur `profiles` échouent silencieusement (erreurs non destructurées) ; le pseudo **est** persisté via l'upsert `teens` antérieur.
- **Fix :** lire/écrire `teens.pseudo` ; liaison via `parent_teen_links` / `teens.parent_id` ; remplacer `linking_code` par `linking_codes.code`.

**P1-6 · Route circles : `profiles.pseudo/is_muted/muted_until` → identité perdue + garde de mute mort (contournement modération)**
- **Localisation :** `app/api/circles/route.ts:121` (GET) & `241` (POST), garde `246-253`.
- **Cause :** `profiles` n'a ni `pseudo` ni `is_muted` ni `muted_until` (`is_muted`/`muted_until` existent dans **zéro** table). `.single()` sans throw → `profile=null`. GET perd l'identité (`userRole` undefined) ; POST : `profile?.is_muted` undefined ⇒ **garde de mute sauté = contournement modération réel** ; collatéral : XP grant sauté.
- **Preuve :** 42703 capturé sur les deux selects. Latent aujourd'hui (`circles WHERE is_active=true` = 0), s'active dès qu'un cercle actif existe.
- **Fix :** `role` depuis `profiles` (OK), `pseudo` depuis `teens.pseudo`. Le concept de mute **n'a aucun store** (`is_muted`/`muted_until` nulle part ; seul `feed_muted_users(muted_user_id, mute_until)` existe, scope différent) ⇒ recâbler le garde sur un vrai store ou le retirer, pas seulement le repointer. *(Phantom adjacent hors scope : `circle_messages.user_id` sans FK ⇒ l'embed PostgREST `author:user_id(...pseudo...)` aux lignes 159/330 ne résout pas.)*

**P1-7 · Observabilité : `console.error(label, error)` logge un PostgrestError brut → `{}` en RSC (~200 sites)**
- **Localisation :** `gamification-system/features/crews/actions/get-crews.ts:29` (représentatif) ; 312 occurrences sur 35 fichiers dans `gamification-system/features`.
- **Cause :** un PostgrestError est un objet plain (non-instance d'`Error`) ; passé à `console.error` en RSC Next 16, il s'affiche `{}` et le SQLSTATE est perdu. C'est exactement la trace « Error fetching user crew: {} ».
- **Preuve :** grep confirmé `312 console.error(…, error)` / 35 fichiers ; seulement `112 .message|.code|.details|.hint` / 25 fichiers ⇒ ~200 sites loggent l'objet nu. Mêmes patterns dans `activity.ts:32` (`getCrewLeaderboard`, sur le chemin circles), 67, 121, 168, 212, 244.
- **Fix :** voir §6. **Ce fix est complémentaire, pas substitutif** : il rend le 42703 visible mais ne corrige pas le bug fonctionnel (P0-1).

**P1-8 · Observabilité : contexte coach Niv dégradé en silence (`profiles.pseudo/city/date_of_birth/archetype`)**
- **Localisation :** `lib/ai/context-engine.ts:86-91` (teen) & `245-246` (parent).
- **Cause :** `gatherTeenContext` lit `profiles.select('pseudo, city, avatar_url, date_of_birth, archetype')` → 42703. **2 requêtes profiles cassées** (teen l.86 + parent l.245), pas 1. Le coach part avec `pseudo:null`/`city:null`/`archetype:null`/`age_bucket:'unknown'`, **sans aucun log**.
- **Preuve :** 42703 capturé en live. **Correction du mécanisme :** le `.catch(() => ({data:null}))` n'avale **pas** le 42703 — postgrest-js@2.81.1 **résout** sur 42703 avec `{data:null, error}` (le `.catch` est du code mort sans `shouldThrowOnError`). C'est le code appelant qui **ignore le champ `.error` résolu**. NB : `teen_full_profile` (l.95-100) n'erreure PAS (colonnes présentes).
- **Fix :** inspecter/logger `result.error` (pas via `.catch`) ET corriger la source (lire `pseudo` via `teen_full_profile`/`teens`). *(Le helper `logDbError` n'existe pas encore dans le repo — à créer, cf. §6.)*

### P2 — Défaut réel mais latent / hors chemin critique

**P2-1 · `open_advent_day` : `UPDATE user_profiles SET xp/total_xp` → 42P01.** `public.open_advent_day(uuid, int)`. Enregistre `user_advent_progress` puis échoue à l'UPDATE XP ⇒ rollback, case jamais ouverte. Fix : `UPDATE user_xp SET total_xp = total_xp + v_xp_earned WHERE teen_id = p_user_id;`, retirer `xp`.

**P2-2 · `resolve_prediction` : `UPDATE user_profiles up … FROM user_predictions` → 42P01.** `public.resolve_prediction(uuid, int)`. Prédictions résolues mais crédit XP échoue ⇒ rollback complet, résolution jamais persistée. Fix : `UPDATE user_xp ux SET total_xp = total_xp + pred.points_earned FROM user_predictions pred WHERE pred.user_id = ux.teen_id AND …;`, retirer `xp`.

**P2-3 · `submit_game_score` : `UPDATE user_profiles SET xp/total_xp` → 42P01.** `public.submit_game_score(uuid, uuid, int, jsonb)` ; `mini-games/actions.ts`. Scores daily/weekly upsert puis UPDATE XP final échoue ⇒ rollback, score perdu. Fix : `UPDATE user_xp SET total_xp = total_xp + v_xp_earned WHERE teen_id = p_user_id;`, retirer `xp`.

**P2-4 · RLS `crews_member_read` : tautologie `crew_members.crew_id = crew_members.id` (réajusté de P0/P1 à P2).** Le prédicat compare la FK `crew_id` à l'`id` de la ligne membre ⇒ **toujours faux** (`COUNT(*) FILTER (WHERE crew_id = id)` = 0/5). Origine `007_crews_system.sql:901-903` ; jamais corrigé sur `crews` (l'a été sur `circles` via migration 117). **Impact runtime actuel NUL** : 0 crew privé sur 2 (tous publics) ⇒ `crews_public_read (is_public=true)` masque le bug ; le crew d'Amine étant public, c'est le 42703 de P0-1 qui casse, pas la tautologie. Preuve runtime : branche buguée `grants_read=false`, branche corrélée `=true`. Latent : ne mord qu'une fois qu'un crew privé existe ET P0-1 corrigé. Fix : §5.

**P2-5 · Écritures `profiles.coins` (achat boutique + top-up Stripe) → 42703.** `gamification-system/features/profile-customization/actions.ts:361/374` ; `app/api/webhooks/stripe/dispatcher.ts:81/84`. Le wallet réel = `user_coins.balance` (5 lignes, 15400 coins). **Latent** : `dispatcher.ts` est code mort documenté (Stripe non câblé, CMI = PSP live) ; `purchaseItem` n'a **aucun appelant**. Champ de mines à corriger avant câblage. *(Drift bonus dans le même handler mort : insert `coin_transactions` écrit `type/parent_id/stripe_session_id` alors que la table a `transaction_type/source_type/source_id/balance_after`.)* Fix : router sur `user_coins.balance`/`.eq('teen_id', …)` ou la RPC atomique `top_up_teen`.

**P2-6 · Leaderboard créateurs + page friend-défis : enrichissement via `profiles.pseudo` → anonymisés.** `app/teen/leaderboard/page.tsx:70` ; `app/teen/quests/friend-defis/new/page.tsx:47`. 42703 ⇒ tous les pseudos/avatars tombent en `Anonyme`/null (pas de crash). Fix : `JOIN teens` pour résoudre `id→pseudo`, ou lire directement `v_leaderboard_monthly` (expose déjà pseudo+avatar+classement).

**P2-7 · Contexte coach IA `referral_code` + sources `teens`.** `lib/ai/context-engine.ts` ; `app/api/teen/avatar-coach/route.ts:260` ; `lib/ai/agent-actions.ts:146`. `referral_code` n'existe nulle part (généré par RPC `get_or_create_referral_code`) ⇒ code toujours `CODE-NON-DEFINI` ; `avatar-coach` lit `profiles.pseudo` ⇒ `teenFirstName='champion'`. Fix : lire depuis `teens`/`teen_full_profile` ; appeler `get_or_create_referral_code`.

**P2-8 · Recap onboarding lit `profiles.total_xp` → recap XP toujours vide.** `app/onboarding/complete/page.tsx:56`. `total_xp` est sur `user_xp`. Try/catch best-effort ⇒ pas de crash, `starterXp` toujours null. Fix : `.from('user_xp').select('total_xp').eq('teen_id', profileId).maybeSingle()` ou `teen_full_profile.total_xp`.

**P2-9 · Contenu personnalisé teen : `teens.interests/profiles/school` inexistants → 42703.** `app/api/teen/content/personalized/route.ts:36`. Seul `grade_level` existe parmi les colonnes demandées. Fix : sélectionner les colonnes réelles (`grade_level, archetype, learning_style, primary_language, city, region`) ; vérifier aussi le filtre `id` vs `parent_id`.

**P2-10 · Export PDF parent : `profiles.pseudo` + filtre `profiles.parent_id` → export vide.** `app/api/parent/export-pdf/route.ts:79-80`. 42703 sur `pseudo` + filtre sur colonne inexistante. Fix : récupérer les `teen_ids` via `parent_teen_links`/`teens.parent_id`, lire `pseudo` depuis `teens`.

**P2-11 · Observabilité : 72 catch `{}` vides + 64 retours `"Erreur serveur"` génériques.** `app/teen` (72 catch vides / 46 fichiers, ex `page.tsx:54`, `circles-client.tsx:96,117`) ; 64 `error: "Erreur serveur"` / 9 fichiers features. Empêchent de distinguer 42703 / timeout / RLS denied. Fix : bannir les catch `{}` sans log ; inclure le SQLSTATE en debug (`NODE_ENV === 'development'`) ; garde lint `no-empty-catch` sur `app/teen` et `gamification-system/features`.

### P3 — Hygiène / cosmétique

**P3-1 · Hook gamification client lit `user_xp.level` (réel = `current_level`) → `level=undefined`.** `lib/hooks/use-gamification.ts:124-165` + mapping realtime `228-252`. `select('*')` ⇒ pas de 42703, juste `xp.level` undefined ; le header retombe sur `userInfo.teenData.level`. Incohérence interne (`teen-dashboard.ts:133` lit déjà correctement `current_level`). Fix : mapper `current_level → level` dans le hook et le handler realtime.

---

## 4. Rayon de souffle du drift `profiles`/`user_profiles`

**Fonctions DB (9, toutes confirmées) :**

| Fonction | Référence fantôme | SQLSTATE | Sur chemin connexion | Sévérité |
|---|---|---|---|---|
| `get_user_crew` | `profiles.pseudo`, `profiles.level` | 42703 | **Oui** | **P0** |
| `get_user_challenges` | `profiles.pseudo` | 42703 | Non | P1 |
| `end_game_session` | `user_profiles.pseudo` | 42P01 | Non | P1 |
| `get_game_leaderboard` | `user_profiles.pseudo` (×3 branches) | 42P01 | Non | P1 |
| `complete_seasonal_challenge` | `user_profiles.xp/total_xp` | 42P01 | Non | P1 |
| `open_advent_day` | `user_profiles.xp/total_xp` | 42P01 | Non | P2 |
| `resolve_prediction` | `user_profiles.xp/total_xp` | 42P01 | Non | P2 |
| `submit_game_score` | `user_profiles.xp/total_xp` | 42P01 | Non | P2 |
| `crews_member_read` (policy) | tautologie `crew_id = id` | — | Latent | P2 |

**Sites code TS/TSX (~15, principaux) :** `get-crews.ts:24` (relais du bug DB) · `parent/teens/create+search` (`username`/`linking_code`/`parent_id`) · `api/circles/route.ts` (`pseudo`/`is_muted`/`muted_until`) · `profile-customization/actions.ts` + `stripe/dispatcher.ts` (`coins`, code mort) · `leaderboard/page.tsx` + `friend-defis/new/page.tsx` (`pseudo`) · `context-engine.ts` + `avatar-coach` + `agent-actions.ts` (`pseudo`/`city`/`dob`/`archetype`/`referral_code`) · `onboarding/complete/page.tsx` (`total_xp`) · `content/personalized/route.ts` (`interests`/`profiles`/`school`) · `parent/export-pdf/route.ts` (`pseudo`/`parent_id`) · `use-gamification.ts` (`level`, client).

**Lignes de mire des sources réelles :** `pseudo → teens.pseudo` (ou `teen_full_profile.pseudo`) · `level → user_xp.current_level` (ou `teen_full_profile.level`) · `total_xp → user_xp.total_xp` / `user_progression` / `teen_full_profile.total_xp` · `coins → user_coins.balance` (PK `teen_id`) · `parent_id → teens.parent_id` / `parent_teen_links` · `referral_code → RPC get_or_create_referral_code` · `linking_code → linking_codes.code`. **`username` et `xp` n'existent NULLE PART** (utiliser `pseudo` et `total_xp`).

---

## 5. Plan de remédiation ordonné (P0 d'abord)

### Étape 1 — P0-1 : corriger `get_user_crew` (débloque le bug reporté)

Migration `gamification-system/database/migrations/119_realityfix_get_user_crew_profiles_drift.sql`. Reconstruire **uniquement le bloc membres** : remplacer `JOIN profiles p` par `JOIN teens t` (pseudo/avatar) + `LEFT JOIN user_xp ux` (level), et passer la fonction en SECURITY DEFINER (search_path déjà figé). Squelette du bloc à corriger :

```sql
-- Bloc membres corrigé (pseudo<-teens, level<-user_xp, avatar via COALESCE) :
SELECT jsonb_agg(
  jsonb_build_object(
    'user_id',    cm.user_id,
    'pseudo',     t.pseudo,                         -- était p.pseudo (fantôme)
    'avatar_url', COALESCE(t.avatar_url, p.avatar_url),
    'level',      COALESCE(ux.current_level, 1),    -- était p.level (fantôme)
    'role',       cm.role,
    'status',     cm.status
  )
)
FROM crew_members cm
JOIN teens t            ON t.id = cm.user_id         -- remplace JOIN profiles
LEFT JOIN user_xp ux    ON ux.teen_id = cm.user_id  -- source réelle du level
LEFT JOIN profiles p    ON p.id = cm.user_id         -- conservé seulement pour avatar fallback
WHERE cm.crew_id = v_member.crew_id
  AND cm.status = 'active';
```

> Conserver les autres colonnes du `jsonb_build_object` existant à l'identique ; ne toucher qu'aux clés `pseudo`/`level`/`avatar_url`. Marquer la fonction `SECURITY DEFINER` (`ALTER FUNCTION public.get_user_crew(uuid) SECURITY DEFINER;`) pour aligner sur les autres RPC du module.

### Étape 2 — P0-2 : couper la fuite PII mineurs

```sql
DROP POLICY "Users can view all teens" ON public.teens;
-- teens_self_read (id = auth.uid() OR via parent_teen_links) suffit.
-- Visibilité pseudo/avatar pour crews/leaderboard : via vue dédiée, jamais qual=true.
```

### Étape 3 — P1 RPC drift (challenges + jeux + saisonnier)

```sql
-- P1-1 get_user_challenges : sous-requête participants
-- … FROM challenge_participants cp JOIN teens t ON cp.user_id = t.id
--   jsonb_build_object('user_id',cp.user_id,'pseudo',t.pseudo,'avatar_url',t.avatar_url,…)

-- P1-2 end_game_session : … FROM mini_game_participants p
--   JOIN teens up ON up.id = p.user_id   (était JOIN user_profiles up)  -- up.pseudo, up.avatar_url

-- P1-3 get_game_leaderboard : dans les 3 branches
--   JOIN teens up ON up.id = <d|w>.user_id   (était JOIN user_profiles up)

-- P1-4 complete_seasonal_challenge : remplacer l'UPDATE fantôme
UPDATE user_xp SET total_xp = total_xp + v_xp_earned WHERE teen_id = p_user_id;
-- supprimer entièrement « xp = xp + v_xp_earned » (colonne xp inexistante)
```

### Étape 4 — P1 routes/code parent + circles

- `parent/teens/create+search` : écrire/lire `teens.pseudo` ; liaison `parent_teen_links`/`teens.parent_id` ; `linking_code → linking_codes.code`. **Prioriser `search`** (404 systématique = feature morte).
- `api/circles/route.ts` : `pseudo` depuis `teens` ; **décider du sort du garde de mute** (aucun store global ⇒ recâbler sur un vrai store ou retirer) avant qu'un cercle actif n'existe.

### Étape 5 — P2 RPC XP + RLS crews

```sql
-- P2-1/2/3 open_advent_day / resolve_prediction / submit_game_score :
--   remplacer UPDATE user_profiles par UPDATE user_xp … WHERE teen_id = p_user_id, retirer xp.

-- P2-4 RLS crews_member_read (réutilise le helper SECURITY DEFINER existant) :
DROP POLICY crews_member_read ON public.crews;
CREATE POLICY crews_member_read ON public.crews
  FOR SELECT
  USING ( public.is_active_crew_member(id, (SELECT auth.uid())) );
-- NB arité : is_active_crew_member(p_crew_id uuid, p_user_id uuid) — passer (id, auth.uid()), pas (id) seul.
```

### Étape 6 — P2/P3 sites code restants

`profile-customization`/`dispatcher` (router sur `user_coins` **avant** câblage) · `leaderboard`/`friend-defis` (JOIN `teens` ou `v_leaderboard_monthly`) · `context-engine`/`avatar-coach`/`agent-actions` (sources `teens` + RPC referral) · `onboarding/complete` (`user_xp.total_xp`) · `content/personalized` (colonnes réelles) · `export-pdf` (`parent_teen_links`) · `use-gamification.ts` (`current_level → level`).

---

## 6. Recommandation observabilité (arrêter de logger `{}`)

1. **Créer le helper manquant** `lib/observability/log-db-error.ts` (référencé par plusieurs fix mais inexistant dans le repo) :

```ts
export function logDbError(
  scope: string,
  error: { message?: string; code?: string; details?: string; hint?: string } | null,
) {
  if (!error) return;
  console.error(`[${scope}]`, JSON.stringify({
    message: error.message, code: error.code, details: error.details, hint: error.hint,
  }));
}
```

2. **Remplacer `console.error("…", error)` par `logDbError("scope", error)`** — prioriser le chemin connexion : `crews.getUserCrew` (`get-crews.ts:29`) et `crews.getCrewLeaderboard` (`activity.ts:32`).

3. **Inspecter `result.error`, pas `.catch`** : la leçon postgrest-js@2.81.1 est que `.maybeSingle()`/`.single()` **résolvent** sur 42703 (`{data:null, error}`) sans throw. Les `.catch(() => ({data:null}))` (context-engine, circles/page) sont du **code mort** pour cette classe d'erreur — le vrai correctif est de **lire et logger `result.error`** côté appelant.

4. **Propager un flag d'erreur à l'UI** : `circles/page.tsx` ignore `.error` ⇒ passer `hasLoadError` à `CirclesPageClient` pour afficher « réessayer » au lieu d'un faux état vide (idem `streak/page.tsx`, `teen/page.tsx`).

5. **Debug-only SQLSTATE** dans les server actions : `error: process.env.NODE_ENV === 'development' ? \`${e.code}: ${e.message}\` : 'Erreur serveur'`, + garde lint `no-empty-catch` sur `app/teen` et `gamification-system/features`.

---

## 7. Annexe — Findings écartés / réajustés

**Écarté (réfuté, `confirmed=false`) :**

- **DBDRIFT-CODE-1 — `teen-dashboard.ts:124` hook `useTeenData` lit `teen_full_profile.username` (réel = `pseudo`) → 42703 (annoncé P0/chemin connexion).** Mécanisme réel (42703 reproduit en live, erreur avalée), **mais code mort** : `useTeenData` a **zéro call site** dans tout le repo (seule sa déclaration `lib/hooks/teen-dashboard.ts:96`). Le vrai dashboard utilise le loader serveur `lib/server/teen-dashboard.ts:getTeenDashboardData`, qui sélectionne déjà `pseudo` (pas `username`) et est `.catch`-gardé. Drift latent en code inatteignable, **ne peut PAS causer le bug de login**. **Réajusté P0 → P3** (hygiène : corriger le select ou supprimer le hook mort).

**Réajustements de sévérité notables (conservés mais reclassés) :**

- **`crews_member_read` (DBDRIFT-9 / RLS-1 / RLS-CREWS-1) : P0/P1 → P2.** Réel et reproductible, mais impact runtime **nul** (0 crew privé) ; ce n'est PAS ce qui casse la connexion d'Amine (c'est P0-1). `onConnectionPath` surévalué dans l'état actuel. Snippet de fix initial corrigé (arité : `is_active_crew_member(id, auth.uid())`).
- **`teens` `qual=true` (RLS-2) : P1 → P0.** Exposition **pré-auth** de PII de mineurs confirmée (5/5 lignes lisibles en anonyme).
- **`profiles.coins` (DBDRIFT-CODE-3) : P1 → P2.** Les deux chemins d'écriture sont inatteignables (dispatcher = code mort documenté, `purchaseItem` orphelin). Landmine à corriger avant câblage.

**Faux positifs du flag « drift » (confirmés sains, aucune action) :**

- **`get_crew_leaderboard`** — utilise légitimement `c.total_xp` et `p.full_name` ; a retourné 2 lignes en live.
- **`get_friends_presence`** — ne lit que `p.id`/`full_name`/`avatar_url` (présents) + colonnes de `user_presence`.
- **`get_game_leaderboard` / `get_user_challenges`** — bien SECURITY DEFINER (contrairement au framing initial) ; sans incidence sur le 42703/42P01 ni sur les fix.

**Findings de référence sans correctif propre (cartographie / état sain documenté) :**

- **TRACE-MAP** — carte d'exécution login → first paint (vérifiée file:line + DB live) ; aucun fix propre, les correctifs sont P0-1, P1-7, P3-1.
- **TRACE-LANDING-OK** — la landing `/teen` ne jette PAS au login : `getTeenDashboardData` est entièrement `.catch`-gardée, ses requêtes alignées sur le schéma réel (`teen_full_profile` explicite, `bookings.user_id`, `user_coins.teen_id`), `getUserCrew` n'est importé QUE par `app/teen/circles/page.tsx`. État sain documenté comme contraste.
- **RLS-3 — 4 tables RLS active / 0 policy** (`discount_usage`, `marketplace_payouts`, `pending_teen_registrations`, `webhook_events`) : blocage total mais **hors chemin teen** (tables d'intégration/admin, accès `service_role`/SECURITY DEFINER). Décider par table : confirmer « service_role-only » (état correct) ou ajouter une policy self-read si un teen/parent doit lire ses propres lignes (ex. `discount_usage`).
